<?php

namespace App\Services;

use App\Jobs\DispatchWebhook;
use App\Models\Webhook;

class WebhookService
{
    public static function dispatch(string $event, array $payload): void
    {
        $webhooks = Webhook::where('is_active', true)
            ->get()
            ->filter(fn (Webhook $w) => in_array($event, $w->events ?? []));

        foreach ($webhooks as $webhook) {
            DispatchWebhook::dispatch($webhook, $event, $payload);
        }
    }
}
