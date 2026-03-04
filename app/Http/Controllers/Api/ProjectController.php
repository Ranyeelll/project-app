<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\BudgetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * List all projects.
     */
    public function index(): JsonResponse
    {
        $projects = Project::orderByDesc('created_at')
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
        ]);

        $data['budget']  = $data['budget'] ?? 0;
        $data['spent']   = 0;
        $data['progress'] = 0;
        $data['team_ids'] = $data['team_ids'] ?? [];

        $project = Project::create($data);

        // Auto-create a task for each team member so it appears in their My Tasks
        foreach ($data['team_ids'] as $memberId) {
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

        return response()->json($this->formatProject($project->fresh()), 201);
    }

    /**
     * Update an existing project.
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        $oldTeamIds = $project->team_ids ?? [];

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
        ]);

        $project->update($data);

        // Auto-create tasks for newly added team members
        if (isset($data['team_ids'])) {
            $newTeamIds = $data['team_ids'];
            $addedMembers = array_diff($newTeamIds, $oldTeamIds);

            foreach ($addedMembers as $memberId) {
                // Only create if this member doesn't already have a task in this project
                $existing = Task::where('project_id', $project->id)
                    ->where('assigned_to', $memberId)
                    ->exists();

                if (!$existing) {
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
        $project->delete();
        return response()->json(['message' => 'Project deleted']);
    }

    /**
     * Format a project model into the JSON shape the frontend expects.
     */
    private function formatProject(Project $p): array
    {
        // Compute progress from tasks
        $projectTasks = Task::where('project_id', $p->id)->get();
        $totalTasks = $projectTasks->count();
        $completedTasks = $projectTasks->where('status', 'completed')->count();
        $computedProgress = $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : (int) $p->progress;

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
            'id'          => (string) $p->id,
            'name'        => $p->name,
            'description' => $p->description ?? '',
            'status'      => $p->status,
            'priority'    => $p->priority,
            'startDate'   => $p->start_date?->toDateString() ?? '',
            'endDate'     => $p->end_date?->toDateString() ?? '',
            'budget'      => (float) $p->budget,
            'spent'       => $computedSpent,
            'progress'    => $computedProgress,
            'managerId'   => (string) ($p->manager_id ?? ''),
            'teamIds'     => $p->team_ids ?? [],
            'createdAt'   => $p->created_at?->toDateString() ?? '',
        ];
    }
}
