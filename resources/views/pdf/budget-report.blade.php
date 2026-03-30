<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Budget Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11px;
            color: #1f2937;
            line-height: 1.4;
        }

        /* Header styles are moved to a shared partial so headers repeat per page */

        /* Summary Cards */
        .summary-grid {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-row {
            display: table-row;
        }
        .summary-card {
            display: table-cell;
            width: 25%;
            padding: 6px;
        }
        .summary-card-inner {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px 14px;
            background: #fafafa;
        }
        .summary-card .label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            margin-bottom: 4px;
        }
        .summary-card .value {
            font-size: 16px;
            font-weight: 700;
        }
        .summary-card .note {
            font-size: 9px;
            color: #999;
            margin-top: 2px;
        }
        .color-green  { color: #16a34a; }
        .color-yellow { color: #ca8a04; }
        .color-red    { color: #dc2626; }
        .color-blue   { color: #2563eb; }
        .color-dark   { color: #1f2937; }
        .color-brand  { color: #154734; }

        /* Section title */
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #374151;
            margin: 20px 0 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e5e7eb;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        table thead th {
            background: #154734;
            color: #fff;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
        }
        table thead th:first-child {
            border-radius: 6px 0 0 0;
        }
        table thead th:last-child {
            border-radius: 0 6px 0 0;
        }
        table tbody td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
            color: #1f2937;
        }
        table tbody tr:nth-child(even) {
            background: #fafafa;
        }
        table tbody tr:last-child td:first-child {
            border-radius: 0 0 0 6px;
        }
        table tbody tr:last-child td:last-child {
            border-radius: 0 0 6px 0;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .font-bold {
            font-weight: 700;
        }

        /* Progress bar */
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
        }
        .progress-green { background: #16a34a; }
        .progress-yellow { background: #ca8a04; }
        .progress-red { background: #dc2626; }

        /* Status badge */
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-active   { background: #dcfce7; color: #16a34a; }
        .badge-on-hold  { background: #fef9c3; color: #ca8a04; }
        .badge-completed{ background: #dbeafe; color: #2563eb; }
        .badge-archived { background: #f3f4f6; color: #888; }
        .badge-over     { background: #fee2e2; color: #dc2626; }
        .badge-risk     { background: #fef9c3; color: #ca8a04; }
        .badge-healthy  { background: #dcfce7; color: #16a34a; }

        /* Alerts */
        .alert-box {
            border: 1px solid #fecaca;
            background: #fef2f2;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 16px;
        }
        .alert-box h4 {
            color: #dc2626;
            font-size: 11px;
            margin-bottom: 6px;
        }
        .alert-box ul {
            list-style: none;
            padding: 0;
        }
        .alert-box ul li {
            font-size: 10px;
            color: #7f1d1d;
            padding: 2px 0;
        }

        /* Footer */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #374151;
            font-weight: 600;
            padding: 8px 16px;
            background: #f0fdf4;
            border-top: 2px solid #154734;
        }

        /* Page break */
        .page-break {
            page-break-before: always;
        }

        /* Totals row */
        .totals-row td {
            font-weight: 700;
            border-top: 2px solid #154734;
            background: #f0fdf4 !important;
            font-size: 11px;
        }
    </style>
</head>
<body>

    @include('pdf.partials.header', ['title' => 'Budget Report', 'subtitle' => $periodLabel, 'dateRange' => $dateRange, 'generatedAt' => $generatedAt])

    <!-- Portfolio Summary -->
    <table>
        <thead>
            <tr>
                <th>Total Budget</th>
                <th>Total Spent</th>
                <th>Total Pending</th>
                <th>Total Rejected</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="font-bold color-dark" style="font-size:13px">{{ $fmt($summary['totalBudget']) }}</td>
                <td class="font-bold color-green" style="font-size:13px">{{ $fmt($summary['totalApproved']) }}</td>
                <td class="font-bold color-yellow" style="font-size:13px">{{ $fmt($summary['totalPending']) }}</td>
                <td class="font-bold color-red" style="font-size:13px">{{ $fmt($summary['totalRejected']) }}</td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Projects</th>
                <th>Total Requests</th>
                <th>Over Budget</th>
                <th>At Risk (&ge;80%)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="font-bold">{{ $summary['projectCount'] }}</td>
                <td class="font-bold">{{ $summary['totalRequests'] }}</td>
                <td class="font-bold color-red">{{ $summary['overBudgetProjects'] }}</td>
                <td class="font-bold color-yellow">{{ $summary['atRiskProjects'] }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Budget Alerts --}}
    @php
        $overBudget = collect($projects)->filter(fn($p) => $p['remaining'] < 0);
        $atRisk = collect($projects)->filter(fn($p) => $p['percentUsed'] >= 80 && $p['percentUsed'] < 100);
    @endphp

    @if($overBudget->count() > 0 || $atRisk->count() > 0)
        <div class="alert-box">
            <h4>⚠ Budget Alerts</h4>
            <ul>
                @foreach($overBudget as $p)
                    <li><strong>{{ $p['projectName'] }}</strong> — Over budget by {{ $fmt(abs($p['remaining'])) }} ({{ $p['percentUsed'] }}% used)</li>
                @endforeach
                @foreach($atRisk as $p)
                    <li><strong>{{ $p['projectName'] }}</strong> — At risk: {{ $p['percentUsed'] }}% used ({{ $fmt($p['remaining']) }} remaining)</li>
                @endforeach
            </ul>
        </div>
    @endif

    <!-- Project Budget Overview -->
    <div class="section-title">Project Budget Overview</div>
    <table>
        <thead>
            <tr>
                <th>Project</th>
                <th class="text-right">Budget</th>
                <th class="text-right">Spent</th>
                <th class="text-right">Remaining</th>
                <th class="text-center">% Used</th>
                <th class="text-center">Requests (A/P/R)</th>
                <th class="text-center">Status</th>
                <th class="text-center">Health</th>
            </tr>
        </thead>
        <tbody>
            @foreach($projects as $p)
                @php
                    $isOver = $p['remaining'] < 0;
                    $isRisk = $p['percentUsed'] >= 80 && $p['percentUsed'] < 100;
                @endphp
                <tr>
                    <td class="font-bold">{{ $p['projectName'] }}</td>
                    <td class="text-right">{{ $fmt($p['budget']) }}</td>
                    <td class="text-right color-green font-bold">{{ $fmt($p['totalApproved']) }}</td>
                    <td class="text-right {{ $isOver ? 'color-red font-bold' : '' }}">{{ $fmt($p['remaining']) }}</td>
                    <td class="text-center">
                        <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                            <div class="progress-bar" style="width:50px;">
                                <div class="progress-fill {{ $isOver ? 'progress-red' : ($isRisk ? 'progress-yellow' : 'progress-green') }}"
                                     style="width:{{ min($p['percentUsed'], 100) }}%"></div>
                            </div>
                            <span>{{ $p['percentUsed'] }}%</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <span class="color-green">{{ $p['approvedCount'] }}</span> /
                        <span class="color-yellow">{{ $p['pendingCount'] }}</span> /
                        <span class="color-red">{{ $p['rejectedCount'] }}</span>
                    </td>
                    <td class="text-center">
                        <span class="badge badge-{{ $p['projectStatus'] }}">{{ ucfirst($p['projectStatus']) }}</span>
                    </td>
                    <td class="text-center">
                        @if($isOver)
                            <span class="badge badge-over">Over</span>
                        @elseif($isRisk)
                            <span class="badge badge-risk">Risk</span>
                        @else
                            <span class="badge badge-healthy">OK</span>
                        @endif
                    </td>
                </tr>
            @endforeach

            {{-- Totals --}}
            <tr class="totals-row">
                <td>TOTAL</td>
                <td class="text-right">{{ $fmt($summary['totalBudget']) }}</td>
                <td class="text-right color-green">{{ $fmt($summary['totalApproved']) }}</td>
                <td class="text-right">{{ $fmt($summary['totalBudget'] - $summary['totalApproved']) }}</td>
                <td class="text-center">
                    {{ $summary['totalBudget'] > 0 ? round(($summary['totalApproved'] / $summary['totalBudget']) * 100, 1) : 0 }}%
                </td>
                <td class="text-center">{{ $summary['totalRequests'] }}</td>
                <td></td>
                <td></td>
            </tr>
        </tbody>
    </table>

    {{-- Detailed Breakdown per Project --}}
    @foreach($projects as $idx => $p)
        @if(count($p['categories']) > 0 || count($p['monthlyTrend']) > 0)
            @if($idx > 0 || true)
                {{-- page break for each project detail --}}
            @endif

            <div class="section-title">{{ $p['projectName'] }} — Detailed Breakdown</div>

            <table>
                <thead>
                    <tr>
                        <th colspan="2">Budget Summary</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Total Budget</td><td class="text-right font-bold">{{ $fmt($p['budget']) }}</td></tr>
                    <tr><td>Approved Spent</td><td class="text-right font-bold color-green">{{ $fmt($p['totalApproved']) }}</td></tr>
                    <tr><td>Pending</td><td class="text-right font-bold color-yellow">{{ $fmt($p['totalPending']) }}</td></tr>
                    <tr><td>Rejected</td><td class="text-right font-bold color-red">{{ $fmt($p['totalRejected']) }}</td></tr>
                    <tr><td>Remaining</td><td class="text-right font-bold {{ $p['remaining'] < 0 ? 'color-red' : '' }}">{{ $fmt($p['remaining']) }}</td></tr>
                    <tr><td>Budget Used</td><td class="text-right font-bold">{{ $p['percentUsed'] }}%</td></tr>
                    <tr>
                        <td>If All Pending Approved</td>
                        <td class="text-right font-bold {{ ($p['totalApproved'] + $p['totalPending']) > $p['budget'] ? 'color-red' : '' }}">
                            {{ $fmt($p['budget'] - $p['totalApproved'] - $p['totalPending']) }}
                        </td>
                    </tr>
                </tbody>
            </table>

            @if(count($p['categories']) > 0)
                <table>
                    <thead>
                        <tr>
                            <th>Category / Purpose</th>
                            <th class="text-right">Amount</th>
                            <th class="text-center">Count</th>
                            <th class="text-right">% of Spent</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach(collect($p['categories'])->sortByDesc('amount') as $cat)
                            @php
                                $catPct = $p['totalApproved'] > 0 ? round(($cat['amount'] / $p['totalApproved']) * 100, 1) : 0;
                            @endphp
                            <tr>
                                <td>{{ $cat['category'] }}</td>
                                <td class="text-right font-bold">{{ $fmt($cat['amount']) }}</td>
                                <td class="text-center">{{ $cat['count'] }}</td>
                                <td class="text-right">{{ $catPct }}%</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif

            @if(count($p['monthlyTrend']) > 0)
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="text-right">Amount</th>
                            <th class="text-center">Requests</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($p['monthlyTrend'] as $m)
                            <tr>
                                <td>{{ $m['month'] }}</td>
                                <td class="text-right font-bold">{{ $fmt($m['amount']) }}</td>
                                <td class="text-center">{{ $m['count'] }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
        @endif
    @endforeach

    {{-- Approved Budget Requests Listing --}}
    @if(count($requests) > 0)
        <div class="section-title">Budget Requests ({{ $periodLabel }})</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Requested By</th>
                    <th>Purpose</th>
                    <th>Type</th>
                    <th class="text-right">Amount</th>
                    <th class="text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($requests as $r)
                    <tr>
                        <td>{{ $r['date'] }}</td>
                        <td>{{ $r['project'] }}</td>
                        <td>{{ $r['requester'] }}</td>
                        <td>{{ \Illuminate\Support\Str::limit($r['purpose'], 30) }}</td>
                        <td>{{ $r['type'] === 'spending' ? 'Spending' : 'Additional Budget' }}</td>
                        <td class="text-right font-bold">{{ $fmt($r['amount']) }}</td>
                        <td class="text-center">
                            <span class="badge {{ $r['status'] === 'approved' ? 'badge-active' : ($r['status'] === 'pending' ? 'badge-on-hold' : 'badge-over') }}">
                                {{ ucfirst($r['status']) }}
                            </span>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <!-- Footer -->
    <div class="footer">
        Budget Report &mdash; {{ $periodLabel }} &mdash; Generated {{ $generatedAt }}
    </div>

</body>
</html>
