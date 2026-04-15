<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskTemplate extends Model
{
    protected $fillable = [
        'project_template_id',
        'title',
        'description',
        'priority',
        'offset_days',
        'duration_days',
        'estimated_hours',
        'position',
    ];

    public function projectTemplate(): BelongsTo
    {
        return $this->belongsTo(ProjectTemplate::class);
    }
}
