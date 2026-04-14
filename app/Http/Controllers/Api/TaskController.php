<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\Project;
use App\Models\BudgetRequest;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * List all tasks (optionally filtered by project_id or assigned_to).
     * Employees can only see tasks assigned to them.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $query = Task::query();

        // Employees can only see tasks assigned to them
        if ($user && $user->department === Department::Employee) {
            $query->where('assigned_to', $user->id);
        } else {
            // Other departments can filter by assigned_to if provided
            if ($request->has('assigned_to')) {
                $query->where('assigned_to', $request->input('assigned_to'));
            }
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        // Advanced filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }
        if ($request->filled('start_date_from')) {
            $query->where('start_date', '>=', $request->input('start_date_from'));
        }
        if ($request->filled('start_date_to')) {
            $query->where('start_date', '<=', $request->input('start_date_to'));
        }
        if ($request->filled('end_date_from')) {
            $query->where('end_date', '>=', $request->input('end_date_from'));
        }
        if ($request->filled('end_date_to')) {
            $query->where('end_date', '<=', $request->input('end_date_to'));
        }
        if ($request->filled('overdue') && $request->boolean('overdue')) {
            $query->where('end_date', '<', now())
                  ->whereNotIn('status', ['completed', 'done', 'approved']);
        }

        $tasks = $query->orderByDesc('created_at')
            ->limit(1000)
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
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:todo,in-progress,review,completed',
            'priority' => 'sometimes|in:low,medium,high,critical',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        $data['progress'] = 0;
        $data['logged_hours'] = 0;
        $data['allow_employee_edit'] = false;
        $data['completion_report_status'] = 'none';

        $task = Task::create($data);

        // Log task creation
        TaskActivityLogger::taskCreated($task->id, $task->title);

        return response()->json($this->formatTask($task->fresh()), 201);
    }

    /**
     * Update a task.
     * Employees can only update their own tasks with limited fields.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Employees can only update their own tasks
        if ($user && $user->department === Department::Employee) {
            if ($task->assigned_to !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only update tasks assigned to you.',
                ], 403);
            }

            $project = Project::find($task->project_id);
            if ($project && in_array($project->status, ['completed', 'archived'], true)) {
                return response()->json([
                    'error' => 'Locked',
                    'message' => 'This project is already completed and can no longer be updated by employees.',
                ], 422);
            }

            // Employees can only update limited fields
            $data = $request->validate([
                'status' => 'sometimes|in:todo,in-progress,review,completed',
                'progress' => 'nullable|integer|min:0|max:100',
                'logged_hours' => 'nullable|numeric|min:0',
                'completion_report_status' => 'sometimes|in:none,pending',
                'report_cost' => 'nullable|numeric|min:0',
            ]);
        } else {
            // Admin/Technical - full update access
            $data = $request->validate([
                'title' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'status' => 'sometimes|in:todo,in-progress,review,completed',
                'priority' => 'sometimes|in:low,medium,high,critical',
                'assigned_to' => 'nullable|exists:users,id',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date|after_or_equal:start_date',
                'progress' => 'nullable|integer|min:0|max:100',
                'estimated_hours' => 'nullable|numeric|min:0',
                'logged_hours' => 'nullable|numeric|min:0',
                'allow_employee_edit' => 'nullable|boolean',
                'completion_report_status' => 'sometimes|in:none,pending,approved,rejected',
                'report_cost' => 'nullable|numeric|min:0',
            ]);
        }

        $oldStatus = $task->completion_report_status;
        $oldAssignedTo = $task->assigned_to;
        $oldStatusField = $task->status;

        DB::transaction(function () use ($task, &$data, $oldStatus) {
            // When re-submitting a report for an already-approved task,
            // ADD the new cost to the existing approved cost (accumulate, not replace)
            if (isset($data['completion_report_status']) && $data['completion_report_status'] === ApprovalStatus::PENDING->value
                && $oldStatus === ApprovalStatus::APPROVED->value
                && isset($data['report_cost']) && (float) $task->report_cost > 0) {
                // Lock the task row to prevent concurrent reads
                $task->lockForUpdate()->first();
                $data['report_cost'] = (float) $task->report_cost + (float) $data['report_cost'];
            }

            $task->update($data);

            // When a report is approved, auto-recalculate project.spent
            if (isset($data['completion_report_status']) && $data['completion_report_status'] === ApprovalStatus::APPROVED->value && $oldStatus !== ApprovalStatus::APPROVED->value) {
                $this->recalcProjectSpent($task->project_id);
            }
            // If report is un-approved (rejected after approval), recalc too
            if (isset($data['completion_report_status']) && $oldStatus === ApprovalStatus::APPROVED->value && $data['completion_report_status'] !== ApprovalStatus::APPROVED->value) {
                $this->recalcProjectSpent($task->project_id);
            }
        });

        // Log activity changes
        // 1. Status change
        if (isset($data['status']) && $data['status'] !== $oldStatusField) {
            TaskActivityLogger::statusChanged($task->id, $oldStatusField, $data['status']);
        }

        // 2. Assignment changes (reassigned or newly assigned)
        if (isset($data['assigned_to']) && $data['assigned_to'] !== $oldAssignedTo) {
            if ($oldAssignedTo) {
                $oldUser = \App\Models\User::find($oldAssignedTo);
                $newUser = \App\Models\User::find($data['assigned_to']);
                TaskActivityLogger::taskReassigned($task->id, $oldUser?->name, $newUser?->name);
            } else {
                $newUser = \App\Models\User::find($data['assigned_to']);
                TaskActivityLogger::taskAssigned($task->id, $newUser?->name);
            }
        }

        // 3. Generic field updates
        if (count($data) > 0 && !isset($data['status']) && !isset($data['assigned_to'])) {
            TaskActivityLogger::taskUpdated($task->id, $data);
        }

        // Auto-recalculate project progress when task progress or status changes
        if (isset($data['progress']) || isset($data['status'])) {
            $project = Project::find($task->project_id);
            $project?->recalculateProgress();
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
            'id' => (string) $t->id,
            'projectId' => (string) $t->project_id,
            'title' => $t->title,
            'description' => $t->description ?? '',
            'status' => $t->status,
            'priority' => $t->priority,
            'assignedTo' => (string) ($t->assigned_to ?? ''),
            'startDate' => $t->start_date?->toIso8601String() ?? '',
            'endDate' => $t->end_date?->toIso8601String() ?? '',
            'progress' => (int) $t->progress,
            'estimatedHours' => (float) $t->estimated_hours,
            'loggedHours' => (float) $t->logged_hours,
            'allowEmployeeEdit' => (bool) $t->allow_employee_edit,
            'completionReportStatus' => $t->completion_report_status,
            'reportCost' => (float) $t->report_cost,
        ];
    }

    /**
     * Recalculate project.spent from approved budget requests + approved task report costs.
     */
    private function recalcProjectSpent(int $projectId): void
    {
        $project = Project::lockForUpdate()->find($projectId);
        if (!$project) return;

        $budgetSpent = BudgetRequest::where('project_id', $projectId)
            ->where('status', ApprovalStatus::APPROVED->value)
            ->where('type', 'spending')
            ->sum('amount');

        $reportCosts = Task::where('project_id', $projectId)
            ->where('completion_report_status', ApprovalStatus::APPROVED->value)
            ->sum('report_cost');

        $project->spent = $budgetSpent + $reportCosts;
        $project->save();
    }
}
