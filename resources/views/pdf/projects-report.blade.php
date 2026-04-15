<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Projects Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }

        .summary-grid { display: table; width: 100%; margin-bottom: 20px; }
        .summary-row { display: table-row; }
        .summary-card { display: table-cell; width: 20%; padding: 6px; }
        .summary-card-inner { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; background: #fafafa; }
        .summary-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-bottom: 4px; }
        .summary-card .value { font-size: 16px; font-weight: 700; }
        .summary-card .note { font-size: 9px; color: #999; margin-top: 2px; }
        .color-green  { color: #16a34a; }
        .color-yellow { color: #ca8a04; }
        .color-red    { color: #dc2626; }
        .color-blue   { color: #2563eb; }
        .color-dark   { color: #1f2937; }
        .color-brand  { color: #154734; }

        .section-title { font-size: 13px; font-weight: 700; color: #374151; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        table thead th {
            background: #154734; color: #fff; font-size: 9px; text-transform: uppercase;
            letter-spacing: 0.5px; padding: 8px 10px; text-align: left;
        }
        table thead th:first-child { border-radius: 6px 0 0 0; }
        table thead th:last-child  { border-radius: 0 6px 0 0; }
        table tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; color: #1f2937; }
        table tbody tr:nth-child(even) { background: #fafafa; }
        table tbody tr:last-child td:first-child { border-radius: 0 0 0 6px; }
        table tbody tr:last-child td:last-child  { border-radius: 0 0 6px 0; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }

        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; }
        .progress-green  { background: #16a34a; }
        .progress-yellow { background: #ca8a04; }
        .progress-red    { background: #dc2626; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: 600; text-transform: uppercase; }
        .badge-active    { background: #dcfce7; color: #16a34a; }
        .badge-on-hold   { background: #fef9c3; color: #ca8a04; }
        .badge-completed { background: #dbeafe; color: #2563eb; }
        .badge-archived  { background: #f3f4f6; color: #888; }
        .badge-high      { background: #fee2e2; color: #dc2626; }
        .badge-critical  { background: #fee2e2; color: #dc2626; }
        .badge-medium    { background: #fef9c3; color: #ca8a04; }
        .badge-low       { background: #dcfce7; color: #16a34a; }

        .totals-row td { font-weight: 700; border-top: 2px solid #154734; background: #f0fdf4 !important; }

        .footer {
            position: fixed; bottom: 0; left: 0; right: 0; text-align: center;
            font-size: 10px; color: #374151; font-weight: 600; padding: 8px 16px;
            background: #f0fdf4; border-top: 2px solid #154734;
        }
    </style>
</head>
<body>
    @include('pdf.partials.header', ['title' => 'Projects Report', 'subtitle' => $periodLabel, 'dateRange' => $dateRange, 'generatedAt' => $generatedAt])

    {{-- Summary Cards --}}
    <div class="summary-grid">
        <div class="summary-row">
            <div class="summary-card">
                <div class="summary-card-inner">
                    <div class="label">Total Projects</div>
                    <div class="value color-brand">{{ $summary['totalProjects'] }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-card-inner">
                    <div class="label">Active</div>
                    <div class="value color-green">{{ $summary['activeProjects'] }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-card-inner">
                    <div class="label">Completed</div>
                    <div class="value color-blue">{{ $summary['completedProjects'] }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-card-inner">
                    <div class="label">Total Budget</div>
                    <div class="value color-dark">₱{{ number_format($summary['totalBudget'], 2) }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-card-inner">
                    <div class="label">Total Spent</div>
                    <div class="value {{ $totalSpent > $summary['totalBudget'] ? 'color-red' : 'color-green' }}">₱{{ number_format($totalSpent, 2) }}</div>
                </div>
            </div>
        </div>
    </div>

    {{-- Active Filters --}}
    @if($filters['status'] || $filters['priority'] || $filters['category'])
    <div class="section-title">Active Filters</div>
    <table>
        <thead>
            <tr>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $filters['status'] ? ucfirst($filters['status']) : 'All' }}</td>
                <td>{{ $filters['priority'] ? ucfirst($filters['priority']) : 'All' }}</td>
                <td>{{ $filters['category'] ? ucfirst($filters['category']) : 'All' }}</td>
            </tr>
        </tbody>
    </table>
    @endif

    {{-- Project List --}}
    <div class="section-title">Project List</div>
    @if(count($rows) === 0)
        <p style="text-align:center; padding: 20px; color: #6b7280;">No projects found for this period.</p>
    @else
    <table>
        <thead>
            <tr>
                <th>Project Name</th>
                <th>Serial</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th class="text-right">Budget</th>
                <th class="text-right">Spent</th>
                <th class="text-center">Progress</th>
                <th>Start Date</th>
                <th>End Date</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
            <tr>
                <td class="font-bold">{{ $row['name'] }}</td>
                <td>{{ $row['serial'] }}</td>
                <td>
                    @php
                        $statusClass = match(strtolower($row['status'])) {
                            'active' => 'badge-active',
                            'on-hold' => 'badge-on-hold',
                            'completed' => 'badge-completed',
                            'archived' => 'badge-archived',
                            default => 'badge-active',
                        };
                    @endphp
                    <span class="badge {{ $statusClass }}">{{ $row['status'] }}</span>
                </td>
                <td>
                    @php
                        $priorityClass = match(strtolower($row['priority'])) {
                            'critical' => 'badge-critical',
                            'high' => 'badge-high',
                            'medium' => 'badge-medium',
                            'low' => 'badge-low',
                            default => 'badge-medium',
                        };
                    @endphp
                    <span class="badge {{ $priorityClass }}">{{ $row['priority'] }}</span>
                </td>
                <td>{{ $row['category'] }}</td>
                <td class="text-right">₱{{ $row['budget'] }}</td>
                <td class="text-right">₱{{ $row['spent'] }}</td>
                <td class="text-center">
                    @php $pct = (int)$row['progress']; @endphp
                    <div style="display:flex; align-items:center; gap:4px; justify-content:center;">
                        <div class="progress-bar" style="width:50px;">
                            <div class="progress-fill {{ $pct >= 75 ? 'progress-green' : ($pct >= 40 ? 'progress-yellow' : 'progress-red') }}" style="width:{{ $pct }}%"></div>
                        </div>
                        <span style="font-size:9px; font-weight:600;">{{ $row['progress'] }}</span>
                    </div>
                </td>
                <td>{{ $row['startDate'] }}</td>
                <td>{{ $row['endDate'] }}</td>
            </tr>
            @endforeach
            <tr class="totals-row">
                <td colspan="5" class="text-right font-bold">Totals</td>
                <td class="text-right">₱{{ number_format($summary['totalBudget'], 2) }}</td>
                <td class="text-right">₱{{ number_format($totalSpent, 2) }}</td>
                <td colspan="3"></td>
            </tr>
        </tbody>
    </table>
    @endif

    <div class="footer">
        Maptech Information Solutions Inc. &mdash; Projects Report &mdash; {{ $generatedAt }}
    </div>
</body>
</html>
