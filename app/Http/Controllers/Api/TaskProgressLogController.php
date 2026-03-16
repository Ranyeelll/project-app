<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskProgressLogController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * Record or update task progress.
     * PATCH /api/tasks/{id}/progress
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee on own task, Manager/Admin on any task
        if ($user && $user->department === Department::Employee) {
            if ($task->assigned_to !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only update progress on tasks assigned to you.',
                ], 403);
            }
        }

        $data = $request->validate([
            'percentage_completed' => 'required|integer|min:0|max:100',
            'work_description' => 'nullable|string',
            'file_path' => 'nullable|string',
        ]);

        // Create progress log entry
        $log = TaskProgressLog::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'percentage_completed' => $data['percentage_completed'],
            'work_description' => $data['work_description'] ?? null,
            'file_path' => $data['file_path'] ?? null,
        ]);

        // Update task progress
        $task->update(['progress' => $data['percentage_completed']]);

        // Audit log
        $this->auditService->logTaskProgressUpdate(
            taskId: $task->id,
            percentage: $data['percentage_completed'],
            description: $data['work_description'] ?? null
        );

        // Activity log
        TaskActivityLogger::progressUpdated($task->id, $data['percentage_completed']);

        return response()->json([
            'message' => 'Progress updated successfully',
            'log' => $this->formatProgressLog($log),
        ]);
    }

    /**
     * Get progress logs for a task.
     * GET /api/tasks/{id}/progress
     */
    public function show(Task $task): JsonResponse
    {
        $logs = $task->progressLogs()
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($log) => $this->formatProgressLog($log));

        return response()->json([
            'taskId' => (string) $task->id,
            'currentProgress' => (int) $task->progress,
            'logs' => $logs,
        ]);
    }

    /**
     * Format progress log for response.
     */
    private function formatProgressLog(TaskProgressLog $log): array
    {
        return [
            'id' => (string) $log->id,
            'taskId' => (string) $log->task_id,
            'userId' => (string) ($log->user_id ?? ''),
            'userName' => $log->user?->name ?? null,
            'percentageCompleted' => (int) $log->percentage_completed,
            'workDescription' => $log->work_description ?? '',
            'filePath' => $log->file_path ?? '',
            'createdAt' => $log->created_at?->toIso8601String(),
        ];
    }
}
