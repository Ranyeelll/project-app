<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
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

        return response()->json($this->formatProject($project), 201);
    }

    /**
     * Update an existing project.
     */
    public function update(Request $request, Project $project): JsonResponse
    {
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
        return [
            'id'          => (string) $p->id,
            'name'        => $p->name,
            'description' => $p->description ?? '',
            'status'      => $p->status,
            'priority'    => $p->priority,
            'startDate'   => $p->start_date?->toDateString() ?? '',
            'endDate'     => $p->end_date?->toDateString() ?? '',
            'budget'      => (float) $p->budget,
            'spent'       => (float) $p->spent,
            'progress'    => (int) $p->progress,
            'managerId'   => (string) ($p->manager_id ?? ''),
            'teamIds'     => $p->team_ids ?? [],
            'createdAt'   => $p->created_at?->toDateString() ?? '',
        ];
    }
}
