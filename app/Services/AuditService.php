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
        ?int $projectId,
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
     * Log a message sent (project or direct).
     */
    public static function logMessageSent(
        int $messageId,
        ?int $projectId,
        ?int $conversationId,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'chat.message_sent',
            resourceType: 'chat_message',
            resourceId: $messageId,
            projectId: $projectId,
            context: ['conversation_id' => $conversationId],
            userId: $userId,
        );
    }

    /**
     * Log a message edited.
     */
    public static function logMessageEdited(
        int $messageId,
        ?int $projectId,
        string $oldText,
        string $newText,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'chat.message_edited',
            resourceType: 'chat_message',
            resourceId: $messageId,
            projectId: $projectId,
            changes: [
                'message_text' => ['from' => $oldText, 'to' => $newText],
            ],
            userId: $userId,
        );
    }

    /**
     * Log a message deleted (by the sender).
     */
    public static function logMessageDeleted(
        int $messageId,
        ?int $projectId,
        ?array $snapshot = null,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'chat.message_deleted',
            resourceType: 'chat_message',
            resourceId: $messageId,
            projectId: $projectId,
            snapshot: $snapshot,
            userId: $userId,
        );
    }

    /**
     * Log a user being muted or unmuted in chat.
     */
    public static function logUserMuted(
        int $targetUserId,
        string $action,
        ?string $reason = null,
        ?\DateTimeInterface $mutedUntil = null,
        ?int $adminUserId = null
    ): AuditLog {
        return AuditLog::log(
            action: "chat.user_{$action}",     // chat.user_muted | chat.user_unmuted
            resourceType: 'user',
            resourceId: $targetUserId,
            changes: [
                'reason'      => $reason,
                'muted_until' => $mutedUntil?->format('Y-m-d H:i:s'),
            ],
            userId: $adminUserId,
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

    /**
     * Log a project approval state transition.
     */
    public function logApprovalTransition(
        int $projectId,
        string $action,
        string $from,
        string $to,
        ?string $notes,
        ?int $userId = null
    ): AuditLog {
        return self::logProjectApproval($projectId, [
            'action' => $action,
            'from'   => $from,
            'to'     => $to,
            'notes'  => $notes,
        ], $userId);
    }

    /**
     * Log: Gantt item created.
     */
    public static function logGanttItemCreated(
        int $itemId,
        int $projectId,
        string $type,
        string $name,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'gantt.item_created',
            resourceType: 'gantt_item',
            resourceId: $itemId,
            projectId: $projectId,
            changes: ['type' => $type, 'name' => $name],
            userId: $userId
        );
    }

    /**
     * Log: Gantt item deleted.
     */
    public static function logGanttItemDeleted(
        int $itemId,
        int $projectId,
        string $type,
        string $name,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'gantt.item_deleted',
            resourceType: 'gantt_item',
            resourceId: $itemId,
            projectId: $projectId,
            changes: ['type' => $type, 'name' => $name],
            userId: $userId,
            sensitiveFlag: true
        );
    }

    /**
     * Log: Gantt item visibility changed.
     */
    public static function logGanttVisibilityChange(
        int $itemId,
        int $projectId,
        array $oldRoles,
        array $newRoles,
        array $oldUsers,
        array $newUsers,
        ?int $userId = null
    ): AuditLog {
        return AuditLog::log(
            action: 'gantt.visibility_changed',
            resourceType: 'gantt_item',
            resourceId: $itemId,
            projectId: $projectId,
            changes: [
                'visible_to_roles' => ['from' => $oldRoles, 'to' => $newRoles],
                'visible_to_users' => ['from' => $oldUsers, 'to' => $newUsers],
            ],
            userId: $userId
        );
    }

    // ─── Project Form Submission Logging ──────────────────────────────

    /**
     * Log: Project form submission created.
     */
    public function logFormSubmission(
        int $submissionId,
        int $projectId,
        string $formType,
        ?int $userId = null
    ): AuditLog {
        return self::log(
            action: 'project_form.submitted',
            resourceType: 'project_form',
            resourceId: $submissionId,
            projectId: $projectId,
            context: ['form_type' => $formType],
            userId: $userId
        );
    }

    /**
     * Log: Project form submission reviewed.
     */
    public function logFormReviewed(
        int $submissionId,
        int $projectId,
        string $formType,
        string $status,
        ?string $notes = null,
        ?int $userId = null
    ): AuditLog {
        return self::log(
            action: 'project_form.reviewed',
            resourceType: 'project_form',
            resourceId: $submissionId,
            projectId: $projectId,
            context: [
                'form_type' => $formType,
                'status'    => $status,
                'notes'     => $notes,
            ],
            userId: $userId,
            sensitiveFlag: true
        );
    }
}
