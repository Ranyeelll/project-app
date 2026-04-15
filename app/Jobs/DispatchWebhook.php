<?php

namespace App\Jobs;

use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class DispatchWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public array $backoff = [10, 60, 300];

    public function __construct(
        public Webhook $webhook,
        public string $event,
        public array $payload,
    ) {}

    public function handle(): void
    {
        $body = [
            'event' => $this->event,
            'timestamp' => now()->toIso8601String(),
            'data' => $this->payload,
        ];

        $json = json_encode($body);
        $headers = ['Content-Type' => 'application/json'];

        if ($this->webhook->secret) {
            $headers['X-Webhook-Signature'] = hash_hmac('sha256', $json, $this->webhook->secret);
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(15)
                ->withBody($json, 'application/json')
                ->post($this->webhook->url);

            WebhookLog::create([
                'webhook_id' => $this->webhook->id,
                'event' => $this->event,
                'payload' => $body,
                'response_code' => $response->status(),
                'response_body' => substr((string) $response->body(), 0, 5000),
                'success' => $response->successful(),
            ]);

            if ($response->failed()) {
                $this->fail(new \RuntimeException("Webhook returned HTTP {$response->status()}"));
            }
        } catch (\Exception $e) {
            WebhookLog::create([
                'webhook_id' => $this->webhook->id,
                'event' => $this->event,
                'payload' => $body,
                'response_code' => 0,
                'response_body' => substr($e->getMessage(), 0, 5000),
                'success' => false,
            ]);

            throw $e;
        }
    }
}
