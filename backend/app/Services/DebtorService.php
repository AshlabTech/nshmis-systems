<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Sale;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DebtorService
{
    /**
     * Get all debtors with outstanding balances
     */
    public function getDebtors(array $filters = [])
    {
        $query = Customer::query()
            ->with(['sales' => function($q) {
                $q->where('payment_status', '!=', 'paid')
                  ->where('status', 'completed')
                  ->with(['payments', 'store', 'branch']);
            }])
            ->whereHas('sales', function($q) {
                $q->where('payment_status', '!=', 'paid')
                  ->where('status', 'completed');
            })
            ->where('is_active', true);

        // Apply filters
        if (!empty($filters['customer_id'])) {
            $query->where('id', $filters['customer_id']);
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['search'])) {
            $query->where(function($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                  ->orWhere('code', 'like', "%{$filters['search']}%")
                  ->orWhere('phone', 'like', "%{$filters['search']}%");
            });
        }

        $customers = $query->get();

        return $customers->map(function($customer) {
            $outstandingSales = $customer->sales->where('payment_status', '!=', 'paid');
            $totalOutstanding = $outstandingSales->sum('outstanding_amount');
            $totalOverdue = $this->getOverdueAmount($customer);
            
            return [
                'customer' => $customer,
                'total_outstanding' => $totalOutstanding,
                'total_overdue' => $totalOverdue,
                'credit_limit' => $customer->credit_limit,
                'credit_available' => max(0, $customer->credit_limit - $totalOutstanding),
                'outstanding_invoices_count' => $outstandingSales->count(),
                'oldest_invoice_date' => $outstandingSales->min('sale_date'),
                'aging' => $this->calculateAging($customer),
            ];
        });
    }

    /**
     * Get debtor details for a specific customer
     */
    public function getDebtorDetails(Customer $customer)
    {
        $sales = Sale::where('customer_id', $customer->id)
            ->where('payment_status', '!=', 'paid')
            ->where('status', 'completed')
            ->with(['payments', 'store', 'branch', 'items.product'])
            ->orderBy('sale_date', 'desc')
            ->get();

        $totalOutstanding = $sales->sum('outstanding_amount');
        $totalOverdue = $this->getOverdueAmount($customer);

        return [
            'customer' => $customer,
            'sales' => $sales->map(function($sale) {
                return [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'sale_date' => $sale->sale_date,
                    'due_date' => $sale->due_date,
                    'total_amount' => $sale->total_amount,
                    'amount_paid' => $sale->amount_paid,
                    'outstanding_amount' => $sale->outstanding_amount,
                    'payment_status' => $sale->payment_status,
                    'days_overdue' => $sale->due_date ? max(0, Carbon::parse($sale->due_date)->diffInDays(now(), false)) : 0,
                    'is_overdue' => $sale->due_date ? Carbon::parse($sale->due_date)->isPast() : false,
                    'store' => $sale->store,
                    'branch' => $sale->branch,
                    'payments' => $sale->payments,
                ];
            }),
            'total_outstanding' => $totalOutstanding,
            'total_overdue' => $totalOverdue,
            'credit_limit' => $customer->credit_limit,
            'credit_available' => max(0, $customer->credit_limit - $totalOutstanding),
            'aging' => $this->calculateAging($customer),
        ];
    }

    /**
     * Calculate aging buckets (0-30, 31-60, 61-90, 90+)
     */
    public function calculateAging(Customer $customer)
    {
        $sales = Sale::where('customer_id', $customer->id)
            ->where('payment_status', '!=', 'paid')
            ->where('status', 'completed')
            ->get();

        $aging = [
            'current' => 0,      // 0-30 days
            '31_60' => 0,        // 31-60 days
            '61_90' => 0,        // 61-90 days
            'over_90' => 0,      // 90+ days
        ];

        foreach ($sales as $sale) {
            if (!$sale->due_date) {
                $aging['current'] += $sale->outstanding_amount;
                continue;
            }

            $daysOverdue = Carbon::parse($sale->due_date)->diffInDays(now(), false);

            if ($daysOverdue <= 0) {
                $aging['current'] += $sale->outstanding_amount;
            } elseif ($daysOverdue <= 30) {
                $aging['current'] += $sale->outstanding_amount;
            } elseif ($daysOverdue <= 60) {
                $aging['31_60'] += $sale->outstanding_amount;
            } elseif ($daysOverdue <= 90) {
                $aging['61_90'] += $sale->outstanding_amount;
            } else {
                $aging['over_90'] += $sale->outstanding_amount;
            }
        }

        return $aging;
    }

    /**
     * Get overdue amount for a customer
     */
    public function getOverdueAmount(Customer $customer)
    {
        return Sale::where('customer_id', $customer->id)
            ->where('payment_status', '!=', 'paid')
            ->where('status', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->sum('outstanding_amount');
    }

    /**
     * Record payment against a sale
     */
    public function recordPayment(Sale $sale, array $paymentData, $userId)
    {
        return DB::transaction(function () use ($sale, $paymentData, $userId) {
            // Create payment record
            $payment = Payment::create([
                'payment_number' => 'PAY-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'payable_type' => Sale::class,
                'payable_id' => $sale->id,
                'customer_id' => $sale->customer_id,
                'amount' => $paymentData['amount'],
                'payment_method' => $paymentData['payment_method'],
                'payment_date' => $paymentData['payment_date'] ?? now(),
                'status' => 'verified',
                'reference' => $paymentData['reference'] ?? null,
                'bank_name' => $paymentData['bank_name'] ?? null,
                'account_number' => $paymentData['account_number'] ?? null,
                'notes' => $paymentData['notes'] ?? null,
                'received_by' => $userId,
                'verified_by' => $userId,
                'verified_at' => now(),
            ]);

            // Update sale amounts
            $totalPaid = $sale->payments()->sum('amount');
            $outstanding = $sale->total_amount - $totalPaid;

            $paymentStatus = 'paid';
            if ($outstanding > 0.01) {
                $paymentStatus = 'partial';
            }

            $sale->update([
                'amount_paid' => $totalPaid,
                'outstanding_amount' => max(0, $outstanding),
                'payment_status' => $paymentStatus,
            ]);

            return $payment;
        });
    }

    /**
     * Get aging report summary
     */
    public function getAgingReport(array $filters = [])
    {
        $debtors = $this->getDebtors($filters);

        $summary = [
            'total_debtors' => $debtors->count(),
            'total_outstanding' => $debtors->sum('total_outstanding'),
            'total_overdue' => $debtors->sum('total_overdue'),
            'total_invoices' => $debtors->sum('outstanding_invoices_count'),
            'aging_summary' => [
                'current' => 0,
                '31_60' => 0,
                '61_90' => 0,
                'over_90' => 0,
            ],
        ];

        foreach ($debtors as $debtor) {
            $summary['aging_summary']['current'] += $debtor['aging']['current'];
            $summary['aging_summary']['31_60'] += $debtor['aging']['31_60'];
            $summary['aging_summary']['61_90'] += $debtor['aging']['61_90'];
            $summary['aging_summary']['over_90'] += $debtor['aging']['over_90'];
        }

        return [
            'summary' => $summary,
            'debtors' => $debtors,
        ];
    }
}
