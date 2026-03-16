<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskBlocker;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskBlockerController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * List blockers for a task.
     * GET /api/tasks/{id}/blockers
     */
    public function index(Task $task, Request $request): JsonResponse
    {
        $query = $task->blockers();

        // Filter by status if provided
        if ($request->has('status')) {
            $status = $request->input('status');
            if ($status === 'open') {
                $query->whereNull('resolved_at');
            } elseif ($status === 'resolved') {
                $query->whereNotNull('resolved_at');
            }
        }

        $blockers = $query
            ->with(['reportedBy:id,name', 'resolvedBy:id,name'])
            ->orderBy('priority', 'desc')
            ->orderBy('date_reported', 'desc')
            ->get()
            ->map(fn ($b) => $this->formatBlocker($b));

        $openCount = $task->blockers()->whereNull('resolved_at')->count();

        return response()->json([
            'taskId' => (string) $task->id,
            'openBlockersCount' => $openCount,
            'blockers' => $blockers,
        ]);
    }

    /**
     * Report a new blocker/issue.
     * POST /api/tasks/{id}/blockers
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'issue_title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,medium,high,critical',
            'date_reported' => 'required|date',
            'attachment_path' => 'nullable|string',
        ]);

        $blocker = TaskBlocker::create([
            'task_id' => $task->id,
            'project_id' => $task->project_id,
            'issue_title' => $data['issue_title'],
            'description' => $data['description'],
            'priority' => $data['priority'],
            'date_reported' => $data['date_reported'],
            'attachment_path' => $data['attachment_path'],
            'reported_by_user_id' => $user->id,
        ]);

        // Audit log
        $this->auditService->logTaskBlockerReported(
            taskId: $task->id,
            title: $data['issue_title'],
            priority: $data['priority']
        );

        // Activity log
        TaskActivityLogger::issueReported($task->id, $data['issue_title'], $data['priority']);

        return response()->json([
            'message' => 'Blocker reported successfully',
            'blocker' => $this->formatBlocker($blocker),
        ], 201);
    }

    /**
     * Mark a blocker as resolved.
     * PUT /api/tasks/{id}/blockers/{blockerId}
     */
    public function update(Request $request, Task $task, TaskBlocker $blocker): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Only Technical/Admin can resolve
        $canResolve = $user && in_array($user->department, [
            Department::Admin,
            Department::Technical,
        ]);

        if (!$canResolve) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Only managers can resolve blockers.',
            ], 403);
        }

        $data = $request->validate([
            'resolution_notes' => 'nullable|string',
        ]);

        // Mark as resolved
        $blocker->update([
            'resolved_at' => now(),
            'resolved_by_user_id' => $user->id,
        ]);

        // Audit log
        $this->auditService->logTaskBlockerResolved(
            taskId: $task->id,
            blockerId: $blocker->id,
            resolutionNotes: $data['resolution_notes'] ?? null
        );

        return response()->json([
            'message' => 'Blocker marked as resolved',
            'blocker' => $this->formatBlocker($blocker),
        ]);
    }

    /**
     * Delete a blocker.
     * DELETE /api/tasks/{id}/blockers/{blockerId}
     */
    public function destroy(Task $task, TaskBlocker $blocker): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Only admin or the reporter can delete
        if ($user->department !== Department::Admin && $user->id !== $blocker->reported_by_user_id) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Only admins or the reporter can delete blockers.',
            ], 403);
        }

        $blockerId = $blocker->id;
        $blocker->delete();

        // Audit log
        $this->auditService->logTaskBlockerDeleted(
            taskId: $task->id,
            blockerId: $blockerId
        );

        return response()->json([
            'message' => 'Blocker deleted successfully',
        ]);
    }

    /**
     * Format blocker for response.
     */
    private function formatBlocker(TaskBlocker $b): array
    {
        return [
            'id' => (string) $b->id,
            'taskId' => (string) $b->task_id,
            'projectId' => (string) ($b->project_id ?? ''),
            'issueTitle' => $b->issue_title,
            'description' => $b->description,
            'priority' => $b->priority,
            'dateReported' => $b->date_reported?->toDateString(),
            'attachmentPath' => $b->attachment_path ?? '',
            'reportedByUserId' => (string) ($b->reported_by_user_id ?? ''),
            'reportedByName' => $b->reportedBy?->name ?? null,
            'status' => $b->isResolved() ? 'resolved' : 'open',
            'resolvedAt' => $b->resolved_at?->toIso8601String(),
            'resolvedByUserId' => (string) ($b->resolved_by_user_id ?? ''),
            'resolvedByName' => $b->resolvedBy?->name ?? null,
            'createdAt' => $b->created_at?->toIso8601String(),
        ];
    }
}
