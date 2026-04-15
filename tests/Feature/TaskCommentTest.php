<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskCommentTest extends TestCase
{
    use RefreshDatabase;

    private function createProjectAndTask(User $user): Task
    {
        $project = Project::create([
            'name' => 'Comment Test Project',
            'description' => 'Test',
            'status' => 'active',
            'priority' => 'medium',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'budget' => 50000,
            'spent' => 0,
            'progress' => 0,
            'manager_id' => $user->id,
            'team_ids' => [(string) $user->id],
        ]);

        return Task::create([
            'project_id' => $project->id,
            'title' => 'Test Task',
            'status' => 'in_progress',
            'progress' => 50,
            'assigned_to' => $user->id,
        ]);
    }

    public function test_user_can_create_comment(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        $this->actingAs($user)
            ->postJson("/api/tasks/{$task->id}/comments", [
                'body' => 'This is a test comment',
            ])
            ->assertStatus(201)
            ->assertJsonFragment([
                'body' => 'This is a test comment',
                'taskId' => (string) $task->id,
                'userId' => (string) $user->id,
            ]);

        $this->assertDatabaseHas('task_comments', [
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'This is a test comment',
        ]);
    }

    public function test_user_can_list_comments(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'First comment',
        ]);

        TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'Second comment',
        ]);

        $this->actingAs($user)
            ->getJson("/api/tasks/{$task->id}/comments")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['body' => 'First comment'])
            ->assertJsonFragment(['body' => 'Second comment']);
    }

    public function test_user_can_reply_to_comment(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        $parent = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'Parent comment',
        ]);

        $this->actingAs($user)
            ->postJson("/api/tasks/{$task->id}/comments", [
                'body' => 'Reply comment',
                'parent_id' => $parent->id,
            ])
            ->assertStatus(201)
            ->assertJsonFragment([
                'body' => 'Reply comment',
                'parentId' => (string) $parent->id,
            ]);
    }

    public function test_owner_can_update_comment(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'Original text',
        ]);

        $this->actingAs($user)
            ->putJson("/api/tasks/{$task->id}/comments/{$comment->id}", [
                'body' => 'Updated text',
            ])
            ->assertOk()
            ->assertJsonFragment(['body' => 'Updated text']);
    }

    public function test_non_owner_cannot_update_comment(): void
    {
        $owner = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $other = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($owner);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $owner->id,
            'body' => 'Owner comment',
        ]);

        $this->actingAs($other)
            ->putJson("/api/tasks/{$task->id}/comments/{$comment->id}", [
                'body' => 'Hacked!',
            ])
            ->assertStatus(403);
    }

    public function test_owner_can_delete_comment(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'body' => 'To be deleted',
        ]);

        $this->actingAs($user)
            ->deleteJson("/api/tasks/{$task->id}/comments/{$comment->id}")
            ->assertOk();

        $this->assertDatabaseMissing('task_comments', ['id' => $comment->id]);
    }

    public function test_superadmin_can_delete_any_comment(): void
    {
        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $admin = User::factory()->create([
            'role' => 'superadmin',
            'department' => Department::Admin->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($employee);

        $comment = TaskComment::create([
            'task_id' => $task->id,
            'user_id' => $employee->id,
            'body' => 'Employee comment',
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/tasks/{$task->id}/comments/{$comment->id}")
            ->assertOk();

        $this->assertDatabaseMissing('task_comments', ['id' => $comment->id]);
    }

    public function test_comment_body_is_required(): void
    {
        $user = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $task = $this->createProjectAndTask($user);

        $this->actingAs($user)
            ->postJson("/api/tasks/{$task->id}/comments", [])
            ->assertStatus(422);
    }
}
