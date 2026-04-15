<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\AuditLog;
use App\Services\AuditService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(
        private AuditService $audit,
    ) {}

    /**
     * List audit logs for a project, optionally filtered by action or resource type.
     */
    public function indexForProject(Request $request, Project $project): JsonResponse
    {
        $query = $this->baseQuery($request)
            ->where('project_id', $project->id)
            ->orderBy('created_at', 'desc');

        $limit = $request->integer('limit', 50);
        $logs = $query->limit($limit)->get()->map(fn ($log) => $this->formatLog($log));

        return response()->json($logs);
    }

    /**
     * Get global audit logs (all projects, admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->baseQuery($request)->orderBy('created_at', 'desc');

        // Support server-side pagination: ?page=1&per_page=100
        if ($request->has('page')) {
            $perPage = min($request->integer('per_page', 100), 200);
            $paginated = $query->paginate($perPage);

            return response()->json([
                'data' => collect($paginated->items())->map(fn ($log) => $this->formatLog($log)),
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page'    => $paginated->lastPage(),
                    'per_page'     => $paginated->perPage(),
                    'total'        => $paginated->total(),
                ],
            ]);
        }

        // Legacy: flat array with limit (for backwards compat with AppContext / other callers)
        $limit = $request->integer('limit', 100);
        $logs = $query->limit($limit)->get()->map(fn ($log) => $this->formatLog($log));

        return response()->json($logs);
    }

    /**
     * Export audit logs as PDF.
     * Supports ?period=weekly|monthly|yearly + existing filters.
     */
    public function exportPdf(Request $request)
    {
        $now = Carbon::now();
        [$period, $periodLabel, $dateRange, $startDate, $endDate] = $this->resolvePeriod($request->input('period', 'monthly'));

        $logs = $this->baseQuery($request)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')
            ->limit($request->integer('limit', 2000))
            ->get();

        $rows = $logs->map(function (AuditLog $log) {
            return [
                'date' => $log->created_at?->format('M d, Y h:i A') ?? '—',
                'entity' => $log->resource_type,
                'activity' => $log->resource_type . ' #' . $log->resource_id,
                'action' => $log->action,
                'actor' => $log->user_id ? ('User #' . $log->user_id) : 'System',
                'project' => $log->project_id ? ('Project #' . $log->project_id) : 'Global',
                'details' => $this->compactDetails($log),
            ];
        })->toArray();

        $summary = [
            'totalLogs' => count($rows),
            'sensitiveLogs' => $logs->where('sensitive_flag', true)->count(),
            'uniqueActions' => $logs->pluck('action')->filter()->unique()->count(),
            'projectScoped' => $logs->pluck('project_id')->filter()->unique()->count(),
        ];

        $filters = [
            'search' => (string) $request->query('search', ''),
            'action' => (string) $request->query('action', ''),
            'resourceType' => (string) $request->query('resourceType', ''),
            'projectId' => (string) $request->query('projectId', ''),
        ];

        $pdf = Pdf::loadView('pdf.audit-logs-report', [
            'summary' => $summary,
            'filters' => $filters,
            'periodLabel' => $periodLabel,
            'dateRange' => $dateRange,
            'generatedAt' => $now->format('M d, Y h:i A'),
            'rows' => $rows,
        ]);
        $pdf->setPaper('A4', 'portrait');

        $filename = 'audit-logs-' . $period . '-' . $now->format('Y-m-d') . '.pdf';

        $this->audit->auditLogReportExported('pdf', $period);

        return $pdf->download($filename);
    }

    /**
         * Export audit logs as a real .xlsx file (Open XML via ZipArchive).
     * Supports ?period=weekly|monthly|yearly + existing filters.
     */
        public function exportSheet(Request $request)
    {
                $now = Carbon::now();
        [$period, $periodLabel, $dateRange, $startDate, $endDate] = $this->resolvePeriod($request->input('period', 'monthly'));

        $logs = $this->baseQuery($request)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')
            ->limit($request->integer('limit', 5000))
            ->get();

                $summary = [
                        'totalLogs' => $logs->count(),
                        'sensitiveLogs' => $logs->where('sensitive_flag', true)->count(),
                        'uniqueActions' => $logs->pluck('action')->filter()->unique()->count(),
                        'projectScoped' => $logs->pluck('project_id')->filter()->unique()->count(),
                ];

                $filters = [
                        'search' => (string) $request->query('search', ''),
                        'action' => (string) $request->query('action', ''),
                        'resourceType' => (string) $request->query('resourceType', ''),
                        'projectId' => (string) $request->query('projectId', ''),
                ];

                // ── Build Open XML xlsx (same pattern as Budget Report export) ───────
                $colLetters = ['A','B','C','D','E','F','G','H','I','J'];
                $x = fn (string $s): string => htmlspecialchars($s, ENT_XML1, 'UTF-8');
                $rows = [];
                $merges = [];
                $rowNum = 0;

                $addRow = function (array $vals, array $styles = [], ?int $mergeToCol = null) use (&$rows, &$merges, &$rowNum, $colLetters) {
                        $rowNum++;
                        $rows[] = ['vals' => $vals, 'styles' => $styles];
                        if ($mergeToCol !== null) {
                                $endCol = $colLetters[$mergeToCol - 1] ?? chr(64 + $mergeToCol);
                                $merges[] = "A{$rowNum}:{$endCol}{$rowNum}";
                        }
                };

                $addRow(["AUDIT LOGS REPORT - {$periodLabel}"], [2], 8);
                $addRow(["Range: {$dateRange}"], [0], 8);
                $addRow(["Generated: " . $now->format('M d, Y h:i A')], [0], 8);
                $addRow([]);

                $addRow(['SUMMARY'], [2], 8);
                $addRow(['Total Logs', 'Sensitive Logs', 'Unique Actions', 'Projects Involved'], array_fill(0, 4, 1));
                $addRow([
                        (string) $summary['totalLogs'],
                        (string) $summary['sensitiveLogs'],
                        (string) $summary['uniqueActions'],
                        (string) $summary['projectScoped'],
                ], [3, 5, 4, 7]);
                $addRow([]);

                $addRow(['ACTIVE FILTERS'], [2], 8);
                $addRow(['Search', 'Action', 'Entity', 'Project'], array_fill(0, 4, 1));
                $addRow([
                        $filters['search'] !== '' ? $filters['search'] : 'None',
                        $filters['action'] !== '' ? $filters['action'] : 'All',
                        $filters['resourceType'] !== '' ? $filters['resourceType'] : 'All',
                        $filters['projectId'] !== '' ? ('Project #' . $filters['projectId']) : 'All',
                ], [0, 0, 0, 0]);
                $addRow([]);

                $addRow(['AUDIT LOG ENTRIES'], [2], 8);
                $addRow(['Date', 'Entity', 'Activity', 'Action', 'Actor', 'Project', 'Sensitive', 'Details'], array_fill(0, 8, 1));
                foreach ($logs as $log) {
                        $addRow([
                                $log->created_at?->format('Y-m-d H:i:s') ?? '',
                                $log->resource_type,
                                $log->resource_type . ' #' . $log->resource_id,
                                $log->action,
                                $log->user_id ? ('User #' . $log->user_id) : 'System',
                                $log->project_id ? ('Project #' . $log->project_id) : 'Global',
                                $log->sensitive_flag ? 'Yes' : 'No',
                                $this->compactDetails($log),
                        ], [0, 0, 0, 0, 0, 0, $log->sensitive_flag ? 5 : 4, 0]);
                }

                $sheetRows = '';
                foreach ($rows as $rIdx => $row) {
                        $rNum = $rIdx + 1;
                        $cells = '';
                        foreach ($row['vals'] as $cIdx => $val) {
                                $col = $colLetters[$cIdx] ?? chr(65 + $cIdx);
                                $cellRef = $col . $rNum;
                                $styleIdx = $row['styles'][$cIdx] ?? 0;
                                if ($val === null || $val === '') {
                                        $cells .= "<c r=\"{$cellRef}\" s=\"{$styleIdx}\"><v></v></c>";
                                } else {
                                        $escaped = $x((string) $val);
                                        $cells .= "<c r=\"{$cellRef}\" s=\"{$styleIdx}\" t=\"inlineStr\"><is><t>{$escaped}</t></is></c>";
                                }
                        }
                        $sheetRows .= "<row r=\"{$rNum}\">{$cells}</row>";
                }

                $mergeCellsXml = '';
                if (!empty($merges)) {
                        $mergeCellsXml = '<mergeCells count="' . count($merges) . '">';
                        foreach ($merges as $m) {
                                $mergeCellsXml .= "<mergeCell ref=\"{$m}\"/>";
                        }
                        $mergeCellsXml .= '</mergeCells>';
                }

                $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheetViews><sheetView workbookViewId="0"/></sheetViews>
    <cols>
        <col min="1" max="1" width="22" customWidth="1"/>
        <col min="2" max="2" width="16" customWidth="1"/>
        <col min="3" max="3" width="24" customWidth="1"/>
        <col min="4" max="4" width="24" customWidth="1"/>
        <col min="5" max="5" width="18" customWidth="1"/>
        <col min="6" max="6" width="18" customWidth="1"/>
        <col min="7" max="7" width="12" customWidth="1"/>
        <col min="8" max="8" width="60" customWidth="1"/>
    </cols>
    <sheetData>' . $sheetRows . '</sheetData>
    ' . $mergeCellsXml . '
</worksheet>';

                $stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="7">
        <font><sz val="10"/><name val="Arial"/></font>
        <font><sz val="10"/><name val="Arial"/><b/><color rgb="FFFFFFFF"/></font>
        <font><sz val="12"/><name val="Arial"/><b/><color rgb="FF154734"/></font>
        <font><sz val="10"/><name val="Arial"/><b/></font>
        <font><sz val="10"/><name val="Arial"/><b/><color rgb="FF16a34a"/></font>
        <font><sz val="10"/><name val="Arial"/><b/><color rgb="FFdc2626"/></font>
        <font><sz val="10"/><name val="Arial"/><b/><color rgb="FFca8a04"/></font>
    </fonts>
    <fills count="6">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF154734"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFe8f5e9"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFf0fdf4"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFf3f4f6"/></patternFill></fill>
    </fills>
    <borders count="3">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border><left style="thin"><color rgb="FFcccccc"/></left><right style="thin"><color rgb="FFcccccc"/></right><top style="thin"><color rgb="FFcccccc"/></top><bottom style="thin"><color rgb="FFcccccc"/></bottom><diagonal/></border>
        <border><left style="medium"><color rgb="FF154734"/></left><right style="medium"><color rgb="FF154734"/></right><top style="medium"><color rgb="FF154734"/></top><bottom style="medium"><color rgb="FF154734"/></bottom><diagonal/></border>
    </borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="11">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="2" xfId="0"/>
        <xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0"/>
        <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"><alignment horizontal="center"/></xf>
        <xf numFmtId="0" fontId="3" fillId="4" borderId="2" xfId="0"/>
        <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0"/>
    </cellXfs>
</styleSheet>';

                $workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="Audit Logs Report" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>';

                $workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>';

                $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>';

                $packageRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

                $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx_');
                $zip = new \ZipArchive();
                $zip->open($tmpFile, \ZipArchive::OVERWRITE);
                $zip->addFromString('[Content_Types].xml', $contentTypes);
                $zip->addFromString('_rels/.rels', $packageRels);
                $zip->addFromString('xl/workbook.xml', $workbookXml);
                $zip->addFromString('xl/_rels/workbook.xml.rels', $workbookRels);
                $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);
                $zip->addFromString('xl/styles.xml', $stylesXml);
                $zip->close();

                $filename = 'audit-logs-' . $period . '-' . $now->format('Y-m-d') . '.xlsx';
                $content = file_get_contents($tmpFile);
                unlink($tmpFile);

                $this->audit->auditLogReportExported('xlsx', $period);

                return response($content, 200, [
                        'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                        'Content-Length' => strlen($content),
                        'Pragma' => 'no-cache',
                        'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                        'Expires' => '0',
                ]);
    }

    /**
     * Shared filters for audit log listing/export.
     */
    private function baseQuery(Request $request): Builder
    {
        $query = AuditLog::query();

        if ($request->filled('projectId')) {
            $query->where('project_id', $request->query('projectId'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('resourceType')) {
            $query->where('resource_type', $request->query('resourceType'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('resource_type', 'like', "%{$search}%")
                  ->orWhere('context', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    /**
     * Resolve report period for export.
     *
     * @return array{0:string,1:string,2:string,3:Carbon,4:Carbon}
     */
    private function resolvePeriod(string $period): array
    {
        $now = Carbon::now();

        switch ($period) {
            case 'weekly':
                $startDate = $now->copy()->startOfWeek();
                $endDate = $now->copy()->endOfWeek();
                $periodLabel = 'Weekly Audit Logs Report';
                $dateRange = $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y');
                break;
            case 'yearly':
                $startDate = $now->copy()->startOfYear();
                $endDate = $now->copy()->endOfYear();
                $periodLabel = 'Yearly Audit Logs Report';
                $dateRange = $startDate->format('Y');
                break;
            case 'monthly':
            default:
                $period = 'monthly';
                $startDate = $now->copy()->startOfMonth();
                $endDate = $now->copy()->endOfMonth();
                $periodLabel = 'Monthly Audit Logs Report';
                $dateRange = $startDate->format('F Y');
                break;
        }

        return [$period, $periodLabel, $dateRange, $startDate, $endDate];
    }

    /**
     * Compact details field for exports.
     */
    private function compactDetails(AuditLog $log): string
    {
        $parts = [];

        if (!empty($log->context)) {
            $parts[] = 'context=' . json_encode($log->context, JSON_UNESCAPED_SLASHES);
        }
        if (!empty($log->changes)) {
            $parts[] = 'changes=' . json_encode($log->changes, JSON_UNESCAPED_SLASHES);
        }
        if (!empty($log->snapshot)) {
            $parts[] = 'snapshot=' . json_encode($log->snapshot, JSON_UNESCAPED_SLASHES);
        }

        return mb_substr(implode(' | ', $parts), 0, 1000);
    }

    /**
     * Format a log for JSON response.
     */
    private function formatLog(AuditLog $log): array
    {
        return [
            'id'           => (string) $log->id,
            'action'       => $log->action,
            'resourceType' => $log->resource_type,
            'resourceId'   => (string) $log->resource_id,
            'projectId'    => $log->project_id ? (string) $log->project_id : null,
            'userId'       => $log->user_id ? (string) $log->user_id : null,
            'changes'      => $log->changes,
            'snapshot'     => $log->snapshot,
            'context'      => $log->context,
            'sensitive'    => (bool) $log->sensitive_flag,
            'createdAt'    => $log->created_at?->toIso8601String(),
        ];
    }
}
