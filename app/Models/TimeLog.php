<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeLog extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'hours',
        'description',
        'date',
    ];

    protected $casts = [
        'task_id' => 'integer',
        'user_id' => 'integer',
        'hours'   => 'decimal:1',
        'date'    => 'date',
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
