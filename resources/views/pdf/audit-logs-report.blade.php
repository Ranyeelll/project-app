<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Audit Logs Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }

        /* Header styles moved to shared partial so header repeats on each page */

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
    </style>
</head>
<body>
    @include('pdf.partials.header', ['title' => 'Audit Logs Report', 'subtitle' => $periodLabel, 'dateRange' => $dateRange, 'generatedAt' => $generatedAt])

    <table>
        <thead>
            <tr>
                <th>Total Logs</th>
                <th>Sensitive Logs</th>
                <th>Unique Actions</th>
                <th>Projects Involved</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><span class="badge badge-green">{{ $summary['totalLogs'] }}</span></td>
                <td><span class="badge badge-red">{{ $summary['sensitiveLogs'] }}</span></td>
                <td><span class="badge badge-yellow">{{ $summary['uniqueActions'] }}</span></td>
                <td><span class="badge badge-green">{{ $summary['projectScoped'] }}</span></td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Search</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Project</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $filters['search'] !== '' ? $filters['search'] : 'None' }}</td>
                <td>{{ $filters['action'] !== '' ? $filters['action'] : 'All' }}</td>
                <td>{{ $filters['resourceType'] !== '' ? $filters['resourceType'] : 'All' }}</td>
                <td>{{ $filters['projectId'] !== '' ? 'Project #' . $filters['projectId'] : 'All' }}</td>
            </tr>
        </tbody>
    </table>

    <div class="section-title">Audit Entries</div>
    <table>
        <thead>
            <tr>
                <th style="width: 12%;">Date</th>
                <th style="width: 9%;">Entity</th>
                <th style="width: 14%;">Activity</th>
                <th style="width: 16%;">Action</th>
                <th style="width: 10%;">Actor</th>
                <th style="width: 10%;">Project</th>
                <th style="width: 29%;">Details</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td>{{ $row['entity'] }}</td>
                    <td>{{ $row['activity'] }}</td>
                    <td>{{ $row['action'] }}</td>
                    <td>{{ $row['actor'] }}</td>
                    <td>{{ $row['project'] }}</td>
                    <td class="muted">{{ $row['details'] ?: '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="muted" style="text-align:center;">No audit logs found for this period.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">MAPTECH INFORMATION SOLUTIONS INC. - Confidential Audit Report</div>
</body>
</html>
