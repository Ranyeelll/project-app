<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'status',
        'priority',
        'category',
        'risk_level',
        'beneficiary_type',
        'beneficiary_name',
        'contact_person',
        'contact_email',
        'contact_phone',
        'location',
        'objectives',
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

    /**
     * Compute progress as the average of team-member tasks (or all tasks if no team).
     * Updates the stored progress column and returns the computed value.
     */
    public function recalculateProgress(): int
    {
        $teamIds = array_values(array_filter(array_map('intval', $this->team_ids ?? []), static fn ($id) => $id > 0));

        $query = Task::where('project_id', $this->id);
        if (!empty($teamIds)) {
            $query->whereIn('assigned_to', $teamIds);
        }

        $avg = (int) round($query->avg('progress') ?? 0);
        if ((int) $this->progress !== $avg) {
            $this->update(['progress' => $avg]);
        }
        return $avg;
    }
}
