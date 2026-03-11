<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;

    public function __construct(Message $msg)
    {
        // Eager-load relationships so the payload is self-contained
        $msg->loadMissing(['sender', 'replyTo.sender']);

        $this->message = [
            'id'               => $msg->id,
            'project_id'       => $msg->project_id,
            'sender_id'        => $msg->sender_id,
            'message_text'     => $msg->message_text,
            'attachments_meta' => $msg->attachments_meta ?? [],
            'metadata'         => $msg->metadata ?? [],
            'reply_to_id'      => $msg->reply_to_id,
            'read_by'          => $msg->read_by ?? [],
            'created_at'       => $msg->created_at->toISOString(),
            'sender'           => $msg->sender ? [
                'id'             => $msg->sender->id,
                'name'           => $msg->sender->name,
                'profile_photo'  => $msg->sender->profile_photo,
            ] : null,
            'reply_to'         => $msg->replyTo ? [
                'id'          => $msg->replyTo->id,
                'message_text'=> $msg->replyTo->message_text,
                'sender'      => $msg->replyTo->sender ? [
                    'id'   => $msg->replyTo->sender->id,
                    'name' => $msg->replyTo->sender->name,
                ] : null,
            ] : null,
        ];
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel('project.' . $this->message['project_id'])];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
