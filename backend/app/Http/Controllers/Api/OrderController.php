<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Store;
use App\Models\AuditLog;
use App\Services\PricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use AuthorizesRequests;
    protected $pricingService;

    public function __construct(PricingService $pricingService)
    {
        $this->pricingService = $pricingService;
    }

    public function index(Request $request)
    {
        $query = Order::with(['customer', 'store', 'items.product']);

        // Filter by accessible stores for non-super admins
        if (!$request->user()->isSuperAdmin()) {
            $accessibleStoreIds = $request->user()->getAccessibleStoreIds();
            if (empty($accessibleStoreIds)) {
                return response()->json([]);
            }
            $query->whereIn('store_id', $accessibleStoreIds);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('order_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('order_date', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $orders = $query->latest('order_date')->paginate($perPage);

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'store_id' => 'required|exists:stores,id',
            'delivery_address' => 'nullable|string',
            'delivery_phone' => 'nullable|string',
            'delivery_date' => 'nullable|date',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|numeric|min:0.01',
            'items.*.unit_price' => 'required_with:items|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $customer = Customer::findOrFail($validated['customer_id']);

            // Calculate totals
            $subtotal = 0;
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    $subtotal += $item['quantity'] * $item['unit_price'];
                }
            }

            // Create order
            $order = Order::create([
                'order_number' => 'ORD-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'customer_id' => $validated['customer_id'],
                'store_id' => $validated['store_id'],
                'order_date' => now(),
                'delivery_date' => $validated['delivery_date'] ?? null,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => $subtotal,
                'delivery_address' => $validated['delivery_address'] ?? null,
                'delivery_phone' => $validated['delivery_phone'] ?? $customer->phone ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create order items
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    $order->items()->create([
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['product_variant_id'] ?? null,
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'discount_percentage' => 0,
                        'discount_amount' => 0,
                        'line_total' => $item['quantity'] * $item['unit_price'],
                    ]);
                }
            }

            AuditLog::log('created', $order, null, $order->toArray(), 'Order created');

            DB::commit();

            return response()->json([
                'message' => 'Order created successfully',
                'order' => $order->load(['customer', 'store', 'items.product']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function show(Order $order)
    {
        $order->load(['customer', 'store', 'items.product', 'items.variant', 'payments']);

        return response()->json($order);
    }

    public function update(Request $request, Order $order)
    {
        if (!in_array($order->status, ['draft', 'placed'])) {
            return response()->json([
                'message' => 'Cannot update order in current status',
            ], 400);
        }

        $validated = $request->validate([
            'delivery_address' => 'sometimes|string',
            'delivery_phone' => 'sometimes|string',
            'notes' => 'nullable|string',
        ]);

        $oldValues = $order->toArray();
        $order->update($validated);

        AuditLog::log('updated', $order, $oldValues, $order->toArray(), 'Order updated');

        return response()->json([
            'message' => 'Order updated successfully',
            'order' => $order->load(['customer', 'store', 'items.product']),
        ]);
    }

    public function confirm(Order $order)
    {
        if ($order->status !== 'placed') {
            return response()->json([
                'message' => 'Only placed orders can be confirmed',
            ], 400);
        }

        $oldStatus = $order->status;
        $order->update(['status' => 'confirmed']);

        AuditLog::log('confirmed', $order, ['status' => $oldStatus], ['status' => 'confirmed'], 'Order confirmed');

        return response()->json([
            'message' => 'Order confirmed successfully',
            'order' => $order,
        ]);
    }

    public function cancel(Order $order)
    {
        if (!in_array($order->status, ['draft', 'placed', 'confirmed'])) {
            return response()->json([
                'message' => 'Cannot cancel order in current status',
            ], 400);
        }

        $oldStatus = $order->status;
        $order->update(['status' => 'cancelled']);

        AuditLog::log('cancelled', $order, ['status' => $oldStatus], ['status' => 'cancelled'], 'Order cancelled');

        return response()->json([
            'message' => 'Order cancelled successfully',
            'order' => $order,
        ]);
    }
}

