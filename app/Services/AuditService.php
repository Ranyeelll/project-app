<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Project;

/**
 * Audit Service: Centralized append-only audit logging.
 * All audit log entries are immutable by design.
 */
class AuditService
{
    /**
     * Log a project approval event.
     */
    public static function logProjectApproval(int $projectId, ?array $context = null, ?int $userId = null): AuditLog
    {
        return AuditLog::log(
            action: 'project.approval',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            context: $context,
            userId: $userId,
            sensitiveFlag: true
        );
    }

    /**
     * Log a project export event.
     */
    public static function logProjectExport(int $projectId, ?array $context = null, ?int $userId = null): AuditLog
    {
        return AuditLog::log(
            action: 'project.export',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            context: $context,
            userId: $userId
        );
    }

    /**
     * Log a visibility change event.
     */
    public static function logVisibilityChange(
        int $resourceId,
        string $resourceType,
        ?string $oldVisibility,
        ?string $newVisibility,
        ?int $projectId = null,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: "{$resourceType}.visibility_change",
            resourceType: $resourceType,
            resourceId: $resourceId,
            projectId: $projectId,
            changes: [
                'visibility' => [
                    'from' => $oldVisibility,
                    'to' => $newVisibility,
                ]
            ],
            userId: $userId
        );
    }

    /**
     * Log a serial assignment event.
     */
    public static function logSerialAssignment(int $projectId, string $serial, ?int $userId = null): AuditLog
    {
        return AuditLog::log(
            action: 'project.serial_assignment',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            changes: ['serial' => $serial],
            userId: $userId
        );
    }

    /**
     * Log a serial backfill event.
     */
    public static function logSerialBackfill(int $projectId, string $serial, ?array $context = null, ?int $userId = null): AuditLog
    {
        return AuditLog::log(
            action: 'project.serial_backfill',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            changes: ['serial' => $serial],
            context: $context,
            userId: $userId,
            performedVia: 'cli'
        );
    }

    /**
     * Instance method: Log a serial assignment (called from ProjectSerialService).
     */
    public function serialAssigned(Project $project, string $serial, ?int $userId = null): AuditLog
    {
        return self::logSerialAssignment($project->id, $serial, $userId);
    }

    /**
     * Log a chat moderation event.
     */
    public static function logChatModeration(
        int $messageId,
        int $projectId,
        string $action,
        ?array $moderationDetails = null,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: "chat.{$action}",
            resourceType: 'chat_message',
            resourceId: $messageId,
            projectId: $projectId,
            changes: $moderationDetails,
            userId: $userId,
            sensitiveFlag: true
        );
    }

    /**
     * Generic audit logging for any action.
     */
    public static function log(
        string $action,
        string $resourceType,
        int $resourceId,
        ?int $projectId = null,
        ?array $changes = null,
        ?array $snapshot = null,
        ?array $context = null,
        ?int $userId = null,
        bool $sensitiveFlag = false
    ): AuditLog {
        return AuditLog::log(
            action: $action,
            resourceType: $resourceType,
            resourceId: $resourceId,
            projectId: $projectId,
            changes: $changes,
            snapshot: $snapshot,
            context: $context,
            userId: $userId,
            sensitiveFlag: $sensitiveFlag
        );
    }

    /**
     * Query audit logs for a resource.
     */
    public static function forResource(string $resourceType, int $resourceId)
    {
        return AuditLog::where('resource_type', $resourceType)
            ->where('resource_id', $resourceId)
            ->orderBy('created_at', 'desc');
    }

    /**
     * Query audit logs for a project.
     */
    public static function forProject(int $projectId)
    {
        return AuditLog::where('project_id', $projectId)
            ->orderBy('created_at', 'desc');
    }

    /**
     * Query audit logs by action.
     */
    public static function byAction(string $action)
    {
        return AuditLog::where('action', $action)
            ->orderBy('created_at', 'desc');
    }

    /**
     * Query sensitive operations.
     */
    public static function sensitive()
    {
        return AuditLog::where('sensitive_flag', true)
            ->orderBy('created_at', 'desc');
    }

    // ─── Convenience instance methods for controller use ────────────────

    /**
     * Log: Project created.
     */
    public function projectCreated(mixed $project): AuditLog
    {
        $projectId = is_object($project) ? $project->id : $project;
        return self::log(
            action: 'project.created',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            snapshot: is_object($project) ? $project->toArray() : null,
            sensitiveFlag: true
        );
    }

    /**
     * Log: Project status changed.
     */
    public function projectStatusChanged(mixed $project, string $oldStatus, string $newStatus): AuditLog
    {
        $projectId = is_object($project) ? $project->id : $project;
        return self::log(
            action: 'project.status_change',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            changes: [
                'status' => [
                    'from' => $oldStatus,
                    'to' => $newStatus,
                ]
            ]
        );
    }

    /**
     * Log: Project deleted.
     */
    public function projectDeleted(mixed $project): AuditLog
    {
        $projectId = is_object($project) ? $project->id : $project;
        return self::log(
            action: 'project.deleted',
            resourceType: 'project',
            resourceId: $projectId,
            projectId: $projectId,
            sensitiveFlag: true
        );
    }

    /**
     * Log: Budget request approval/rejection/revision.
     */
    public function budgetRequestApproved(mixed $budgetRequest, string $status, ?string $comment = null): AuditLog
    {
        $budgetId = is_object($budgetRequest) ? $budgetRequest->id : $budgetRequest;
        $projectId = is_object($budgetRequest) ? $budgetRequest->project_id : null;

        return self::log(
            action: "budget_request.{$status}",
            resourceType: 'budget_request',
            resourceId: $budgetId,
            projectId: $projectId,
            changes: [
                'status' => [
                    'to' => $status,
                ],
                'review_comment' => $comment,
            ],
            sensitiveFlag: in_array($status, ['approved', 'rejected', 'revision_requested'])
        );
    }

    /**
     * Log: Budget report exported.
     */
    public function budgetReportExported(string $format, string $period): AuditLog
    {
        return self::log(
            action: 'budget.report_exported',
            resourceType: 'budget_report',
            resourceId: 0,
            context: [
                'format' => $format,
                'period' => $period,
            ]
        );
    }

    // ─── Task Enhancement Logging ─────────────────────────────────────

    /**
     * Log: Task progress updated.
     */
    public function logTaskProgressUpdate(int $taskId, int $percentage, ?string $description = null): AuditLog
    {
        return self::log(
            action: 'task.progress_updated',
            resourceType: 'task',
            resourceId: $taskId,
            changes: [
                'progress' => $percentage,
                'description' => $description,
            ]
        );
    }

    /**
     * Log: Time logged on task.
     */
    public function logTaskTimeLogged(
        int $taskId,
        float $hours,
        ?string $dateWorked = null,
        ?string $note = null
    ): AuditLog {
        return self::log(
            action: 'task.time_logged',
            resourceType: 'task',
            resourceId: $taskId,
            changes: [
                'hours' => $hours,
                'date_worked' => $dateWorked,
                'note' => $note,
            ]
        );
    }

    /**
     * Log: Task completion submitted.
     */
    public function logTaskCompletionSubmitted(
        int $taskId,
        ?string $completionDate = null,
        ?string $summary = null,
        ?string $note = null
    ): AuditLog {
        return self::log(
            action: 'task.completion_submitted',
            resourceType: 'task',
            resourceId: $taskId,
            changes: [
                'completion_date' => $completionDate,
                'summary' => $summary,
                'note' => $note,
            ],
            sensitiveFlag: true
        );
    }

    /**
     * Log: Task review submitted.
     */
    public function logTaskReviewSubmitted(
        int $taskId,
        int $reviewerId,
        string $status,
        ?string $comments = null,
        ?string $note = null
    ): AuditLog {
        return self::log(
            action: 'task.review_submitted',
            resourceType: 'task',
            resourceId: $taskId,
            changes: [
                'review_status' => $status,
                'reviewer_id' => $reviewerId,
                'comments' => $comments,
                'note' => $note,
            ],
            sensitiveFlag: true
        );
    }

    /**
     * Log: Task blocker reported.
     */
    public function logTaskBlockerReported(
        int $taskId,
        string $title,
        string $priority,
        ?string $description = null
    ): AuditLog {
        return self::log(
            action: 'task.blocker_reported',
            resourceType: 'task',
            resourceId: $taskId,
            changes: [
                'issue_title' => $title,
                'priority' => $priority,
                'description' => $description,
            ]
        );
    }

    /**
     * Log: Task blocker resolved.
     */
    public function logTaskBlockerResolved(
        int $taskId,
        int $blockerId,
        ?string $resolutionNotes = null
    ): AuditLog {
        return self::log(
            action: 'task.blocker_resolved',
            resourceType: 'task_blocker',
            resourceId: $blockerId,
            changes: [
                'task_id' => $taskId,
                'resolution_notes' => $resolutionNotes,
            ]
        );
    }

    /**
     * Log: Task blocker deleted.
     */
    public function logTaskBlockerDeleted(int $taskId, int $blockerId): AuditLog
    {
        return self::log(
            action: 'task.blocker_deleted',
            resourceType: 'task_blocker',
            resourceId: $blockerId,
            changes: [
                'task_id' => $taskId,
            ]
        );
    }
}
