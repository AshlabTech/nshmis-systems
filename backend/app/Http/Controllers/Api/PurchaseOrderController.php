<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\PurchaseOrder;
use App\Models\GoodsReceivedNote;
use App\Models\Product;
use App\Models\Store;
use App\Models\AuditLog;
use App\Services\StockService;
use App\Services\PriceHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    use AuthorizesRequests;
    protected $stockService;
    protected $priceHistoryService;

    public function __construct(StockService $stockService, PriceHistoryService $priceHistoryService)
    {
        $this->stockService = $stockService;
        $this->priceHistoryService = $priceHistoryService;
    }

    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'store', 'items.product', 'items.unit']);

        // Filter by accessible stores for non-super admins
        if (!$request->user()->isSuperAdmin()) {
            $accessibleStoreIds = $request->user()->getAccessibleStoreIds();
            if (empty($accessibleStoreIds)) {
                return response()->json([]);
            }
            $query->whereIn('store_id', $accessibleStoreIds);
        }

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
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
        $purchaseOrders = $query->latest('order_date')->paginate($perPage);

        return response()->json($purchaseOrders);
    }

    public function store(Request $request)
    {
        $this->authorize('create', PurchaseOrder::class);

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'store_id' => 'required|exists:stores,id',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_id' => 'nullable|exists:units,id',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            //branch_id from store
            $store = Store::findOrFail($validated['store_id']);
            $branch = $store->branch;

            // Calculate totals
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += $item['quantity'] * $item['unit_cost'];
            }

            // Create purchase order
            $purchaseOrder = PurchaseOrder::create([
                'po_number' => 'PO-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'supplier_id' => $validated['supplier_id'],
                'store_id' => $validated['store_id'],
                'branch_id' => $branch->id,
                'order_date' => $validated['order_date'],
                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'total_amount' => $subtotal,
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            // Create purchase order items
            foreach ($validated['items'] as $item) {
                // If no unit_id provided, use product's base unit
                $unitId = $item['unit_id'] ?? null;
                if (!$unitId) {
                    $product = Product::find($item['product_id']);
                    $unitId = $product->unit_id;
                }

                $purchaseOrder->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_id' => $unitId,
                    'received_quantity' => 0,
                    'unit_cost' => $item['unit_cost'],
                    'line_total' => $item['quantity'] * $item['unit_cost'],
                ]);
            }

            AuditLog::log('created', $purchaseOrder, null, $purchaseOrder->toArray(), 'Purchase order created');

            DB::commit();

            return response()->json([
                'message' => 'Purchase order created successfully',
                'purchase_order' => $purchaseOrder->load(['supplier', 'store', 'items.product']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create purchase order',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load(['supplier', 'store', 'items.product', 'items.variant', 'items.unit', 'goodsReceivedNotes']);

        return response()->json($purchaseOrder);
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('update', $purchaseOrder);

        // Only draft and pending POs can be updated
        if (!in_array($purchaseOrder->status, ['draft', 'pending'])) {
            return response()->json([
                'message' => 'Only draft or pending purchase orders can be updated',
            ], 400);
        }

        $validated = $request->validate([
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'store_id' => 'sometimes|exists:stores,id',
            'order_date' => 'sometimes|date',
            'expected_delivery_date' => 'nullable|date|after:order_date',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $oldData = $purchaseOrder->toArray();

            // Update branch_id if store_id changed
            if (isset($validated['store_id']) && $validated['store_id'] != $purchaseOrder->store_id) {
                $store = Store::findOrFail($validated['store_id']);
                $validated['branch_id'] = $store->branch_id;
            }

            // Update basic fields
            $purchaseOrder->update(array_filter($validated, function($key) {
                return $key !== 'items';
            }, ARRAY_FILTER_USE_KEY));

            // Update items if provided
            if (isset($validated['items'])) {
                // Delete old items
                $purchaseOrder->items()->delete();

                // Calculate new totals
                $subtotal = 0;
                foreach ($validated['items'] as $item) {
                    $subtotal += $item['quantity'] * $item['unit_cost'];

                    // Create new items
                    $purchaseOrder->items()->create([
                        'product_id' => $item['product_id'],
                        'product_variant_id' => $item['product_variant_id'] ?? null,
                        'quantity' => $item['quantity'],
                        'received_quantity' => 0,
                        'unit_cost' => $item['unit_cost'],
                        'line_total' => $item['quantity'] * $item['unit_cost'],
                    ]);
                }

                // Update totals
                $purchaseOrder->update([
                    'subtotal' => $subtotal,
                    'total_amount' => $subtotal,
                ]);
            }

            AuditLog::log('updated', $purchaseOrder, $oldData, $purchaseOrder->fresh()->toArray(), 'Purchase order updated');

            DB::commit();

            return response()->json([
                'message' => 'Purchase order updated successfully',
                'purchase_order' => $purchaseOrder->load(['supplier', 'store', 'items.product']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update purchase order',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function cancel(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('delete', $purchaseOrder);

        // Cannot cancel if already received or completed
        if (in_array($purchaseOrder->status, ['received', 'completed', 'cancelled'])) {
            return response()->json([
                'message' => 'Cannot cancel a purchase order that has been received or is already cancelled',
            ], 400);
        }

        $oldStatus = $purchaseOrder->status;
        $purchaseOrder->update(['status' => 'cancelled']);

        AuditLog::log('cancelled', $purchaseOrder, ['status' => $oldStatus], ['status' => 'cancelled'], 'Purchase order cancelled');

        return response()->json([
            'message' => 'Purchase order cancelled successfully',
            'purchase_order' => $purchaseOrder,
        ]);
    }

    public function approve(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('approve', $purchaseOrder);

        if (!in_array($purchaseOrder->status, ['draft', 'pending'])) {
            return response()->json([
                'message' => 'Only draft or pending purchase orders can be approved',
            ], 400);
        }

        $oldStatus = $purchaseOrder->status;
        $purchaseOrder->update([
            'status' => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        AuditLog::log('approved', $purchaseOrder, ['status' => $oldStatus], ['status' => 'approved'], 'Purchase order approved');

        return response()->json([
            'message' => 'Purchase order approved successfully',
            'purchase_order' => $purchaseOrder,
        ]);
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('receive', $purchaseOrder);

        if ($purchaseOrder->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved purchase orders can be received',
            ], 400);
        }

        $validated = $request->validate([
            'received_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $store = Store::findOrFail($purchaseOrder->store_id);

            // Create GRN
            $grn = GoodsReceivedNote::create([
                'grn_number' => 'GRN-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'purchase_order_id' => $purchaseOrder->id,
                'store_id' => $purchaseOrder->store_id,
                'received_date' => $validated['received_date'],
                'status' => 'completed',
                'notes' => $validated['notes'] ?? null,
                'received_by' => auth()->id(),
            ]);

            // Process received items
            foreach ($validated['items'] as $item) {
                $poItem = $purchaseOrder->items()->findOrFail($item['purchase_order_item_id']);
                
                // Create GRN item
                $grn->items()->create([
                    'product_id' => $poItem->product_id,
                    'product_variant_id' => $poItem->product_variant_id,
                    'quantity_ordered' => $poItem->quantity_ordered,
                    'quantity_received' => $item['quantity_received'],
                    'purchase_order_item_id' => $poItem->id,
                    'unit_cost' => $poItem->unit_cost,
                ]);

                // Update PO item
                $poItem->increment('received_quantity', $item['quantity_received']);

                // Update stock ledger with unit conversion
                $product = Product::findOrFail($poItem->product_id);
                $this->stockService->recordTransaction(
                    $store,
                    $product,
                    'receipt',
                    $item['quantity_received'],
                    $poItem->unit_cost,
                    $poItem->product_variant_id,
                    'goods_received_note',
                    $grn->id,
                    "GRN: {$grn->grn_number}",
                    null,
                    $poItem->unit_id  // Pass unit_id for conversion
                );

                // Auto-update product cost price with weighted average from stock ledger
                $stockBalance = $this->stockService->getStockBalance(
                    $store,
                    $product,
                    $poItem->product_variant_id
                );

                $newCostPrice = $poItem->unit_cost; //round($stockBalance['average_cost'], 2);

                // Update product or variant cost price and record history
                if ($poItem->product_variant_id) {
                    $variant = $product->variants()->find($poItem->product_variant_id);
                    if ($variant) {
                        $oldPrices = [
                            'cost_price' => $variant->cost_price,
                            'selling_price' => $variant->selling_price,
                            'wholesale_price' => $variant->wholesale_price,
                            'retailer_price' => $variant->retailer_price,
                        ];

                        // Calculate new selling price based on product's gain settings
                        $newSellingPrice = $product->calculateSellingPrice($newCostPrice);

                        $variant->update([
                            'cost_price' => $newCostPrice,
                            'selling_price' => round($newSellingPrice, 2),
                        ]);

                        $newPrices = [
                            'cost_price' => $newCostPrice,
                            'selling_price' => round($newSellingPrice, 2),
                            'wholesale_price' => $variant->wholesale_price,
                            'retailer_price' => $variant->retailer_price,
                        ];

                        // Record price history if cost or selling price changed
                        if ($oldPrices['cost_price'] != $newCostPrice || $oldPrices['selling_price'] != $newSellingPrice) {
                            $this->priceHistoryService->recordPriceChange(
                                $product,
                                $oldPrices,
                                $newPrices,
                                'goods_receipt',
                                "Prices auto-updated from goods receipt: {$grn->grn_number}",
                                'goods_received_note',
                                $grn->id,
                                $store->id,
                                $variant->id
                            );
                        }
                    }
                } else {
                    $oldPrices = [
                        'cost_price' => $product->cost_price,
                        'selling_price' => $product->selling_price,
                        'wholesale_price' => $product->wholesale_price,
                        'retailer_price' => $product->retailer_price,
                    ];

                    // Calculate new selling price based on product's gain settings
                    $newSellingPrice = $product->calculateSellingPrice($newCostPrice);

                    $product->update([
                        'cost_price' => $newCostPrice,
                        'selling_price' => round($newSellingPrice, 2),
                    ]);

                    $newPrices = [
                        'cost_price' => $newCostPrice,
                        'selling_price' => round($newSellingPrice, 2),
                        'wholesale_price' => $product->wholesale_price,
                        'retailer_price' => $product->retailer_price,
                    ];

                    // Record price history if cost or selling price changed
                    if ($oldPrices['cost_price'] != $newCostPrice || $oldPrices['selling_price'] != $newSellingPrice) {
                        $this->priceHistoryService->recordPriceChange(
                            $product,
                            $oldPrices,
                            $newPrices,
                            'goods_receipt',
                            "Prices auto-updated from goods receipt: {$grn->grn_number}",
                            'goods_received_note',
                            $grn->id,
                            $store->id
                        );
                    }
                }
            }

            // Update PO status if fully received
            $allReceived = $purchaseOrder->items->every(function ($item) {
                return $item->quantity_received >= $item->quantity_ordered;
            });

            if ($allReceived) {
                $purchaseOrder->update(['status' => 'completed']);
            } else {
                $purchaseOrder->update(['status' => 'partially_received']);
            }

            AuditLog::log('received', $grn, null, $grn->toArray(), 'Goods received');

            DB::commit();

            return response()->json([
                'message' => 'Goods received successfully',
                'grn' => $grn->load(['purchaseOrder', 'store', 'items.product']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to receive goods',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

