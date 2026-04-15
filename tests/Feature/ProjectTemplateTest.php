<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\Project;
use App\Models\ProjectTemplate;
use App\Models\Task;
use App\Models\TaskTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTemplateTest extends TestCase
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

    private function employee(): User
    {
        return User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);
    }

    public function test_superadmin_can_create_template_with_tasks(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/project-templates', [
                'name' => 'Web Development',
                'description' => 'Standard web project',
                'category' => 'Development',
                'risk_level' => 'medium',
                'default_budget' => 100000,
                'default_duration_days' => 30,
                'task_templates' => [
                    [
                        'title' => 'Requirements Gathering',
                        'priority' => 'high',
                        'offset_days' => 0,
                        'duration_days' => 5,
                        'estimated_hours' => 40,
                    ],
                    [
                        'title' => 'Development',
                        'priority' => 'high',
                        'offset_days' => 5,
                        'duration_days' => 15,
                        'estimated_hours' => 120,
                    ],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonFragment(['name' => 'Web Development'])
            ->assertJsonCount(2, 'taskTemplates');

        $this->assertDatabaseHas('project_templates', ['name' => 'Web Development']);
        $this->assertDatabaseHas('task_templates', ['title' => 'Requirements Gathering']);
        $this->assertDatabaseHas('task_templates', ['title' => 'Development']);
    }

    public function test_superadmin_can_list_templates(): void
    {
        $admin = $this->superadmin();

        ProjectTemplate::create([
            'name' => 'Template A',
            'created_by' => $admin->id,
        ]);

        ProjectTemplate::create([
            'name' => 'Template B',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->getJson('/api/project-templates')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_superadmin_can_update_template(): void
    {
        $admin = $this->superadmin();

        $template = ProjectTemplate::create([
            'name' => 'Old Name',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->putJson("/api/project-templates/{$template->id}", [
                'name' => 'New Name',
                'risk_level' => 'high',
            ])
            ->assertOk()
            ->assertJsonFragment(['name' => 'New Name', 'riskLevel' => 'high']);
    }

    public function test_superadmin_can_delete_template(): void
    {
        $admin = $this->superadmin();

        $template = ProjectTemplate::create([
            'name' => 'Disposable',
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->deleteJson("/api/project-templates/{$template->id}")
            ->assertOk();

        $this->assertDatabaseMissing('project_templates', ['id' => $template->id]);
    }

    public function test_instantiate_creates_project_and_tasks_from_template(): void
    {
        $admin = $this->superadmin();
        $manager = $this->employee();

        $template = ProjectTemplate::create([
            'name' => 'Quick Start',
            'description' => 'A template description',
            'default_budget' => 50000,
            'default_duration_days' => 14,
            'created_by' => $admin->id,
        ]);

        TaskTemplate::create([
            'project_template_id' => $template->id,
            'title' => 'Init',
            'priority' => 'high',
            'offset_days' => 0,
            'duration_days' => 3,
            'estimated_hours' => 24,
            'position' => 0,
        ]);

        TaskTemplate::create([
            'project_template_id' => $template->id,
            'title' => 'Build',
            'priority' => 'medium',
            'offset_days' => 3,
            'duration_days' => 10,
            'estimated_hours' => 80,
            'position' => 1,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/project-templates/{$template->id}/instantiate", [
                'name' => 'My New Project',
                'start_date' => '2026-05-01',
                'manager_id' => $manager->id,
                'team_ids' => [(string) $manager->id],
            ])
            ->assertStatus(201)
            ->assertJsonStructure(['message', 'projectId']);

        $this->assertDatabaseHas('projects', [
            'name' => 'My New Project',
            'budget' => 50000,
            'manager_id' => $manager->id,
        ]);

        $this->assertDatabaseHas('tasks', ['title' => 'Init', 'priority' => 'high']);
        $this->assertDatabaseHas('tasks', ['title' => 'Build', 'priority' => 'medium']);
    }

    public function test_employee_cannot_access_templates(): void
    {
        $employee = $this->employee();

        $this->actingAs($employee)
            ->getJson('/api/project-templates')
            ->assertStatus(403);
    }

    public function test_template_name_is_required(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/project-templates', [
                'description' => 'No name',
            ])
            ->assertStatus(422);
    }
}
