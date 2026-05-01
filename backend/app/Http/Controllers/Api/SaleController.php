<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Sale;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Store;
use App\Models\Payment;
use App\Models\AuditLog;
use App\Services\StockService;
use App\Services\PricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    use AuthorizesRequests;
    protected $stockService;
    protected $pricingService;

    public function __construct(StockService $stockService, PricingService $pricingService)
    {
        $this->stockService = $stockService;
        $this->pricingService = $pricingService;
    }

    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'store', 'cashier', 'items.product', 'items.unit', 'payments']);

        // Filter by accessible stores for non-super admins
        if (!$request->user()->isSuperAdmin()) {
            $accessibleStoreIds = $request->user()->getAccessibleStoreIds();
            if (empty($accessibleStoreIds)) {
                return response()->json([]);
            }
            $query->whereIn('store_id', $accessibleStoreIds);
        }

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('sale_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('sale_date', '<=', $request->date_to);
        }

        if ($request->filled('sale_type')) {
            $query->where('sale_type', $request->sale_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('invoice_number', 'like', "%{$request->search}%")
                  ->orWhereHas('customer', function($q) use ($request) {
                      $q->where('name', 'like', "%{$request->search}%");
                  });
            });
        }

        $perPage = $request->get('per_page', 15);
        $sales = $query->latest('sale_date')->paginate($perPage);

        return response()->json($sales);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Sale::class);

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'store_id' => 'required|exists:stores,id',
            'sale_type' => 'required|in:pos,portal,manual',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_id' => 'nullable|exists:units,id',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|in:cash,card,bank_transfer,wallet,mixed',
            'amount_paid' => 'required|numeric|min:0',
            'credit_days' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'payments' => 'nullable|array|min:1',
            'payments.*.payment_method' => 'required_with:payments|in:cash,card,bank_transfer,wallet',
            'payments.*.amount' => 'required_with:payments|numeric|min:0.01',
            'payments.*.reference' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $store = Store::findOrFail($validated['store_id']);
            $branch = $store->branch;

            // If no customer provided, use walk-in customer
            if (!$validated['customer_id']) {
                $walkInCustomer = Customer::where('code', 'CUST00000')->first();
                if ($walkInCustomer) {
                    $validated['customer_id'] = $walkInCustomer->id;
                }
            }

            $customer = $validated['customer_id'] ? Customer::findOrFail($validated['customer_id']) : null;

            // Calculate totals
            $subtotal = 0;
            $totalDiscount = 0;

            foreach ($validated['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $lineDiscount = 0;

                if (isset($item['discount_percentage']) && $item['discount_percentage'] > 0) {
                    $lineDiscount = $lineTotal * ($item['discount_percentage'] / 100);
                }

                $subtotal += $lineTotal;
                $totalDiscount += $lineDiscount;
            }

            $totalDiscount += $validated['discount_amount'] ?? 0;
            $taxAmount = $validated['tax_amount'] ?? 0;
            $totalAmount = $subtotal - $totalDiscount + $taxAmount;

            // Determine payment status and outstanding amount
            $outstandingAmount = max(0, $totalAmount - $validated['amount_paid']);
            $paymentStatus = 'paid';

            if ($outstandingAmount > 0.01) {
                $paymentStatus = $validated['amount_paid'] > 0 ? 'partial' : 'unpaid';
            }

            // Calculate due date if credit days provided
            $dueDate = null;
            $creditDays = $validated['credit_days'] ?? 0;
            if ($creditDays > 0) {
                $dueDate = now()->addDays($creditDays);
            }

            // Create sale
            $sale = Sale::create([
                'invoice_number' => 'INV-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'customer_id' => $validated['customer_id'],
                'branch_id' => $branch->id,
                'store_id' => $validated['store_id'],
                'sale_date' => now(),
                'sale_type' => $validated['sale_type'],
                'status' => 'completed',
                'payment_status' => $paymentStatus,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'amount_paid' => $validated['amount_paid'],
                'outstanding_amount' => $outstandingAmount,
                'change_amount' => max(0, $validated['amount_paid'] - $totalAmount),
                'due_date' => $dueDate,
                'credit_days' => $creditDays,
                'notes' => $validated['notes'] ?? null,
                'cashier_id' => $request->user()->id,
            ]);

            // Create sale items and update stock
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // If no unit_id provided, use product's base unit
                $unitId = $item['unit_id'] ?? $product->unit_id;

                // Check stock availability (with unit conversion)
                if ($product->track_inventory) {
                    if (!$this->stockService->hasAvailableStock(
                        $store,
                        $product,
                        $item['quantity'],
                        $item['product_variant_id'] ?? null,
                        $unitId
                    )) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }
                }

                $lineTotal = $item['quantity'] * $item['unit_price'];
                $lineDiscount = 0;

                if (isset($item['discount_percentage']) && $item['discount_percentage'] > 0) {
                    $lineDiscount = $lineTotal * ($item['discount_percentage'] / 100);
                }

                // Create sale item
                $sale->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $unitId,
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $item['discount_percentage'] ?? 0,
                    'discount_amount' => $lineDiscount,
                    'line_total' => $lineTotal - $lineDiscount,
                ]);

                // Update stock ledger (with unit conversion)
                if ($product->track_inventory) {
                    $this->stockService->recordTransaction(
                        $store,
                        $product,
                        'issue',
                        $item['quantity'],
                        $product->cost_price,
                        $item['product_variant_id'] ?? null,
                        'sale',
                        $sale->id,
                        "Sale: {$sale->invoice_number}",
                        null,
                        $unitId  // Pass unit_id for conversion
                    );
                }
            }

            // Create payment record(s)
            if (isset($validated['payments']) && count($validated['payments']) > 0) {
                // Split payment - multiple payment methods
                foreach ($validated['payments'] as $payment) {
                    Payment::create([
                        'payment_number' => 'PAY-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                        'payable_type' => Sale::class,
                        'payable_id' => $sale->id,
                        'customer_id' => $validated['customer_id'],
                        'amount' => $payment['amount'],
                        'payment_method' => $payment['payment_method'],
                        'payment_date' => now(),
                        'status' => 'verified', // POS sales are immediately verified
                        'reference' => $payment['reference'] ?? ('PAY-' . now()->format('YmdHis')),
                        'received_by' => $request->user()->id,
                        'verified_by' => $request->user()->id,
                        'verified_at' => now(),
                    ]);
                }
            } else {
                // Single payment method
                Payment::create([
                    'payment_number' => 'PAY-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                    'payable_type' => Sale::class,
                    'payable_id' => $sale->id,
                    'customer_id' => $validated['customer_id'],
                    'amount' => $validated['amount_paid'],
                    'payment_method' => $validated['payment_method'] ?? 'cash',
                    'payment_date' => now(),
                    'status' => 'verified', // POS sales are immediately verified
                    'reference' => 'PAY-' . now()->format('YmdHis'),
                    'received_by' => $request->user()->id,
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                ]);
            }

            AuditLog::log('created', $sale, null, $sale->toArray(), 'Sale created');

            DB::commit();

            return response()->json([
                'message' => 'Sale created successfully',
                'sale' => $sale->load(['customer', 'store', 'cashier', 'items.product', 'items.unit', 'payments']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => $e->getMessage(),
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function show(Sale $sale)
    {
        $sale->load(['customer', 'store', 'cashier', 'items.product', 'items.variant', 'items.unit', 'payments']);

        return response()->json($sale);
    }

    public function void(Sale $sale)
    {
        $this->authorize('void', $sale);

        if ($sale->status === 'voided') {
            return response()->json([
                'message' => 'Sale is already voided',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $oldStatus = $sale->status;
            $sale->update(['status' => 'voided']);

            AuditLog::log('voided', $sale, ['status' => $oldStatus], ['status' => 'voided'], 'Sale voided');

            DB::commit();

            return response()->json([
                'message' => 'Sale voided successfully',
                'sale' => $sale,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to void sale',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

