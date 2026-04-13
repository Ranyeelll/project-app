<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\BudgetRequest;
use App\Services\AuditService;
use App\Services\ProjectSerialService;
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
    public function index(): JsonResponse
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
            ->where('status', 'approved')
            ->where('type', 'spending')
            ->groupBy('project_id')
            ->selectRaw('project_id, SUM(amount) as total')
            ->pluck('total', 'project_id');

        $reportCostsByProject = Task::whereIn('project_id', $projectIds)
            ->where('completion_report_status', 'approved')
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
            'end_date'    => 'nullable|date',
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

        return response()->json($this->formatProject($project->fresh()));
    }

    /**
     * Delete a project.
     */
    public function destroy(Project $project): JsonResponse
    {
        $this->audit->projectDeleted($project);
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
                ->where('status', 'approved')->where('type', 'spending')->sum('amount');
            $reportCosts = (float) Task::where('project_id', $p->id)
                ->where('completion_report_status', 'approved')->sum('report_cost');
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
}
