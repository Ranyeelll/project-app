<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gantt Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1f2937; line-height: 1.35; }

        /* Header styles are moved to shared partial so header repeats on each page */

        table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table thead th {
            background: #154734;
            color: #fff;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
        }
        table tbody td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
            color: #1f2937;
            vertical-align: top;
        }
        table tbody tr:nth-child(even) { background: #fafafa; }

        .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #374151;
            margin: 20px 0 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e5e7eb;
        }

        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-green  { background: #dcfce7; color: #16a34a; }
        .badge-yellow { background: #fef9c3; color: #ca8a04; }
        .badge-red    { background: #fee2e2; color: #dc2626; }
        .muted { color: #6b7280; }

        .gantt-table thead th {
            text-align: center;
            font-size: 8px;
            padding: 6px 4px;
        }
        .gantt-table thead th:first-child,
        .gantt-table {
            table-layout: fixed;
        }
        .gantt-table thead th {
            font-size: 8px;
            padding: 7px 6px;
            text-align: left;
        }
        .gantt-table tbody td {
            padding: 5px 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
            vertical-align: middle;
        }
        .tree-col { width: 7%; }
        .task-col { width: 19%; }
        .duration-col { width: 8%; }
        .start-col { width: 10%; }
        .end-col { width: 10%; }
        .state-col { width: 10%; }
        .timeline-col { width: 36%; }

        .task-name {
            display: inline-block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 600;
        }

        .timeline-scale {
            position: relative;
            height: 26px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            margin-bottom: 0;
            overflow: hidden;
        }
        .timeline-month {
            float: left;
            height: 100%;
            border-right: 1px solid #d1d5db;
            font-size: 8px;
            font-weight: 700;
            color: #374151;
            text-align: center;
            line-height: 26px;
        }

        .lane {
            position: relative;
            height: 14px;
            background: #f3f4f6;
            border-radius: 8px;
            overflow: visible;
        }
        .bar {
            position: absolute;
            top: 1px;
            height: 12px;
            border-radius: 8px;
        }
        .milestone {
            position: absolute;
            top: 2px;
            width: 10px;
            height: 10px;
            background: #1FAF8E;
            border: 1px solid #167a63;
            transform: rotate(45deg);
        }
        .today-line {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: #ef4444;
        }
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
    @php
        $totalDays = max($rangeStart->diffInDays($rangeEnd) + 1, 1);
        $today = now();
        $todayPct = null;
        if ($today->between($rangeStart, $rangeEnd)) {
            $todayPct = max(0, min(100, ($rangeStart->diffInDays($today, false) / $totalDays) * 100));
        }
    @endphp

    @include('pdf.partials.header', ['title' => 'Gantt Report', 'subtitle' => $periodLabel . ' - ' . $projectName, 'dateRange' => $dateRange, 'generatedAt' => $generatedAt])

    <table>
        <thead>
            <tr>
                <th>Total Items</th>
                <th>Phases</th>
                <th>Steps</th>
                <th>Subtasks</th>
                <th>Milestones</th>
                <th>Avg Progress</th>
                <th>Dependencies</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><span class="badge badge-green">{{ $summary['totalItems'] }}</span></td>
                <td>{{ $summary['phaseCount'] }}</td>
                <td>{{ $summary['stepCount'] }}</td>
                <td>{{ $summary['subtaskCount'] }}</td>
                <td>{{ $summary['milestoneCount'] }}</td>
                <td><span class="badge badge-yellow">{{ $summary['avgProgress'] }}%</span></td>
                <td>{{ $summary['dependencyCount'] }}</td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Project</th>
                <th>Preview As</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $filters['project'] }}</td>
                <td>{{ $filters['previewAs'] !== '' ? $filters['previewAs'] : 'Default viewer' }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Gantt Items</div>
    <div class="timeline-scale">
        @foreach($timelineColumns as $col)
            <div class="timeline-month" style="width: {{ number_format($col['widthPct'], 4, '.', '') }}%;">{{ $col['label'] }}</div>
        @endforeach
        @if($todayPct !== null)
            <div class="today-line" style="left: {{ number_format($todayPct, 4, '.', '') }}%;"></div>
        @endif
    </div>
    <table class="gantt-table">
        <thead>
            <tr>
                <th class="tree-col">#</th>
                <th class="task-col">Task Name</th>
                <th class="duration-col">Duration</th>
                <th class="start-col">Start</th>
                <th class="end-col">End</th>
                <th class="state-col">State</th>
                <th class="timeline-col">Timeline</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    <td>{{ $row['treeIndex'] }}</td>
                    <td>
                        <span class="task-name" style="margin-left: {{ ((int) ($row['depth'] ?? 0)) * 10 }}px;">{{ $row['taskName'] }}</span>
                    </td>
                    <td>{{ $row['durationDays'] !== '—' ? $row['durationDays'] . 'd' : '—' }}</td>
                    <td>{{ $row['startDate'] }}</td>
                    <td>{{ $row['endDate'] }}</td>
                    <td>{{ ucfirst($row['state']) }}</td>
                    <td>
                        <div class="lane">
                            @if($todayPct !== null)
                                <div class="today-line" style="left: {{ number_format($todayPct, 4, '.', '') }}%;"></div>
                            @endif

                            @if($row['leftPct'] !== null && $row['widthPct'] !== null)
                                @if($row['isMilestone'])
                                    <div class="milestone" style="left: {{ number_format($row['leftPct'], 4, '.', '') }}%; margin-left: -5px;"></div>
                                @else
                                    <div class="bar" style="left: {{ number_format($row['leftPct'], 4, '.', '') }}%; width: {{ number_format($row['widthPct'], 4, '.', '') }}%; background: {{ $row['barColor'] }};"></div>
                                @endif
                            @endif
                        </div>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="muted" style="text-align:center;">No gantt items found for this project.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">MAPTECH INFORMATION SOLUTIONS INC. - Confidential Gantt Report</div>
</body>
</html>
