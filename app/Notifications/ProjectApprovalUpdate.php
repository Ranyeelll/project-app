<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ProjectApprovalUpdate extends Notification
{
    use Queueable;

    public function __construct(private array $payload)
    {
    }

    public function via($notifiable)
    {
        return ['mail', 'database'];
    }

    public function toMail($notifiable)
    {
        $subject = $this->payload['subject'] ?? 'Project approval update';
        $line = $this->payload['message'] ?? '';

        return (new MailMessage)
            ->subject($subject)
            ->line($line)
            ->action('View project', $this->payload['url'] ?? url('/projects'));
    }

    public function toDatabase($notifiable)
    {
        return $this->payload;
    }
}
