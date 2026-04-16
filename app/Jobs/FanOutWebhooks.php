<?php

namespace App\Jobs;

use App\Models\Webhook;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class FanOutWebhooks implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public string $event,
        public array $payload,
    ) {}

    public function handle(): void
    {
        $webhooks = Webhook::where('is_active', true)
            ->get()
            ->filter(fn (Webhook $w) => in_array($this->event, $w->events ?? []));

        foreach ($webhooks as $webhook) {
            DispatchWebhook::dispatch($webhook, $this->event, $this->payload);
        }
    }
}
