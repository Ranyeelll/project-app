<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityFeedController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = min((int) ($request->input('limit') ?? 50), 100);

        $query = AuditLog::orderByDesc('created_at');

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }
        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($resourceType = $request->input('resource_type')) {
            $query->where('resource_type', $resourceType);
        }
        if ($projectId = $request->input('project_id')) {
            $query->where('project_id', $projectId);
        }

        $activities = $query->limit($limit)
            ->get()
            ->map(fn ($a) => [
                'id' => (string) $a->id,
                'userId' => (string) ($a->user_id ?? ''),
                'actorRole' => $a->actor_role ?? '',
                'action' => $a->action ?? '',
                'resourceType' => $a->resource_type ?? '',
                'resourceId' => (string) ($a->resource_id ?? ''),
                'projectId' => (string) ($a->project_id ?? ''),
                'changes' => $a->changes ?? [],
                'context' => $a->context ?? [],
                'createdAt' => $a->created_at?->toIso8601String() ?? '',
            ]);

        return response()->json($activities);
    }
}
