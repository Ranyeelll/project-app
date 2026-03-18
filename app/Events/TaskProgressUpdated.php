<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskProgressUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $taskId;
    public int $projectId;
    public int $progress;
    public string $status;
    public int $updatedBy;
    public string $updatedAt;

    public function __construct(int $taskId, int $projectId, int $progress, string $status, int $updatedBy, string $updatedAt)
    {
        $this->taskId = $taskId;
        $this->projectId = $projectId;
        $this->progress = $progress;
        $this->status = $status;
        $this->updatedBy = $updatedBy;
        $this->updatedAt = $updatedAt;
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel('project.' . $this->projectId)];
    }

    public function broadcastAs(): string
    {
        return 'task.progress.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'taskId' => $this->taskId,
            'projectId' => $this->projectId,
            'progress' => $this->progress,
            'status' => $this->status,
            'updatedBy' => $this->updatedBy,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
