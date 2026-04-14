<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskTimeLog extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'date_worked',
        'hours_worked',
        'work_description',
        'legacy_time_log_id',
    ];

    protected $casts = [
        'date_worked' => 'date',
        'hours_worked' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
