<?php

namespace Tests\Feature;

use App\Models\DirectConversation;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatMessageSendTest extends TestCase
{
    use RefreshDatabase;

    public function test_project_chat_message_can_be_sent_and_fetched(): void
    {
        $sender = User::factory()->create([
            'status' => 'active',
        ]);

        $project = Project::create([
            'name' => 'Chat Test Project',
            'description' => 'Project for chat API feature test',
            'manager_id' => $sender->id,
        ]);

        $sendResponse = $this
            ->actingAs($sender)
            ->postJson("/api/projects/{$project->id}/messages", [
                'sender_id' => $sender->id,
                'message_text' => 'Hello project chat',
            ]);

        $sendResponse
            ->assertCreated()
            ->assertJsonPath('message_text', 'Hello project chat')
            ->assertJsonPath('sender_id', $sender->id);

        $fetchResponse = $this
            ->actingAs($sender)
            ->getJson("/api/projects/{$project->id}/messages");

        $fetchResponse
            ->assertOk()
            ->assertJsonFragment([
                'message_text' => 'Hello project chat',
                'sender_id' => $sender->id,
            ]);
    }

    public function test_direct_chat_message_can_be_sent_and_fetched(): void
    {
        $sender = User::factory()->create([
            'status' => 'active',
        ]);

        $recipient = User::factory()->create([
            'status' => 'active',
        ]);

        $conversation = DirectConversation::findOrCreateBetween($sender->id, $recipient->id);

        $sendResponse = $this
            ->actingAs($sender)
            ->postJson("/api/direct-conversations/{$conversation->id}/messages", [
                'sender_id' => $sender->id,
                'message_text' => 'Hello direct chat',
            ]);

        $sendResponse
            ->assertCreated()
            ->assertJsonPath('message_text', 'Hello direct chat')
            ->assertJsonPath('conversation_id', $conversation->id)
            ->assertJsonPath('sender_id', $sender->id);

        $fetchResponse = $this
            ->actingAs($sender)
            ->getJson("/api/direct-conversations/{$conversation->id}/messages");

        $fetchResponse
            ->assertOk()
            ->assertJsonFragment([
                'message_text' => 'Hello direct chat',
                'sender_id' => $sender->id,
            ]);
    }
}
