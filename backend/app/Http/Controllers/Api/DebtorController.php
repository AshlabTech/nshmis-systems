<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Customer;
use App\Models\Sale;
use App\Services\DebtorService;
use Illuminate\Http\Request;

class DebtorController extends Controller
{
    use AuthorizesRequests;
    
    protected $debtorService;

    public function __construct(DebtorService $debtorService)
    {
        $this->debtorService = $debtorService;
    }

    /**
     * Get list of all debtors
     */
    public function index(Request $request)
    {
        $filters = $request->only(['customer_id', 'category', 'search']);
        $debtors = $this->debtorService->getDebtors($filters);

        return response()->json([
            'data' => $debtors,
        ]);
    }

    /**
     * Get debtor details for a specific customer
     */
    public function show(Customer $customer)
    {
        $details = $this->debtorService->getDebtorDetails($customer);

        return response()->json($details);
    }

    /**
     * Get aging report
     */
    public function agingReport(Request $request)
    {
        $filters = $request->only(['customer_id', 'category', 'search']);
        $report = $this->debtorService->getAgingReport($filters);

        return response()->json($report);
    }

    /**
     * Record payment against a sale
     */
    public function recordPayment(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,card,bank_transfer,wallet,mixed',
            'payment_date' => 'nullable|date',
            'reference' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
        ]);

        // Validate amount doesn't exceed outstanding
        if ($validated['amount'] > $sale->outstanding_amount) {
            return response()->json([
                'message' => 'Payment amount cannot exceed outstanding amount',
            ], 422);
        }

        try {
            $payment = $this->debtorService->recordPayment(
                $sale,
                $validated,
                $request->user()->id
            );

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment,
                'sale' => $sale->fresh(['payments']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to record payment',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get debtor summary statistics
     */
    public function summary(Request $request)
    {
        $filters = $request->only(['customer_id', 'category', 'search']);
        $report = $this->debtorService->getAgingReport($filters);

        return response()->json($report['summary']);
    }
}

