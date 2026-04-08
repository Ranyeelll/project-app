<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Events\TaskProgressUpdated;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskProgressLog;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;

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
        $project = $task->project;
        $teamIds = array_values(array_filter(array_map('intval', $project?->team_ids ?? []), static fn ($id) => $id > 0));
        $leaderId = (int) ($project?->project_leader_id ?? 0);
        $isMultiMemberProject = count($teamIds) >= 2;

        // Authorization: If project has 2+ employees and leader is set,
        // only the leader can submit progress updates.
        if ($user && $user->department === Department::Employee) {
            if ($project && in_array($project->status, ['completed', 'archived'], true)) {
                return response()->json([
                    'error' => 'Locked',
                    'message' => 'This project is already completed and can no longer be updated by employees.',
                ], 422);
            }

            if ($isMultiMemberProject && $leaderId > 0) {
                if ((int) $user->id !== $leaderId) {
                    return response()->json([
                        'error' => 'Forbidden',
                        'message' => 'Only the assigned project leader can update progress for this project.',
                    ], 403);
                }
            } else {
                if ($task->assigned_to !== $user->id) {
                    return response()->json([
                        'error' => 'Forbidden',
                        'message' => 'You can only update progress on tasks assigned to you.',
                    ], 403);
                }
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

        // Determine new task status based on progress
        $newStatus = $task->status;
        if ($data['percentage_completed'] === 100) {
            $newStatus = 'completed';
        } elseif ($data['percentage_completed'] > 0 && $task->status === 'todo') {
            $newStatus = 'in-progress';
        }

        // Update task progress and status
        $task->update([
            'progress' => $data['percentage_completed'],
            'status' => $newStatus
        ]);

        // Broadcast task progress update in real-time
        try {
            broadcast(new TaskProgressUpdated(
                taskId: $task->id,
                projectId: $task->project_id,
                progress: $data['percentage_completed'],
                status: $newStatus,
                updatedBy: $user->id,
                updatedAt: now()->toIso8601String()
            ))->toOthers();
        } catch (\Throwable $e) {
            // Broadcasting failed, but continue with response
        }

        // Update project progress using assigned team-member tasks first.
        // Fallback to all project tasks if none are assigned to team members.
        try {
            if ($project) {
                $teamIds = array_values(array_filter(array_map('intval', $project->team_ids ?? []), static fn ($id) => $id > 0));

                $teamTaskAvg = null;
                if (!empty($teamIds)) {
                    $teamTaskAvg = Task::where('project_id', $project->id)
                        ->whereIn('assigned_to', $teamIds)
                        ->avg('progress');
                }

                $allTaskAvg = Task::where('project_id', $project->id)->avg('progress');
                $averageProgress = (int) round($teamTaskAvg ?? $allTaskAvg ?? 0);
                $project->update(['progress' => $averageProgress]);
            }
        } catch (\Throwable $e) {
            // Project update failed, but continue
        }

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
