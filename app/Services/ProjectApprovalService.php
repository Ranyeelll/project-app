<?php

namespace App\Services;

use App\Enums\Department;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Project Approval Service: Manages the project approval state machine.
 * Transitions: draft → technical_review → accounting_review → approved/rejected/revision_requested
 */
class ProjectApprovalService
{
    /**
     * Transition a project to a new approval state.
     *
     * @throws InvalidArgumentException on invalid action or unauthorized actor
     */
    public function transition(Project $project, User $actor, string $action, ?string $notes): Project
    {
        $current = $project->approval_status ?? 'draft';

        return match ($action) {
            'submit_for_review' => $this->submitForReview($project, $actor, $current),
            'approve_technical' => $this->approveTechnical($project, $actor, $current),
            'approve_final'     => $this->approveFinal($project, $actor, $current, $notes),
            'request_revision'  => $this->requestRevision($project, $actor, $current, $notes),
            'reject'            => $this->reject($project, $actor, $current, $notes),
            'resubmit'          => $this->resubmit($project, $actor, $current),
            default             => throw new InvalidArgumentException("Unknown approval action: {$action}"),
        };
    }

    // ─── Transitions ──────────────────────────────────────────────────────────

    private function submitForReview(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, ['draft'], 'submit_for_review');
        $this->requireDepartment($actor, [Department::Admin, Department::Employee], 'submit_for_review');

        if ($actor->department === Department::Employee) {
            $this->requireProjectMember($project, $actor, 'submit_for_review');
            $this->requireProjectCompletion($project, 'submit_for_review');
        }

        $project->update([
            'approval_status'  => 'technical_review',
            'submitted_by'     => $actor->id,
            'approval_notes'   => null,
        ]);

        return $project->fresh();
    }

    private function approveTechnical(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, ['technical_review'], 'approve_technical');
        $this->requireDepartment($actor, [Department::Technical, Department::Admin], 'approve_technical');

        $project->update([
            'approval_status'  => 'accounting_review',
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        return $project->fresh();
    }

    private function approveFinal(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['accounting_review'], 'approve_final');
        $this->requireDepartment($actor, [Department::Accounting, Department::Admin], 'approve_final');

        DB::transaction(function () use ($project, $actor, $notes) {
            $project->update([
                'approval_status'  => 'approved',
                'reviewed_by'      => $actor->id,
                'last_reviewed_at' => now(),
                'approval_notes'   => $notes,
            ]);
            $this->recalcProjectSpent($project);
        });

        return $project->fresh();
    }

    private function requestRevision(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['technical_review', 'accounting_review'], 'request_revision');

        if ($current === 'technical_review') {
            $this->requireDepartment($actor, [Department::Technical, Department::Admin], 'request_revision');
        } else {
            $this->requireDepartment($actor, [Department::Accounting, Department::Admin], 'request_revision');
        }

        $project->update([
            'approval_status'  => 'revision_requested',
            'approval_notes'   => $notes,
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        return $project->fresh();
    }

    private function reject(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['technical_review', 'accounting_review'], 'reject');

        if ($current === 'technical_review') {
            $this->requireDepartment($actor, [Department::Technical, Department::Admin], 'reject');
        } else {
            $this->requireDepartment($actor, [Department::Admin], 'reject');
        }

        $project->update([
            'approval_status'  => 'rejected',
            'approval_notes'   => $notes,
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        return $project->fresh();
    }

    private function resubmit(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, ['revision_requested'], 'resubmit');
        $this->requireDepartment($actor, [Department::Admin, Department::Employee], 'resubmit');

        if ($actor->department === Department::Employee) {
            $this->requireProjectMember($project, $actor, 'resubmit');
            $this->requireProjectCompletion($project, 'resubmit');
        }

        $project->update([
            'approval_status' => 'technical_review',
            'approval_notes'  => null,
            'submitted_by'    => $actor->id,
        ]);

        return $project->fresh();
    }

    // ─── Budget Recalculation ─────────────────────────────────────────────────

    /**
     * Materialize the computed spent value into the database.
     * Called inside DB::transaction on final approval.
     */
    public function recalcProjectSpent(Project $project): void
    {
        $approvedSpent = BudgetRequest::where('project_id', $project->id)
            ->where('status', 'approved')
            ->where('type', 'spending')
            ->sum('amount');

        $reportCosts = Task::where('project_id', $project->id)
            ->where('completion_report_status', 'approved')
            ->sum('report_cost');

        $project->update(['spent' => (float) ($approvedSpent + $reportCosts)]);
    }

    // ─── Guards ───────────────────────────────────────────────────────────────

    private function requireStatus(string $current, array $allowed, string $action): void
    {
        if (!in_array($current, $allowed)) {
            $allowedStr = implode(', ', $allowed);
            throw new InvalidArgumentException(
                "Action '{$action}' requires status in [{$allowedStr}], current is '{$current}'."
            );
        }
    }

    private function requireDepartment(User $actor, array $allowed, string $action): void
    {
        if (!in_array($actor->department, $allowed)) {
            throw new InvalidArgumentException(
                "Action '{$action}' is not allowed for department '{$actor->department->value}'.",
            );
        }
    }

    private function requireProjectMember(Project $project, User $actor, string $action): void
    {
        $teamIds = array_map(static fn ($id) => (string) $id, $project->team_ids ?? []);
        $actorId = (string) $actor->id;
        $isManager = (string) ($project->manager_id ?? '') === $actorId;
        $isTeamMember = in_array($actorId, $teamIds, true);

        if (!$isManager && !$isTeamMember) {
            throw new InvalidArgumentException(
                "Action '{$action}' is only allowed for users assigned to this project.",
            );
        }
    }

    private function requireProjectCompletion(Project $project, string $action): void
    {
        $avgProgress = (float) (Task::where('project_id', $project->id)->avg('progress') ?? 0);
        $hasTasks = Task::where('project_id', $project->id)->exists();

        if (!$hasTasks || $avgProgress < 100) {
            throw new InvalidArgumentException(
                "Action '{$action}' requires project progress to be 100%.",
            );
        }
    }
}
