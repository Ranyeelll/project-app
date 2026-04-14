<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;


class TaskReviewNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private array $payload)
    {
    }

    public function via($notifiable)
    {
        return ['mail', 'database', 'broadcast'];
    }

    public function toMail($notifiable): MailMessage
    {
        $taskTitle = $this->payload['task_title'] ?? $this->payload['title'] ?? 'Task';
        $status = $this->payload['status'] ?? 'reviewed';

        return (new MailMessage)
            ->subject("Task Review: {$taskTitle}")
            ->line($this->payload['message'] ?? "Your task \"{$taskTitle}\" has been {$status}.")
            ->action('View Task', url('/my-tasks'));
    }

    public function toDatabase($notifiable)
    {
        return $this->payload;
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'TaskReviewNotification',
            'data' => $this->payload,
        ]);
    }
}
