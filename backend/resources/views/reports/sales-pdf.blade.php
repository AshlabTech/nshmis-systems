<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Report</title>
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
        <h1>Sales Report</h1>
        <p>Period: {{ $period['from'] }} to {{ $period['to'] }}</p>
        <p>Generated: {{ date('Y-m-d H:i:s') }}</p>
    </div>

    <div class="summary">
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Total Sales</div>
                <div class="summary-value">{{ $summary->total_sales }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Amount</div>
                <div class="summary-value">₦{{ number_format($summary->total_amount, 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Gross Profit</div>
                <div class="summary-value">₦{{ number_format($summary->gross_profit, 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Cost</div>
                <div class="summary-value">₦{{ number_format($summary->total_cost, 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Discount</div>
                <div class="summary-value">₦{{ number_format($summary->total_discount, 2) }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Amount</div>
                <div class="summary-value">₦{{ number_format($summary->net_amount, 2) }}</div>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Store</th>
                <th>Type</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($sales as $sale)
            <tr>
                <td>{{ $sale->sale_date }}</td>
                <td>{{ $sale->invoice_number }}</td>
                <td>{{ $sale->customer?->name ?? 'Walk-in' }}</td>
                <td>{{ $sale->store?->name }}</td>
                <td>{{ ucfirst($sale->sale_type) }}</td>
                <td class="text-right">₦{{ number_format($sale->total_amount, 2) }}</td>
                <td class="text-right">₦{{ number_format($sale->discount_amount, 2) }}</td>
                <td class="text-right">₦{{ number_format($sale->total_amount - $sale->discount_amount, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>This is a computer-generated report. No signature required.</p>
    </div>
</body>
</html>

