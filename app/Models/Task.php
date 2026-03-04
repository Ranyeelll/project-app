<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
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
}
