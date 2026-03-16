<?php

namespace App\Services;

use App\Models\TaskActivityLog;
use Illuminate\Support\Facades\Auth;

/**
 * Task Activity Logger: Logs user-facing task activities for timeline display.
 * Each action generates a human-readable description for UI display.
 * All activities are immutable (append-only).
 */
class TaskActivityLogger
{
    /**
     * Log: Task created.
     */
    public static function taskCreated(int $taskId, ?string $taskName = null): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} created task: {$taskName}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'task_created',
            'description' => $description,
            'metadata' => ['task_name' => $taskName],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Task updated (generic fields changed).
     */
    public static function taskUpdated(int $taskId, array $changes): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $changeList = implode(', ', array_keys($changes));
        $description = "{$userName} updated: {$changeList}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'task_updated',
            'description' => $description,
            'metadata' => $changes,
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Task assigned to someone.
     */
    public static function taskAssigned(int $taskId, ?string $assigneeName): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} assigned this task to {$assigneeName}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'task_assigned',
            'description' => $description,
            'metadata' => ['assigned_to' => $assigneeName],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Task reassigned to someone different.
     */
    public static function taskReassigned(int $taskId, ?string $oldAssigneeName, ?string $newAssigneeName): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} reassigned from {$oldAssigneeName} to {$newAssigneeName}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'task_reassigned',
            'description' => $description,
            'metadata' => [
                'old_assignee' => $oldAssigneeName,
                'new_assignee' => $newAssigneeName,
            ],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Task status changed.
     */
    public static function statusChanged(int $taskId, ?string $oldStatus, ?string $newStatus): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} changed status from '{$oldStatus}' to '{$newStatus}'";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'status_changed',
            'description' => $description,
            'metadata' => [
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Progress updated.
     */
    public static function progressUpdated(int $taskId, int $percentage): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} updated progress to {$percentage}%";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'progress_updated',
            'description' => $description,
            'metadata' => ['percentage' => $percentage],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Time logged on task.
     */
    public static function timeLogged(int $taskId, float $hours, ?string $dateWorked = null): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $dateDisplay = $dateWorked ? " on {$dateWorked}" : '';
        $description = "{$userName} logged {$hours} hours{$dateDisplay}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'time_logged',
            'description' => $description,
            'metadata' => [
                'hours' => $hours,
                'date_worked' => $dateWorked,
            ],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Completion submitted.
     */
    public static function completionSubmitted(int $taskId, ?string $summary = null): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} submitted completion";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'completion_submitted',
            'description' => $description,
            'metadata' => ['summary' => $summary ? substr($summary, 0, 100) : null],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Task reviewed/approved.
     */
    public static function reviewSubmitted(int $taskId, string $status, ?string $reviewerName = null): TaskActivityLog
    {
        $user = Auth::user();
        $reviewer = $reviewerName ?? ($user ? $user->name : 'System');
        $statusText = match ($status) {
            'approved' => 'approved',
            'rejected' => 'rejected',
            'revision_requested' => 'requested revision for',
            default => $status,
        };
        $description = "{$reviewer} {$statusText} this task";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'task_reviewed',
            'description' => $description,
            'metadata' => ['review_status' => $status],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: Issue/blocker reported.
     */
    public static function issueReported(int $taskId, string $issueTitle, string $priority): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} reported a {$priority} blocker: {$issueTitle}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'issue_reported',
            'description' => $description,
            'metadata' => [
                'issue_title' => $issueTitle,
                'priority' => $priority,
            ],
            'created_at' => now(),
        ]);
    }

    /**
     * Log: File uploaded.
     */
    public static function fileUploaded(int $taskId, string $fileName, string $fileType): TaskActivityLog
    {
        $user = Auth::user();
        $userName = $user ? $user->name : 'System';
        $description = "{$userName} uploaded {$fileType}: {$fileName}";

        return TaskActivityLog::create([
            'task_id' => $taskId,
            'user_id' => $user?->id,
            'action_type' => 'file_uploaded',
            'description' => $description,
            'metadata' => [
                'file_name' => $fileName,
                'file_type' => $fileType,
            ],
            'created_at' => now(),
        ]);
    }
}
