<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Store;
use App\Models\StockLedger;
use Illuminate\Support\Facades\DB;

class StockService
{
    protected $unitConversionService;

    public function __construct(UnitConversionService $unitConversionService)
    {
        $this->unitConversionService = $unitConversionService;
    }

    /**
     * Record a stock transaction in the ledger
     *
     * @param float $quantity - Quantity in the specified unit
     * @param int|null $unitId - Unit of the quantity (if null, uses product's base unit)
     */
    public function recordTransaction(
        Store $store,
        Product $product,
        string $transactionType,
        float $quantity,
        float $unitCost,
        ?int $variantId = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?string $notes = null,
        ?int $userId = null,
        ?int $unitId = null
    ): StockLedger {
        return DB::transaction(function () use (
            $store,
            $product,
            $transactionType,
            $quantity,
            $unitCost,
            $variantId,
            $referenceType,
            $referenceId,
            $notes,
            $userId,
            $unitId
        ) {
            // Convert quantity to base unit
            $baseQuantity = $quantity;
            if ($unitId && $unitId != $product->unit_id) {
                $baseQuantity = $this->unitConversionService->toBaseUnit($product, $quantity, $unitId);
            }

            // Get current balance (always in base unit)
            $lastEntry = StockLedger::forStore($store->id)
                ->forProduct($product->id, $variantId)
                ->latest('id')
                ->first();

            $currentBalance = $lastEntry ? $lastEntry->balance_quantity : 0;
            $currentValue = $lastEntry ? $lastEntry->balance_value : 0;

            // Calculate new balance based on transaction type (using base quantity)
            $isIncrease = in_array($transactionType, ['receipt', 'transfer_in', 'adjustment_in', 'return']);
            $newBalance = $isIncrease
                ? $currentBalance + $baseQuantity
                : $currentBalance - $baseQuantity;

            // Calculate new value based on valuation method
            $newValue = $this->calculateStockValue(
                $product,
                $currentBalance,
                $currentValue,
                $baseQuantity,
                $unitCost,
                $isIncrease
            );

            // Create ledger entry
            return StockLedger::create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'product_variant_id' => $variantId,
                'unit_id' => $unitId,
                'transaction_type' => $transactionType,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'quantity' => $isIncrease ? $quantity : -$quantity, // Original quantity in original unit
                'base_quantity_change' => $isIncrease ? $baseQuantity : -$baseQuantity, // Converted to base unit
                'unit_cost' => $unitCost,
                'balance_quantity' => $newBalance, // Always in base unit
                'balance_value' => $newValue,
                'notes' => $notes,
                'created_by' => $userId ?? auth()?->id(),
                'transaction_date' => now(),
            ]);
        });
    }

    /**
     * Calculate stock value based on valuation method
     */
    protected function calculateStockValue(
        Product $product,
        float $currentBalance,
        float $currentValue,
        float $quantity,
        float $unitCost,
        bool $isIncrease
    ): float {
        if ($isIncrease) {
            // Adding stock
            return $currentValue + ($quantity * $unitCost);
        } else {
            // Removing stock
            if ($product->valuation_method === 'weighted_average') {
                $avgCost = $currentBalance > 0 ? $currentValue / $currentBalance : 0;
                return $currentValue - ($quantity * $avgCost);
            } else {
                // FIFO - simplified (would need more complex tracking in production)
                return $currentValue - ($quantity * $unitCost);
            }
        }
    }

    /**
     * Get current stock balance for a product in a store
     */
    public function getStockBalance(Store $store, Product $product, ?int $variantId = null): array
    {
        $lastEntry = StockLedger::forStore($store->id)
            ->forProduct($product->id, $variantId)
            ->latest('id')
            ->first();

        if (!$lastEntry) {
            return [
                'quantity' => 0,
                'value' => 0,
                'average_cost' => 0,
            ];
        }

        $avgCost = $lastEntry->balance_quantity > 0 
            ? $lastEntry->balance_value / $lastEntry->balance_quantity 
            : 0;

        return [
            'quantity' => $lastEntry->balance_quantity,
            'value' => $lastEntry->balance_value,
            'average_cost' => $avgCost,
        ];
    }

    /**
     * Check if sufficient stock is available
     *
     * @param float $requiredQuantity - Quantity in the specified unit
     * @param int|null $unitId - Unit of the required quantity (if null, uses product's base unit)
     */
    public function hasAvailableStock(
        Store $store,
        Product $product,
        float $requiredQuantity,
        ?int $variantId = null,
        ?int $unitId = null
    ): bool {
        // Convert required quantity to base unit
        $baseQuantityRequired = $requiredQuantity;
        if ($unitId && $unitId != $product->unit_id) {
            $baseQuantityRequired = $this->unitConversionService->toBaseUnit($product, $requiredQuantity, $unitId);
        }

        $balance = $this->getStockBalance($store, $product, $variantId);
        return $balance['quantity'] >= $baseQuantityRequired;
    }

    /**
     * Get products below reorder level for a store
     */
    public function getLowStockProducts(Store $store): array
    {
        $products = Product::active()->where('track_inventory', true)->get();
        $lowStock = [];

        foreach ($products as $product) {
            $balance = $this->getStockBalance($store, $product);
            
            if ($balance['quantity'] <= $product->reorder_level) {
                $lowStock[] = [
                    'product' => $product,
                    'current_stock' => $balance['quantity'],
                    'reorder_level' => $product->reorder_level,
                    'reorder_quantity' => $product->reorder_quantity,
                ];
            }
        }

        return $lowStock;
    }
}

