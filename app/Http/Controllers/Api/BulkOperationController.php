<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalStatus;
use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BulkOperationController extends Controller
{
    /**
     * Bulk update task status.
     * POST /api/bulk/tasks/status
     */
    public function updateTaskStatus(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'task_ids'  => 'required|array|min:1|max:100',
            'task_ids.*' => 'integer|exists:tasks,id',
            'status'    => 'required|in:todo,in-progress,review,completed',
        ]);

        $updated = 0;
        DB::transaction(function () use ($data, &$updated, $user) {
            $tasks = Task::whereIn('id', $data['task_ids'])->get();

            // Verify user has access to all affected projects
            if ($user && $user->department === Department::Employee) {
                $projectIds = $tasks->pluck('project_id')->unique();
                foreach ($projectIds as $projectId) {
                    $project = Project::find($projectId);
                    if ($project && !in_array((string) $user->id, $project->team_ids ?? [], true)) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'task_ids' => 'You do not have access to all selected tasks.',
                        ]);
                    }
                }
            }

            foreach ($tasks as $task) {
                $oldStatus = $task->status;
                if ($oldStatus !== $data['status']) {
                    $task->update(['status' => $data['status']]);
                    TaskActivityLogger::statusChanged($task->id, $oldStatus, $data['status']);
                    $updated++;
                }
            }

            // Recalculate progress for affected projects
            $projectIds = $tasks->pluck('project_id')->unique();
            foreach ($projectIds as $projectId) {
                Project::find($projectId)?->recalculateProgress();
            }
        });

        return response()->json([
            'message' => "{$updated} task(s) updated",
            'updated' => $updated,
        ]);
    }

    /**
     * Bulk assign tasks to a user.
     * POST /api/bulk/tasks/assign
     */
    public function assignTasks(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'task_ids'    => 'required|array|min:1|max:100',
            'task_ids.*'  => 'integer|exists:tasks,id',
            'assigned_to' => 'required|exists:users,id',
        ]);

        $updated = 0;
        DB::transaction(function () use ($data, &$updated, $user) {
            $newUser = \App\Models\User::find($data['assigned_to']);
            $tasks = Task::whereIn('id', $data['task_ids'])->get();

            // Verify user has access to all affected projects
            if ($user && $user->department === Department::Employee) {
                $projectIds = $tasks->pluck('project_id')->unique();
                foreach ($projectIds as $projectId) {
                    $project = Project::find($projectId);
                    if ($project && !in_array((string) $user->id, $project->team_ids ?? [], true)) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'task_ids' => 'You do not have access to all selected tasks.',
                        ]);
                    }
                }
            }

            foreach ($tasks as $task) {
                $oldAssignee = $task->assigned_to;
                if ((int) $oldAssignee !== (int) $data['assigned_to']) {
                    $task->update(['assigned_to' => $data['assigned_to']]);
                    if ($oldAssignee) {
                        $oldUser = \App\Models\User::find($oldAssignee);
                        TaskActivityLogger::taskReassigned($task->id, $oldUser?->name, $newUser?->name);
                    } else {
                        TaskActivityLogger::taskAssigned($task->id, $newUser?->name);
                    }
                    $updated++;
                }
            }
        });

        return response()->json([
            'message' => "{$updated} task(s) assigned",
            'updated' => $updated,
        ]);
    }

    /**
     * Bulk update budget request status.
     * POST /api/bulk/budget-requests/status
     */
    public function updateBudgetStatus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'budget_request_ids'   => 'required|array|min:1|max:50',
            'budget_request_ids.*' => 'integer|exists:budget_requests,id',
            'status'               => ['required', \Illuminate\Validation\Rule::in([ApprovalStatus::APPROVED->value, ApprovalStatus::REJECTED->value, ApprovalStatus::REVISION_REQUESTED->value])],
            'comment'              => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $updated = 0;

        DB::transaction(function () use ($data, $user, &$updated) {
            $requests = BudgetRequest::whereIn('id', $data['budget_request_ids'])->get();

            foreach ($requests as $budgetRequest) {
                $budgetRequest->update([
                    'status'         => $data['status'],
                    'reviewed_by'    => $user->id,
                    'review_comment' => $data['comment'] ?? null,
                    'reviewed_at'    => now(),
                ]);
                $updated++;
            }

            // Recalculate spent for affected projects
            $projectIds = $requests->pluck('project_id')->unique();
            foreach ($projectIds as $projectId) {
                $project = Project::lockForUpdate()->find($projectId);
                if (!$project) continue;

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
        });

        return response()->json([
            'message' => "{$updated} budget request(s) updated",
            'updated' => $updated,
        ]);
    }
}
