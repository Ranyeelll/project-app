<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskCommentController extends Controller
{
    /**
     * Verify the authenticated user has access to the task's project.
     */
    private function authorizeTaskAccess(int $taskId): Task
    {
        $task = Task::findOrFail($taskId);
        $user = Auth::user();

        if ($user->department === Department::Employee) {
            $project = Project::find($task->project_id);
            if ($project) {
                $teamIds = array_map('intval', $project->team_ids ?? []);
                if (!in_array((int) $user->id, $teamIds, true) && (int) $task->assigned_to !== (int) $user->id) {
                    abort(403, 'You do not have access to this task.');
                }
            }
        }

        return $task;
    }

    public function index(Request $request, int $taskId): JsonResponse
    {
        $this->authorizeTaskAccess($taskId);

        $comments = TaskComment::where('task_id', $taskId)
            ->with('user:id,name')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($c) => $this->formatComment($c));

        return response()->json($comments);
    }

    public function store(Request $request, int $taskId): JsonResponse
    {
        $this->authorizeTaskAccess($taskId);

        $data = $request->validate([
            'body' => 'required|string|max:5000',
            'parent_id' => 'nullable|exists:task_comments,id',
        ]);

        $comment = TaskComment::create([
            'task_id' => $taskId,
            'user_id' => Auth::id(),
            'body' => $data['body'],
            'parent_id' => $data['parent_id'] ?? null,
        ]);

        $comment->load('user:id,name');

        return response()->json($this->formatComment($comment), 201);
    }

    public function update(Request $request, int $taskId, TaskComment $comment): JsonResponse
    {
        if ($comment->user_id !== Auth::id()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $comment->update($data);
        $comment->load('user:id,name');

        return response()->json($this->formatComment($comment));
    }

    public function destroy(int $taskId, TaskComment $comment): JsonResponse
    {
        $user = Auth::user();
        if ($comment->user_id !== $user->id && $user->role !== 'superadmin') {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $comment->delete();
        return response()->json(['message' => 'Comment deleted']);
    }

    private function formatComment(TaskComment $c): array
    {
        return [
            'id' => (string) $c->id,
            'taskId' => (string) $c->task_id,
            'userId' => (string) $c->user_id,
            'userName' => $c->user?->name ?? '',
            'body' => $c->body,
            'parentId' => $c->parent_id ? (string) $c->parent_id : null,
            'createdAt' => $c->created_at?->toIso8601String() ?? '',
            'updatedAt' => $c->updated_at?->toIso8601String() ?? '',
        ];
    }
}
