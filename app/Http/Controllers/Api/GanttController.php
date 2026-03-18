<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\GanttDependency;
use App\Models\GanttItem;
use App\Models\Project;
use App\Models\User;
use App\Services\AuditService;
use App\Services\GanttVisibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GanttController extends Controller
{
    public function __construct(
        private GanttVisibilityService $visibility,
        private AuditService $audit,
    ) {}

    // ─── Gantt Items ──────────────────────────────────────────────────────────

    /**
     * Return all visible gantt items for a project, with DFS tree structure.
     * Admin can pass ?preview_as={department} to simulate another dept's view.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $user = Auth::user();

        // Resolve the effective viewer (preview_as for admins only)
        $previewDept = null;
        if ($user->department === Department::Admin && $request->has('preview_as')) {
            $previewDept = $request->string('preview_as');
        }

        // Load all items for the project
        $allItems = GanttItem::where('project_id', $project->id)
            ->orderBy('position')
            ->get();

        // Apply visibility filtering
        $effectiveUser = $user;
        if ($previewDept) {
            // Create a temporary user-like object for visibility check
            $tempUser = clone $user;
            $tempUser->department = Department::from($previewDept);
            $effectiveUser = $tempUser;
        }

        if ($effectiveUser->department !== Department::Admin || $previewDept) {
            $allItems = $allItems->filter(
                fn ($item) => $this->visibility->isVisible($item, $effectiveUser)
            )->values();
        }

        // Build flat array keyed by id for DFS
        $byId = $allItems->keyBy('id');

        // Find roots (items with no parent, or whose parent is not visible)
        $roots = $allItems->filter(
            fn ($item) => is_null($item->parent_id) || !$byId->has($item->parent_id)
        )->values();

        // DFS traversal to compute treeIndex and depth
        $result = [];
        $this->dfsTraverse($roots, $byId, $result, [], 0);

        return response()->json($result);
    }

    /**
     * Recursively traverse the tree, computing treeIndex and depth.
     */
    private function dfsTraverse($nodes, $byId, array &$result, array $parentIndex, int $depth): void
    {
        $counter = 1;
        foreach ($nodes as $node) {
            $currentIndex = array_merge($parentIndex, [$counter]);
            $treeIndex = implode('.', $currentIndex);

            $result[] = array_merge($this->formatItem($node), [
                'treeIndex' => $treeIndex,
                'depth'     => $depth,
            ]);

            // Recurse into children
            $children = $byId->filter(fn ($item) => $item->parent_id === $node->id)
                              ->sortBy('position')
                              ->values();

            if ($children->isNotEmpty()) {
                $this->dfsTraverse($children, $byId, $result, $currentIndex, $depth + 1);
            }

            $counter++;
        }
    }

    /**
     * Create a new gantt item.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'parent_id'        => 'nullable|exists:gantt_items,id',
            'type'             => 'required|in:phase,step,subtask,milestone',
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string',
            'start_date'       => 'nullable|date|required_with:end_date',
            'end_date'         => 'nullable|date|after_or_equal:start_date|required_with:start_date',
            'progress'         => 'nullable|integer|min:0|max:100',
            'position'         => 'nullable|integer|min:0',
            'assignee_ids'     => 'nullable|array',
            'assignee_ids.*'   => 'string',
            'visible_to_roles' => 'nullable|array',
            'visible_to_roles.*' => 'string',
            'visible_to_users' => 'nullable|array',
            'visible_to_users.*' => 'string',
        ]);

        $item = GanttItem::create(array_merge($data, [
            'project_id' => $project->id,
            'progress'   => $data['progress'] ?? 0,
            'position'   => $data['position'] ?? 0,
        ]));

        AuditService::logGanttItemCreated(
            $item->id,
            $project->id,
            $item->type,
            $item->name,
            Auth::id()
        );

        return response()->json($this->formatItem($item), 201);
    }

    /**
     * Update a gantt item.
     */
    public function update(Request $request, Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'start_date'       => 'nullable|date|required_with:end_date',
            'end_date'         => 'nullable|date|after_or_equal:start_date|required_with:start_date',
            'progress'         => 'nullable|integer|min:0|max:100',
            'position'         => 'nullable|integer|min:0',
            'assignee_ids'     => 'nullable|array',
            'assignee_ids.*'   => 'string',
            'visible_to_roles' => 'nullable|array',
            'visible_to_roles.*' => 'string',
            'visible_to_users' => 'nullable|array',
            'visible_to_users.*' => 'string',
        ]);

        // Detect visibility changes for audit
        $oldRoles = $item->visible_to_roles ?? [];
        $oldUsers = $item->visible_to_users ?? [];
        $visibilityChanged = isset($data['visible_to_roles']) || isset($data['visible_to_users']);

        $item->update($data);

        if ($visibilityChanged) {
            AuditService::logGanttVisibilityChange(
                $item->id,
                $project->id,
                $oldRoles,
                $data['visible_to_roles'] ?? $oldRoles,
                $oldUsers,
                $data['visible_to_users'] ?? $oldUsers,
                Auth::id()
            );
        }

        return response()->json($this->formatItem($item->fresh()));
    }

    /**
     * Delete a gantt item (cascade deletes children).
     */
    public function destroy(Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        AuditService::logGanttItemDeleted(
            $item->id,
            $project->id,
            $item->type,
            $item->name,
            Auth::id()
        );

        $item->delete();

        return response()->json(['message' => 'Gantt item deleted.']);
    }

    /**
     * Move a gantt item (update parent and/or position).
     */
    public function move(Request $request, Project $project, GanttItem $item): JsonResponse
    {
        $this->authorizeItemBelongsToProject($item, $project);

        $data = $request->validate([
            'parent_id' => 'nullable|exists:gantt_items,id',
            'position'  => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($item, $data) {
            $item->update([
                'parent_id' => $data['parent_id'] ?? null,
                'position'  => $data['position'],
            ]);
        });

        return response()->json($this->formatItem($item->fresh()));
    }

    // ─── Gantt Dependencies ───────────────────────────────────────────────────

    /**
     * List all dependencies for a project.
     */
    public function indexDependencies(Project $project): JsonResponse
    {
        $dependencies = GanttDependency::where('project_id', $project->id)
            ->get()
            ->map(fn ($d) => $this->formatDependency($d));

        return response()->json($dependencies);
    }

    /**
     * Create a new dependency (with BFS cycle detection).
     */
    public function storeDependency(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'predecessor_id' => 'required|exists:gantt_items,id',
            'successor_id'   => 'required|exists:gantt_items,id|different:predecessor_id',
            'type'           => 'nullable|in:finish_to_start',
        ]);

        // Ensure both items belong to this project
        $predecessor = GanttItem::where('project_id', $project->id)
            ->where('id', $data['predecessor_id'])
            ->firstOrFail();

        $successor = GanttItem::where('project_id', $project->id)
            ->where('id', $data['successor_id'])
            ->firstOrFail();

        // BFS cycle detection: check if predecessor is reachable from successor
        if ($this->wouldCreateCycle($project->id, $predecessor->id, $successor->id)) {
            return response()->json([
                'message' => 'This dependency would create a cycle in the Gantt chart.',
            ], 422);
        }

        $dependency = GanttDependency::create([
            'project_id'     => $project->id,
            'predecessor_id' => $predecessor->id,
            'successor_id'   => $successor->id,
            'type'           => $data['type'] ?? 'finish_to_start',
        ]);

        return response()->json($this->formatDependency($dependency), 201);
    }

    /**
     * Delete a dependency.
     */
    public function destroyDependency(Project $project, GanttDependency $dependency): JsonResponse
    {
        if ($dependency->project_id !== $project->id) {
            abort(404);
        }

        $dependency->delete();

        return response()->json(['message' => 'Dependency deleted.']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * BFS cycle detection.
     * Returns true if adding predecessor→successor would create a cycle.
     * i.e. checks if predecessor is already reachable from successor.
     */
    private function wouldCreateCycle(int $projectId, int $predecessorId, int $successorId): bool
    {
        // Load all existing dependencies for this project
        $deps = GanttDependency::where('project_id', $projectId)
            ->get()
            ->groupBy('predecessor_id');

        // BFS from successor: if we can reach predecessor, it's a cycle
        $visited = [];
        $queue = [$successorId];

        while (!empty($queue)) {
            $current = array_shift($queue);

            if ($current === $predecessorId) {
                return true;
            }

            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;

            // Enqueue all nodes that current points to (as predecessor)
            if ($deps->has($current)) {
                foreach ($deps[$current] as $dep) {
                    $queue[] = $dep->successor_id;
                }
            }
        }

        return false;
    }

    private function authorizeItemBelongsToProject(GanttItem $item, Project $project): void
    {
        if ($item->project_id !== $project->id) {
            abort(404);
        }
    }

    private function formatItem(GanttItem $item): array
    {
        return [
            'id'             => (string) $item->id,
            'projectId'      => (string) $item->project_id,
            'parentId'       => $item->parent_id ? (string) $item->parent_id : null,
            'type'           => $item->type,
            'name'           => $item->name,
            'description'    => $item->description,
            'startDate'      => $item->start_date?->toDateString(),
            'endDate'        => $item->end_date?->toDateString(),
            'progress'       => (int) $item->progress,
            'position'       => (int) $item->position,
            'assigneeIds'    => $item->assignee_ids ?? [],
            'visibleToRoles' => $item->visible_to_roles ?? [],
            'visibleToUsers' => $item->visible_to_users ?? [],
            'createdAt'      => $item->created_at?->toISOString(),
            'updatedAt'      => $item->updated_at?->toISOString(),
        ];
    }

    private function formatDependency(GanttDependency $dep): array
    {
        return [
            'id'            => (string) $dep->id,
            'projectId'     => (string) $dep->project_id,
            'predecessorId' => (string) $dep->predecessor_id,
            'successorId'   => (string) $dep->successor_id,
            'type'          => $dep->type,
        ];
    }
}
