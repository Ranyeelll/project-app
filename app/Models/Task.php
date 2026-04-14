<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'status',
        'priority',
        'assigned_to',
        'start_date',
        'end_date',
        'progress',
        'estimated_hours',
        'logged_hours',
        'allow_employee_edit',
        'completion_report_status',
        'report_cost',
    ];

    protected $casts = [
        'start_date'          => 'date',
        'end_date'            => 'date',
        'estimated_hours'     => 'decimal:2',
        'logged_hours'        => 'decimal:2',
        'report_cost'         => 'decimal:2',
        'allow_employee_edit' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // ─── New Enhancement: Task Management Forms ────────────────────────

    public function progressLogs(): HasMany
    {
        return $this->hasMany(TaskProgressLog::class);
    }

    public function timeLogs(): HasMany
    {
        return $this->hasMany(TaskTimeLog::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TaskCompletion::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TaskReview::class);
    }

    public function blockers(): HasMany
    {
        return $this->hasMany(TaskBlocker::class);
    }

    /**
     * Get the latest completion submission.
     */
    public function latestCompletion(): ?TaskCompletion
    {
        return $this->completions()->latest('created_at')->first();
    }

    /**
     * Get the latest approved review.
     */
    public function latestApprovedReview(): ?TaskReview
    {
        return $this->reviews()
            ->where('approval_status', 'approved')
            ->latest('review_date')
            ->first();
    }

    /**
     * Get open blockers for this task.
     */
    public function openBlockers(): HasMany
    {
        return $this->blockers()->whereNull('resolved_at');
    }

    /**
     * Check if task has any open blockers.
     */
    public function hasOpenBlockers(): bool
    {
        return $this->blockers()->whereNull('resolved_at')->exists();
    }

    /**
     * Count of open blockers.
     */
    public function openBlockersCount(): int
    {
        return $this->blockers()->whereNull('resolved_at')->count();
    }
}
