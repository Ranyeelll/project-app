<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DirectConversation extends Model
{
    protected $fillable = [
        'participant1_id',
        'participant2_id',
    ];

    public function participant1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant1_id');
    }

    public function participant2(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant2_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'conversation_id');
    }

    /**
     * Find or create a canonical DM conversation between two users.
     * The lower user ID always becomes participant1 for uniqueness.
     */
    public static function findOrCreateBetween(int $userA, int $userB): self
    {
        [$p1, $p2] = $userA < $userB ? [$userA, $userB] : [$userB, $userA];

        return self::firstOrCreate(
            ['participant1_id' => $p1, 'participant2_id' => $p2]
        );
    }

    /** Return the other participant's ID given one participant's ID. */
    public function otherParticipantId(int $userId): int
    {
        return $this->participant1_id === $userId
            ? $this->participant2_id
            : $this->participant1_id;
    }
}
