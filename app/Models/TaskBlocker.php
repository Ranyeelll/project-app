<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskBlocker extends Model
{
    protected $fillable = [
        'task_id',
        'project_id',
        'issue_title',
        'description',
        'priority',
        'date_reported',
        'attachment_path',
        'reported_by_user_id',
        'resolved_at',
        'resolved_by_user_id',
    ];

    protected $casts = [
        'date_reported' => 'date',
        'resolved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }

    /**
     * Check if blocker is resolved (resolved_at is not null).
     */
    public function isResolved(): bool
    {
        return $this->resolved_at !== null;
    }

    /**
     * Scope: Get only open blockers.
     */
    public function scopeOpen($query)
    {
        return $query->whereNull('resolved_at');
    }

    /**
     * Scope: Get only resolved blockers.
     */
    public function scopeResolved($query)
    {
        return $query->whereNotNull('resolved_at');
    }

    /**
     * Scope: Get blockers by priority.
     */
    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }
}
