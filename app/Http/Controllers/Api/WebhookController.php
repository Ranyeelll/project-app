<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class WebhookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Webhook::orderByDesc('created_at');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('url', 'ilike', "%{$search}%");
            });
        }
        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        $webhooks = $query->get()->map(fn ($w) => $this->formatWebhook($w));

        return response()->json($webhooks);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'events' => 'required|array|min:1',
            'events.*' => 'string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $webhook = Webhook::create([
            'name' => $data['name'],
            'url' => $data['url'],
            'secret' => Str::random(40),
            'events' => $data['events'],
            'is_active' => $data['is_active'] ?? true,
            'created_by' => Auth::id(),
        ]);

        return response()->json($this->formatWebhook($webhook), 201);
    }

    public function update(Request $request, Webhook $webhook): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'url' => 'sometimes|url|max:2048',
            'events' => 'sometimes|array|min:1',
            'events.*' => 'string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $webhook->update($data);

        return response()->json($this->formatWebhook($webhook));
    }

    public function destroy(Webhook $webhook): JsonResponse
    {
        $webhook->logs()->delete();
        $webhook->delete();

        return response()->json(['message' => 'Webhook deleted']);
    }

    public function logs(Webhook $webhook): JsonResponse
    {
        $logs = $webhook->logs()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($l) => [
                'id' => (string) $l->id,
                'event' => $l->event,
                'responseCode' => $l->response_code,
                'success' => (bool) $l->success,
                'createdAt' => $l->created_at?->toIso8601String() ?? '',
            ]);

        return response()->json($logs);
    }

    public function regenerateSecret(Webhook $webhook): JsonResponse
    {
        $webhook->update(['secret' => Str::random(40)]);

        return response()->json([
            'message' => 'Secret regenerated',
            'secret' => $webhook->secret,
        ]);
    }

    private function formatWebhook(Webhook $w): array
    {
        return [
            'id' => (string) $w->id,
            'name' => $w->name,
            'url' => $w->url,
            'events' => $w->events ?? [],
            'isActive' => (bool) $w->is_active,
            'createdBy' => (string) ($w->created_by ?? ''),
            'createdAt' => $w->created_at?->toIso8601String() ?? '',
        ];
    }
}
