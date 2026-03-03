<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IssueController extends Controller
{
    /**
     * List all issues.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Issue::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('reported_by')) {
            $query->where('reported_by', $request->input('reported_by'));
        }

        $items = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($i) => $this->formatIssue($i));

        return response()->json($items);
    }

    /**
     * Create a new issue.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'  => 'required|exists:projects,id',
            'title'       => 'required|string|max:255',
            'description' => 'required|string',
            'type'        => 'required|in:risk,assumption,issue,dependency',
            'severity'    => 'required|in:low,medium,high,critical',
            'reported_by' => 'required|exists:users,id',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $item = Issue::create(array_merge($data, [
            'status' => 'open',
        ]));

        return response()->json($this->formatIssue($item), 201);
    }

    /**
     * Update an issue.
     */
    public function update(Request $request, Issue $issue): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'type'        => 'sometimes|in:risk,assumption,issue,dependency',
            'severity'    => 'sometimes|in:low,medium,high,critical',
            'status'      => 'sometimes|in:open,in-progress,resolved,closed',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $issue->update($data);

        return response()->json($this->formatIssue($issue->fresh()));
    }

    /**
     * Delete an issue.
     */
    public function destroy(Issue $issue): JsonResponse
    {
        $issue->delete();

        return response()->json(['message' => 'Issue deleted']);
    }

    /**
     * Format for frontend (camelCase).
     */
    private function formatIssue(Issue $i): array
    {
        return [
            'id'          => (string) $i->id,
            'projectId'   => (string) $i->project_id,
            'title'       => $i->title,
            'description' => $i->description,
            'type'        => $i->type,
            'severity'    => $i->severity,
            'status'      => $i->status,
            'reportedBy'  => (string) $i->reported_by,
            'assignedTo'  => $i->assigned_to ? (string) $i->assigned_to : '',
            'createdAt'   => $i->created_at?->toDateString() ?? '',
            'updatedAt'   => $i->updated_at?->toDateString() ?? '',
        ];
    }
}
