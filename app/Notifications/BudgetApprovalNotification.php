<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;


class BudgetApprovalNotification extends Notification implements ShouldQueue
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
        $status = $this->payload['status'] ?? 'updated';
        $projectName = $this->payload['project_name'] ?? $this->payload['project'] ?? 'Project';

        return (new MailMessage)
            ->subject("Budget Request {$status} — {$projectName}")
            ->line($this->payload['message'] ?? "Your budget request has been {$status}.")
            ->action('View Budget', url('/budget'));
    }

    public function toDatabase($notifiable)
    {
        return $this->payload;
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'type' => 'BudgetApprovalNotification',
            'data' => $this->payload,
        ]);
    }
}
