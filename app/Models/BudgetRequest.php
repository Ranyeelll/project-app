<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetRequest extends Model
{
    protected $fillable = [
        'project_id',
        'requested_by',
        'amount',
        'purpose',
        'status',
        'review_comment',
        'reviewed_at',
        'attachment',
        'admin_remarks',
        'original_amount',
        'revision_count',
    ];

    protected $casts = [
        'amount'      => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
