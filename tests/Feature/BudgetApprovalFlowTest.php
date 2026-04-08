<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_budget_request_moves_through_accounting_supervisor_superadmin_stages(): void
    {
        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $accounting = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Accounting->value,
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
            'name' => 'Flow Test Project',
            'description' => 'Budget flow test',
            'status' => 'active',
            'priority' => 'medium',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'budget' => 100000,
            'spent' => 0,
            'progress' => 0,
            'manager_id' => $employee->id,
            'team_ids' => [(string) $employee->id],
            'serial' => 'MAP-2026-900001',
            'approval_status' => 'draft',
        ]);

        $request = BudgetRequest::create([
            'project_id' => $project->id,
            'requested_by' => $employee->id,
            'amount' => 12000,
            'type' => 'spending',
            'purpose' => 'Laptop accessories',
            'status' => 'pending',
        ]);

        // Accounting sees pending queue.
        $this->actingAs($accounting)
            ->getJson('/api/budget-requests')
            ->assertOk()
            ->assertJsonFragment(['id' => (string) $request->id, 'status' => 'pending']);

        // Supervisor cannot see request yet.
        $this->actingAs($supervisor)
            ->getJson('/api/budget-requests')
            ->assertOk()
            ->assertJsonMissing(['id' => (string) $request->id]);

        // Accounting forwards to supervisor queue.
        $this->actingAs($accounting)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'accounting_approved',
                'review_comment' => 'Accounting approved.',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'accounting_approved']);

        // Supervisor now sees the request.
        $this->actingAs($supervisor)
            ->getJson('/api/budget-requests')
            ->assertOk()
            ->assertJsonFragment(['id' => (string) $request->id, 'status' => 'accounting_approved']);

        // Supervisor forwards to superadmin queue.
        $this->actingAs($supervisor)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'supervisor_approved',
                'review_comment' => 'Supervisor approved.',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'supervisor_approved']);

        // Superadmin sees and can finalize.
        $this->actingAs($superadmin)
            ->getJson('/api/budget-requests')
            ->assertOk()
            ->assertJsonFragment(['id' => (string) $request->id, 'status' => 'supervisor_approved']);

        $this->actingAs($superadmin)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'approved',
                'review_comment' => 'Final approval.',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'approved']);
    }

    public function test_stage_permissions_are_enforced(): void
    {
        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $accounting = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Accounting->value,
            'status' => 'active',
        ]);

        $supervisor = User::factory()->create([
            'role' => 'supervisor',
            'department' => Department::Technical->value,
            'status' => 'active',
        ]);

        $project = Project::create([
            'name' => 'Flow Guard Project',
            'description' => 'Budget flow guard test',
            'status' => 'active',
            'priority' => 'medium',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'budget' => 90000,
            'spent' => 0,
            'progress' => 0,
            'manager_id' => $employee->id,
            'team_ids' => [(string) $employee->id],
            'serial' => 'MAP-2026-900002',
            'approval_status' => 'draft',
        ]);

        $request = BudgetRequest::create([
            'project_id' => $project->id,
            'requested_by' => $employee->id,
            'amount' => 5000,
            'type' => 'spending',
            'purpose' => 'Testing tools',
            'status' => 'pending',
        ]);

        // Supervisor cannot skip accounting stage.
        $this->actingAs($supervisor)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'supervisor_approved',
            ])
            ->assertStatus(403);

        // Employee cannot mark directly approved.
        $this->actingAs($employee)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'approved',
            ])
            ->assertStatus(403);

        // Accounting can request revision at pending stage.
        $this->actingAs($accounting)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'revision_requested',
                'admin_remarks' => 'Need revised quote',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'revision_requested']);

        // Employee can resubmit back to pending.
        $this->actingAs($employee)
            ->putJson('/api/budget-requests/' . $request->id, [
                'status' => 'pending',
                'amount' => 4500,
                'purpose' => 'Testing tools (revised)',
            ])
            ->assertOk()
            ->assertJsonFragment(['status' => 'pending']);
    }
}
