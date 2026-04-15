<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectTemplate extends Model
{
    protected $fillable = [
        'name',
        'description',
        'category',
        'risk_level',
        'default_budget',
        'default_duration_days',
        'default_team_structure',
        'created_by',
    ];

    protected $casts = [
        'default_budget' => 'decimal:2',
        'default_team_structure' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function taskTemplates(): HasMany
    {
        return $this->hasMany(TaskTemplate::class)->orderBy('position');
    }
}
