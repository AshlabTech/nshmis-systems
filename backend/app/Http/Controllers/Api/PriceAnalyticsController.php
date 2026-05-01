<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductPriceHistory;
use App\Services\PriceHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PriceAnalyticsController extends Controller
{
    protected $priceHistoryService;

    public function __construct(PriceHistoryService $priceHistoryService)
    {
        $this->priceHistoryService = $priceHistoryService;
    }

    /**
     * Get price history for a specific product
     */
    public function productPriceHistory(Request $request, Product $product)
    {
        $validated = $request->validate([
            'variant_id' => 'nullable|exists:product_variants,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $history = $this->priceHistoryService->getPriceHistory(
            $product->id,
            $validated['variant_id'] ?? null,
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null
        );

        return response()->json([
            'product' => $product->load(['category', 'unit']),
            'history' => $history,
        ]);
    }

    /**
     * Get profit margin trends for a product
     */
    public function profitMarginTrends(Request $request, Product $product)
    {
        $validated = $request->validate([
            'variant_id' => 'nullable|exists:product_variants,id',
            'period' => 'nullable|in:7days,30days,90days,6months,1year',
        ]);

        $trends = $this->priceHistoryService->getProfitMarginTrends(
            $product->id,
            $validated['variant_id'] ?? null,
            $validated['period'] ?? '30days'
        );

        $currentMargin = $this->priceHistoryService->getCurrentProfitMargin($product);

        return response()->json([
            'product' => $product->only(['id', 'name', 'sku']),
            'current_margin' => $currentMargin,
            'trends' => $trends,
        ]);
    }

    /**
     * Get overall profit margin analytics across all products
     */
    public function overallAnalytics(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:product_categories,id',
            'period' => 'nullable|in:7days,30days,90days,6months,1year',
        ]);

        $period = $validated['period'] ?? '30days';
        $startDate = match($period) {
            '7days' => now()->subDays(7),
            '30days' => now()->subDays(30),
            '90days' => now()->subDays(90),
            '6months' => now()->subMonths(6),
            '1year' => now()->subYear(),
            default => now()->subDays(30),
        };

        // Get products query
        $productsQuery = Product::where('is_active', true);
        
        if (isset($validated['category_id'])) {
            $productsQuery->where('category_id', $validated['category_id']);
        }

        $products = $productsQuery->get();

        // Calculate current margins for all products
        $profitableCount = 0;
        $lossCount = 0;
        $totalMargin = 0;
        $productMargins = [];

        foreach ($products as $product) {
            $margin = $this->priceHistoryService->getCurrentProfitMargin($product);
            
            if ($margin['is_profitable']) {
                $profitableCount++;
            } elseif ($margin['is_loss']) {
                $lossCount++;
            }

            $totalMargin += $margin['profit_margin'];
            
            $productMargins[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'cost_price' => $margin['cost_price'],
                'selling_price' => $margin['selling_price'],
                'profit_margin' => $margin['profit_margin'],
                'profit_amount' => $margin['profit_amount'],
                'is_profitable' => $margin['is_profitable'],
                'is_loss' => $margin['is_loss'],
            ];
        }

        // Sort by profit margin
        usort($productMargins, fn($a, $b) => $b['profit_margin'] <=> $a['profit_margin']);

        // Get price change trends over period
        $priceChanges = ProductPriceHistory::where('changed_at', '>=', $startDate)
            ->select(
                DB::raw('DATE(changed_at) as date'),
                DB::raw('COUNT(*) as changes_count'),
                DB::raw('AVG(new_profit_margin) as avg_margin')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();

        return response()->json([
            'summary' => [
                'total_products' => $products->count(),
                'profitable_count' => $profitableCount,
                'loss_count' => $lossCount,
                'average_margin' => $products->count() > 0 ? round($totalMargin / $products->count(), 2) : 0,
            ],
            'top_performers' => array_slice($productMargins, 0, 10),
            'worst_performers' => array_slice(array_reverse($productMargins), 0, 10),
            'price_change_trends' => $priceChanges,
        ]);
    }

    /**
     * Get products with low or negative margins
     */
    public function lowMarginProducts(Request $request)
    {
        $validated = $request->validate([
            'threshold' => 'nullable|numeric|min:0|max:100',
        ]);

        $threshold = $validated['threshold'] ?? 20; // Default 20% margin

        $products = Product::where('is_active', true)
            ->get()
            ->map(function ($product) {
                $margin = $this->priceHistoryService->getCurrentProfitMargin($product);
                return array_merge(['product' => $product->only(['id', 'name', 'sku'])], $margin);
            })
            ->filter(fn($item) => $item['profit_margin'] < $threshold)
            ->sortBy('profit_margin')
            ->values();

        return response()->json([
            'threshold' => $threshold,
            'count' => $products->count(),
            'products' => $products,
        ]);
    }
}

