<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast a new direct message to both participants on their private channels.
 */
class DirectMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public int $conversationId;
    public int $recipientId;

    public function __construct(Message $msg, int $recipientId)
    {
        $msg->loadMissing(['sender', 'replyTo.sender']);

        $this->conversationId = $msg->conversation_id;
        $this->recipientId    = $recipientId;

        $this->message = [
            'id'               => $msg->id,
            'conversation_id'  => $msg->conversation_id,
            'sender_id'        => $msg->sender_id,
            'message_text'     => $msg->message_text,
            'attachments_meta' => $msg->attachments_meta ?? [],
            'metadata'         => $msg->metadata ?? [],
            'reply_to_id'      => $msg->reply_to_id,
            'read_by'          => $msg->read_by ?? [],
            'created_at'       => $msg->created_at->toIso8601String(),
            'sender'           => $msg->sender ? [
                'id'            => $msg->sender->id,
                'name'          => $msg->sender->name,
                'profile_photo' => $msg->sender->profile_photo ? '/api/users/' . $msg->sender->id . '/photo' : null,
            ] : null,
            'reply_to'         => $msg->replyTo ? [
                'id'           => $msg->replyTo->id,
                'message_text' => $msg->replyTo->message_text,
                'sender'       => $msg->replyTo->sender ? [
                    'id'   => $msg->replyTo->sender->id,
                    'name' => $msg->replyTo->sender->name,
                ] : null,
            ] : null,
        ];
    }

    /** Broadcast on both participants' private channels for instant delivery. */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->message['sender_id']}"),
            new PrivateChannel("user.{$this->recipientId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'dm.sent';
    }
}
