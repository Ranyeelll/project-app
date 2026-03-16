<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GanttItem extends Model
{
    protected $table = 'gantt_items';

    protected $fillable = [
        'project_id',
        'parent_id',
        'type',
        'name',
        'description',
        'start_date',
        'end_date',
        'progress',
        'position',
        'assignee_ids',
        'visible_to_roles',
        'visible_to_users',
    ];

    protected $casts = [
        'assignee_ids'     => 'array',
        'visible_to_roles' => 'array',
        'visible_to_users' => 'array',
        'start_date'       => 'date',
        'end_date'         => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(GanttItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(GanttItem::class, 'parent_id')->orderBy('position');
    }
}
