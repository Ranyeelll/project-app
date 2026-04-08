<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\ProjectApprovalUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProjectFinishNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_finish_project_notifies_supervisor_and_superadmin(): void
    {
        Notification::fake();

        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'department' => Department::Technical->value,
            'status' => 'active',
        ]);

        $superadmin = User::factory()->create([
            'role' => 'superadmin',
            'department' => Department::Admin->value,
            'status' => 'active',
        ]);

        $project = Project::create([
            'name' => 'Finish Notification Project',
            'description' => 'Ensures finish notifications reach reviewers.',
            'status' => 'active',
            'priority' => 'medium',
            'start_date' => now()->subDays(10)->toDateString(),
            'end_date' => now()->toDateString(),
            'budget' => 50000,
            'spent' => 0,
            'progress' => 100,
            'manager_id' => $employee->id,
            'team_ids' => [(string) $employee->id],
            'serial' => 'MAP-2026-910001',
            'approval_status' => 'draft',
        ]);

        Task::create([
            'project_id' => $project->id,
            'title' => 'Done Task',
            'status' => 'completed',
            'progress' => 100,
            'assigned_to' => $employee->id,
        ]);

        $this->actingAs($employee)
            ->postJson('/api/projects/' . $project->id . '/approval', [
                'action' => 'finish_project',
                'notes' => 'Completed by employee',
            ])
            ->assertOk()
            ->assertJsonFragment(['approvalStatus' => 'supervisor_review']);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'status' => 'completed',
            'approval_status' => 'supervisor_review',
        ]);

        Notification::assertSentTo($supervisor, ProjectApprovalUpdate::class);
        Notification::assertSentTo($superadmin, ProjectApprovalUpdate::class);
        Notification::assertNotSentTo($employee, ProjectApprovalUpdate::class);
    }

    public function test_employee_finish_project_notifies_legacy_admin_role(): void
    {
        Notification::fake();

        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $legacyAdmin = User::factory()->create([
            'role' => 'admin',
            'department' => Department::Admin->value,
            'status' => 'active',
        ]);

        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'department' => Department::Technical->value,
            'status' => 'active',
        ]);

        $project = Project::create([
            'name' => 'Legacy Admin Notification Project',
            'description' => 'Ensures admin alias receives finish notifications.',
            'status' => 'active',
            'priority' => 'medium',
            'start_date' => now()->subDays(8)->toDateString(),
            'end_date' => now()->toDateString(),
            'budget' => 30000,
            'spent' => 0,
            'progress' => 100,
            'manager_id' => $employee->id,
            'team_ids' => [(string) $employee->id],
            'serial' => 'MAP-2026-910002',
            'approval_status' => 'draft',
        ]);

        Task::create([
            'project_id' => $project->id,
            'title' => 'Legacy admin task',
            'status' => 'completed',
            'progress' => 100,
            'assigned_to' => $employee->id,
        ]);

        $this->actingAs($employee)
            ->postJson('/api/projects/' . $project->id . '/approval', [
                'action' => 'finish_project',
                'notes' => 'Completed by employee',
            ])
            ->assertOk()
            ->assertJsonFragment(['approvalStatus' => 'supervisor_review']);

        Notification::assertSentTo($legacyAdmin, ProjectApprovalUpdate::class);
        Notification::assertSentTo($supervisor, ProjectApprovalUpdate::class);
        Notification::assertNotSentTo($employee, ProjectApprovalUpdate::class);
    }
}
