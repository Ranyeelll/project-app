<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TaskActivityController extends Controller
{
    /**
     * Get activity timeline for a task.
     * GET /api/tasks/{task}/activities
     *
     * Visible to: assigned user, managers, admins
     */
    public function index(Task $task): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employees can only view activities for assigned tasks
        if ($user && $user->department === Department::Employee) {
            if ($task->assigned_to !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only view activity timelines for tasks assigned to you.',
                ], 403);
            }
        }

        $activities = TaskActivityLog::where('task_id', $task->id)
            ->with('user:id,name,email')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($a) => $this->formatActivity($a));

        return response()->json([
            'taskId' => (string) $task->id,
            'taskTitle' => $task->title,
            'totalActivities' => $activities->count(),
            'activities' => $activities,
        ]);
    }

    /**
     * Format activity for response.
     */
    private function formatActivity(TaskActivityLog $log): array
    {
        return [
            'id' => (string) $log->id,
            'taskId' => (string) $log->task_id,
            'userId' => (string) ($log->user_id ?? ''),
            'userName' => $log->user?->name ?? 'System',
            'userEmail' => $log->user?->email ?? null,
            'actionType' => $log->action_type,
            'description' => $log->description,
            'metadata' => $log->metadata ?? [],
            'createdAt' => $log->created_at?->toIso8601String(),
            'createdAtFormatted' => $log->created_at?->format('M d, Y H:i') ?? '',
        ];
    }
}
