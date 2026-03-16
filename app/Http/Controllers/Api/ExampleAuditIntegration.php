<?php

namespace App\Http\Controllers\Api;

use App\Services\AuditService;
use Illuminate\Http\Request;

/**
 * EXAMPLE: How to integrate audit logging into any controller
 *
 * This example shows best practices for adding audit logging throughout your app.
 */
class ExampleControllerWithAudit
{
    /**
     * Example 1: Constructor injection (recommended for multiple audit calls)
     */
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * Example 2: Simple create with audit logging
     */
    public function create(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
        ]);

        // Create resource
        $resource = MyModel::create($data);

        // Log the creation
        $this->auditService->log(
            action: 'mymodel.created',
            resourceType: 'my_model',
            resourceId: $resource->id,
            snapshot: $resource->toArray(),
            sensitiveFlag: false
        );

        return $resource;
    }

    /**
     * Example 3: Update with change tracking
     */
    public function update(Request $request, int $id)
    {
        $resource = MyModel::findOrFail($id);

        // Store old values for audit log
        $oldValues = $resource->only(['name', 'description', 'status']);

        // Update resource
        $data = $request->validate([
            'name' => 'sometimes|string',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
        ]);
        $resource->update($data);

        // Log with change tracking
        $this->auditService->log(
            action: 'mymodel.updated',
            resourceType: 'my_model',
            resourceId: $resource->id,
            changes: [
                'name' => ['from' => $oldValues['name'], 'to' => $resource->name],
                'status' => ['from' => $oldValues['status'], 'to' => $resource->status],
            ],
            snapshot: $resource->fresh()->toArray()
        );

        return $resource;
    }

    /**
     * Example 4: Sensitive operations (e.g., approval, deletion)
     */
    public function approve(Request $request, int $id)
    {
        $resource = MyModel::findOrFail($id);
        $oldStatus = $resource->status;

        $resource->update(['status' => 'approved']);

        // Mark as sensitive to trigger extra compliance handling
        $this->auditService->log(
            action: 'mymodel.approval',
            resourceType: 'my_model',
            resourceId: $resource->id,
            projectId: $resource->project_id ?? null,
            changes: [
                'status' => ['from' => $oldStatus, 'to' => 'approved'],
                'approver_comment' => $request->input('comment'),
            ],
            context: [
                'approval_reason' => $request->input('reason'),
                'ip_approved_from' => $request->ip(),
            ],
            sensitiveFlag: true  // Important: marks this for compliance
        );

        return $resource;
    }

    /**
     * Example 5: Batch operations with context
     */
    public function bulkExport(Request $request)
    {
        $filter = $request->validated();
        $resources = MyModel::where($filter)->get();

        // Generate export
        $file = $this->generateExport($resources);

        // Log the bulk action with context
        AuditService::log(
            action: 'mymodel.bulk_export',
            resourceType: 'mymodel_export',
            resourceId: 0, // No single resource
            context: [
                'filter' => $filter,
                'count' => $resources->count(),
                'format' => 'csv',
            ]
        );

        return response()->download($file);
    }

    /**
     * Example 6: Error handling with audit
     */
    public function dangerousOperation(Request $request, int $id)
    {
        try {
            $resource = MyModel::findOrFail($id);

            // Validate extra permission
            $this->authorize('dangerous-operation', $resource);

            // Perform operation
            $resource->deleteRelated();
            $resource->delete();

            // Log successful deletion
            AuditService::log(
                action: 'mymodel.force_deleted',
                resourceType: 'my_model',
                resourceId: $id,
                context: [
                    'reason' => $request->input('reason'),
                    'confirm_token' => 'provided',
                ],
                sensitiveFlag: true
            );

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            // Log the failed attempt
            AuditService::log(
                action: 'mymodel.force_delete_failed',
                resourceType: 'my_model',
                resourceId: $id,
                context: [
                    'error' => $e->getMessage(),
                    'attempt_reason' => $request->input('reason'),
                ],
                sensitiveFlag: true
            );

            throw $e;
        }
    }

    /**
     * Example 7: Querying audit logs
     */
    public function auditHistory(int $resourceId)
    {
        $history = AuditService::forResource('my_model', $resourceId)
            ->with(['user:id,name,email'])
            ->paginate(25);

        return response()->json($history);
    }

    /**
     * Example 8: Compliance reporting - sensitive operations
     */
    public function auditReport(Request $request)
    {
        $dates = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
        ]);

        $report = AuditService::sensitive()
            ->whereBetween('created_at', [$dates['start_date'], $dates['end_date']])
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'timestamp' => $log->created_at,
                    'actor' => $log->user?->name ?? 'System',
                    'action' => $log->action,
                    'resource' => "{$log->resource_type}:{$log->resource_id}",
                    'ip_address' => $log->ip_address,
                    'changes' => $log->changes,
                ];
            });

        return response()->json($report);
    }
}

/**
 * INTEGRATION CHECKLIST
 *
 * 1. ✅ Add AuditService as dependency in controller
 * 2. ✅ Call audit methods for important state changes
 * 3. ✅ Use snapshots for complex state
 * 4. ✅ Mark sensitive operations with sensitiveFlag: true
 * 5. ✅ Include context for compliance
 * 6. ✅ Handle audit failures gracefully (log but don't crash)
 * 7. ✅ Test audit logs in your feature tests
 * 8. ✅ Monitor audit table growth in production
 *
 * ACTIONS TO LOG
 *
 * - ✅ Create: new resource creation
 * - ✅ Update: important field changes
 * - ✅ Delete: resource deletion
 * - ✅ Status Change: workflow state changes
 * - ✅ Approval: decision-based actions
 * - ✅ Export/Report: data access
 * - ✅ Permission Change: access control
 * - ✅ Configuration Change: system settings
 *
 * SENSITIVE OPERATIONS (sensitiveFlag: true)
 *
 * - Delete/Archive operations
 * - Approvals/Rejections
 * - Permission/Role changes
 * - Data exports
 * - Financial decisions (approvals, rejections)
 * - Configuration changes
 */
