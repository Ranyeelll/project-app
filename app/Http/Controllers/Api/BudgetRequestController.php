<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\AuditService;

class BudgetRequestController extends Controller
{
    public function __construct(
        private AuditService $audit,
    ) {}

    /**
     * List all budget requests.
     * Employees can only see their own requests.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = BudgetRequest::query();

        // Employees can only see their own budget requests
        if ($user && $user->department === Department::Employee) {
            $query->where('requested_by', $user->id);
        } else {
            // Other departments can filter by requested_by if provided
            if ($request->has('requested_by')) {
                $query->where('requested_by', $request->input('requested_by'));
            }
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        $items = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($b) => $this->formatBudgetRequest($b));

        return response()->json($items);
    }

    /**
     * Create a new budget request.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'   => 'required|exists:projects,id',
            'requested_by' => 'required|exists:users,id',
            'amount'       => 'required|numeric|min:0',
            'type'         => 'sometimes|in:spending,additional_budget',
            'purpose'      => 'required|string',
            'attachment'   => 'nullable|string',
        ]);

        $item = BudgetRequest::create(array_merge($data, [
            'status' => 'pending',
            'type'   => $data['type'] ?? 'spending',
        ]));

        return response()->json($this->formatBudgetRequest($item), 201);
    }

    /**
     * Update a budget request (edit by employee or review by admin).
     */
    public function update(Request $request, BudgetRequest $budget_request): JsonResponse
    {
        $data = $request->validate([
            'project_id'     => 'sometimes|exists:projects,id',
            'amount'         => 'sometimes|numeric|min:0',
            'type'           => 'sometimes|in:spending,additional_budget',
            'purpose'        => 'sometimes|string',
            'status'         => 'sometimes|in:pending,approved,rejected,revision_requested',
            'review_comment' => 'nullable|string',
            'admin_remarks'  => 'nullable|string',
            'attachment'     => 'nullable|string',
        ]);

        // If status is being changed to approved/rejected, set reviewed_at
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'])) {
            $data['reviewed_at'] = now();
        }

        // If admin requests a revision, save original amount on first revision
        if (isset($data['status']) && $data['status'] === 'revision_requested') {
            if (!$budget_request->original_amount) {
                $data['original_amount'] = $budget_request->amount;
            }
            $data['revision_count'] = ($budget_request->revision_count ?? 0) + 1;
        }

        // If employee resubmits (status back to pending), clear reviewed_at
        if (isset($data['status']) && $data['status'] === 'pending' && $budget_request->status === 'revision_requested') {
            $data['reviewed_at'] = null;
        }

        $budget_request->update($data);

        // Audit log for status changes (approvals, rejections, revision requests)
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected', 'revision_requested'])) {
            $this->audit->budgetRequestApproved($budget_request, $data['status'], $data['review_comment'] ?? null);
        }

        // Auto-recalculate project budget & spent from approved budget requests
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'])) {
            $project = Project::find($budget_request->project_id);
            if ($project) {
                // Spending requests go to spent
                $budgetSpent = BudgetRequest::where('project_id', $project->id)
                    ->where('status', 'approved')
                    ->where('type', 'spending')
                    ->sum('amount');

                // Include approved task report costs in spent
                $reportCosts = Task::where('project_id', $project->id)
                    ->where('completion_report_status', 'approved')
                    ->sum('report_cost');

                $project->spent = $budgetSpent + $reportCosts;

                // Additional budget requests increase the project budget
                $additionalBudget = BudgetRequest::where('project_id', $project->id)
                    ->where('status', 'approved')
                    ->where('type', 'additional_budget')
                    ->sum('amount');

                // Store original budget on first additional budget approval if needed
                // We recalculate budget as: original base + approved additional
                // Get base budget by subtracting any previously approved additional budget
                $baseBudget = $project->budget - BudgetRequest::where('project_id', $project->id)
                    ->where('status', 'approved')
                    ->where('type', 'additional_budget')
                    ->where('id', '!=', $budget_request->id) // exclude current (its status just changed)
                    ->sum('amount');

                // If this request is being approved as additional_budget, add it
                if ($budget_request->type === 'additional_budget' && $data['status'] === 'approved') {
                    $project->budget = $baseBudget + $additionalBudget;
                } else if ($budget_request->type === 'additional_budget' && $data['status'] === 'rejected') {
                    // Recalculate without this one
                    $project->budget = $baseBudget + $additionalBudget;
                }

                $project->save();
            }
        }

        return response()->json($this->formatBudgetRequest($budget_request->fresh()));
    }

    /**
     * Delete a budget request.
     */
    public function destroy(BudgetRequest $budget_request): JsonResponse
    {
        $budget_request->delete();

        return response()->json(['message' => 'Budget request deleted']);
    }

    /**
     * Budget report: per-project spending analytics.
     */
    public function report(): JsonResponse
    {
        $projects = Project::orderBy('name')->get();
        $allRequests = BudgetRequest::all();

        $report = $projects->map(function ($p) use ($allRequests) {
            $projectRequests = $allRequests->where('project_id', $p->id);
            $approved = $projectRequests->where('status', 'approved');
            $pending  = $projectRequests->where('status', 'pending');
            $rejected = $projectRequests->where('status', 'rejected');

            // Separate spending vs additional_budget
            $spendingApproved = $approved->where('type', 'spending');
            $additionalApproved = $approved->where('type', 'additional_budget');

            $totalSpent    = $spendingApproved->sum('amount');
            $totalPending  = $pending->sum('amount');
            $totalRejected = $rejected->sum('amount');

            // Include approved task report costs in spending
            $reportCosts = Task::where('project_id', $p->id)
                ->where('completion_report_status', 'approved')
                ->sum('report_cost');
            $totalSpent += $reportCosts;

            // Budget = base budget + approved additional budget requests
            $budget = (float) $p->budget;
            $remaining     = $budget - $totalSpent;
            $pct           = $budget > 0 ? round(($totalSpent / $budget) * 100, 1) : 0;

            // Category breakdown from approved spending requests
            $categories = $spendingApproved->groupBy('purpose')->map(function ($items, $purpose) {
                return [
                    'category' => $purpose,
                    'amount'   => $items->sum('amount'),
                    'count'    => $items->count(),
                ];
            })->values();

            // Monthly spending trend (approved only)
            $monthly = $approved->groupBy(function ($r) {
                return $r->created_at->format('Y-m');
            })->map(function ($items, $month) {
                return [
                    'month'  => $month,
                    'amount' => $items->sum('amount'),
                    'count'  => $items->count(),
                ];
            })->sortKeys()->values();

            return [
                'projectId'       => (string) $p->id,
                'projectName'     => $p->name,
                'projectStatus'   => $p->status,
                'budget'          => $budget,
                'totalApproved'   => (float) $totalSpent,
                'totalPending'    => (float) $totalPending,
                'totalRejected'   => (float) $totalRejected,
                'remaining'       => (float) $remaining,
                'percentUsed'     => $pct,
                'approvedCount'   => $approved->count(),
                'pendingCount'    => $pending->count(),
                'rejectedCount'   => $rejected->count(),
                'totalRequests'   => $projectRequests->count(),
                'categories'      => $categories,
                'monthlyTrend'    => $monthly,
            ];
        });

        // Portfolio-level summary (only spending in totalApproved/spent)
        $totalReportCosts = Task::where('completion_report_status', 'approved')->sum('report_cost');
        $totalSpending = (float) $allRequests->where('status', 'approved')->where('type', 'spending')->sum('amount') + $totalReportCosts;
        $summary = [
            'totalBudget'       => $projects->sum('budget'),
            'totalApproved'     => $totalSpending,
            'totalPending'      => (float) $allRequests->where('status', 'pending')->sum('amount'),
            'totalRejected'     => (float) $allRequests->where('status', 'rejected')->sum('amount'),
            'totalRequests'     => $allRequests->count(),
            'projectCount'      => $projects->count(),
            'overBudgetProjects' => $report->filter(fn ($r) => $r['remaining'] < 0)->count(),
            'atRiskProjects'    => $report->filter(fn ($r) => $r['percentUsed'] >= 80 && $r['percentUsed'] < 100)->count(),
        ];

        return response()->json([
            'summary'  => $summary,
            'projects' => $report->values(),
        ]);
    }

    /**
     * Export budget report as PDF.
     * Accepts ?period=weekly|monthly|yearly
     */
    public function exportPdf(Request $request)
    {
        $period = $request->input('period', 'monthly'); // weekly, monthly, yearly
        $now    = Carbon::now();

        switch ($period) {
            case 'weekly':
                $startDate   = $now->copy()->startOfWeek();
                $endDate     = $now->copy()->endOfWeek();
                $periodLabel = 'Weekly Budget Report';
                $dateRange   = $startDate->format('M d, Y') . ' — ' . $endDate->format('M d, Y');
                break;
            case 'yearly':
                $startDate   = $now->copy()->startOfYear();
                $endDate     = $now->copy()->endOfYear();
                $periodLabel = 'Yearly Budget Report';
                $dateRange   = $startDate->format('Y');
                break;
            case 'monthly':
            default:
                $startDate   = $now->copy()->startOfMonth();
                $endDate     = $now->copy()->endOfMonth();
                $periodLabel = 'Monthly Budget Report';
                $dateRange   = $startDate->format('F Y');
                break;
        }

        // Gather projects and budget requests
        $projects    = Project::orderBy('name')->get();
        $allRequests = BudgetRequest::all();

        // Budget requests within the period
        $periodRequests = BudgetRequest::whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')
            ->get();

        // Build per-project report data (same as report() method logic)
        $reportProjects = $projects->map(function ($p) use ($allRequests, $startDate, $endDate) {
            $projectRequests = $allRequests->where('project_id', $p->id);
            $approved = $projectRequests->where('status', 'approved');
            $pending  = $projectRequests->where('status', 'pending');
            $rejected = $projectRequests->where('status', 'rejected');

            $spendingApproved   = $approved->where('type', 'spending');
            $totalSpent    = (float) $spendingApproved->sum('amount');
            $totalPending  = (float) $pending->sum('amount');
            $totalRejected = (float) $rejected->sum('amount');

            // Include approved task report costs
            $reportCosts = Task::where('project_id', $p->id)
                ->where('completion_report_status', 'approved')
                ->sum('report_cost');
            $totalSpent += $reportCosts;

            $budget    = (float) $p->budget;
            $remaining = $budget - $totalSpent;
            $pct       = $budget > 0 ? round(($totalSpent / $budget) * 100, 1) : 0;

            // Category breakdown
            $categories = $spendingApproved->groupBy('purpose')->map(function ($items, $purpose) {
                return [
                    'category' => $purpose,
                    'amount'   => $items->sum('amount'),
                    'count'    => $items->count(),
                ];
            })->values()->toArray();

            // Monthly trend
            $monthly = $approved->groupBy(fn ($r) => $r->created_at->format('Y-m'))
                ->map(function ($items, $month) {
                    return [
                        'month'  => $month,
                        'amount' => $items->sum('amount'),
                        'count'  => $items->count(),
                    ];
                })->sortKeys()->values()->toArray();

            return [
                'projectId'     => (string) $p->id,
                'projectName'   => $p->name,
                'projectStatus' => $p->status,
                'budget'        => $budget,
                'totalApproved' => $totalSpent,
                'totalPending'  => $totalPending,
                'totalRejected' => $totalRejected,
                'remaining'     => $remaining,
                'percentUsed'   => $pct,
                'approvedCount' => $approved->count(),
                'pendingCount'  => $pending->count(),
                'rejectedCount' => $rejected->count(),
                'totalRequests' => $projectRequests->count(),
                'categories'    => $categories,
                'monthlyTrend'  => $monthly,
            ];
        })->toArray();

        // Portfolio summary
        $totalReportCosts = Task::where('completion_report_status', 'approved')->sum('report_cost');
        $totalSpending    = (float) $allRequests->where('status', 'approved')->where('type', 'spending')->sum('amount') + $totalReportCosts;
        $summary = [
            'totalBudget'        => (float) $projects->sum('budget'),
            'totalApproved'      => $totalSpending,
            'totalPending'       => (float) $allRequests->where('status', 'pending')->sum('amount'),
            'totalRejected'      => (float) $allRequests->where('status', 'rejected')->sum('amount'),
            'totalRequests'      => $allRequests->count(),
            'projectCount'       => $projects->count(),
            'overBudgetProjects' => collect($reportProjects)->filter(fn ($r) => $r['remaining'] < 0)->count(),
            'atRiskProjects'     => collect($reportProjects)->filter(fn ($r) => $r['percentUsed'] >= 80 && $r['percentUsed'] < 100)->count(),
        ];

        // Format period requests for listing
        $users = User::all()->keyBy('id');
        $projectNames = $projects->keyBy('id');

        $requestsList = $periodRequests->map(function ($r) use ($users, $projectNames) {
            return [
                'date'      => $r->created_at->format('M d, Y'),
                'project'   => $projectNames[$r->project_id]->name ?? '—',
                'requester' => $users[$r->requested_by]->name ?? '—',
                'purpose'   => $r->purpose,
                'type'      => $r->type ?? 'spending',
                'amount'    => (float) $r->amount,
                'status'    => $r->status,
            ];
        })->toArray();

        // Currency formatter closure
        $fmt = fn ($n) => 'PHP ' . number_format((float) $n, 0, '.', ',');

        $pdf = Pdf::loadView('pdf.budget-report', [
            'summary'     => $summary,
            'projects'    => $reportProjects,
            'requests'    => $requestsList,
            'periodLabel' => $periodLabel,
            'dateRange'   => $dateRange,
            'generatedAt' => $now->format('M d, Y h:i A'),
            'fmt'         => $fmt,
        ]);

        // Use portrait orientation for exported PDFs to match print layout
        $pdf->setPaper('A4', 'portrait');

        $filename = 'budget-report-' . $period . '-' . $now->format('Y-m-d') . '.pdf';

        $this->audit->budgetReportExported('pdf', $period);

        return $pdf->download($filename);
    }

    /**
     * Export budget report as a real .xlsx file (Open XML via ZipArchive).
     * Accepts ?period=weekly|monthly|yearly
     */
    public function exportSheet(Request $request)
    {
        $period = $request->input('period', 'monthly');
        $now    = Carbon::now();

        switch ($period) {
            case 'weekly':
                $startDate   = $now->copy()->startOfWeek();
                $endDate     = $now->copy()->endOfWeek();
                $periodLabel = 'Weekly Budget Report';
                $dateRange   = $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y');
                break;
            case 'yearly':
                $startDate   = $now->copy()->startOfYear();
                $endDate     = $now->copy()->endOfYear();
                $periodLabel = 'Yearly Budget Report';
                $dateRange   = $startDate->format('Y');
                break;
            case 'monthly':
            default:
                $startDate   = $now->copy()->startOfMonth();
                $endDate     = $now->copy()->endOfMonth();
                $periodLabel = 'Monthly Budget Report';
                $dateRange   = $startDate->format('F Y');
                break;
        }

        // ── Build data (same logic as exportPdf) ──────────────────────────────
        $projects    = Project::orderBy('name')->get();
        $allRequests = BudgetRequest::all();

        $periodRequests = BudgetRequest::whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc')->get();

        $reportProjects = $projects->map(function ($p) use ($allRequests) {
            $pr       = $allRequests->where('project_id', $p->id);
            $approved = $pr->where('status', 'approved');
            $pending  = $pr->where('status', 'pending');
            $rejected = $pr->where('status', 'rejected');
            $spending = $approved->where('type', 'spending');
            $spent    = (float) $spending->sum('amount');
            $spent   += (float) Task::where('project_id', $p->id)->where('completion_report_status', 'approved')->sum('report_cost');
            $budget   = (float) $p->budget;
            $rem      = $budget - $spent;
            $pct      = $budget > 0 ? round(($spent / $budget) * 100, 1) : 0;
            $cats     = $spending->groupBy('purpose')->map(fn ($i, $k) => ['category' => $k, 'amount' => $i->sum('amount'), 'count' => $i->count()])->values()->toArray();
            $monthly  = $approved->groupBy(fn ($r) => $r->created_at->format('Y-m'))->map(fn ($i, $k) => ['month' => $k, 'amount' => $i->sum('amount'), 'count' => $i->count()])->sortKeys()->values()->toArray();
            return [
                'projectName'   => $p->name, 'projectStatus' => $p->status,
                'budget'        => $budget,  'totalApproved' => $spent,
                'totalPending'  => (float) $pending->sum('amount'),
                'totalRejected' => (float) $rejected->sum('amount'),
                'remaining'     => $rem,     'percentUsed'   => $pct,
                'approvedCount' => $approved->count(), 'pendingCount' => $pending->count(),
                'rejectedCount' => $rejected->count(), 'categories' => $cats, 'monthlyTrend' => $monthly,
            ];
        })->toArray();

        $totalReportCosts = (float) Task::where('completion_report_status', 'approved')->sum('report_cost');
        $totalSpending    = (float) $allRequests->where('status', 'approved')->where('type', 'spending')->sum('amount') + $totalReportCosts;
        $summary = [
            'totalBudget'        => (float) $projects->sum('budget'),
            'totalApproved'      => $totalSpending,
            'totalPending'       => (float) $allRequests->where('status', 'pending')->sum('amount'),
            'totalRejected'      => (float) $allRequests->where('status', 'rejected')->sum('amount'),
            'totalRequests'      => $allRequests->count(),
            'projectCount'       => $projects->count(),
            'overBudgetProjects' => collect($reportProjects)->filter(fn ($r) => $r['remaining'] < 0)->count(),
            'atRiskProjects'     => collect($reportProjects)->filter(fn ($r) => $r['percentUsed'] >= 80 && $r['percentUsed'] < 100)->count(),
        ];

        $users        = User::all()->keyBy('id');
        $projectNames = $projects->keyBy('id');
        $requestsList = $periodRequests->map(fn ($r) => [
            'date'      => $r->created_at->format('M d, Y'),
            'project'   => $projectNames[$r->project_id]->name ?? '-',
            'requester' => $users[$r->requested_by]->name ?? '-',
            'purpose'   => $r->purpose,
            'type'      => $r->type ?? 'spending',
            'amount'    => (float) $r->amount,
            'status'    => $r->status,
        ])->toArray();

        $fmt = fn ($n) => 'PHP ' . number_format((float) $n, 0, '.', ',');

        // ── Build Open XML xlsx ───────────────────────────────────────────────
        // Style indices (0-based, defined in styles XML below):
        // 0 = default, 1 = header-green-bold, 2 = section-title, 3 = bold,
        // 4 = money-green-bold, 5 = money-red-bold, 6 = money-yellow-bold,
        // 7 = money-default, 8 = center, 9 = totals-row, 10 = subheader-gray
        $colLetters = ['A','B','C','D','E','F','G','H','I','J'];
        $x = fn (string $s): string => htmlspecialchars($s, ENT_XML1, 'UTF-8');
        $rows   = [];   // array of [values[], styleIdx[]]
        $merges = [];   // array of "A1:D1" strings
        $rowNum = 0;

        // $mergeToCol = how many columns to span from A (e.g. 8 = A:H). Computed AFTER rowNum increment.
        $addRow = function (array $vals, array $styles = [], ?int $mergeToCol = null) use (&$rows, &$merges, &$rowNum, $colLetters) {
            $rowNum++;
            $rows[] = ['vals' => $vals, 'styles' => $styles];
            if ($mergeToCol !== null) {
                $endCol   = $colLetters[$mergeToCol - 1] ?? chr(64 + $mergeToCol);
                $merges[] = "A{$rowNum}:{$endCol}{$rowNum}";
            }
        };

        // ── Report Title ──
        $addRow(["BUDGET REPORT - {$periodLabel}"], [2], 8);
        $addRow(["Period: {$dateRange}"], [0]);
        $addRow(["Generated: {$now->format('M d, Y h:i A')}"], [0]);
        $addRow([]);

        // ── Portfolio Summary ──
        $addRow(['PORTFOLIO SUMMARY'], [2], 8);
        $addRow(['Total Budget', 'Total Spent', 'Total Pending', 'Total Rejected', 'Projects', 'Total Requests', 'Over Budget', 'At Risk (>=80%)'], array_fill(0, 8, 1));
        $addRow([
            $fmt($summary['totalBudget']),
            $fmt($summary['totalApproved']),
            $fmt($summary['totalPending']),
            $fmt($summary['totalRejected']),
            $summary['projectCount'],
            $summary['totalRequests'],
            $summary['overBudgetProjects'],
            $summary['atRiskProjects'],
        ], [7, 4, 6, 5, 3, 3, 5, 6]);
        $addRow([]);

        // ── Budget Alerts ──
        $overBudgetProj = collect($reportProjects)->filter(fn ($p) => $p['remaining'] < 0);
        $atRiskProj     = collect($reportProjects)->filter(fn ($p) => $p['percentUsed'] >= 80 && $p['percentUsed'] < 100);
        if ($overBudgetProj->count() > 0 || $atRiskProj->count() > 0) {
            $addRow(['BUDGET ALERTS'], [2], 8);
            foreach ($overBudgetProj as $p) {
                $addRow(["OVER BUDGET: {$p['projectName']} - Over by {$fmt(abs($p['remaining']))} ({$p['percentUsed']}% used)"], [5]);
            }
            foreach ($atRiskProj as $p) {
                $addRow(["AT RISK: {$p['projectName']} - {$p['percentUsed']}% used ({$fmt($p['remaining'])} remaining)"], [6]);
            }
            $addRow([]);
        }

        // ── Project Budget Overview ──
        $addRow(['PROJECT BUDGET OVERVIEW'], [2], 8);
        $addRow(['Project', 'Budget', 'Spent', 'Remaining', '% Used', 'Requests (A/P/R)', 'Status', 'Health'], array_fill(0, 8, 1));
        foreach ($reportProjects as $p) {
            $isOver   = $p['remaining'] < 0;
            $isRisk   = $p['percentUsed'] >= 80 && $p['percentUsed'] < 100;
            $health   = $isOver ? 'Over Budget' : ($isRisk ? 'At Risk' : 'Healthy');
            $remStyle = $isOver ? 5 : 7;
            $addRow([
                $p['projectName'],
                $fmt($p['budget']),
                $fmt($p['totalApproved']),
                $fmt($p['remaining']),
                $p['percentUsed'] . '%',
                $p['approvedCount'] . ' / ' . $p['pendingCount'] . ' / ' . $p['rejectedCount'],
                ucfirst($p['projectStatus']),
                $health,
            ], [3, 7, 4, $remStyle, 8, 8, 8, $isOver ? 5 : ($isRisk ? 6 : 4)]);
        }
        // Totals
        $totalPct = $summary['totalBudget'] > 0 ? round(($summary['totalApproved'] / $summary['totalBudget']) * 100, 1) : 0;
        $addRow([
            'TOTAL',
            $fmt($summary['totalBudget']),
            $fmt($summary['totalApproved']),
            $fmt($summary['totalBudget'] - $summary['totalApproved']),
            $totalPct . '%',
            $summary['totalRequests'],
            '', '',
        ], array_fill(0, 8, 9));
        $addRow([]);

        // ── Per-project Detailed Breakdown ──
        foreach ($reportProjects as $p) {
            if (empty($p['categories']) && empty($p['monthlyTrend'])) continue;
            $addRow(["{$p['projectName']} - Detailed Breakdown"], [2], 8);
            $addRow(['Budget Summary', ''], [1, 1], 2);
            $addRow(['Total Budget', $fmt($p['budget'])], [3, 7]);
            $addRow(['Approved Spent', $fmt($p['totalApproved'])], [3, 4]);
            $addRow(['Pending', $fmt($p['totalPending'])], [3, 6]);
            $addRow(['Rejected', $fmt($p['totalRejected'])], [3, 5]);
            $addRow(['Remaining', $fmt($p['remaining'])], [3, $p['remaining'] < 0 ? 5 : 7]);
            $addRow(['Budget Used', $p['percentUsed'] . '%'], [3, 3]);
            $ifAllPending = $p['budget'] - $p['totalApproved'] - $p['totalPending'];
            $addRow(['If All Pending Approved', $fmt($ifAllPending)], [3, $ifAllPending < 0 ? 5 : 7]);

            if (!empty($p['categories'])) {
                $addRow([]);
                $addRow(['Category / Purpose', 'Amount', 'Count', '% of Spent'], array_fill(0, 4, 1));
                foreach (collect($p['categories'])->sortByDesc('amount') as $cat) {
                    $catPct = $p['totalApproved'] > 0 ? round(($cat['amount'] / $p['totalApproved']) * 100, 1) : 0;
                    $addRow([$cat['category'], $fmt($cat['amount']), $cat['count'], $catPct . '%'], [0, 4, 8, 8]);
                }
            }
            if (!empty($p['monthlyTrend'])) {
                $addRow([]);
                $addRow(['Month', 'Amount', 'Requests'], array_fill(0, 3, 1));
                foreach ($p['monthlyTrend'] as $m) {
                    $addRow([$m['month'], $fmt($m['amount']), $m['count']], [0, 4, 8]);
                }
            }
            $addRow([]);
        }

        // ── Budget Requests Listing ──
        if (!empty($requestsList)) {
            $addRow(["BUDGET REQUESTS ({$periodLabel})"], [2], 7);
            $addRow(['Date', 'Project', 'Requested By', 'Purpose', 'Type', 'Amount', 'Status'], array_fill(0, 7, 1));
            foreach ($requestsList as $r) {
                $statusStyle = $r['status'] === 'approved' ? 4 : ($r['status'] === 'pending' ? 6 : 5);
                $addRow([
                    $r['date'],
                    $r['project'],
                    $r['requester'],
                    $r['purpose'],
                    $r['type'] === 'spending' ? 'Spending' : 'Additional Budget',
                    $fmt($r['amount']),
                    ucfirst($r['status']),
                ], [0, 0, 0, 0, 0, 7, $statusStyle]);
            }
        }

        // ── Generate the sheet XML ────────────────────────────────────────────
        $sheetRows  = '';
        foreach ($rows as $rIdx => $row) {
            $rNum  = $rIdx + 1;
            $cells = '';
            foreach ($row['vals'] as $cIdx => $val) {
                $col      = $colLetters[$cIdx] ?? chr(65 + $cIdx);
                $cellRef  = $col . $rNum;
                $styleIdx = $row['styles'][$cIdx] ?? 0;
                if ($val === null || $val === '') {
                    $cells .= "<c r=\"{$cellRef}\" s=\"{$styleIdx}\"><v></v></c>";
                } else {
                    $escaped = $x((string) $val);
                    $cells  .= "<c r=\"{$cellRef}\" s=\"{$styleIdx}\" t=\"inlineStr\"><is><t>{$escaped}</t></is></c>";
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
    <col min="1" max="1" width="38" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="22" customWidth="1"/>
    <col min="4" max="4" width="22" customWidth="1"/>
    <col min="5" max="5" width="12" customWidth="1"/>
    <col min="6" max="6" width="20" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="14" customWidth="1"/>
  </cols>
  <sheetData>' . $sheetRows . '</sheetData>
  ' . $mergeCellsXml . '
</worksheet>';

        // ── Styles XML ────────────────────────────────────────────────────────
        // Colors: brand=#154734, green=#16a34a, yellow=#ca8a04, red=#dc2626, gray=#6b7280
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

        // ── Workbook XML ──────────────────────────────────────────────────────
        $workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Budget Report" sheetId="1" r:id="rId1"/>
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

        // ── Write to a temp zip file ──────────────────────────────────────────
        $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx_');
        $zip     = new \ZipArchive();
        $zip->open($tmpFile, \ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml',          $contentTypes);
        $zip->addFromString('_rels/.rels',                  $packageRels);
        $zip->addFromString('xl/workbook.xml',              $workbookXml);
        $zip->addFromString('xl/_rels/workbook.xml.rels',   $workbookRels);
        $zip->addFromString('xl/worksheets/sheet1.xml',     $sheetXml);
        $zip->addFromString('xl/styles.xml',                $stylesXml);
        $zip->close();

        $filename = 'budget-report-' . $period . '-' . $now->format('Y-m-d') . '.xlsx';
        $content  = file_get_contents($tmpFile);
        unlink($tmpFile);

        $this->audit->budgetReportExported('xlsx', $period);

        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Content-Length'      => strlen($content),
            'Pragma'              => 'no-cache',
            'Cache-Control'       => 'must-revalidate, post-check=0, pre-check=0',
            'Expires'             => '0',
        ]);
    }
    private function formatBudgetRequest(BudgetRequest $b): array
    {
        return [
            'id'             => (string) $b->id,
            'projectId'      => (string) $b->project_id,
            'requestedBy'    => (string) $b->requested_by,
            'amount'         => (float) $b->amount,
            'type'           => $b->type ?? 'spending',
            'purpose'        => $b->purpose,
            'status'         => $b->status,
            'createdAt'      => $b->created_at?->toDateString() ?? '',
            'reviewedAt'     => $b->reviewed_at?->toDateString() ?? '',
            'reviewComment'  => $b->review_comment ?? '',
            'attachment'     => $b->attachment ?? '',
            'adminRemarks'   => $b->admin_remarks ?? '',
            'originalAmount' => $b->original_amount ? (float) $b->original_amount : null,
            'revisionCount'  => (int) ($b->revision_count ?? 0),
        ];
    }
}
