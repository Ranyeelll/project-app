<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project extends Model
{
    protected $fillable = [
        'name',
        'description',
        'status',
        'priority',
        'start_date',
        'end_date',
        'budget',
        'spent',
        'progress',
        'manager_id',
        'team_ids',
        'project_leader_id',
        'serial',
        'approval_status',
        'approval_notes',
        'submitted_by',
        'reviewed_by',
        'last_reviewed_at',
        'last_message_at',
    ];

    protected $casts = [
        'team_ids'         => 'array',
        'budget'           => 'decimal:2',
        'spent'            => 'decimal:2',
        'start_date'       => 'date',
        'end_date'         => 'date',
        'last_reviewed_at' => 'datetime',
        'last_message_at'  => 'datetime',
    ];

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_leader_id');
    }
}
