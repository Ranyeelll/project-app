<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class TaskActivityLog extends Model
{
    public $timestamps = false; // Append-only: we manage timestamps ourselves

    protected $fillable = [
        'task_id',
        'user_id',
        'action_type',
        'description',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    // ─── Immutability Guards ──────────────────────────────────────

    public function update(array $attributes = [], array $options = []): never
    {
        throw new LogicException('Activity logs are immutable — updates are not allowed.');
    }

    public function delete(): never
    {
        throw new LogicException('Activity logs are immutable — deletes are not allowed.');
    }

    public static function destroy($ids): never
    {
        throw new LogicException('Activity logs are immutable — deletes are not allowed.');
    }

    // ─── Relationships ────────────────────────────────────────────

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Query Helpers ────────────────────────────────────────────

    /**
     * Get all activities for a task in chronological order.
     */
    public static function forTask(int $taskId)
    {
        return self::where('task_id', $taskId)
            ->with('user:id,name,email')
            ->orderBy('created_at', 'asc');
    }
}
