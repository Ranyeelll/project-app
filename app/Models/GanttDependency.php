<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GanttDependency extends Model
{
    protected $table = 'gantt_dependencies';

    public $timestamps = false; // only created_at

    protected $fillable = [
        'project_id',
        'predecessor_id',
        'successor_id',
        'type',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function predecessor(): BelongsTo
    {
        return $this->belongsTo(GanttItem::class, 'predecessor_id');
    }

    public function successor(): BelongsTo
    {
        return $this->belongsTo(GanttItem::class, 'successor_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
