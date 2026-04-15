<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WebhookLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    use RefreshDatabase;

    private function superadmin(): User
    {
        return User::factory()->create([
            'role' => 'superadmin',
            'department' => Department::Admin->value,
            'status' => 'active',
        ]);
    }

    public function test_superadmin_can_create_webhook(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/webhooks', [
                'name' => 'CI Pipeline',
                'url' => 'https://ci.example.com/hook',
                'events' => ['project.created', 'task.completed'],
            ])
            ->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'CI Pipeline',
                'url' => 'https://ci.example.com/hook',
            ]);

        $this->assertDatabaseHas('webhooks', ['name' => 'CI Pipeline']);
    }

    public function test_webhook_gets_auto_generated_secret(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/webhooks', [
                'name' => 'Secret Test',
                'url' => 'https://example.com/hook',
                'events' => ['task.created'],
            ])
            ->assertStatus(201);

        $webhook = Webhook::where('name', 'Secret Test')->first();
        $this->assertNotNull($webhook->secret);
        $this->assertEquals(40, strlen($webhook->secret));
    }

    public function test_superadmin_can_list_webhooks(): void
    {
        $admin = $this->superadmin();

        Webhook::create([
            'name' => 'Hook A',
            'url' => 'https://a.com/hook',
            'secret' => 'abc',
            'events' => ['task.created'],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/webhooks')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Hook A']);
    }

    public function test_superadmin_can_update_webhook(): void
    {
        $admin = $this->superadmin();

        $webhook = Webhook::create([
            'name' => 'Original',
            'url' => 'https://old.com/hook',
            'secret' => 'secret123',
            'events' => ['task.created'],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/webhooks/{$webhook->id}", [
                'name' => 'Updated',
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonFragment(['name' => 'Updated', 'isActive' => false]);
    }

    public function test_superadmin_can_delete_webhook(): void
    {
        $admin = $this->superadmin();

        $webhook = Webhook::create([
            'name' => 'Delete Me',
            'url' => 'https://del.com/hook',
            'secret' => 'sec',
            'events' => ['task.created'],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/webhooks/{$webhook->id}")
            ->assertOk();

        $this->assertDatabaseMissing('webhooks', ['id' => $webhook->id]);
    }

    public function test_superadmin_can_view_webhook_logs(): void
    {
        $admin = $this->superadmin();

        $webhook = Webhook::create([
            'name' => 'Log Test',
            'url' => 'https://log.com/hook',
            'secret' => 'sec',
            'events' => ['task.created'],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        WebhookLog::create([
            'webhook_id' => $webhook->id,
            'event' => 'task.created',
            'payload' => ['task_id' => 1],
            'response_code' => 200,
            'response_body' => 'OK',
            'success' => true,
        ]);

        $this->actingAs($admin)
            ->getJson("/api/webhooks/{$webhook->id}/logs")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['event' => 'task.created', 'success' => true]);
    }

    public function test_superadmin_can_regenerate_secret(): void
    {
        $admin = $this->superadmin();

        $webhook = Webhook::create([
            'name' => 'Regen',
            'url' => 'https://regen.com/hook',
            'secret' => 'old_secret_value',
            'events' => ['task.created'],
            'is_active' => true,
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/webhooks/{$webhook->id}/regenerate-secret")
            ->assertOk()
            ->assertJsonStructure(['message', 'secret']);

        $webhook->refresh();
        $this->assertNotEquals('old_secret_value', $webhook->secret);
    }

    public function test_employee_cannot_access_webhooks(): void
    {
        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $this->actingAs($employee)
            ->getJson('/api/webhooks')
            ->assertStatus(403);
    }

    public function test_webhook_url_must_be_valid(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/webhooks', [
                'name' => 'Bad URL',
                'url' => 'not-a-url',
                'events' => ['task.created'],
            ])
            ->assertStatus(422);
    }

    public function test_webhook_requires_at_least_one_event(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/webhooks', [
                'name' => 'No Events',
                'url' => 'https://example.com/hook',
                'events' => [],
            ])
            ->assertStatus(422);
    }
}
