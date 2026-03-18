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
            ->get()
            ->map(fn ($p) => $this->formatProject($p));

        return response()->json($projects);
    }

    /**
     * Create a new project.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:active,on-hold,completed,archived',
            'priority'    => 'required|in:low,medium,high,critical',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date',
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
    private function formatProject(Project $p): array
    {
        // Keep persisted project progress as source of truth.
        // Derive task-based progress from assigned team-member tasks first,
        // then fallback to all project tasks when needed.
        $teamIds = array_values(array_filter(array_map('intval', $p->team_ids ?? []), static fn ($id) => $id > 0));
        $teamTaskAvg = null;
        if (!empty($teamIds)) {
            $teamTaskAvg = Task::where('project_id', $p->id)
                ->whereIn('assigned_to', $teamIds)
                ->avg('progress');
        }
        $allTaskAvg = Task::where('project_id', $p->id)->avg('progress');
        $taskAverageProgress = (int) round($teamTaskAvg ?? $allTaskAvg ?? 0);
        $storedProgress = (int) ($p->progress ?? 0);
        $computedProgress = max($storedProgress, $taskAverageProgress);

        // Compute spent from approved spending budget requests + approved task report costs
        $approvedSpent = BudgetRequest::where('project_id', $p->id)
            ->where('status', 'approved')
            ->where('type', 'spending')
            ->sum('amount');
        $reportCosts = Task::where('project_id', $p->id)
            ->where('completion_report_status', 'approved')
            ->sum('report_cost');
        $computedSpent = (float) ($approvedSpent + $reportCosts);

        return [
            'id'             => (string) $p->id,
            'serial'         => $p->serial ?? '',
            'name'           => $p->name,
            'description'    => $p->description ?? '',
            'status'         => $p->status,
            'priority'       => $p->priority,
            'startDate'      => $p->start_date?->toDateString() ?? '',
            'endDate'        => $p->end_date?->toDateString() ?? '',
            'budget'         => (float) $p->budget,
            'spent'          => $computedSpent,
            'progress'       => $computedProgress,
            'managerId'      => (string) ($p->manager_id ?? ''),
            'teamIds'        => array_values(array_filter(array_map('strval', $p->team_ids ?? []))),
            'leaderId'       => $p->project_leader_id ? (string) $p->project_leader_id : null,
            'createdAt'      => $p->created_at?->toDateString() ?? '',
            'approvalStatus' => $p->approval_status ?? 'draft',
            'approvalNotes'  => $p->approval_notes,
            'submittedBy'    => $p->submitted_by ? (string) $p->submitted_by : null,
            'reviewedBy'     => $p->reviewed_by  ? (string) $p->reviewed_by  : null,
            'lastReviewedAt' => $p->last_reviewed_at?->toISOString(),
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
