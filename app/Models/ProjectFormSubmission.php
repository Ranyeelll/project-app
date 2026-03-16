<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectFormSubmission extends Model
{
    public const FORM_TYPES = [
        'project_details',
        'project_planning',
        'progress_update',
        'issue_risk',
        'approval_review',
        'completion_handover',
        'analytics_kpi',
    ];

    public const STATUSES = [
        'submitted',
        'reviewed',
        'approved',
        'rejected',
        'revision_requested',
    ];

    protected $fillable = [
        'project_id',
        'submitted_by',
        'form_type',
        'status',
        'data',
        'notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'data'        => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
