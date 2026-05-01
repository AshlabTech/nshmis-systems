<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Inventory Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #1976d2;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .summary {
            background: #f5f5f5;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            text-transform: uppercase;
        }
        .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #1976d2;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 11px;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 10px;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .badge {
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-success {
            background: #4caf50;
            color: white;
        }
        .badge-warning {
            background: #ff9800;
            color: white;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Inventory Report</h1>
        <p>Generated: {{ date('Y-m-d H:i:s') }}</p>
    </div>

    <div class="summary">
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Total Products</div>
                <div class="summary-value">{{ $summary->total_products }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Stock Value</div>
                <div class="summary-value">₦{{ number_format($summary->total_stock_value, 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Low Stock Items</div>
                <div class="summary-value">{{ $summary->low_stock_items }}</div>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th class="text-center">Unit</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Reorder Level</th>
                <th class="text-right">Avg Cost</th>
                <th class="text-right">Stock Value</th>
                <th class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($inventory as $item)
            <tr>
                <td>{{ $item['sku'] }}</td>
                <td>{{ $item['name'] }}</td>
                <td>{{ $item['category'] ?? 'N/A' }}</td>
                <td class="text-center">{{ $item['unit'] }}</td>
                <td class="text-right">{{ number_format($item['current_quantity'], 2) }}</td>
                <td class="text-right">{{ number_format($item['reorder_level'], 2) }}</td>
                <td class="text-right">₦{{ number_format($item['avg_cost'], 2) }}</td>
                <td class="text-right">₦{{ number_format($item['stock_value'], 2) }}</td>
                <td class="text-center">
                    <span class="badge {{ $item['is_low_stock'] ? 'badge-warning' : 'badge-success' }}">
                        {{ $item['status'] }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>This is a computer-generated report. No signature required.</p>
    </div>
</body>
</html>

