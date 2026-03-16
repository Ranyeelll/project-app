<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Project;
use App\Services\AuditService;
use App\Services\ProjectApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class ProjectApprovalController extends Controller
{
    public function __construct(
        private ProjectApprovalService $approvalService,
        private AuditService $audit,
    ) {}

    /**
     * Perform an approval state transition on a project.
     *
     * POST /api/projects/{project}/approval
     * Body: { action: string, notes?: string }
     */
    public function transition(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|string|in:submit_for_review,approve_technical,approve_final,request_revision,reject,resubmit',
            'notes'  => 'nullable|string|max:2000',
        ]);

        $actor = Auth::user();
        $fromStatus = $project->approval_status ?? 'draft';

        try {
            $updated = $this->approvalService->transition($project, $actor, $data['action'], $data['notes'] ?? null);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $toStatus = $updated->approval_status;

        // Audit the transition
        $this->audit->logApprovalTransition(
            $project->id,
            $data['action'],
            $fromStatus,
            $toStatus,
            $data['notes'] ?? null,
            $actor->id
        );

        return response()->json($this->formatProject($updated));
    }

    /**
     * Get the approval history for a project.
     *
     * GET /api/projects/{project}/approval-history
     */
    public function history(Project $project): JsonResponse
    {
        $logs = AuditLog::where('resource_type', 'project')
            ->where('resource_id', $project->id)
            ->where(function ($q) {
                $q->where('action', 'like', 'project.approval%')
                  ->orWhere('action', 'project.serial_assignment');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($log) => [
                'id'            => (string) $log->id,
                'action'        => $log->action,
                'context'       => $log->context,
                'changes'       => $log->changes,
                'userId'        => $log->user_id ? (string) $log->user_id : null,
                'performedVia'  => $log->performed_via,
                'sensitiveFlag' => (bool) $log->sensitive_flag,
                'createdAt'     => $log->created_at?->toISOString(),
            ]);

        return response()->json($logs);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function formatProject(Project $p): array
    {
        return [
            'id'             => (string) $p->id,
            'name'           => $p->name,
            'approvalStatus' => $p->approval_status ?? 'draft',
            'approvalNotes'  => $p->approval_notes,
            'submittedBy'    => $p->submitted_by ? (string) $p->submitted_by : null,
            'reviewedBy'     => $p->reviewed_by  ? (string) $p->reviewed_by  : null,
            'lastReviewedAt' => $p->last_reviewed_at?->toISOString(),
        ];
    }
}
