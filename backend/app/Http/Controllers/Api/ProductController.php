<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Models\Product;
use App\Models\AuditLog;
use App\Services\PriceHistoryService;
use Illuminate\Http\Request;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;

class ProductController extends Controller
{
    use AuthorizesRequests;

    protected $priceHistoryService;

    public function __construct(PriceHistoryService $priceHistoryService)
    {
        $this->priceHistoryService = $priceHistoryService;
    }
    public function index(Request $request)
    {
        $query = Product::with(['category', 'unit', 'variants']);

        // Search
        if ($request->has('search')) {
            $query->search($request->search);
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by barcode
        if ($request->has('barcode')) {
            $query->where('barcode', $request->barcode);
        }

        $perPage = $request->get('per_page', 15);
        $products = $query->latest()->paginate($perPage);

        return response()->json($products);
    }

    public function store(StoreProductRequest $request)
    {
        $validated = $request->validated();

        // Auto-generate SKU if not provided
        if (empty($validated['sku'])) {
            $validated['sku'] = Product::generateSku();
        }

        $product = Product::create($validated);

        AuditLog::log('created', $product, null, $product->toArray(), 'Product created');

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $product->load(['category', 'unit']),
        ], 201);
    }

    public function show(Product $product)
    {
        $product->load(['category', 'unit', 'variants', 'customerPricing']);

        return response()->json($product);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $validated = $request->validated();

        $oldValues = $product->toArray();

        // Check if prices changed
        $priceChanged = isset($validated['cost_price']) && $validated['cost_price'] != $product->cost_price
            || isset($validated['selling_price']) && $validated['selling_price'] != $product->selling_price
            || isset($validated['wholesale_price']) && $validated['wholesale_price'] != $product->wholesale_price
            || isset($validated['retailer_price']) && $validated['retailer_price'] != $product->retailer_price;

        $product->update($validated);

        // Record price history if prices changed
        if ($priceChanged) {
            $oldPrices = [
                'cost_price' => $oldValues['cost_price'],
                'selling_price' => $oldValues['selling_price'],
                'wholesale_price' => $oldValues['wholesale_price'] ?? null,
                'retailer_price' => $oldValues['retailer_price'] ?? null,
            ];

            $newPrices = [
                'cost_price' => $product->cost_price,
                'selling_price' => $product->selling_price,
                'wholesale_price' => $product->wholesale_price,
                'retailer_price' => $product->retailer_price,
            ];

            $this->priceHistoryService->recordPriceChange(
                $product,
                $oldPrices,
                $newPrices,
                'manual_update',
                'Product prices manually updated'
            );
        }

        AuditLog::log('updated', $product, $oldValues, $product->toArray(), 'Product updated');

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product->load(['category', 'unit']),
        ]);
    }

    public function destroy(Product $product)
    {
        $this->authorize('delete', $product);

        $oldValues = $product->toArray();
        $product->delete();

        AuditLog::log('deleted', $product, $oldValues, null, 'Product deleted');

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    public function barcodeSearch(Request $request)
    {
        $request->validate([
            'barcode' => 'required|string',
        ]);

        $product = Product::where('barcode', $request->barcode)
            ->with(['category', 'unit', 'variants'])
            ->first();

        if (!$product) {
            return response()->json([
                'message' => 'Product not found',
            ], 404);
        }

        return response()->json($product);
    }
}

