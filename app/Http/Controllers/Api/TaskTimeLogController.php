<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskTimeLog;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskTimeLogController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * List time logs for a task.
     * GET /api/tasks/{id}/time-logs
     */
    public function index(Task $task, Request $request): JsonResponse
    {
        $logs = $task->timeLogs()
            ->with('user:id,name')
            ->orderBy('date_worked', 'desc')
            ->get()
            ->map(fn ($log) => $this->formatTimeLog($log));

        // Calculate total hours
        $totalHours = $task->timeLogs()->sum('hours_worked');

        return response()->json([
            'taskId' => (string) $task->id,
            'estimatedHours' => (float) $task->estimated_hours,
            'loggedHours' => (float) $task->logged_hours,
            'totalFromLogs' => (float) $totalHours,
            'logs' => $logs,
        ]);
    }

    /**
     * Create a new time log.
     * POST /api/tasks/{id}/time-logs
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee can only log for their own tasks
        if ($user && $user->department === Department::Employee) {
            if ($task->assigned_to !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only log time on tasks assigned to you.',
                ], 403);
            }
        }

        $data = $request->validate([
            'date_worked' => 'required|date',
            'hours_worked' => 'required|numeric|min:0.25|max:24',
            'work_description' => 'nullable|string',
        ]);

        $log = TaskTimeLog::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'date_worked' => $data['date_worked'],
            'hours_worked' => $data['hours_worked'],
            'work_description' => $data['work_description'],
        ]);

        // Recalculate task.logged_hours
        $this->recalcTaskHours($task->id);

        // Audit log
        $this->auditService->logTaskTimeLogged(
            taskId: $task->id,
            hours: (float) $data['hours_worked'],
            dateWorked: $data['date_worked']
        );

        // Activity log
        TaskActivityLogger::timeLogged($task->id, (float) $data['hours_worked'], $data['date_worked']->toDateString());

        return response()->json([
            'message' => 'Time logged successfully',
            'log' => $this->formatTimeLog($log),
        ], 201);
    }

    /**
     * Update a time log.
     * PUT /api/tasks/{id}/time-logs/{logId}
     */
    public function update(Request $request, Task $task, TaskTimeLog $timeLog): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee can only update their own logs
        if ($user && $user->department === Department::Employee) {
            if ($timeLog->user_id !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only edit your own time logs.',
                ], 403);
            }
        }

        $data = $request->validate([
            'date_worked' => 'sometimes|date',
            'hours_worked' => 'sometimes|numeric|min:0.25|max:24',
            'work_description' => 'nullable|string',
        ]);

        $oldHours = $timeLog->hours_worked;
        $timeLog->update($data);

        // Recalculate task.logged_hours
        $this->recalcTaskHours($task->id);

        // Audit log
        if (isset($data['hours_worked'])) {
            $this->auditService->logTaskTimeLogged(
                taskId: $task->id,
                hours: (float) $data['hours_worked'],
                dateWorked: $data['date_worked'] ?? $timeLog->date_worked,
                note: "Updated from {$oldHours} hours"
            );
        }

        return response()->json([
            'message' => 'Time log updated successfully',
            'log' => $this->formatTimeLog($timeLog),
        ]);
    }

    /**
     * Delete a time log.
     * DELETE /api/tasks/{id}/time-logs/{logId}
     */
    public function destroy(Task $task, TaskTimeLog $timeLog): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee can only delete their own logs
        if ($user && $user->department === Department::Employee) {
            if ($timeLog->user_id !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only delete your own time logs.',
                ], 403);
            }
        }

        $deletedHours = $timeLog->hours_worked;
        $timeLog->delete();

        // Recalculate task.logged_hours
        $this->recalcTaskHours($task->id);

        // Audit log
        $this->auditService->logTaskTimeLogged(
            taskId: $task->id,
            hours: -(float) $deletedHours,
            note: "Time log deleted"
        );

        return response()->json([
            'message' => 'Time log deleted successfully',
        ]);
    }

    /**
     * Recalculate task.logged_hours from all time logs.
     */
    private function recalcTaskHours(int $taskId): void
    {
        $task = Task::find($taskId);
        if (!$task) return;

        $totalHours = $task->timeLogs()->sum('hours_worked');
        $task->update(['logged_hours' => $totalHours]);
    }

    /**
     * Format time log for response.
     */
    private function formatTimeLog(TaskTimeLog $log): array
    {
        return [
            'id' => (string) $log->id,
            'taskId' => (string) $log->task_id,
            'userId' => (string) $log->user_id,
            'userName' => $log->user?->name ?? null,
            'dateWorked' => $log->date_worked?->toDateString(),
            'hoursWorked' => (float) $log->hours_worked,
            'workDescription' => $log->work_description ?? '',
            'createdAt' => $log->created_at?->toIso8601String(),
        ];
    }
}
