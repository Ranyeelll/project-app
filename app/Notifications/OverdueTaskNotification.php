<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;


class OverdueTaskNotification extends Notification implements ShouldQueue
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
        $projectName = $this->payload['project_name'] ?? $this->payload['project'] ?? '';

        return (new MailMessage)
            ->subject("Overdue Task: {$taskTitle}")
            ->line("Your task \"{$taskTitle}\" in project \"{$projectName}\" is overdue.")
            ->line($this->payload['message'] ?? 'Please update your progress or contact your supervisor.')
            ->action('View Tasks', url('/my-tasks'));
    }

    public function toDatabase($notifiable)
    {
        return $this->payload;
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'OverdueTaskNotification',
            'data' => $this->payload,
        ]);
    }
}
