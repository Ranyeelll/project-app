<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Budget Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #1f2937;
        }

        /* ── Header ── */
        .header {
            padding: 16px 20px 14px;
            border-bottom: 3px solid #154734;
            margin-bottom: 20px;
            text-align: center;
            background: #f0fdf4;
        }
        .header h1 {
            font-size: 20px;
            color: #154734;
            margin-bottom: 3px;
            font-weight: 900;
            letter-spacing: 0.5px;
        }
        .header .subtitle {
            font-size: 12px;
            color: #374151;
            font-weight: 700;
        }
        .header .period {
            font-size: 10px;
            color: #6b7280;
            margin-top: 3px;
        }
        .logo-text {
            display: inline-block;
            background: #154734;
            padding: 8px 18px;
            border-radius: 6px;
            margin-bottom: 10px;
        }
        .logo-text .name {
            font-size: 18px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 3px;
        }
        .logo-text .tagline {
            font-size: 8px;
            color: #a7f3d0;
            letter-spacing: 1.5px;
        }

        /* ── Section titles ── */
        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #374151;
            margin: 24px 0 10px;
            padding: 6px 10px;
            background: #f9fafb;
            border-left: 4px solid #154734;
            border-bottom: 1px solid #e5e7eb;
        }

        /* ── Tables ── */
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
            border: 1px solid #0f3524;
        }
        table tbody td {
            padding: 7px 10px;
            border: 1px solid #e5e7eb;
            font-size: 10px;
            color: #1f2937;
            vertical-align: middle;
        }
        table tbody tr:nth-child(even) td {
            background: #fafafa;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: 700; }

        /* ── Colors ── */
        .color-green  { color: #16a34a; }
        .color-yellow { color: #ca8a04; }
        .color-red    { color: #dc2626; }
        .color-blue   { color: #2563eb; }
        .color-dark   { color: #1f2937; }
        .color-brand  { color: #154734; }

        /* ── Summary cards rendered as table ── */
        .summary-outer { width: 100%; border-collapse: separate; border-spacing: 6px; margin-bottom: 16px; }
        .summary-cell {
            width: 25%;
            padding: 12px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fafafa;
            vertical-align: top;
        }
        .summary-cell .s-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
            margin-bottom: 4px;
        }
        .summary-cell .s-value {
            font-size: 16px;
            font-weight: 700;
        }
        .summary-cell .s-note {
            font-size: 9px;
            color: #999;
            margin-top: 2px;
        }

        /* ── Badges ── */
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge-active    { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-on-hold   { background: #fef9c3; color: #ca8a04; border: 1px solid #fde68a; }
        .badge-completed { background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe; }
        .badge-archived  { background: #f3f4f6; color: #888;    border: 1px solid #e5e7eb; }
        .badge-over      { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-risk      { background: #fef9c3; color: #ca8a04; border: 1px solid #fde68a; }
        .badge-healthy   { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-approved  { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .badge-pending   { background: #fef9c3; color: #ca8a04; border: 1px solid #fde68a; }
        .badge-rejected  { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }

        /* ── Alert box ── */
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
            font-weight: 700;
        }
        .alert-item {
            font-size: 10px;
            color: #7f1d1d;
            padding: 2px 0;
        }

        /* ── Totals row ── */
        .totals-row td {
            font-weight: 700;
            border-top: 2px solid #154734;
            background: #f0fdf4 !important;
            font-size: 11px;
            color: #154734;
        }

        /* ── Progress bar (text-based for XLS) ── */
        .pct-bar-wrap {
            display: inline-block;
            width: 60px;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            vertical-align: middle;
            margin-right: 4px;
            overflow: hidden;
        }
        .pct-fill {
            height: 100%;
            border-radius: 4px;
        }
        .fill-green  { background: #16a34a; }
        .fill-yellow { background: #ca8a04; }
        .fill-red    { background: #dc2626; }

        /* ── Footer ── */
        .footer {
            margin-top: 32px;
            text-align: center;
            font-size: 10px;
            color: #374151;
            font-weight: 600;
            padding: 8px 16px;
            background: #f0fdf4;
            border-top: 2px solid #154734;
        }
    </style>
</head>
<body>

{{-- ── Header ───────────────────────────────────────────────────── --}}
@php
    $logoSrc = null;
    if (function_exists('gd_info')) {
        $b64File = public_path('logo.b64');
        $pngFile = public_path('Maptech_Official_Logo_version2_(1).png');
        if (file_exists($b64File)) {
            $logoSrc = 'data:image/png;base64,' . trim(file_get_contents($b64File));
        } elseif (file_exists($pngFile)) {
            $logoSrc = 'data:image/png;base64,' . base64_encode(file_get_contents($pngFile));
        }
    }
@endphp
<div class="header">
    <div style="margin-bottom:10px;">
        @if($logoSrc)
            <img src="{{ $logoSrc }}" alt="Maptech Logo" style="max-width:260px; max-height:65px;" />
        @else
            <div class="logo-text">
                <div class="name">MAPTECH</div>
                <div class="tagline">INFORMATION SOLUTIONS INC.</div>
            </div>
        @endif
    </div>
    <h1>Budget Report</h1>
    <div class="subtitle">{{ $periodLabel }}</div>
    <div class="period">{{ $dateRange }} &mdash; Generated on {{ $generatedAt }}</div>
</div>

{{-- ── Portfolio Summary Cards ─────────────────────────────────── --}}
<table class="summary-outer">
    <tr>
        <td class="summary-cell">
            <div class="s-label">Total Budget</div>
            <div class="s-value color-dark">{{ $fmt($summary['totalBudget']) }}</div>
            <div class="s-note">All projects combined</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">Total Spent</div>
            <div class="s-value color-green">{{ $fmt($summary['totalApproved']) }}</div>
            <div class="s-note">Approved expenses</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">Total Pending</div>
            <div class="s-value color-yellow">{{ $fmt($summary['totalPending']) }}</div>
            <div class="s-note">Awaiting approval</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">Total Rejected</div>
            <div class="s-value color-red">{{ $fmt($summary['totalRejected']) }}</div>
            <div class="s-note">Declined requests</div>
        </td>
    </tr>
</table>
<table class="summary-outer">
    <tr>
        <td class="summary-cell">
            <div class="s-label">Projects</div>
            <div class="s-value color-dark">{{ $summary['projectCount'] }}</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">Total Requests</div>
            <div class="s-value color-dark">{{ $summary['totalRequests'] }}</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">Over Budget</div>
            <div class="s-value color-red">{{ $summary['overBudgetProjects'] }}</div>
        </td>
        <td class="summary-cell">
            <div class="s-label">At Risk (&ge;80%)</div>
            <div class="s-value color-yellow">{{ $summary['atRiskProjects'] }}</div>
        </td>
    </tr>
</table>

{{-- ── Budget Alerts ────────────────────────────────────────────── --}}
@php
    $overBudget = collect($projects)->filter(fn($p) => $p['remaining'] < 0);
    $atRisk     = collect($projects)->filter(fn($p) => $p['percentUsed'] >= 80 && $p['percentUsed'] < 100);
@endphp
@if($overBudget->count() > 0 || $atRisk->count() > 0)
    <div class="alert-box">
        <h4>&#9888; Budget Alerts</h4>
        @foreach($overBudget as $p)
            <div class="alert-item"><strong>{{ $p['projectName'] }}</strong> — Over budget by {{ $fmt(abs($p['remaining'])) }} ({{ $p['percentUsed'] }}% used)</div>
        @endforeach
        @foreach($atRisk as $p)
            <div class="alert-item"><strong>{{ $p['projectName'] }}</strong> — At risk: {{ $p['percentUsed'] }}% used ({{ $fmt($p['remaining']) }} remaining)</div>
        @endforeach
    </div>
@endif

{{-- ── Project Budget Overview ─────────────────────────────────── --}}
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
                $fillClass = $isOver ? 'fill-red' : ($isRisk ? 'fill-yellow' : 'fill-green');
                $pctWidth  = min($p['percentUsed'], 100);
            @endphp
            <tr>
                <td class="font-bold">{{ $p['projectName'] }}</td>
                <td class="text-right">{{ $fmt($p['budget']) }}</td>
                <td class="text-right color-green font-bold">{{ $fmt($p['totalApproved']) }}</td>
                <td class="text-right {{ $isOver ? 'color-red font-bold' : '' }}">{{ $fmt($p['remaining']) }}</td>
                <td class="text-center">
                    <span class="pct-bar-wrap"><span class="pct-fill {{ $fillClass }}" style="width:{{ $pctWidth }}%; display:block;"></span></span>
                    <span>{{ $p['percentUsed'] }}%</span>
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
            <td class="text-right">{{ $fmt($summary['totalApproved']) }}</td>
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

{{-- ── Per-project Detailed Breakdown ─────────────────────────── --}}
@foreach($projects as $p)
    @if(count($p['categories']) > 0 || count($p['monthlyTrend']) > 0)
        <div class="section-title">{{ $p['projectName'] }} &mdash; Detailed Breakdown</div>

        <table>
            <thead>
                <tr><th colspan="2">Budget Summary</th></tr>
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
                        @php $catPct = $p['totalApproved'] > 0 ? round(($cat['amount'] / $p['totalApproved']) * 100, 1) : 0; @endphp
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

{{-- ── Budget Requests Listing ─────────────────────────────────── --}}
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
                    <td>{{ \Illuminate\Support\Str::limit($r['purpose'], 40) }}</td>
                    <td>{{ $r['type'] === 'spending' ? 'Spending' : 'Additional Budget' }}</td>
                    <td class="text-right font-bold">{{ $fmt($r['amount']) }}</td>
                    <td class="text-center">
                        <span class="badge badge-{{ $r['status'] }}">{{ ucfirst($r['status']) }}</span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif

{{-- ── Footer ───────────────────────────────────────────────────── --}}
<div class="footer">
    Budget Report &mdash; {{ $periodLabel }} &mdash; Generated {{ $generatedAt }}
</div>

</body>
</html>
