<?php
// Generate sample PDFs for budget, audit, and gantt reports
require __DIR__ . '/..\vendor\autoload.php';

$app = require __DIR__ . '/..\bootstrap\app.php';

// Ensure storage directory
$exportDir = __DIR__ . '/..\storage\app\exports';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0755, true);
}

/** @var \Illuminate\Contracts\View\Factory $viewFactory */
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$viewFactory = $app->make(\Illuminate\Contracts\View\Factory::class);

// Helper formatter
$fmt = function ($v) {
    return is_numeric($v) ? number_format($v, 2) : $v;
};

// Common vars
$now = new \DateTimeImmutable();
$dateRange = '2026-01-01 to 2026-03-31';
$generatedAt = $now->format('Y-m-d H:i:s');

// 1) Budget report sample
$budgetData = [
    'periodLabel' => 'Q1 2026',
    'dateRange' => $dateRange,
    'generatedAt' => $generatedAt,
    'summary' => [
        'totalBudget' => 1000000,
        'totalApproved' => 650000,
        'totalPending' => 200000,
        'totalRejected' => 50000,
        'projectCount' => 4,
        'totalRequests' => 12,
        'overBudgetProjects' => 1,
        'atRiskProjects' => 1,
    ],
    'projects' => [
        ['projectName' => 'Alpha', 'budget' => 300000, 'totalApproved' => 200000, 'remaining' => 100000, 'percentUsed' => 66, 'approvedCount'=>3,'pendingCount'=>1,'rejectedCount'=>0,'projectStatus'=>'active','categories'=>[], 'monthlyTrend'=>[]],
        ['projectName' => 'Beta', 'budget' => 250000, 'totalApproved' => 150000, 'remaining' => 100000, 'percentUsed' => 60, 'approvedCount'=>2,'pendingCount'=>2,'rejectedCount'=>0,'projectStatus'=>'active','categories'=>[], 'monthlyTrend'=>[]],
    ],
    'fmt' => $fmt,
    'requests' => [],
];

$html = $viewFactory->make('pdf.budget-report', $budgetData)->render();

$options = new \Dompdf\Options();
$options->set('isRemoteEnabled', true);
$dompdf = new \Dompdf\Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
file_put_contents($exportDir . '/budget-sample.pdf', $dompdf->output());
echo "Wrote: storage/app/exports/budget-sample.pdf\n";

// 2) Audit logs sample
$auditData = [
    'periodLabel' => 'March 2026',
    'dateRange' => $dateRange,
    'generatedAt' => $generatedAt,
    'summary' => ['totalLogs'=>128,'sensitiveLogs'=>5,'uniqueActions'=>23,'projectScoped'=>8],
    'filters' => ['search'=>'','action'=>'','resourceType'=>'','projectId'=>''],
    'rows' => [
        ['date'=>'2026-03-29','entity'=>'Task','activity'=>'Updated','action'=>'update','actor'=>'Alice','project'=>'Alpha','details'=>'Changed progress to 60%'],
        ['date'=>'2026-03-28','entity'=>'Budget','activity'=>'Requested','action'=>'create','actor'=>'Bob','project'=>'Beta','details'=>'Requested additional funds'],
    ],
];

$html = $viewFactory->make('pdf.audit-logs-report', $auditData)->render();
$dompdf = new \Dompdf\Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
file_put_contents($exportDir . '/audit-logs-sample.pdf', $dompdf->output());
echo "Wrote: storage/app/exports/audit-logs-sample.pdf\n";

// 3) Gantt sample
$rangeStart = new \Carbon\Carbon('2026-01-01');
$rangeEnd = new \Carbon\Carbon('2026-03-31');
$timelineColumns = [
    ['label'=>'Jan','widthPct'=>33.33],
    ['label'=>'Feb','widthPct'=>33.33],
    ['label'=>'Mar','widthPct'=>33.34],
];
$ganttData = [
    'rangeStart' => $rangeStart,
    'rangeEnd' => $rangeEnd,
    'periodLabel' => 'Q1 2026',
    'projectName' => 'Alpha',
    'dateRange' => $dateRange,
    'generatedAt' => $generatedAt,
    'timelineColumns' => $timelineColumns,
    'summary' => ['totalItems'=>5,'phaseCount'=>1,'stepCount'=>2,'subtaskCount'=>1,'milestoneCount'=>1,'avgProgress'=>57,'dependencyCount'=>2],
    'filters' => ['project'=>'Alpha','previewAs'=>'Manager'],
    'rows' => [
        ['treeIndex'=>1,'taskName'=>'Phase 1','depth'=>0,'durationDays'=>30,'startDate'=>'2026-01-01','endDate'=>'2026-01-30','state'=>'working','leftPct'=>0,'widthPct'=>20,'barColor'=>'#F9E1A8','isMilestone'=>false],
        ['treeIndex'=>2,'taskName'=>'Milestone A','depth'=>1,'durationDays'=>'—','startDate'=>'2026-02-01','endDate'=>'2026-02-01','state'=>'milestone','leftPct'=>40,'widthPct'=>0,'barColor'=>'#BCD8EC','isMilestone'=>true],
    ],
];

$html = $viewFactory->make('pdf.gantt-report', $ganttData)->render();
$dompdf = new \Dompdf\Dompdf($options);
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
file_put_contents($exportDir . '/gantt-sample.pdf', $dompdf->output());
echo "Wrote: storage/app/exports/gantt-sample.pdf\n";

echo "All done.\n";
