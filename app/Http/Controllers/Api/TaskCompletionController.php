<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskCompletion;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskCompletionController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * Get completion submissions for a task.
     * GET /api/tasks/{id}/completions
     */
    public function index(Task $task): JsonResponse
    {
        $completions = $task->completions()
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($c) => $this->formatCompletion($c));

        return response()->json([
            'taskId' => (string) $task->id,
            'completionStatus' => $task->completion_report_status,
            'completions' => $completions,
        ]);
    }

    /**
     * Submit task completion.
     * POST /api/tasks/{id}/completions
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee on own task, Manager/Admin on any task
        if ($user && $user->department === Department::Employee) {
            if ($task->assigned_to !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only submit completion for tasks assigned to you.',
                ], 403);
            }
        }

        $data = $request->validate([
            'completion_date' => 'required|date',
            'deliverable_path' => 'nullable|string',
            'summary' => 'required|string',
            'issues_encountered' => 'nullable|string',
        ]);

        $completion = TaskCompletion::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'completion_date' => $data['completion_date'],
            'deliverable_path' => $data['deliverable_path'],
            'summary' => $data['summary'],
            'issues_encountered' => $data['issues_encountered'],
        ]);

        // Update task status to pending approval
        $task->update(['completion_report_status' => 'pending']);

        // Audit log
        $this->auditService->logTaskCompletionSubmitted(
            taskId: $task->id,
            completionDate: $data['completion_date'],
            summary: substr($data['summary'], 0, 100)
        );

        // Activity log
        TaskActivityLogger::completionSubmitted($task->id, $data['summary']);

        return response()->json([
            'message' => 'Completion submitted successfully for review',
            'completion' => $this->formatCompletion($completion),
        ], 201);
    }

    /**
     * Update a completion submission.
     * PUT /api/tasks/{id}/completions/{completionId}
     */
    public function update(Request $request, Task $task, TaskCompletion $completion): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Employee can only update their own, others can update any
        if ($user && $user->department === Department::Employee) {
            if ($completion->user_id !== $user->id) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only update your own completion submissions.',
                ], 403);
            }
        }

        $data = $request->validate([
            'completion_date' => 'sometimes|date',
            'deliverable_path' => 'nullable|string',
            'summary' => 'sometimes|string',
            'issues_encountered' => 'nullable|string',
        ]);

        $completion->update($data);

        // Audit log
        $this->auditService->logTaskCompletionSubmitted(
            taskId: $task->id,
            completionDate: $data['completion_date'] ?? $completion->completion_date,
            note: 'Completion updated'
        );

        return response()->json([
            'message' => 'Completion updated successfully',
            'completion' => $this->formatCompletion($completion),
        ]);
    }

    /**
     * Format completion for response.
     */
    private function formatCompletion(TaskCompletion $c): array
    {
        return [
            'id' => (string) $c->id,
            'taskId' => (string) $c->task_id,
            'userId' => (string) ($c->user_id ?? ''),
            'userName' => $c->user?->name ?? null,
            'completionDate' => $c->completion_date?->toDateString(),
            'deliverablePath' => $c->deliverable_path ?? '',
            'summary' => $c->summary ?? '',
            'issuesEncountered' => $c->issues_encountered ?? '',
            'createdAt' => $c->created_at?->toIso8601String(),
            'updatedAt' => $c->updated_at?->toIso8601String(),
        ];
    }
}
