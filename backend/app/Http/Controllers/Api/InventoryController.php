<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Store;
use App\Models\Product;
use App\Models\StockLedger;
use App\Models\StockTransfer;
use App\Models\StockAdjustment;
use App\Models\AuditLog;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    use AuthorizesRequests;
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function stockLevels(Request $request)
    {
        // Get the latest stock ledger entry for each product in each store
        $subquery = StockLedger::select('store_id', 'product_id', 'product_variant_id', DB::raw('MAX(id) as max_id'))
            ->groupBy('store_id', 'product_id', 'product_variant_id');

        // Filter by accessible stores for non-super admins
        if (!$request->user()->isSuperAdmin()) {
            $accessibleStoreIds = $request->user()->getAccessibleStoreIds();
            if (empty($accessibleStoreIds)) {
                return response()->json([]);
            }
            $subquery->whereIn('store_id', $accessibleStoreIds);
        }

        if ($request->filled('store_id')) {
            $subquery->where('store_id', $request->store_id);
        }

        if ($request->filled('branch_id')) {
            $subquery->whereHas('store', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        // Get the IDs of the latest entries
        $latestIds = $subquery->pluck('max_id');

        // Get the full stock ledger entries with product details
        $query = StockLedger::with(['product.unit', 'variant'])
            ->whereIn('id', $latestIds);

        $stockLevels = $query->get()->map(function ($ledger) {
            $product = $ledger->product;
            $variant = $ledger->variant;

            return [
                'id' => $ledger->id,
                'product_id' => $ledger->product_id,
                'product_name' => $variant ? "{$product->name} ({$variant->name})" : $product->name,
                'sku' => $variant ? $variant->sku : $product->sku,
                'current_quantity' => $ledger->balance_quantity,
                'unit' => $product->unit,
                'reorder_level' => $product->reorder_level ?? 0,
                'reorder_quantity' => $product->reorder_quantity ?? 0,
                'average_cost' => $ledger->balance_quantity > 0
                    ? round($ledger->balance_value / $ledger->balance_quantity, 2)
                    : 0,
                'stock_value' => $ledger->balance_value,
                'last_updated' => $ledger->created_at,
            ];
        });

        // Apply search filter if provided
        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $stockLevels = $stockLevels->filter(function ($item) use ($search) {
                return str_contains(strtolower($item['product_name']), $search) ||
                       str_contains(strtolower($item['sku']), $search);
            });
        }

        // Apply category filter if provided
        if ($request->filled('category_id')) {
            $stockLevels = $stockLevels->filter(function ($item) use ($request) {
                $product = \App\Models\Product::find($item['product_id']);
                return $product && $product->category_id == $request->category_id;
            });
        }

        return response()->json($stockLevels->values());
    }

    public function stockLedger(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
        ]);

        $query = StockLedger::with(['store', 'product', 'variant', 'createdBy'])
            ->where('store_id', $request->store_id);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        $perPage = $request->get('per_page', 50);
        $ledger = $query->latest()->paginate($perPage);

        return response()->json($ledger);
    }

    public function lowStockAlert(Request $request)
    {
        $storeId = $request->get('store_id');
        
        if (!$storeId) {
            return response()->json([
                'message' => 'Store ID is required',
            ], 400);
        }

        $store = Store::findOrFail($storeId);
        $lowStockProducts = $this->stockService->getLowStockProducts($store);

        return response()->json($lowStockProducts);
    }

    public function stockBalance(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
        ]);

        $store = Store::findOrFail($request->store_id);
        $product = Product::findOrFail($request->product_id);

        $balance = $this->stockService->getStockBalance(
            $store,
            $product,
            $request->variant_id
        );

        return response()->json($balance);
    }

    public function getTransfers(Request $request)
    {
        $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'status' => 'nullable|in:pending,approved,completed,cancelled',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = StockTransfer::with(['fromStore', 'toStore', 'initiatedBy']);

        // Filter by store (either from or to)
        if ($request->filled('store_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('from_store_id', $request->store_id)
                  ->orWhere('to_store_id', $request->store_id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transfer_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transfer_date', '<=', $request->date_to);
        }

        // Access control
        if (!$request->user()->isSuperAdmin()) {
            if ($request->user()->store_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('from_store_id', $request->user()->store_id)
                      ->orWhere('to_store_id', $request->user()->store_id);
                });
            }
        }

        $perPage = $request->get('per_page', 20);
        $transfers = $query->latest('transfer_date')->paginate($perPage);

        return response()->json($transfers);
    }

    public function getTransferDetails(StockTransfer $stockTransfer)
    {
        $this->authorize('view', $stockTransfer);

        // Get transfer items from stock ledger
        $transferItems = StockLedger::where('reference_type', 'stock_transfer')
            ->where('reference_id', $stockTransfer->id)
            ->where('transaction_type', 'transfer_out')
            ->with(['product', 'product.unit'])
            ->get()
            ->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'product_sku' => $item->product->sku,
                    'quantity' => abs($item->quantity),
                    'unit_name' => $item->product->unit->name ?? 'N/A',
                    'unit_cost' => $item->unit_cost,
                    'line_total' => abs($item->quantity) * $item->unit_cost,
                ];
            });

        $transfer = $stockTransfer->load(['fromStore', 'toStore', 'initiatedBy', 'approvedBy', 'receivedBy']);

        return response()->json([
            'transfer' => $transfer,
            'items' => $transferItems,
        ]);
    }

    public function createTransfer(Request $request)
    {
        $this->authorize('create', StockTransfer::class);

        $validated = $request->validate([
            'from_store_id' => 'required|exists:stores,id',
            'to_store_id' => 'required|exists:stores,id|different:from_store_id',
            'transfer_date' => 'nullable|date',
            'product_id' => 'required_without:items|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required_without:items|numeric|min:0.01',
            'unit_cost' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|exists:products,id',
            'items.*.product_variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required_with:items|numeric|min:0.01',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Convert single item to items array format
        if (!isset($validated['items']) && isset($validated['product_id'])) {
            $validated['items'] = [[
                'product_id' => $validated['product_id'],
                'product_variant_id' => $validated['product_variant_id'] ?? null,
                'quantity' => $validated['quantity'],
                'unit_cost' => $validated['unit_cost'] ?? 0,
            ]];
        }

        DB::beginTransaction();
        try {
            $fromStore = Store::findOrFail($validated['from_store_id']);
            $toStore = Store::findOrFail($validated['to_store_id']);

            // Check stock availability
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                
                if (!$this->stockService->hasAvailableStock(
                    $fromStore,
                    $product,
                    $item['quantity'],
                    $item['product_variant_id'] ?? null
                )) {
                    throw new \Exception("Insufficient stock for product: {$product->name}");
                }
            }

            // Create transfer record
            $transfer = StockTransfer::create([
                'from_store_id' => $validated['from_store_id'],
                'to_store_id' => $validated['to_store_id'],
                'transfer_date' => $validated['transfer_date'] ?? now(),
                'transfer_number' => 'TR-' . now()->format('YmdHis') . '-' . rand(1000, 9999),
                'status' => 'pending',
                'notes' => $validated['notes'] ?? null,
                'initiated_by' => $request->user()->id,
            ]);

            // Create transfer items and stock ledger entries
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Use product cost price if unit_cost not provided
                $unitCost = $item['unit_cost'] ?? $product->cost_price ?? 0;

                // Deduct from source store
                $this->stockService->recordTransaction(
                    $fromStore,
                    $product,
                    'transfer_out',
                    $item['quantity'],
                    $unitCost,
                    $item['product_variant_id'] ?? null,
                    'stock_transfer',
                    $transfer->id,
                    "Transfer to {$toStore->name}"
                );
            }

            AuditLog::log('created', $transfer, null, $transfer->toArray(), 'Stock transfer created');

            DB::commit();

            return response()->json([
                'message' => 'Stock transfer created successfully',
                'transfer' => $transfer->load(['fromStore', 'toStore']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create stock transfer',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function approveTransfer(Request $request, StockTransfer $stockTransfer)
    {
        $this->authorize('approve', $stockTransfer);

        if ($stockTransfer->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending stock transfers can be approved',
            ], 400);
        }

        DB::beginTransaction();
        try {
            $oldStatus = $stockTransfer->status;

            $stockTransfer->update([
                'status' => 'in_transit',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            AuditLog::log(
                'approved',
                $stockTransfer,
                ['status' => $oldStatus],
                ['status' => 'in_transit'],
                'Stock transfer approved and marked as in transit'
            );

            DB::commit();

            return response()->json([
                'message' => 'Stock transfer approved successfully',
                'transfer' => $stockTransfer->fresh(['fromStore', 'toStore', 'initiatedBy', 'approvedBy']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to approve stock transfer',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function receiveTransfer(Request $request, StockTransfer $stockTransfer)
    {
        if (!$request->user()->hasPermissionTo('receive_stock_transfers')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($stockTransfer->status, ['approved', 'in_transit'])) {
            return response()->json([
                'message' => 'Only approved or in-transit stock transfers can be received',
            ], 400);
        }

        $validated = $request->validate([
            'received_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $toStore = $stockTransfer->toStore;

            // Get transfer items from stock ledger
            $transferItems = StockLedger::where('reference_type', 'stock_transfer')
                ->where('reference_id', $stockTransfer->id)
                ->where('transaction_type', 'transfer_out')
                ->get();

            // Add stock to destination store
            foreach ($transferItems as $ledgerItem) {
                $this->stockService->recordTransaction(
                    $toStore,
                    $ledgerItem->product,
                    'transfer_in',
                    abs($ledgerItem->quantity),
                    $ledgerItem->unit_cost,
                    $ledgerItem->product_variant_id,
                    'stock_transfer',
                    $stockTransfer->id,
                    "Transfer from {$stockTransfer->fromStore->name}"
                );
            }

            $oldStatus = $stockTransfer->status;

            $stockTransfer->update([
                'status' => 'received',
                'received_by' => $request->user()->id,
                'actual_receipt_date' => $validated['received_date'] ?? now(),
                'notes' => $validated['notes'] ?? $stockTransfer->notes,
            ]);

            AuditLog::log(
                'received',
                $stockTransfer,
                ['status' => $oldStatus],
                ['status' => 'received'],
                'Stock transfer received'
            );

            DB::commit();

            return response()->json([
                'message' => 'Stock transfer received successfully',
                'transfer' => $stockTransfer->fresh(['fromStore', 'toStore', 'initiatedBy', 'approvedBy', 'receivedBy']),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to receive stock transfer',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}

