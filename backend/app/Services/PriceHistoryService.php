<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductPriceHistory;
use App\Models\Store;

class PriceHistoryService
{
    /**
     * Record price change for a product
     */
    public function recordPriceChange(
        Product $product,
        array $oldPrices,
        array $newPrices,
        string $changeType = 'manual_update',
        ?string $changeReason = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $storeId = null,
        ?int $variantId = null,
        ?int $userId = null
    ): ProductPriceHistory {
        // Calculate profit margins
        $oldProfitMargin = isset($oldPrices['cost_price'], $oldPrices['selling_price'])
            ? ProductPriceHistory::calculateProfitMargin($oldPrices['cost_price'], $oldPrices['selling_price'])
            : null;

        $newProfitMargin = ProductPriceHistory::calculateProfitMargin(
            $newPrices['cost_price'],
            $newPrices['selling_price']
        );

        $oldProfitAmount = isset($oldPrices['cost_price'], $oldPrices['selling_price'])
            ? ProductPriceHistory::calculateProfitAmount($oldPrices['cost_price'], $oldPrices['selling_price'])
            : null;

        $newProfitAmount = ProductPriceHistory::calculateProfitAmount(
            $newPrices['cost_price'],
            $newPrices['selling_price']
        );

        return ProductPriceHistory::create([
            'product_id' => $product->id,
            'product_variant_id' => $variantId,
            'store_id' => $storeId,
            'old_cost_price' => $oldPrices['cost_price'] ?? null,
            'new_cost_price' => $newPrices['cost_price'],
            'old_selling_price' => $oldPrices['selling_price'] ?? null,
            'new_selling_price' => $newPrices['selling_price'],
            'old_wholesale_price' => $oldPrices['wholesale_price'] ?? null,
            'new_wholesale_price' => $newPrices['wholesale_price'] ?? null,
            'old_retailer_price' => $oldPrices['retailer_price'] ?? null,
            'new_retailer_price' => $newPrices['retailer_price'] ?? null,
            'old_profit_margin' => $oldProfitMargin,
            'new_profit_margin' => $newProfitMargin,
            'old_profit_amount' => $oldProfitAmount,
            'new_profit_amount' => $newProfitAmount,
            'change_type' => $changeType,
            'change_reason' => $changeReason,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'changed_by' => $userId ?? auth()->id(),
            'changed_at' => now(),
        ]);
    }

    /**
     * Get price history for a product
     */
    public function getPriceHistory(
        int $productId,
        ?int $variantId = null,
        ?string $startDate = null,
        ?string $endDate = null
    ): \Illuminate\Database\Eloquent\Collection {
        $query = ProductPriceHistory::forProduct($productId, $variantId)
            ->with(['changedBy:id,name', 'store:id,name'])
            ->orderBy('changed_at', 'desc');

        if ($startDate && $endDate) {
            $query->dateRange($startDate, $endDate);
        }

        return $query->get();
    }

    /**
     * Get profit margin trends over time
     */
    public function getProfitMarginTrends(
        int $productId,
        ?int $variantId = null,
        string $period = '30days'
    ): array {
        $startDate = match($period) {
            '7days' => now()->subDays(7),
            '30days' => now()->subDays(30),
            '90days' => now()->subDays(90),
            '6months' => now()->subMonths(6),
            '1year' => now()->subYear(),
            default => now()->subDays(30),
        };

        $history = ProductPriceHistory::forProduct($productId, $variantId)
            ->where('changed_at', '>=', $startDate)
            ->orderBy('changed_at', 'asc')
            ->get();

        return [
            'labels' => $history->pluck('changed_at')->map(fn($date) => $date->format('Y-m-d H:i'))->toArray(),
            'cost_prices' => $history->pluck('new_cost_price')->toArray(),
            'selling_prices' => $history->pluck('new_selling_price')->toArray(),
            'profit_margins' => $history->pluck('new_profit_margin')->toArray(),
            'profit_amounts' => $history->pluck('new_profit_amount')->toArray(),
        ];
    }

    /**
     * Get current profit margin for a product
     */
    public function getCurrentProfitMargin(Product $product, ?ProductVariant $variant = null): array
    {
        $costPrice = $variant ? $variant->cost_price : $product->cost_price;
        $sellingPrice = $variant ? $variant->selling_price : $product->selling_price;

        $profitAmount = ProductPriceHistory::calculateProfitAmount($costPrice, $sellingPrice);
        $profitMargin = ProductPriceHistory::calculateProfitMargin($costPrice, $sellingPrice);

        return [
            'cost_price' => $costPrice,
            'selling_price' => $sellingPrice,
            'profit_amount' => $profitAmount,
            'profit_margin' => $profitMargin,
            'is_profitable' => $profitAmount > 0,
            'is_loss' => $profitAmount < 0,
        ];
    }

    /**
     * Check if price change should be recorded
     */
    public function shouldRecordChange(array $oldPrices, array $newPrices): bool
    {
        return $oldPrices['cost_price'] != $newPrices['cost_price']
            || $oldPrices['selling_price'] != $newPrices['selling_price']
            || ($oldPrices['wholesale_price'] ?? null) != ($newPrices['wholesale_price'] ?? null)
            || ($oldPrices['retailer_price'] ?? null) != ($newPrices['retailer_price'] ?? null);
    }
}

