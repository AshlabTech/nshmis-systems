<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Services\UnitConversionService;
use Illuminate\Http\Request;

class ProductUnitController extends Controller
{
    protected $unitConversionService;

    public function __construct(UnitConversionService $unitConversionService)
    {
        $this->unitConversionService = $unitConversionService;
    }

    /**
     * Get all available units for a product
     */
    public function index(Request $request, Product $product)
    {
        $type = $request->get('type', 'all'); // 'all', 'purchase', 'sale'
        $units = $this->unitConversionService->getProductUnits($product, $type);
        
        return response()->json($units);
    }

    /**
     * Add a unit to a product
     */
    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'unit_id' => 'required|exists:units,id',
            'conversion_factor' => 'required|numeric|min:0.0001',
            'selling_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'is_purchase_unit' => 'boolean',
            'is_sale_unit' => 'boolean',
            'is_default' => 'boolean',
        ]);

        $productUnit = ProductUnit::updateOrCreate(
            [
                'product_id' => $product->id,
                'unit_id' => $validated['unit_id'],
            ],
            $validated
        );

        return response()->json([
            'message' => 'Product unit added successfully',
            'data' => $productUnit->load('unit'),
        ], 201);
    }

    /**
     * Update a product unit
     */
    public function update(Request $request, Product $product, ProductUnit $productUnit)
    {
        $validated = $request->validate([
            'conversion_factor' => 'nullable|numeric|min:0.0001',
            'selling_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'is_purchase_unit' => 'boolean',
            'is_sale_unit' => 'boolean',
            'is_default' => 'boolean',
        ]);

        $productUnit->update($validated);

        return response()->json([
            'message' => 'Product unit updated successfully',
            'data' => $productUnit->load('unit'),
        ]);
    }

    /**
     * Remove a unit from a product
     */
    public function destroy(Product $product, ProductUnit $productUnit)
    {
        $productUnit->delete();

        return response()->json([
            'message' => 'Product unit removed successfully',
        ]);
    }

    /**
     * Convert quantity between units
     */
    public function convert(Request $request, Product $product)
    {
        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0',
            'from_unit_id' => 'required|exists:units,id',
            'to_unit_id' => 'required|exists:units,id',
        ]);

        try {
            // Convert to base unit first
            $baseQuantity = $this->unitConversionService->toBaseUnit(
                $product,
                $validated['quantity'],
                $validated['from_unit_id']
            );

            // Then convert to target unit
            $targetQuantity = $this->unitConversionService->fromBaseUnit(
                $product,
                $baseQuantity,
                $validated['to_unit_id']
            );

            return response()->json([
                'from_quantity' => $validated['quantity'],
                'from_unit_id' => $validated['from_unit_id'],
                'to_quantity' => round($targetQuantity, 3),
                'to_unit_id' => $validated['to_unit_id'],
                'base_quantity' => round($baseQuantity, 3),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get unit price based on conversion
     */
    public function getUnitPrice(Request $request, Product $product)
    {
        $validated = $request->validate([
            'unit_id' => 'required|exists:units,id',
            'price_type' => 'required|in:selling,cost,wholesale,retailer',
        ]);

        $productUnit = ProductUnit::where('product_id', $product->id)
            ->where('unit_id', $validated['unit_id'])
            ->first();

        if ($productUnit) {
            $price = $validated['price_type'] === 'selling' 
                ? $productUnit->selling_price 
                : $productUnit->cost_price;
            
            if ($price) {
                return response()->json(['price' => $price]);
            }
        }

        // Calculate based on base price and conversion
        $basePrice = match($validated['price_type']) {
            'selling' => $product->selling_price,
            'cost' => $product->cost_price,
            'wholesale' => $product->wholesale_price,
            'retailer' => $product->retailer_price,
        };

        $baseQuantity = $this->unitConversionService->toBaseUnit($product, 1, $validated['unit_id']);
        $unitPrice = $basePrice * $baseQuantity;

        return response()->json(['price' => round($unitPrice, 2)]);
    }
}
