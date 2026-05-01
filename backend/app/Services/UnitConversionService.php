<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Unit;
use App\Models\ProductUnit;

class UnitConversionService
{
    /**
     * Convert quantity from one unit to product's base unit
     * 
     * @param Product $product
     * @param float $quantity
     * @param int|null $fromUnitId - If null, uses product's default unit
     * @return float Quantity in base unit
     */
    public function toBaseUnit(Product $product, float $quantity, ?int $fromUnitId = null): float
    {
        // If no unit specified, use product's default unit
        if (!$fromUnitId) {
            $fromUnitId = $product->unit_id;
        }

        // If it's already the base unit, return as is
        if ($fromUnitId == $product->unit_id) {
            return $quantity;
        }

        // Check if this product has a custom conversion for this unit
        $productUnit = ProductUnit::where('product_id', $product->id)
            ->where('unit_id', $fromUnitId)
            ->first();

        if ($productUnit) {
            // Use product-specific conversion factor
            return $quantity * $productUnit->conversion_factor;
        }

        // Fall back to global unit conversion
        $fromUnit = Unit::find($fromUnitId);
        $baseUnit = Unit::find($product->unit_id);

        if (!$fromUnit || !$baseUnit) {
            throw new \Exception("Invalid unit configuration for product: {$product->name}");
        }

        // If units are in the same family (have same base_unit_id)
        if ($fromUnit->base_unit_id && $fromUnit->base_unit_id == $baseUnit->id) {
            return $quantity * $fromUnit->conversion_factor;
        }

        if ($baseUnit->base_unit_id && $baseUnit->base_unit_id == $fromUnit->id) {
            return $quantity / $baseUnit->conversion_factor;
        }

        // If both have the same base unit
        if ($fromUnit->base_unit_id && $fromUnit->base_unit_id == $baseUnit->base_unit_id) {
            $inCommonBase = $quantity * $fromUnit->conversion_factor;
            return $inCommonBase / $baseUnit->conversion_factor;
        }

        throw new \Exception("Cannot convert between incompatible units: {$fromUnit->name} to {$baseUnit->name}");
    }

    /**
     * Convert quantity from base unit to another unit
     */
    public function fromBaseUnit(Product $product, float $baseQuantity, int $toUnitId): float
    {
        if ($toUnitId == $product->unit_id) {
            return $baseQuantity;
        }

        $productUnit = ProductUnit::where('product_id', $product->id)
            ->where('unit_id', $toUnitId)
            ->first();

        if ($productUnit) {
            return $baseQuantity / $productUnit->conversion_factor;
        }

        $toUnit = Unit::find($toUnitId);
        if (!$toUnit) {
            throw new \Exception("Invalid target unit");
        }

        if ($toUnit->base_unit_id == $product->unit_id) {
            return $baseQuantity / $toUnit->conversion_factor;
        }

        throw new \Exception("Cannot convert to incompatible unit");
    }

    /**
     * Get all available units for a product
     */
    public function getProductUnits(Product $product, string $type = 'all'): array
    {
        $query = ProductUnit::where('product_id', $product->id)
            ->with('unit');

        if ($type === 'purchase') {
            $query->where('is_purchase_unit', true);
        } elseif ($type === 'sale') {
            $query->where('is_sale_unit', true);
        }

        $productUnits = $query->get();

        // Always include the product's base unit
        $baseUnit = $product->unit;
        $units = [[
            'id' => $baseUnit->id,
            'unit_id' => $baseUnit->id,  // For consistency with product units
            'name' => $baseUnit->name,
            'short_name' => $baseUnit->short_name,
            'conversion_factor' => 1,
            'is_default' => true,
            'cost_price' => null,
            'selling_price' => null,
        ]];

        foreach ($productUnits as $pu) {
            $units[] = [
                'id' => $pu->unit->id,  // Use unit ID for dropdown value
                'unit_id' => $pu->unit->id,
                'product_unit_id' => $pu->id,  // ProductUnit ID for editing
                'unit' => [
                    'id' => $pu->unit->id,
                    'name' => $pu->unit->name,
                    'short_name' => $pu->unit->short_name,
                ],
                'name' => $pu->unit->name,
                'short_name' => $pu->unit->short_name,
                'conversion_factor' => $pu->conversion_factor,
                'selling_price' => $pu->selling_price,
                'cost_price' => $pu->cost_price,
                'is_purchase_unit' => $pu->is_purchase_unit,
                'is_sale_unit' => $pu->is_sale_unit,
                'is_default' => $pu->is_default,
            ];
        }

        return $units;
    }

    /**
     * Calculate unit price based on base price and conversion
     */
    public function calculateUnitPrice(float $basePrice, float $conversionFactor): float
    {
        return $basePrice * $conversionFactor;
    }

    /**
     * Format quantity with unit
     */
    public function formatQuantity(float $quantity, Unit $unit): string
    {
        return number_format($quantity, 2) . ' ' . $unit->short_name;
    }
}

