<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SprintController extends Controller
{
    public function index(Request $request, int $projectId): JsonResponse
    {
        $query = Sprint::where('project_id', $projectId)
            ->with('tasks:id,sprint_id,title,status,priority,progress');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->input('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }

        $sprints = $query->orderBy('start_date')
            ->get()
            ->map(fn ($s) => $this->formatSprint($s));

        return response()->json($sprints);
    }

    public function store(Request $request, int $projectId): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'nullable|in:planning,active,completed,cancelled',
        ]);

        $sprint = Sprint::create([
            'project_id' => $projectId,
            'name' => $data['name'],
            'goal' => $data['goal'] ?? null,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $data['status'] ?? 'planning',
        ]);

        $sprint->load('tasks:id,sprint_id,title,status,priority,progress');

        return response()->json($this->formatSprint($sprint), 201);
    }

    public function update(Request $request, int $projectId, Sprint $sprint): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'status' => 'nullable|in:planning,active,completed,cancelled',
        ]);

        $sprint->update($data);
        $sprint->load('tasks:id,sprint_id,title,status,priority,progress');

        return response()->json($this->formatSprint($sprint));
    }

    public function destroy(int $projectId, Sprint $sprint): JsonResponse
    {
        // Unassign tasks from this sprint before deleting
        $sprint->tasks()->update(['sprint_id' => null]);
        $sprint->delete();

        return response()->json(['message' => 'Sprint deleted']);
    }

    private function formatSprint(Sprint $s): array
    {
        $tasks = $s->tasks ?? collect();
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'completed')->count();

        return [
            'id' => (string) $s->id,
            'projectId' => (string) $s->project_id,
            'name' => $s->name,
            'goal' => $s->goal ?? '',
            'startDate' => $s->start_date?->format('Y-m-d') ?? '',
            'endDate' => $s->end_date?->format('Y-m-d') ?? '',
            'status' => $s->status,
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'progress' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0,
            'tasks' => $tasks->map(fn ($t) => [
                'id' => (string) $t->id,
                'title' => $t->title,
                'status' => $t->status,
                'priority' => $t->priority,
                'progress' => (int) $t->progress,
            ])->values()->toArray(),
        ];
    }
}
