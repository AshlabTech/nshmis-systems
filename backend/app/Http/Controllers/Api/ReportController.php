<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\StockLedger;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Order;
use App\Models\PurchaseOrder;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Sales Report
     */
    public function salesReport(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'branch_id' => 'nullable|exists:branches,id',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'sale_type' => 'nullable|in:pos,order,invoice',
            'group_by' => 'nullable|in:day,week,month,product,customer,cashier',
        ]);

        $dateFrom = Carbon::parse($validated['date_from'])->startOfDay();
        $dateTo = Carbon::parse($validated['date_to'])->endOfDay();

        $query = Sale::with(['customer', 'store', 'items.product', 'createdBy'])
            ->whereBetween('sale_date', [$dateFrom, $dateTo]);

        // Apply filters
        if (!empty($validated['store_id'])) {
            $query->where('store_id', $validated['store_id']);
        }

        if (!empty($validated['branch_id'])) {
            $query->whereHas('store', fn($q) => $q->where('branch_id', $validated['branch_id']));
        }

        if (!empty($validated['sale_type'])) {
            $query->where('sale_type', $validated['sale_type']);
        }

        // Access control
        if (!$request->user()->isSuperAdmin()) {
            if ($request->user()->branch_id) {
                $query->whereHas('store', fn($q) => $q->where('branch_id', $request->user()->branch_id));
            }
            if ($request->user()->store_id) {
                $query->where('store_id', $request->user()->store_id);
            }
        }

        $sales = $query->get();

        // Calculate summary
        $summary = [
            'total_sales' => $sales->count(),
            'total_amount' => $sales->sum('total_amount'),
            'total_cost' => $sales->sum('cost_of_goods_sold'),
            'gross_profit' => $sales->sum('total_amount') - $sales->sum('cost_of_goods_sold'),
            'total_discount' => $sales->sum('discount_amount'),
            'total_tax' => $sales->sum('tax_amount'),
            'net_amount' => $sales->sum('total_amount') - $sales->sum('discount_amount') + $sales->sum('tax_amount'),
        ];

        // Group data if requested
        $groupedData = null;
        if (!empty($validated['group_by'])) {
            $groupedData = $this->groupSalesData($sales, $validated['group_by']);
        }

        return response()->json([
            'summary' => $summary,
            'sales' => $sales,
            'grouped_data' => $groupedData,
            'period' => [
            'from' => $dateFrom->toDateString(),
            'to' => $dateTo->toDateString(),
        ],
        ]);
    }

    /**
     * Inventory Report
     */
    public function inventoryReport(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'required|exists:stores,id',
            'category_id' => 'nullable|exists:product_categories,id',
        ]);
        $validated['low_stock_only'] = $request->boolean('low_stock_only');
        // Get current stock levels
        $stockLevels = StockLedger::select('product_id', 'product_variant_id', 'store_id')
            ->selectRaw('SUM(COALESCE(base_quantity_change, quantity)) as current_quantity')
            ->selectRaw('SUM(COALESCE(base_quantity_change, quantity) * unit_cost) / NULLIF(SUM(COALESCE(base_quantity_change, quantity)), 0) as avg_cost')
            ->where('store_id', $validated['store_id'])
            ->groupBy('product_id', 'product_variant_id', 'store_id')
            ->having('current_quantity', '>', 0)
            ->get();

        $report = [];
        foreach ($stockLevels as $stock) {
            $product = Product::with(['category', 'unit'])->find($stock->product_id);

            if (!$product) continue;

            // Filter by category if specified
            if (!empty($validated['category_id']) && $product->category_id != $validated['category_id']) {
                continue;
            }

            $stockValue = $stock->current_quantity * ($stock->avg_cost ?? $product->cost_price);
            $isLowStock = $stock->current_quantity <= $product->reorder_level;

            // Filter low stock if requested
            if (!empty($validated['low_stock_only']) && !$isLowStock) {
                continue;
            }

            $report[] = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category?->name,
                'unit' => $product->unit->short_name,
                'current_quantity' => $stock->current_quantity,
                'reorder_level' => $product->reorder_level,
                'reorder_quantity' => $product->reorder_quantity,
                'avg_cost' => round($stock->avg_cost ?? $product->cost_price, 2),
                'stock_value' => round($stockValue, 2),
                'is_low_stock' => $isLowStock,
                'status' => $isLowStock ? 'Low Stock' : 'In Stock',
            ];
        }

        $summary = [
            'total_products' => count($report),
            'total_stock_value' => array_sum(array_column($report, 'stock_value')),
            'low_stock_items' => count(array_filter($report, fn($item) => $item['is_low_stock'])),
        ];

        return response()->json([
            'summary' => $summary,
            'inventory' => $report,
        ]);
    }

    /**
     * Profitability Report
     */
    public function profitabilityReport(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'branch_id' => 'nullable|exists:branches,id',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'group_by' => 'nullable|in:day,week,month,product,category',
        ]);

        $dateFrom = Carbon::parse($validated['date_from'])->startOfDay();
        $dateTo = Carbon::parse($validated['date_to'])->endOfDay();

        $query = Sale::whereBetween('sale_date', [$dateFrom, $dateTo]);

        // Apply filters
        if (!empty($validated['store_id'])) {
            $query->where('store_id', $validated['store_id']);
        }

        if (!empty($validated['branch_id'])) {
            $query->whereHas('store', fn($q) => $q->where('branch_id', $validated['branch_id']));
        }

        // Access control
        if (!$request->user()->isSuperAdmin()) {
            if ($request->user()->branch_id) {
                $query->whereHas('store', fn($q) => $q->where('branch_id', $request->user()->branch_id));
            }
            if ($request->user()->store_id) {
                $query->where('store_id', $request->user()->store_id);
            }
        }

        $sales = $query->get();

        $totalRevenue = $sales->sum('total_amount');
        $totalCOGS = 0;
        if ($sales->isNotEmpty()) {
            $ledgerQuery = StockLedger::where('reference_type', 'sale')
                ->where('transaction_type', 'issue')
                ->whereIn('reference_id', $sales->pluck('id'));

            if (!empty($validated['store_id'])) {
                $ledgerQuery->where('store_id', $validated['store_id']);
            }

            $totalCOGS = (float) $ledgerQuery
                ->selectRaw('SUM(ABS(COALESCE(base_quantity_change, quantity)) * unit_cost) as total_cogs')
                ->value('total_cogs');
        }
        $grossProfit = $totalRevenue - $totalCOGS;
        $grossMargin = $totalRevenue > 0 ? ($grossProfit / $totalRevenue) * 100 : 0;

        $summary = [
            'total_revenue' => round($totalRevenue, 2),
            'total_cogs' => round($totalCOGS, 2),
            'gross_profit' => round($grossProfit, 2),
            'gross_margin_percentage' => round($grossMargin, 2),
            'total_discount' => round($sales->sum('discount_amount'), 2),
            'total_tax' => round($sales->sum('tax_amount'), 2),
            'net_profit' => round($grossProfit - $sales->sum('discount_amount'), 2),
        ];

        // Group data if requested
        $groupedData = null;
        if (!empty($validated['group_by'])) {
            $groupedData = $this->groupProfitabilityData($sales, $validated['group_by']);
        }

        return response()->json([
            'summary' => $summary,
            'grouped_data' => $groupedData,
            'period' => [
            'from' => $dateFrom->toDateString(),
            'to' => $dateTo->toDateString(),
        ],
        ]);
    }

    /**
     * Dashboard Statistics
     */
    public function dashboardStats(Request $request)
    {
        $validated = $request->validate([
            'store_id' => 'nullable|exists:stores,id',
            'branch_id' => 'nullable|exists:branches,id',
            'period' => 'nullable|in:today,week,month,year',
        ]);

        $period = $validated['period'] ?? 'today';
        $dateRange = $this->getDateRange($period);

        // Sales stats
        $salesQuery = Sale::whereBetween('sale_date', $dateRange);

        if (!empty($validated['store_id'])) {
            $salesQuery->where('store_id', $validated['store_id']);
        }

        if (!empty($validated['branch_id'])) {
            $salesQuery->whereHas('store', fn($q) => $q->where('branch_id', $validated['branch_id']));
        }

        // Access control
        if (!$request->user()->isSuperAdmin()) {
            if ($request->user()->branch_id) {
                $salesQuery->whereHas('store', fn($q) => $q->where('branch_id', $request->user()->branch_id));
            }
            if ($request->user()->store_id) {
                $salesQuery->where('store_id', $request->user()->store_id);
            }
        }

        $sales = $salesQuery->get();
        $totalRevenue = $sales->sum('total_amount');
        $totalCOGS = 0;

        if ($sales->isNotEmpty()) {
            $ledgerQuery = StockLedger::where('reference_type', 'sale')
                ->where('transaction_type', 'issue')
                ->whereIn('reference_id', $sales->pluck('id'));

            if (!empty($validated['store_id'])) {
                $ledgerQuery->where('store_id', $validated['store_id']);
            }

            $totalCOGS = (float) $ledgerQuery
                ->selectRaw('SUM(ABS(COALESCE(base_quantity_change, quantity)) * unit_cost) as total_cogs')
                ->value('total_cogs');
        }

        // Order stats
        $ordersQuery = Order::whereBetween('created_at', $dateRange);
        if (!empty($validated['store_id'])) {
            $ordersQuery->where('store_id', $validated['store_id']);
        }
        $orders = $ordersQuery->get();

        // Low stock alerts
        $lowStockQuery = StockLedger::select('product_id', 'store_id')
            ->selectRaw('SUM(quantity) as current_quantity')
            ->groupBy('product_id', 'store_id')
            ->havingRaw('current_quantity > 0');

        if (!empty($validated['store_id'])) {
            $lowStockQuery->where('store_id', $validated['store_id']);
        }

        $stockLevels = $lowStockQuery->get();
        $lowStockCount = 0;
        foreach ($stockLevels as $stock) {
            $product = Product::find($stock->product_id);
            if ($product && $stock->current_quantity <= $product->reorder_level) {
                $lowStockCount++;
            }
        }

        // Wallet stats
        $walletQuery = WalletTransaction::whereBetween('created_at', $dateRange);
        $walletStats = [
            'total_credits' => $walletQuery->clone()->where('type', 'credit')->sum('amount'),
            'total_debits' => $walletQuery->clone()->where('type', 'debit')->sum('amount'),
            'pending_approvals' => $walletQuery->clone()->where('status', 'pending')->count(),
        ];

        return response()->json([
            'sales' => [
                'total_sales' => $sales->count(),
                'total_revenue' => round($totalRevenue, 2),
                'total_profit' => round($totalRevenue - $totalCOGS, 2),
                'average_sale' => $sales->count() > 0 ? round($totalRevenue / $sales->count(), 2) : 0,
            ],
            'orders' => [
                'total_orders' => $orders->count(),
                'pending_orders' => $orders->where('status', 'pending')->count(),
                'confirmed_orders' => $orders->where('status', 'confirmed')->count(),
                'completed_orders' => $orders->where('status', 'completed')->count(),
            ],
            'inventory' => [
                'low_stock_items' => $lowStockCount,
            ],
            'wallet' => $walletStats,
            'period' => $period,
            'date_range' => $dateRange,
        ]);
    }

    /**
     * Export Sales Report to PDF
     */
    public function exportSalesPDF(Request $request)
    {
        $data = $this->salesReport($request)->getData();

        $pdf = Pdf::loadView('reports.sales-pdf', [
            'summary' => $data->summary,
            'sales' => $data->sales,
            'period' => $data->period,
        ]);

        return $pdf->download('sales-report-' . date('Y-m-d') . '.pdf');
    }

    /**
     * Export Inventory Report to PDF
     */
    public function exportInventoryPDF(Request $request)
    {
        $data = $this->inventoryReport($request)->getData();

        $pdf = Pdf::loadView('reports.inventory-pdf', [
            'summary' => $data->summary,
            'inventory' => $data->inventory,
        ]);

        return $pdf->download('inventory-report-' . date('Y-m-d') . '.pdf');
    }

    /**
     * Helper: Group sales data
     */
    private function groupSalesData($sales, $groupBy)
    {
        switch ($groupBy) {
            case 'day':
                return $sales->groupBy(fn($sale) => Carbon::parse($sale->sale_date)->format('Y-m-d'))
                    ->map(fn($group) => [
                        'date' => $group->first()->sale_date,
                        'count' => $group->count(),
                        'total' => $group->sum('total_amount'),
                        'profit' => $group->sum('total_amount') - $group->sum('cost_of_goods_sold'),
                    ]);

            case 'product':
                return $sales->flatMap(fn($sale) => $sale->items)
                    ->groupBy('product_id')
                    ->map(fn($group) => [
                        'product_id' => $group->first()->product_id,
                        'product_name' => $group->first()->product->name,
                        'quantity_sold' => $group->sum('quantity'),
                        'total_revenue' => $group->sum('total_price'),
                    ]);

            default:
                return null;
        }
    }

    /**
     * Helper: Group profitability data
     */
    private function groupProfitabilityData($sales, $groupBy)
    {
        if ($groupBy === 'product') {
            return $sales->flatMap(fn($sale) => $sale->items)
                ->groupBy('product_id')
                ->map(fn($group) => [
                    'product_id' => $group->first()->product_id,
                    'product_name' => $group->first()->product->name,
                    'revenue' => $group->sum('total_price'),
                    'cogs' => $group->sum(fn($item) => $item->quantity * $item->unit_cost),
                    'profit' => $group->sum('total_price') - $group->sum(fn($item) => $item->quantity * $item->unit_cost),
                ]);
        }

        return null;
    }

    /**
     * Helper: Get date range for period
     */
    private function getDateRange($period)
    {
        switch ($period) {
            case 'today':
                return [Carbon::today(), Carbon::now()];
            case 'week':
                return [Carbon::now()->startOfWeek(), Carbon::now()];
            case 'month':
                return [Carbon::now()->startOfMonth(), Carbon::now()];
            case 'year':
                return [Carbon::now()->startOfYear(), Carbon::now()];
            default:
                return [Carbon::today(), Carbon::now()];
        }
    }
}
