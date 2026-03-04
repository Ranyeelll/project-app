<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetRequestController extends Controller
{
    /**
     * List all budget requests.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BudgetRequest::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('requested_by')) {
            $query->where('requested_by', $request->input('requested_by'));
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

        // Auto-recalculate project budget & spent from approved budget requests
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'])) {
            $project = Project::find($budget_request->project_id);
            if ($project) {
                // Spending requests go to spent
                $project->spent = BudgetRequest::where('project_id', $project->id)
                    ->where('status', 'approved')
                    ->where('type', 'spending')
                    ->sum('amount');

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
     * Format for frontend (camelCase).
     */
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
