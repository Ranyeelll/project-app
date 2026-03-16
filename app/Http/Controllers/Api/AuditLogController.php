<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * List audit logs for a project, optionally filtered by action or resource type.
     */
    public function indexForProject(Request $request, Project $project): JsonResponse
    {
        $query = AuditLog::where('project_id', $project->id)
            ->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('resourceType')) {
            $query->where('resource_type', $request->query('resourceType'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('resource_type', 'like', "%{$search}%")
                  ->orWhere('context', 'like', "%{$search}%");
            });
        }

        $limit = $request->integer('limit', 50);
        $logs = $query->limit($limit)->get()->map(fn ($log) => $this->formatLog($log));

        return response()->json($logs);
    }

    /**
     * Get global audit logs (all projects, admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::orderBy('created_at', 'desc');

        if ($request->filled('projectId')) {
            $query->where('project_id', $request->query('projectId'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('resourceType')) {
            $query->where('resource_type', $request->query('resourceType'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('resource_type', 'like', "%{$search}%");
            });
        }

        $limit = $request->integer('limit', 100);
        $logs = $query->limit($limit)->get()->map(fn ($log) => $this->formatLog($log));

        return response()->json($logs);
    }

    /**
     * Format a log for JSON response.
     */
    private function formatLog(AuditLog $log): array
    {
        return [
            'id'           => (string) $log->id,
            'action'       => $log->action,
            'resourceType' => $log->resource_type,
            'resourceId'   => (string) $log->resource_id,
            'projectId'    => $log->project_id ? (string) $log->project_id : null,
            'userId'       => $log->user_id ? (string) $log->user_id : null,
            'changes'      => $log->changes,
            'snapshot'     => $log->snapshot,
            'context'      => $log->context,
            'sensitive'    => (bool) $log->sensitive_flag,
            'createdAt'    => $log->created_at?->toISOString(),
        ];
    }
}
