<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskReview extends Model
{
    protected $fillable = [
        'task_id',
        'reviewer_id',
        'approval_status',
        'comments',
        'review_date',
    ];

    protected $casts = [
        'review_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * Get the latest approved review for a task.
     */
    public static function latestApprovedForTask(int $taskId): ?self
    {
        return self::where('task_id', $taskId)
            ->where('approval_status', 'approved')
            ->latest('review_date')
            ->first();
    }

    /**
     * Check if a task has an approved review.
     */
    public static function hasApprovedReview(int $taskId): bool
    {
        return self::where('task_id', $taskId)
            ->where('approval_status', 'approved')
            ->exists();
    }
}
