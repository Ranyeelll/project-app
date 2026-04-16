<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\BudgetRequest;
use App\Services\AuditService;
use App\Services\ProjectSerialService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    public function __construct(
        private ProjectSerialService $serialService,
        private AuditService $audit,
    ) {}

    /**
     * List all projects.
     * Employees can only see projects where they are manager or team member.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Project::query();

        // Employees can only see projects they're assigned to
        if ($user && $user->department === Department::Employee) {
            $query->where(function ($q) use ($user) {
                $q->where('manager_id', $user->id)
                  ->orWhereJsonContains('team_ids', (string) $user->id);
            });
        }

        // Advanced filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('serial', 'ilike', "%{$search}%");
            });
        }
        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }
        if ($request->filled('start_date_from')) {
            $query->where('start_date', '>=', $request->input('start_date_from'));
        }
        if ($request->filled('end_date_to')) {
            $query->where('end_date', '<=', $request->input('end_date_to'));
        }

        $projects = $query->orderByDesc('created_at')
            ->limit(500)
            ->get();

        // Pre-load aggregates to avoid N+1 queries in formatProject
        $projectIds = $projects->pluck('id');

        $taskAvgByProject = Task::whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->selectRaw('project_id, AVG(progress) as avg_progress')
            ->pluck('avg_progress', 'project_id');

        $taskExistsByProject = Task::whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->selectRaw('project_id, COUNT(*) as cnt')
            ->pluck('cnt', 'project_id');

        $approvedSpentByProject = BudgetRequest::whereIn('project_id', $projectIds)
            ->where('status', ApprovalStatus::APPROVED->value)
            ->where('type', 'spending')
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(amount) as total')
            ->pluck('total', 'project_id');

        $reportCostsByProject = Task::whereIn('project_id', $projectIds)
            ->where('completion_report_status', ApprovalStatus::APPROVED->value)
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(report_cost) as total')
            ->pluck('total', 'project_id');

        // Team-specific task averages
        $teamTaskAvgByProject = [];
        foreach ($projects as $p) {
            $teamIds = array_values(array_filter(array_map('intval', $p->team_ids ?? []), static fn ($id) => $id > 0));
            if (!empty($teamIds)) {
                $teamTaskAvgByProject[$p->id] = Task::where('project_id', $p->id)
                    ->whereIn('assigned_to', $teamIds)
                    ->avg('progress');
            }
        }

        $preloaded = compact('taskAvgByProject', 'taskExistsByProject', 'approvedSpentByProject', 'reportCostsByProject', 'teamTaskAvgByProject');
        $result = $projects->map(fn ($p) => $this->formatProject($p, $preloaded));

        return response()->json($result);
    }

    /**
     * Create a new project.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'status'      => 'required|in:active,on-hold,completed,archived',
            'priority'    => 'required|in:low,medium,high,critical',
            'category'         => 'required|in:development,maintenance,research,infrastructure,consultation',
            'risk_level'       => 'required|in:low,medium,high',
            'beneficiary_type' => 'required|in:internal,external',
            'beneficiary_name' => 'required|string|max:255',
            'contact_person'   => 'nullable|string|max:255',
            'contact_email'    => 'nullable|email|max:255',
            'contact_phone'    => 'nullable|string|max:50',
            'location'         => 'nullable|string|max:500',
            'objectives'       => 'required|string|max:5000',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'budget'      => 'nullable|numeric|min:0',
            'manager_id'  => 'nullable|exists:users,id',
            'team_ids'    => 'nullable|array',
            'team_ids.*'  => 'string',
            'leader_id'   => 'nullable|exists:users,id',
        ]);

        $data['team_ids'] = array_values(array_unique(array_filter(array_map('strval', $data['team_ids'] ?? []))));
        $data['budget']  = $data['budget'] ?? 0;
        $data['spent']   = 0;
        $data['progress'] = 0;
        $data['team_ids'] = $data['team_ids'] ?? [];
        $data['project_leader_id'] = $data['leader_id'] ?? null;
        unset($data['leader_id']);

        $this->validateLeaderForTeam($data['team_ids'], $data['project_leader_id']);

        $project = DB::transaction(function () use ($data) {
            $project = Project::create($data);

            // Generate and assign unique serial number.
            $this->serialService->assignSerial($project, Auth::id());

            // Audit: project created
            $this->audit->projectCreated($project->fresh());

            // Auto-create a task for each team member so it appears in their My Tasks
            foreach (($data['team_ids'] ?? []) as $memberId) {
                Task::create([
                    'project_id'               => $project->id,
                    'title'                    => $data['name'],
                    'description'              => $data['description'] ?? '',
                    'status'                   => 'todo',
                    'priority'                 => $data['priority'] ?? 'medium',
                    'assigned_to'              => $memberId,
                    'start_date'               => $data['start_date'] ?? null,
                    'end_date'                 => $data['end_date'] ?? null,
                    'estimated_hours'          => 0,
                    'progress'                 => 0,
                    'logged_hours'             => 0,
                    'allow_employee_edit'      => false,
                    'completion_report_status' => 'none',
                ]);
            }

            return $project;
        });

        \App\Services\WebhookService::dispatch('project.created', $project->fresh()->toArray());

        return response()->json($this->formatProject($project->fresh()), 201);
    }

    /**
     * Update an existing project.
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        $oldTeamIds = $project->team_ids ?? [];
        $oldStatus  = $project->status;

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'sometimes|in:active,on-hold,completed,archived',
            'priority'    => 'sometimes|in:low,medium,high,critical',
            'category'         => 'sometimes|in:development,maintenance,research,infrastructure,consultation',
            'risk_level'       => 'sometimes|in:low,medium,high',
            'beneficiary_type' => 'sometimes|in:internal,external',
            'beneficiary_name' => 'sometimes|string|max:255',
            'contact_person'   => 'nullable|string|max:255',
            'contact_email'    => 'nullable|email|max:255',
            'contact_phone'    => 'nullable|string|max:50',
            'location'         => 'nullable|string|max:500',
            'objectives'       => 'sometimes|string|max:5000',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'budget'      => 'nullable|numeric|min:0',
            'spent'       => 'nullable|numeric|min:0',
            'progress'    => 'nullable|integer|min:0|max:100',
            'manager_id'  => 'nullable|exists:users,id',
            'team_ids'    => 'nullable|array',
            'team_ids.*'  => 'string',
            'leader_id'   => 'nullable|exists:users,id',
        ]);

        if (array_key_exists('team_ids', $data)) {
            $data['team_ids'] = array_values(array_unique(array_filter(array_map('strval', $data['team_ids'] ?? []))));
        }

        $nextTeamIds = array_key_exists('team_ids', $data) ? ($data['team_ids'] ?? []) : ($project->team_ids ?? []);
        $nextLeaderId = array_key_exists('leader_id', $data) ? $data['leader_id'] : $project->project_leader_id;
        $this->validateLeaderForTeam($nextTeamIds, $nextLeaderId);

        if (array_key_exists('leader_id', $data)) {
            $data['project_leader_id'] = $data['leader_id'];
            unset($data['leader_id']);
        }

        $project->update($data);

        // Audit: status change
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $this->audit->projectStatusChanged($project, $oldStatus, $data['status']);
        }

        // Auto-create tasks for newly added team members
        if (isset($data['team_ids'])) {
            $newTeamIds = $data['team_ids'];
            $addedMembers = array_diff($newTeamIds, $oldTeamIds);

            $addedMemberInts = array_values(array_filter(array_map('intval', $addedMembers), static fn ($id) => $id > 0));
            if (!empty($addedMemberInts)) {
                $existingAssignees = Task::where('project_id', $project->id)
                    ->whereIn('assigned_to', $addedMemberInts)
                    ->pluck('assigned_to')
                    ->map(static fn ($id) => (int) $id)
                    ->all();

                foreach ($addedMemberInts as $memberId) {
                    if (in_array($memberId, $existingAssignees, true)) {
                        continue;
                    }

                    Task::create([
                        'project_id'               => $project->id,
                        'title'                    => $project->name,
                        'description'              => $project->description ?? '',
                        'status'                   => 'todo',
                        'priority'                 => $project->priority ?? 'medium',
                        'assigned_to'              => $memberId,
                        'start_date'               => $project->start_date,
                        'end_date'                 => $project->end_date,
                        'estimated_hours'          => 0,
                        'progress'                 => 0,
                        'logged_hours'             => 0,
                        'allow_employee_edit'      => false,
                        'completion_report_status' => 'none',
                    ]);
                }
            }
        }

        \App\Services\WebhookService::dispatch('project.updated', $project->fresh()->toArray());

        return response()->json($this->formatProject($project->fresh()));
    }

    /**
     * Delete a project.
     */
    public function destroy(Project $project): JsonResponse
    {
        $this->audit->projectDeleted($project);
        \App\Services\WebhookService::dispatch('project.deleted', $project->toArray());
        $project->delete();
        return response()->json(['message' => 'Project deleted']);
    }

    /**
     * Format a project model into the JSON shape the frontend expects.
     */
    private function formatProject(Project $p, array $preloaded = []): array
    {
        $teamIds = array_values(array_filter(array_map('intval', $p->team_ids ?? []), static fn ($id) => $id > 0));

        if (!empty($preloaded)) {
            $teamTaskAvg = $preloaded['teamTaskAvgByProject'][$p->id] ?? null;
            $allTaskAvg = $preloaded['taskAvgByProject'][$p->id] ?? null;
            $hasProjectTasks = ($preloaded['taskExistsByProject'][$p->id] ?? 0) > 0;
            $approvedSpent = (float) ($preloaded['approvedSpentByProject'][$p->id] ?? 0);
            $reportCosts = (float) ($preloaded['reportCostsByProject'][$p->id] ?? 0);
        } else {
            $teamTaskAvg = !empty($teamIds)
                ? Task::where('project_id', $p->id)->whereIn('assigned_to', $teamIds)->avg('progress')
                : null;
            $allTaskAvg = Task::where('project_id', $p->id)->avg('progress');
            $hasProjectTasks = Task::where('project_id', $p->id)->exists();
            $approvedSpent = (float) BudgetRequest::where('project_id', $p->id)
                ->where('status', ApprovalStatus::APPROVED->value)->where('type', 'spending')->sum('amount');
            $reportCosts = (float) Task::where('project_id', $p->id)
                ->where('completion_report_status', ApprovalStatus::APPROVED->value)->sum('report_cost');
        }

        $taskAverageProgress = (int) round($teamTaskAvg ?? $allTaskAvg ?? 0);
        $storedProgress = (int) ($p->progress ?? 0);
        $computedProgress = $hasProjectTasks ? $taskAverageProgress : $storedProgress;
        $computedSpent = $approvedSpent + $reportCosts;

        return [
            'id'             => (string) $p->id,
            'serial'         => $p->serial ?? '',
            'name'           => $p->name,
            'description'    => $p->description ?? '',
            'status'         => $p->status,
            'priority'       => $p->priority,
            'category'        => $p->category ?? 'development',
            'riskLevel'       => $p->risk_level ?? 'low',
            'beneficiaryType' => $p->beneficiary_type ?? 'internal',
            'beneficiaryName' => $p->beneficiary_name ?? '',
            'contactPerson'   => $p->contact_person,
            'contactEmail'    => $p->contact_email,
            'contactPhone'    => $p->contact_phone,
            'location'        => $p->location,
            'objectives'      => $p->objectives ?? '',
            'startDate'      => $p->start_date?->toIso8601String() ?? '',
            'endDate'        => $p->end_date?->toIso8601String() ?? '',
            'budget'         => (float) $p->budget,
            'spent'          => $computedSpent,
            'progress'       => $computedProgress,
            'managerId'      => (string) ($p->manager_id ?? ''),
            'teamIds'        => array_values(array_filter(array_map('strval', $p->team_ids ?? []))),
            'leaderId'       => $p->project_leader_id ? (string) $p->project_leader_id : null,
            'createdAt'      => $p->created_at?->toIso8601String() ?? '',
            'updatedAt'      => $p->updated_at?->toIso8601String() ?? '',
            'approvalStatus' => $p->approval_status ?? 'draft',
            'approvalNotes'  => $p->approval_notes,
            'submittedBy'    => $p->submitted_by ? (string) $p->submitted_by : null,
            'reviewedBy'     => $p->reviewed_by  ? (string) $p->reviewed_by  : null,
            'lastReviewedAt' => $p->last_reviewed_at?->toIso8601String(),
        ];
    }

    private function validateLeaderForTeam(array $teamIds, mixed $leaderId): void
    {
        $normalizedTeamIds = array_values(array_unique(array_filter(array_map('strval', $teamIds))));
        $normalizedLeaderId = $leaderId !== null ? (string) $leaderId : null;

        if (count($normalizedTeamIds) >= 2) {
            if (!$normalizedLeaderId) {
                throw ValidationException::withMessages([
                    'leader_id' => 'A project leader is required when assigning two or more employees.',
                ]);
            }

            if (!in_array($normalizedLeaderId, $normalizedTeamIds, true)) {
                throw ValidationException::withMessages([
                    'leader_id' => 'The selected project leader must be one of the assigned team members.',
                ]);
            }
        }
    }

    // ─── Export helpers ─────────────────────────────────────────────────

    private function resolvePeriod(string $period): array
    {
        $now = Carbon::now();

        switch ($period) {
            case 'weekly':
                $startDate = $now->copy()->startOfWeek();
                $endDate = $now->copy()->endOfWeek();
                $periodLabel = 'Weekly Projects Report';
                $dateRange = $startDate->format('M d, Y') . ' - ' . $endDate->format('M d, Y');
                break;
            case 'yearly':
                $startDate = $now->copy()->startOfYear();
                $endDate = $now->copy()->endOfYear();
                $periodLabel = 'Yearly Projects Report';
                $dateRange = $startDate->format('Y');
                break;
            default:
                $period = 'monthly';
                $startDate = $now->copy()->startOfMonth();
                $endDate = $now->copy()->endOfMonth();
                $periodLabel = 'Monthly Projects Report';
                $dateRange = $now->format('F Y');
                break;
        }

        return [$period, $periodLabel, $dateRange, $startDate, $endDate];
    }

    private function getProjectRows(Request $request, Carbon $startDate, Carbon $endDate): \Illuminate\Support\Collection
    {
        $query = Project::query()
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        return $query->limit(500)->get();
    }

    private function buildProjectSummary(\Illuminate\Support\Collection $projects): array
    {
        return [
            'totalProjects' => $projects->count(),
            'activeProjects' => $projects->where('status', 'active')->count(),
            'completedProjects' => $projects->where('status', 'completed')->count(),
            'totalBudget' => $projects->sum('budget'),
        ];
    }

    /**
     * Export projects as PDF.
     */
    public function exportPdf(Request $request)
    {
        $now = Carbon::now();
        [$period, $periodLabel, $dateRange, $startDate, $endDate] = $this->resolvePeriod($request->input('period', 'monthly'));

        $projects = $this->getProjectRows($request, $startDate, $endDate);

        // Compute spent per project
        $projectIds = $projects->pluck('id');
        $approvedSpent = BudgetRequest::whereIn('project_id', $projectIds)
            ->where('status', ApprovalStatus::APPROVED->value)
            ->where('type', 'spending')
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(amount) as total')
            ->pluck('total', 'project_id');

        $reportCosts = Task::whereIn('project_id', $projectIds)
            ->where('completion_report_status', ApprovalStatus::APPROVED->value)
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(report_cost) as total')
            ->pluck('total', 'project_id');

        $taskAvg = Task::whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->selectRaw('project_id, AVG(progress) as avg_progress')
            ->pluck('avg_progress', 'project_id');

        $rows = $projects->map(function (Project $p) use ($approvedSpent, $reportCosts, $taskAvg) {
            $spent = (float) ($approvedSpent[$p->id] ?? 0) + (float) ($reportCosts[$p->id] ?? 0);
            $progress = (int) round($taskAvg[$p->id] ?? $p->progress ?? 0);
            return [
                'name'       => $p->name,
                'serial'     => $p->serial ?? '—',
                'status'     => ucfirst($p->status),
                'priority'   => ucfirst($p->priority),
                'category'   => ucfirst($p->category ?? '—'),
                'budget'     => number_format((float) $p->budget, 2),
                'spent'      => number_format($spent, 2),
                'progress'   => $progress . '%',
                'startDate'  => $p->start_date?->format('M d, Y') ?? '—',
                'endDate'    => $p->end_date?->format('M d, Y') ?? '—',
            ];
        })->toArray();

        $summary = $this->buildProjectSummary($projects);
        $totalSpent = $projects->sum(function ($p) use ($approvedSpent, $reportCosts) {
            return (float) ($approvedSpent[$p->id] ?? 0) + (float) ($reportCosts[$p->id] ?? 0);
        });

        $filters = [
            'status'   => (string) $request->query('status', ''),
            'priority' => (string) $request->query('priority', ''),
            'category' => (string) $request->query('category', ''),
        ];

        $pdf = Pdf::loadView('pdf.projects-report', [
            'summary'     => $summary,
            'totalSpent'  => $totalSpent,
            'filters'     => $filters,
            'periodLabel' => $periodLabel,
            'dateRange'   => $dateRange,
            'generatedAt' => $now->format('M d, Y h:i A'),
            'rows'        => $rows,
        ]);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->download('projects-' . $period . '-' . $now->format('Y-m-d') . '.pdf');
    }

    /**
     * Export projects as .xlsx (Open XML via ZipArchive).
     */
    public function exportSheet(Request $request)
    {
        $now = Carbon::now();
        [$period, $periodLabel, $dateRange, $startDate, $endDate] = $this->resolvePeriod($request->input('period', 'monthly'));

        $projects = $this->getProjectRows($request, $startDate, $endDate);

        $projectIds = $projects->pluck('id');
        $approvedSpent = BudgetRequest::whereIn('project_id', $projectIds)
            ->where('status', ApprovalStatus::APPROVED->value)
            ->where('type', 'spending')
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(amount) as total')
            ->pluck('total', 'project_id');

        $reportCosts = Task::whereIn('project_id', $projectIds)
            ->where('completion_report_status', ApprovalStatus::APPROVED->value)
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(report_cost) as total')
            ->pluck('total', 'project_id');

        $taskAvg = Task::whereIn('project_id', $projectIds)
            ->groupBy('project_id')
            ->selectRaw('project_id, AVG(progress) as avg_progress')
            ->pluck('avg_progress', 'project_id');

        $summary = $this->buildProjectSummary($projects);
        $totalSpent = $projects->sum(function ($p) use ($approvedSpent, $reportCosts) {
            return (float) ($approvedSpent[$p->id] ?? 0) + (float) ($reportCosts[$p->id] ?? 0);
        });

        $filters = [
            'status'   => (string) $request->query('status', ''),
            'priority' => (string) $request->query('priority', ''),
            'category' => (string) $request->query('category', ''),
        ];

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

        $addRow(["PROJECTS REPORT - {$periodLabel}"], [2], 10);
        $addRow(["Range: {$dateRange}"], [0], 10);
        $addRow(["Generated: " . $now->format('M d, Y h:i A')], [0], 10);
        $addRow([]);

        $addRow(['SUMMARY'], [2], 10);
        $addRow(['Total Projects', 'Active', 'Completed', 'Total Budget', 'Total Spent'], array_fill(0, 5, 1));
        $addRow([
            (string) $summary['totalProjects'],
            (string) $summary['activeProjects'],
            (string) $summary['completedProjects'],
            number_format((float) $summary['totalBudget'], 2),
            number_format($totalSpent, 2),
        ], [3, 4, 4, 3, 5]);
        $addRow([]);

        $addRow(['ACTIVE FILTERS'], [2], 10);
        $addRow(['Status', 'Priority', 'Category'], array_fill(0, 3, 1));
        $addRow([
            $filters['status'] !== '' ? ucfirst($filters['status']) : 'All',
            $filters['priority'] !== '' ? ucfirst($filters['priority']) : 'All',
            $filters['category'] !== '' ? ucfirst($filters['category']) : 'All',
        ], [0, 0, 0]);
        $addRow([]);

        $addRow(['PROJECT LIST'], [2], 10);
        $addRow(['Name', 'Serial', 'Status', 'Priority', 'Category', 'Budget', 'Spent', 'Progress', 'Start Date', 'End Date'], array_fill(0, 10, 1));

        foreach ($projects as $p) {
            $spent = (float) ($approvedSpent[$p->id] ?? 0) + (float) ($reportCosts[$p->id] ?? 0);
            $progress = (int) round($taskAvg[$p->id] ?? $p->progress ?? 0);
            $addRow([
                $p->name,
                $p->serial ?? '',
                ucfirst($p->status),
                ucfirst($p->priority),
                ucfirst($p->category ?? ''),
                number_format((float) $p->budget, 2),
                number_format($spent, 2),
                $progress . '%',
                $p->start_date?->format('Y-m-d') ?? '',
                $p->end_date?->format('Y-m-d') ?? '',
            ], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }

        // Build XML
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
        <col min="1" max="1" width="35" customWidth="1"/>
        <col min="2" max="2" width="16" customWidth="1"/>
        <col min="3" max="3" width="12" customWidth="1"/>
        <col min="4" max="4" width="12" customWidth="1"/>
        <col min="5" max="5" width="16" customWidth="1"/>
        <col min="6" max="6" width="16" customWidth="1"/>
        <col min="7" max="7" width="16" customWidth="1"/>
        <col min="8" max="8" width="12" customWidth="1"/>
        <col min="9" max="9" width="14" customWidth="1"/>
        <col min="10" max="10" width="14" customWidth="1"/>
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
        <sheet name="Projects Report" sheetId="1" r:id="rId1"/>
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

        $filename = 'projects-' . $period . '-' . $now->format('Y-m-d') . '.xlsx';
        $content = file_get_contents($tmpFile);
        unlink($tmpFile);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Content-Length' => strlen($content),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }
}
