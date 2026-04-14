<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;


class BlockerReportedNotification extends Notification implements ShouldQueue
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
        $blockerTitle = $this->payload['blocker_title'] ?? 'Blocker';

        return (new MailMessage)
            ->subject("Blocker Reported: {$blockerTitle}")
            ->line("A blocker has been reported on task \"{$taskTitle}\".")
            ->line($this->payload['message'] ?? $this->payload['description'] ?? '')
            ->action('View Task', url('/my-tasks'));
    }

    public function toDatabase($notifiable)
    {
        return $this->payload;
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'BlockerReportedNotification',
            'data' => $this->payload,
        ]);
    }
}
