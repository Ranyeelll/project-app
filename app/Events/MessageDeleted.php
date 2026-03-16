<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast when a message is deleted (project channel only).
 * DM deletions use the same user private channels as DirectMessageSent.
 */
class MessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $messageId,
        public readonly ?int $projectId,
    ) {}

    public function broadcastOn(): array
    {
        if ($this->projectId) {
            return [new PresenceChannel("project.{$this->projectId}")];
        }
        return [];
    }

    public function broadcastAs(): string
    {
        return 'message.deleted';
    }
}
