<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use App\Models\BudgetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * List all tasks (optionally filtered by project_id or assigned_to).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Task::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->input('assigned_to'));
        }

        $tasks = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => $this->formatTask($t));

        return response()->json($tasks);
    }

    /**
     * Create a new task.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'      => 'required|exists:projects,id',
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'status'          => 'sometimes|in:todo,in-progress,review,completed',
            'priority'        => 'sometimes|in:low,medium,high,critical',
            'assigned_to'     => 'nullable|exists:users,id',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        $data['progress']                 = 0;
        $data['logged_hours']             = 0;
        $data['allow_employee_edit']      = false;
        $data['completion_report_status'] = 'none';

        $task = Task::create($data);

        return response()->json($this->formatTask($task), 201);
    }

    /**
     * Update a task.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $data = $request->validate([
            'title'                    => 'sometimes|string|max:255',
            'description'              => 'nullable|string',
            'status'                   => 'sometimes|in:todo,in-progress,review,completed',
            'priority'                 => 'sometimes|in:low,medium,high,critical',
            'assigned_to'              => 'nullable|exists:users,id',
            'start_date'               => 'nullable|date',
            'end_date'                 => 'nullable|date',
            'progress'                 => 'nullable|integer|min:0|max:100',
            'estimated_hours'          => 'nullable|numeric|min:0',
            'logged_hours'             => 'nullable|numeric|min:0',
            'allow_employee_edit'      => 'nullable|boolean',
            'completion_report_status' => 'sometimes|in:none,pending,approved,rejected',
            'report_cost'              => 'nullable|numeric|min:0',
        ]);

        $oldStatus = $task->completion_report_status;
        $task->update($data);

        // When a report is approved, auto-recalculate project.spent
        if (isset($data['completion_report_status']) && $data['completion_report_status'] === 'approved' && $oldStatus !== 'approved') {
            $this->recalcProjectSpent($task->project_id);
        }
        // If report is un-approved (rejected after approval), recalc too
        if (isset($data['completion_report_status']) && $oldStatus === 'approved' && $data['completion_report_status'] !== 'approved') {
            $this->recalcProjectSpent($task->project_id);
        }

        return response()->json($this->formatTask($task->fresh()));
    }

    /**
     * Delete a task.
     */
    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return response()->json(['message' => 'Task deleted']);
    }

    /**
     * Format a task for the frontend.
     */
    private function formatTask(Task $t): array
    {
        return [
            'id'                     => (string) $t->id,
            'projectId'              => (string) $t->project_id,
            'title'                  => $t->title,
            'description'            => $t->description ?? '',
            'status'                 => $t->status,
            'priority'               => $t->priority,
            'assignedTo'             => (string) ($t->assigned_to ?? ''),
            'startDate'              => $t->start_date?->toDateString() ?? '',
            'endDate'                => $t->end_date?->toDateString() ?? '',
            'progress'               => (int) $t->progress,
            'estimatedHours'         => (float) $t->estimated_hours,
            'loggedHours'            => (float) $t->logged_hours,
            'allowEmployeeEdit'      => (bool) $t->allow_employee_edit,
            'completionReportStatus' => $t->completion_report_status,
            'reportCost'             => (float) $t->report_cost,
        ];
    }

    /**
     * Recalculate project.spent from approved budget requests + approved task report costs.
     */
    private function recalcProjectSpent(int $projectId): void
    {
        $project = Project::find($projectId);
        if (!$project) return;

        $budgetSpent = BudgetRequest::where('project_id', $projectId)
            ->where('status', 'approved')
            ->where('type', 'spending')
            ->sum('amount');

        $reportCosts = Task::where('project_id', $projectId)
            ->where('completion_report_status', 'approved')
            ->sum('report_cost');

        $project->spent = $budgetSpent + $reportCosts;
        $project->save();
    }
}
