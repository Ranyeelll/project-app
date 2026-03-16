<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMutedUser extends Model
{
    protected $fillable = [
        'user_id',
        'muted_by',
        'reason',
        'muted_until',
    ];

    protected $casts = [
        'muted_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function mutedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'muted_by');
    }

    /** Returns true if the mute is still active. */
    public function isActive(): bool
    {
        return $this->muted_until === null || $this->muted_until->isFuture();
    }

    /**
     * Check if a given user ID is currently muted.
     */
    public static function isUserMuted(int $userId): bool
    {
        $mute = self::where('user_id', $userId)->first();
        return $mute && $mute->isActive();
    }
}
