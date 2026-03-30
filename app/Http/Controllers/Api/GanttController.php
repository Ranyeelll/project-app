<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\GanttDependency;
use App\Models\GanttItem;
use App\Models\Project;
use App\Models\User;
use App\Services\AuditService;
use App\Services\GanttVisibilityService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GanttController extends Controller
{
    public function __construct(
        private GanttVisibilityService $visibility,
        private AuditService $audit,
    ) {}

    // ─── Gantt Items ──────────────────────────────────────────────────────────

    /**
     * Return all visible gantt items for a project, with DFS tree structure.
     * Admin can pass ?preview_as={department} to simulate another dept's view.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $orderedItems = $this->resolveVisibleOrderedItems($request, $project);

        return response()->json(
            collect($orderedItems)->map(fn ($row) => array_merge(
                $this->formatItem($row['item']),
                [
                    'treeIndex' => $row['treeIndex'],
                    'depth' => $row['depth'],
                ]
            ))->values()
        );
    }

    /**
     * Export gantt report as PDF.
     * Supports ?period=weekly|monthly|yearly and ?preview_as for admin preview mode.
     */
    public function exportPdf(Request $request, Project $project)
    {
        $now = Carbon::now();
        [$periodLabel, $dateRange, $startDate, $endDate] = $this->resolveProjectExportRange($project);

        $orderedItems = $this->resolveVisibleOrderedItems($request, $project);
        $itemRows = $this->buildExportRows($orderedItems, $startDate, $endDate);
        $summary = $this->buildExportSummary($itemRows);
        $timelineColumns = $this->buildTimelineColumns($startDate, $endDate);
        $ganttRows = $this->buildGanttLayoutRows($itemRows, $startDate, $endDate);
        $filters = [
            'project' => $project->name,
            'previewAs' => (string) $request->query('preview_as', ''),
        ];

        $pdf = Pdf::loadView('pdf.gantt-report', [
            'summary' => $summary,
            'filters' => $filters,
            'periodLabel' => $periodLabel,
            'dateRange' => $dateRange,
            'generatedAt' => $now->format('M d, Y h:i A'),
            'rows' => $ganttRows,
            'timelineColumns' => $timelineColumns,
            'projectName' => $project->name,
            'rangeStart' => $startDate,
            'rangeEnd' => $endDate,
        ]);
        $pdf->setPaper('A4', 'landscape');

        $filename = 'gantt-report-' . $project->id . '-' . $now->format('Y-m-d') . '.pdf';

        $this->audit->ganttReportExported('pdf', 'project', (string) $project->id);

        return $pdf->download($filename);
    }

    /**
     * Export gantt report as XLSX (Open XML).
     * Supports ?period=weekly|monthly|yearly and ?preview_as for admin preview mode.
     */
    public function exportSheet(Request $request, Project $project)
    {
        $now = Carbon::now();
        [$periodLabel, $dateRange, $startDate, $endDate] = $this->resolveProjectExportRange($project);

        $orderedItems = $this->resolveVisibleOrderedItems($request, $project);
        $itemRows = $this->buildExportRows($orderedItems, $startDate, $endDate);
        $summary = $this->buildExportSummary($itemRows);
        $timelineColumns = $this->buildWeeklyTimelineColumns($startDate, $endDate);
        $ganttRows = $this->buildGanttMatrix($itemRows, $timelineColumns);

        $x = fn (string $s): string => htmlspecialchars($s, ENT_XML1, 'UTF-8');
        $rows = [];
        $merges = [];
        $rowNum = 0;

        $excelCol = static function (int $index): string {
            $name = '';
            while ($index > 0) {
                $index--;
                $name = chr(65 + ($index % 26)) . $name;
                $index = intdiv($index, 26);
            }
            return $name;
        };

        $addRow = function (array $vals, array $styles = [], ?int $mergeToCol = null) use (&$rows, &$merges, &$rowNum, $excelCol) {
            $rowNum++;
            $rows[] = ['vals' => $vals, 'styles' => $styles];
            if ($mergeToCol !== null) {
                $endCol = $excelCol($mergeToCol);
                $merges[] = "A{$rowNum}:{$endCol}{$rowNum}";
            }
        };

        $totalCols = 6 + count($timelineColumns);

        $addRow(["GANTT REPORT - {$periodLabel}"], [2], $totalCols);
        $addRow(["Project: {$project->name}"], [0], $totalCols);
        $addRow(["Range: {$dateRange}"], [0], $totalCols);
        $addRow(["Generated: " . $now->format('M d, Y h:i A')], [0], $totalCols);
        $addRow([]);

        $addRow(['SUMMARY'], [2], $totalCols);
        $addRow(['Total Items', 'Phases', 'Steps', 'Subtasks', 'Milestones', 'Avg Progress', 'Dependencies'], array_fill(0, 7, 1));
        $addRow([
            (string) $summary['totalItems'],
            (string) $summary['phaseCount'],
            (string) $summary['stepCount'],
            (string) $summary['subtaskCount'],
            (string) $summary['milestoneCount'],
            (string) $summary['avgProgress'] . '%',
            (string) $summary['dependencyCount'],
        ], [3, 3, 3, 3, 3, 8, 3]);
        $addRow([]);

        $addRow(['GANTT CHART'], [2], $totalCols);
        $header = ['#', 'Task Name', 'Duration', 'Start', 'End', 'State'];
        foreach ($timelineColumns as $col) {
            $header[] = $col['label'];
        }
        $addRow($header, array_fill(0, count($header), 1));

        foreach ($ganttRows as $row) {
            $vals = [
                $row['treeIndex'],
                $row['taskName'],
                (string) $row['durationDays'],
                $row['startDate'],
                $row['endDate'],
                ucfirst($row['state']),
            ];
            $styles = [0, 0, 8, 0, 0, 8];
            foreach ($row['cells'] as $filled) {
                $vals[] = '';
                if (!$filled) {
                    $styles[] = 12;
                    continue;
                }

                $state = (string) ($row['state'] ?? 'planned');
                if ($state === 'completed') {
                    $styles[] = 15;
                } elseif ($state === 'in process') {
                    $styles[] = 13;
                } else {
                    $styles[] = 14;
                }
            }
            $addRow($vals, $styles);
        }

        $sheetRows = '';
        foreach ($rows as $rIdx => $row) {
            $rNum = $rIdx + 1;
            $cells = '';
            foreach ($row['vals'] as $cIdx => $val) {
                $col = $excelCol($cIdx + 1);
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

        $colsXml = '';
        for ($i = 1; $i <= $totalCols; $i++) {
            if ($i === 1) {
                $width = 10;
            } elseif ($i === 2) {
                $width = 34;
            } elseif ($i === 3) {
                $width = 10;
            } elseif ($i === 4 || $i === 5) {
                $width = 12;
            } elseif ($i === 6) {
                $width = 12;
            } else {
                $width = 6;
            }
            $colsXml .= '<col min="' . $i . '" max="' . $i . '" width="' . $width . '" customWidth="1"/>';
        }

        $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>' . $colsXml . '</cols>
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
    <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF154734"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFe8f5e9"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFf0fdf4"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFf3f4f6"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFf59e0b"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFef4444"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF63D44A"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFcccccc"/></left><right style="thin"><color rgb="FFcccccc"/></right><top style="thin"><color rgb="FFcccccc"/></top><bottom style="thin"><color rgb="FFcccccc"/></bottom><diagonal/></border>
    <border><left style="medium"><color rgb="FF154734"/></left><right style="medium"><color rgb="FF154734"/></right><top style="medium"><color rgb="FF154734"/></top><bottom style="medium"><color rgb="FF154734"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="16">
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
        <xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0"><alignment horizontal="center"/></xf>
        <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0"><alignment horizontal="center"/></xf>
                <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0"/>
                <xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0"/>
                <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0"/>
  </cellXfs>
</styleSheet>';

        $workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Gantt Report" sheetId="1" r:id="rId1"/>
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

        $filename = 'gantt-report-' . $project->id . '-' . $now->format('Y-m-d') . '.xlsx';
        $content = file_get_contents($tmpFile);
        unlink($tmpFile);

        $this->audit->ganttReportExported('xlsx', 'project', (string) $project->id);

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
     * Recursively traverse the tree, computing treeIndex and depth.
     */
    private function dfsTraverse($nodes, $byId, array &$result, array $parentIndex, int $depth): void
    {
        $counter = 1;
        foreach ($nodes as $node) {
            $currentIndex = array_merge($parentIndex, [$counter]);
            $treeIndex = implode('.', $currentIndex);

            $result[] = array_merge($this->formatItem($node), [
                'treeIndex' => $treeIndex,
                'depth'     => $depth,
            ]);

            // Recurse into children
            $children = $byId->filter(fn ($item) => $item->parent_id === $node->id)
                              ->sortBy('position')
                              ->values();

            if ($children->isNotEmpty()) {
                $this->dfsTraverse($children, $byId, $result, $currentIndex, $depth + 1);
            }

            $counter++;
        }
    }

    /**
     * Resolve visible gantt items and preserve tree order, tree index and depth.
     *
     * @return array<int,array{item:GanttItem,treeIndex:string,depth:int}>
     */
    private function resolveVisibleOrderedItems(Request $request, Project $project): array
    {
        $user = Auth::user();

        $previewDept = null;
        if ($user->department === Department::Admin && $request->has('preview_as')) {
            $previewDept = $request->string('preview_as');
        }

        $allItems = GanttItem::where('project_id', $project->id)
            ->orderBy('position')
            ->get();

        $effectiveUser = $user;
        if ($previewDept) {
            $tempUser = clone $user;
            $tempUser->department = Department::from($previewDept);
            $effectiveUser = $tempUser;
        }

        if ($effectiveUser->department !== Department::Admin || $previewDept) {
            $allItems = $allItems->filter(
                fn ($item) => $this->visibility->isVisible($item, $effectiveUser)
            )->values();
        }

        $byId = $allItems->keyBy('id');
        $roots = $allItems->filter(
            fn ($item) => is_null($item->parent_id) || !$byId->has($item->parent_id)
        )->values();

        $ordered = [];
        $this->dfsTraverseModels($roots, $byId, $ordered, [], 0);

        return $ordered;
    }

    /**
     * DFS traversal returning typed rows for report/export use.
     */
    private function dfsTraverseModels($nodes, $byId, array &$result, array $parentIndex, int $depth): void
    {
        $counter = 1;
        foreach ($nodes as $node) {
            $currentIndex = array_merge($parentIndex, [$counter]);
            $treeIndex = implode('.', $currentIndex);

            $result[] = [
                'item' => $node,
                'treeIndex' => $treeIndex,
                'depth' => $depth,
            ];

            $children = $byId->filter(fn ($item) => $item->parent_id === $node->id)
                ->sortBy('position')
                ->values();

            if ($children->isNotEmpty()) {
                $this->dfsTraverseModels($children, $byId, $result, $currentIndex, $depth + 1);
            }

            $counter++;
        }
    }

    /**
     * @param array<int,array{item:GanttItem,treeIndex:string,depth:int}> $orderedItems
     * @return array<int,array<string,mixed>>
     */
    private function buildExportRows(array $orderedItems, Carbon $startDate, Carbon $endDate): array
    {
        $itemIds = collect($orderedItems)->pluck('item.id')->all();
        $itemsById = collect($orderedItems)->mapWithKeys(fn ($row) => [$row['item']->id => $row['item']]);
        $childrenByParent = collect($orderedItems)
            ->groupBy(fn ($row) => $row['item']->parent_id)
            ->map(fn ($group) => $group->pluck('item.id')->values()->all());

        $resolvedDateRangeByItem = [];
        $resolveDateRange = function (int $itemId) use (&$resolveDateRange, &$resolvedDateRangeByItem, $itemsById, $childrenByParent): array {
            if (isset($resolvedDateRangeByItem[$itemId])) {
                return $resolvedDateRangeByItem[$itemId];
            }

            /** @var GanttItem|null $item */
            $item = $itemsById->get($itemId);
            if (!$item) {
                return [null, null];
            }

            $start = $item->start_date ? Carbon::parse($item->start_date)->startOfDay() : null;
            $end = $item->end_date ? Carbon::parse($item->end_date)->startOfDay() : null;

            $childIds = $childrenByParent->get($itemId, []);
            foreach ($childIds as $childId) {
                [$childStart, $childEnd] = $resolveDateRange((int) $childId);
                if ($childStart && (!$start || $childStart < $start)) {
                    $start = $childStart->copy();
                }
                if ($childEnd && (!$end || $childEnd > $end)) {
                    $end = $childEnd->copy();
                }
            }

            if ($start && !$end) {
                $end = $start->copy();
            }
            if ($end && !$start) {
                $start = $end->copy();
            }

            return $resolvedDateRangeByItem[$itemId] = [$start, $end];
        };

        foreach ($itemIds as $itemId) {
            $resolveDateRange((int) $itemId);
        }

        $userMap = User::whereIn('id', collect($orderedItems)->flatMap(fn ($row) => $row['item']->assignee_ids ?? [])->unique()->values()->all())->get()->keyBy('id');
        $deps = GanttDependency::whereIn('predecessor_id', $itemIds)
            ->whereIn('successor_id', $itemIds)
            ->get();
        $depCountByItem = [];
        foreach ($deps as $dep) {
            $depCountByItem[$dep->predecessor_id] = ($depCountByItem[$dep->predecessor_id] ?? 0) + 1;
            $depCountByItem[$dep->successor_id] = ($depCountByItem[$dep->successor_id] ?? 0) + 1;
        }

        return collect($orderedItems)
            ->filter(function ($row) use ($startDate, $endDate) {
                $item = $row['item'];
                [$start, $end] = $resolvedDateRangeByItem[$item->id] ?? [null, null];

                if (!$start && !$end) {
                    return true;
                }
                if ($start && !$end) {
                    return $start >= $startDate && $start <= $endDate;
                }
                if (!$start && $end) {
                    return $end >= $startDate && $end <= $endDate;
                }

                return $end >= $startDate && $start <= $endDate;
            })
            ->map(function ($row) use ($userMap, $depCountByItem, $resolvedDateRangeByItem) {
                $item = $row['item'];
                [$resolvedStart, $resolvedEnd] = $resolvedDateRangeByItem[$item->id] ?? [null, null];

                $start = $resolvedStart ? $resolvedStart->format('Y-m-d') : '—';
                $end = $resolvedEnd ? $resolvedEnd->format('Y-m-d') : '—';
                $duration = '—';
                if ($resolvedStart && $resolvedEnd) {
                    $duration = (string) max($resolvedStart->diffInDays($resolvedEnd) + 1, 1);
                }

                $assignees = collect($item->assignee_ids ?? [])
                    ->map(fn ($id) => $userMap[$id]->name ?? ('User #' . $id))
                    ->implode(', ');

                $state = $item->progress >= 100
                    ? 'completed'
                    : ($item->progress <= 0 ? 'planned' : 'in process');

                return [
                    'treeIndex' => $row['treeIndex'],
                    'depth' => $row['depth'],
                    'taskName' => $item->name,
                    'type' => $item->type,
                    'state' => $state,
                    'progress' => (int) $item->progress,
                    'startDate' => $start,
                    'endDate' => $end,
                    'durationDays' => $duration,
                    'assignees' => $assignees !== '' ? $assignees : '—',
                    'dependencyCount' => $depCountByItem[$item->id] ?? 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @return array<string,int|float>
     */
    private function buildExportSummary(array $rows): array
    {
        $total = count($rows);
        $avgProgress = $total > 0
            ? round(collect($rows)->sum(fn ($r) => (int) $r['progress']) / $total, 1)
            : 0;

        return [
            'totalItems' => $total,
            'phaseCount' => collect($rows)->where('type', 'phase')->count(),
            'stepCount' => collect($rows)->where('type', 'step')->count(),
            'subtaskCount' => collect($rows)->where('type', 'subtask')->count(),
            'milestoneCount' => collect($rows)->where('type', 'milestone')->count(),
            'avgProgress' => $avgProgress,
            'dependencyCount' => (int) collect($rows)->sum(fn ($r) => (int) $r['dependencyCount']),
        ];
    }

    /**
     * @return array<int,array{label:string,start:Carbon,end:Carbon,widthPct:float}>
     */
    private function buildTimelineColumns(Carbon $startDate, Carbon $endDate): array
    {
        $columns = [];
        $cursor = $startDate->copy()->startOfMonth();
        $totalDays = max($startDate->diffInDays($endDate) + 1, 1);

        while ($cursor <= $endDate) {
            $monthStart = $cursor->copy()->startOfMonth();
            $monthEnd = $cursor->copy()->endOfMonth();

            if ($monthStart < $startDate) {
                $monthStart = $startDate->copy();
            }
            if ($monthEnd > $endDate) {
                $monthEnd = $endDate->copy();
            }

            $columns[] = [
                'label' => $monthStart->format('M Y'),
                'start' => $monthStart->startOfDay(),
                'end' => $monthEnd->endOfDay(),
                'widthPct' => (max($monthStart->diffInDays($monthEnd) + 1, 1) / $totalDays) * 100,
            ];
            $cursor->addMonth();
        }

        return $columns;
    }

    /**
     * Weekly slots for XLSX gantt matrix (denser than month blocks).
     *
     * @return array<int,array{label:string,start:Carbon,end:Carbon}>
     */
    private function buildWeeklyTimelineColumns(Carbon $startDate, Carbon $endDate): array
    {
        $columns = [];
        $cursor = $startDate->copy()->startOfWeek();

        while ($cursor <= $endDate) {
            $slotStart = $cursor->copy();
            $slotEnd = $cursor->copy()->endOfWeek();

            if ($slotStart < $startDate) {
                $slotStart = $startDate->copy();
            }
            if ($slotEnd > $endDate) {
                $slotEnd = $endDate->copy();
            }

            $columns[] = [
                'label' => $slotStart->format('m/d'),
                'start' => $slotStart->startOfDay(),
                'end' => $slotEnd->endOfDay(),
            ];

            $cursor->addWeek();
        }

        return $columns;
    }

    /**
     * Resolve export range from the project schedule itself.
     *
     * @return array{0:string,1:string,2:Carbon,3:Carbon}
     */
    private function resolveProjectExportRange(Project $project): array
    {
        $query = GanttItem::where('project_id', $project->id);

        $minStart = (clone $query)->whereNotNull('start_date')->min('start_date');
        $maxEnd = (clone $query)->whereNotNull('end_date')->max('end_date');

        $fallbackStart = $project->start_date ? Carbon::parse($project->start_date) : Carbon::now()->startOfMonth();
        $fallbackEnd = $project->end_date ? Carbon::parse($project->end_date) : $fallbackStart->copy()->addMonths(2)->endOfMonth();

        $startDate = $minStart ? Carbon::parse($minStart)->startOfMonth() : $fallbackStart->copy()->startOfMonth();
        $endDate = $maxEnd ? Carbon::parse($maxEnd)->endOfMonth() : $fallbackEnd->copy()->endOfMonth();

        if ($endDate < $startDate) {
            $endDate = $startDate->copy()->addMonths(2)->endOfMonth();
        }

        $periodLabel = 'Project Gantt Chart';
        $dateRange = $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y');

        return [$periodLabel, $dateRange, $startDate, $endDate];
    }

    /**
     * @param array<int,array<string,mixed>> $rows
     * @param array<int,array{label:string,start:Carbon,end:Carbon}> $columns
     * @return array<int,array<string,mixed>>
     */
    private function buildGanttMatrix(array $rows, array $columns): array
    {
        return collect($rows)->map(function ($row) use ($columns) {
            $start = ($row['startDate'] ?? '—') !== '—' ? Carbon::parse((string) $row['startDate'])->startOfDay() : null;
            $end = ($row['endDate'] ?? '—') !== '—' ? Carbon::parse((string) $row['endDate'])->startOfDay() : $start;

            $cells = [];
            foreach ($columns as $col) {
                if (!$start || !$end) {
                    $cells[] = false;
                    continue;
                }
                $cells[] = $start <= $col['end'] && $end >= $col['start'];
            }

            $row['cells'] = $cells;

            return $row;
        })->values()->all();
    }

    /**
     * Build rows with proportional bar geometry for PDF gantt lane rendering.
     *
     * @param array<int,array<string,mixed>> $rows
     * @return array<int,array<string,mixed>>
     */
    private function buildGanttLayoutRows(array $rows, Carbon $rangeStart, Carbon $rangeEnd): array
    {
        $totalDays = max($rangeStart->diffInDays($rangeEnd) + 1, 1);

        return collect($rows)->map(function ($row) use ($rangeStart, $totalDays) {
            $start = ($row['startDate'] ?? '—') !== '—' ? Carbon::parse((string) $row['startDate'])->startOfDay() : null;
            $end = ($row['endDate'] ?? '—') !== '—' ? Carbon::parse((string) $row['endDate'])->startOfDay() : $start;

            $leftPct = null;
            $widthPct = null;
            if ($start && $end) {
                $leftDays = $rangeStart->diffInDays($start, false);
                $leftPct = max(0, min(100, ($leftDays / $totalDays) * 100));

                $spanDays = max($start->diffInDays($end) + 1, 1);
                $widthPct = max((1 / $totalDays) * 100, ($spanDays / $totalDays) * 100);
                if (($leftPct + $widthPct) > 100) {
                    $widthPct = max(100 - $leftPct, (1 / $totalDays) * 100);
                }
            }

            $state = (string) ($row['state'] ?? 'planned');
            $barColor = '#f59e0b';
            if ($state === 'completed') {
                $barColor = '#63D44A';
            } elseif ($state === 'planned') {
                $barColor = '#ef4444';
            }

            $row['leftPct'] = $leftPct;
            $row['widthPct'] = $widthPct;
            $row['barColor'] = $barColor;
            $row['isMilestone'] = ($row['type'] ?? '') === 'milestone';

            return $row;
        })->values()->all();
    }

    /**
     * @return array{0:string,1:string,2:string,3:Carbon,4:Carbon}
     */
    private function resolvePeriod(string $period): array
    {
        $now = Carbon::now();

        switch ($period) {
            case 'weekly':
                $startDate = $now->copy()->startOfWeek();
                $endDate = $now->copy()->endOfWeek();
                $periodLabel = 'Weekly Gantt Report';
                $dateRange = $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y');
                break;
            case 'yearly':
                $startDate = $now->copy()->startOfYear();
                $endDate = $now->copy()->endOfYear();
                $periodLabel = 'Yearly Gantt Report';
                $dateRange = $startDate->format('Y');
                break;
            case 'monthly':
            default:
                $period = 'monthly';
                $startDate = $now->copy()->startOfMonth();
                $endDate = $now->copy()->endOfMonth();
                $periodLabel = 'Monthly Gantt Report';
                $dateRange = $startDate->format('F Y');
                break;
        }

        return [$period, $periodLabel, $dateRange, $startDate, $endDate];
    }

    /**
     * Create a new gantt item.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'parent_id'        => 'nullable|exists:gantt_items,id',
            'type'             => 'required|in:phase,step,subtask,milestone',
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string',
            'start_date'       => 'nullable|date|required_with:end_date',
            'end_date'         => 'nullable|date|after_or_equal:start_date|required_with:start_date',
            'progress'         => 'nullable|integer|min:0|max:100',
            'position'         => 'nullable|integer|min:0',
            'assignee_ids'     => 'nullable|array',
            'assignee_ids.*'   => 'string',
            'visible_to_roles' => 'nullable|array',
            'visible_to_roles.*' => 'string',
            'visible_to_users' => 'nullable|array',
            'visible_to_users.*' => 'string',
        ]);

        $this->assertWithinProjectDateRange($project, $data['start_date'] ?? null, $data['end_date'] ?? null);

        $item = GanttItem::create(array_merge($data, [
            'project_id' => $project->id,
            'progress'   => $data['progress'] ?? 0,
            'position'   => $data['position'] ?? 0,
        ]));

        AuditService::logGanttItemCreated(
            $item->id,
            $project->id,
            $item->type,
            $item->name,
            Auth::id()
        );

        return response()->json($this->formatItem($item), 201);
    }

    /**
     * Update a gantt item.
     */
    public function update(Request $request, Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'start_date'       => 'nullable|date|required_with:end_date',
            'end_date'         => 'nullable|date|after_or_equal:start_date|required_with:start_date',
            'progress'         => 'nullable|integer|min:0|max:100',
            'position'         => 'nullable|integer|min:0',
            'assignee_ids'     => 'nullable|array',
            'assignee_ids.*'   => 'string',
            'visible_to_roles' => 'nullable|array',
            'visible_to_roles.*' => 'string',
            'visible_to_users' => 'nullable|array',
            'visible_to_users.*' => 'string',
        ]);

        $nextStart = array_key_exists('start_date', $data)
            ? ($data['start_date'] ?: null)
            : ($item->start_date?->toDateString());
        $nextEnd = array_key_exists('end_date', $data)
            ? ($data['end_date'] ?: null)
            : ($item->end_date?->toDateString());

        $this->assertWithinProjectDateRange($project, $nextStart, $nextEnd);

        // Detect visibility changes for audit
        $oldRoles = $item->visible_to_roles ?? [];
        $oldUsers = $item->visible_to_users ?? [];
        $visibilityChanged = isset($data['visible_to_roles']) || isset($data['visible_to_users']);

        $item->update($data);

        if ($visibilityChanged) {
            AuditService::logGanttVisibilityChange(
                $item->id,
                $project->id,
                $oldRoles,
                $data['visible_to_roles'] ?? $oldRoles,
                $oldUsers,
                $data['visible_to_users'] ?? $oldUsers,
                Auth::id()
            );
        }

        return response()->json($this->formatItem($item->fresh()));
    }

    /**
     * Delete a gantt item (cascade deletes children).
     */
    public function destroy(Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        AuditService::logGanttItemDeleted(
            $item->id,
            $project->id,
            $item->type,
            $item->name,
            Auth::id()
        );

        $item->delete();

        return response()->json(['message' => 'Gantt item deleted.']);
    }

    /**
     * Move a gantt item (update parent and/or position).
     */
    public function move(Request $request, Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        $data = $request->validate([
            'parent_id' => 'nullable|exists:gantt_items,id',
            'position'  => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($item, $data) {
            $item->update([
                'parent_id' => $data['parent_id'] ?? null,
                'position'  => $data['position'],
            ]);
        });

        return response()->json($this->formatItem($item->fresh()));
    }

    // ─── Gantt Dependencies ───────────────────────────────────────────────────

    /**
     * List all dependencies for a project.
     */
    public function indexDependencies(Project $project): JsonResponse
    {
        $dependencies = GanttDependency::where('project_id', $project->id)
            ->get()
            ->map(fn ($d) => $this->formatDependency($d));

        return response()->json($dependencies);
    }

    /**
     * Create a new dependency (with BFS cycle detection).
     */
    public function storeDependency(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'predecessor_id' => 'required|exists:gantt_items,id',
            'successor_id'   => 'required|exists:gantt_items,id|different:predecessor_id',
            'type'           => 'nullable|in:finish_to_start',
        ]);

        // Ensure both items belong to this project
        $predecessor = GanttItem::where('project_id', $project->id)
            ->where('id', $data['predecessor_id'])
            ->firstOrFail();

        $successor = GanttItem::where('project_id', $project->id)
            ->where('id', $data['successor_id'])
            ->firstOrFail();

        // BFS cycle detection: check if predecessor is reachable from successor
        if ($this->wouldCreateCycle($project->id, $predecessor->id, $successor->id)) {
            return response()->json([
                'message' => 'This dependency would create a cycle in the Gantt chart.',
            ], 422);
        }

        $dependency = GanttDependency::create([
            'project_id'     => $project->id,
            'predecessor_id' => $predecessor->id,
            'successor_id'   => $successor->id,
            'type'           => $data['type'] ?? 'finish_to_start',
        ]);

        return response()->json($this->formatDependency($dependency), 201);
    }

    /**
     * Delete a dependency.
     */
    public function destroyDependency(Project $project, GanttDependency $dependency): JsonResponse
    {
        if ($dependency->project_id !== $project->id) {
            abort(404);
        }

        $dependency->delete();

        return response()->json(['message' => 'Dependency deleted.']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * BFS cycle detection.
     * Returns true if adding predecessor→successor would create a cycle.
     * i.e. checks if predecessor is already reachable from successor.
     */
    private function wouldCreateCycle(int $projectId, int $predecessorId, int $successorId): bool
    {
        // Load all existing dependencies for this project
        $deps = GanttDependency::where('project_id', $projectId)
            ->get()
            ->groupBy('predecessor_id');

        // BFS from successor: if we can reach predecessor, it's a cycle
        $visited = [];
        $queue = [$successorId];

        while (!empty($queue)) {
            $current = array_shift($queue);

            if ($current === $predecessorId) {
                return true;
            }

            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;

            // Enqueue all nodes that current points to (as predecessor)
            if ($deps->has($current)) {
                foreach ($deps[$current] as $dep) {
                    $queue[] = $dep->successor_id;
                }
            }
        }

        return false;
    }

    private function authorizeItemBelongsToProject(GanttItem $item, Project $project): void
    {
        if ($item->project_id !== $project->id) {
            abort(404);
        }
    }

    private function assertWithinProjectDateRange(Project $project, ?string $startDate, ?string $endDate): void
    {
        if (!$startDate && !$endDate) {
            return;
        }

        $projectStart = $project->start_date ? Carbon::parse($project->start_date)->startOfDay() : null;
        $projectEnd = $project->end_date ? Carbon::parse($project->end_date)->startOfDay() : null;

        if (!$projectStart || !$projectEnd) {
            return;
        }

        $start = $startDate ? Carbon::parse($startDate)->startOfDay() : null;
        $end = $endDate ? Carbon::parse($endDate)->startOfDay() : $start;

        if ($start && $start < $projectStart) {
            throw ValidationException::withMessages([
                'start_date' => ['Start date must be on or after project start date (' . $projectStart->toDateString() . ').'],
            ]);
        }

        if ($end && $end > $projectEnd) {
            throw ValidationException::withMessages([
                'end_date' => ['End date must be on or before project end date (' . $projectEnd->toDateString() . ').'],
            ]);
        }
    }

    private function formatItem(GanttItem $item): array
    {
        return [
            'id'             => (string) $item->id,
            'projectId'      => (string) $item->project_id,
            'parentId'       => $item->parent_id ? (string) $item->parent_id : null,
            'type'           => $item->type,
            'name'           => $item->name,
            'description'    => $item->description,
            // Return ISO timestamps (with timezone) for consistent client parsing
            // Frontend parsing of "YYYY-MM-DD" can be interpreted as UTC by some
            // browsers which causes off-by-one-day shifts in certain timezones.
            'startDate'      => $item->start_date?->toIso8601String(),
            'endDate'        => $item->end_date?->toIso8601String(),
            'progress'       => (int) $item->progress,
            'position'       => (int) $item->position,
            'assigneeIds'    => $item->assignee_ids ?? [],
            'visibleToRoles' => $item->visible_to_roles ?? [],
            'visibleToUsers' => $item->visible_to_users ?? [],
            'createdAt'      => $item->created_at?->toISOString(),
            'updatedAt'      => $item->updated_at?->toISOString(),
        ];
    }

    private function formatDependency(GanttDependency $dep): array
    {
        return [
            'id'            => (string) $dep->id,
            'projectId'     => (string) $dep->project_id,
            'predecessorId' => (string) $dep->predecessor_id,
            'successorId'   => (string) $dep->successor_id,
            'type'          => $dep->type,
        ];
    }
}
