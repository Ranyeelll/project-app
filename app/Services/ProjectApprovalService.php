<?php

namespace App\Services;

use App\Enums\Department;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ProjectApprovalUpdate;
use InvalidArgumentException;

/**
 * Project Approval Service: Manages the project approval state machine.
 * Transitions: draft → technical_review → accounting_review (admin review) → approved/rejected/revision_requested
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
            'submit_for_review'   => $this->submitForReview($project, $actor, $current),
            'finish_project'      => $this->finishProject($project, $actor, $current),
            'approve_technical'   => $this->approveTechnical($project, $actor, $current),
            'approve_accounting'  => $this->approveAccounting($project, $actor, $current),
            'approve_supervisor'  => $this->approveSupervisor($project, $actor, $current),
            'approve_superadmin'  => $this->approveSuperadmin($project, $actor, $current, $notes),
            'approve_final'       => $this->approveSuperadmin($project, $actor, $current, $notes), // backwards compat
            'request_revision'    => $this->requestRevision($project, $actor, $current, $notes),
            'reject'              => $this->reject($project, $actor, $current, $notes),
            'resubmit'            => $this->resubmit($project, $actor, $current),
            default               => throw new InvalidArgumentException("Unknown approval action: {$action}"),
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

    private function finishProject(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, [
            'draft',
            'technical_review',
            'accounting_review',
            'supervisor_review',
            'superadmin_review',
            'approved',
            'rejected',
            'revision_requested',
        ], 'finish_project');
        $this->requireProjectMemberOrElevated($project, $actor, 'finish_project');
        $this->requireProjectCompletion($project, 'finish_project');

        $project->update([
            'status'           => 'completed',
            'approval_status'  => $current === 'approved' ? 'approved' : 'supervisor_review',
            'submitted_by'     => $actor->id,
            'approval_notes'   => null,
        ]);

        $message = sprintf(
            'Project "%s" was marked as completed by %s and is awaiting final approval.',
            $project->name,
            $actor->name
        );
        $this->notifySupervisorAndSuperadmin($project, $message, 'Project marked as completed');

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

    private function approveAccounting(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, ['accounting_review'], 'approve_accounting');
        $this->requireDepartment($actor, [Department::Accounting, Department::Admin], 'approve_accounting');

        $project->update([
            'approval_status'  => 'supervisor_review',
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        return $project->fresh();
    }

    private function approveSupervisor(Project $project, User $actor, string $current): Project
    {
        $this->requireStatus($current, ['supervisor_review'], 'approve_supervisor');
        if (!$actor->isSupervisor() && !$actor->isAdmin()) {
            throw new InvalidArgumentException("Action 'approve_supervisor' is only allowed for supervisor or admin.");
        }

        $project->update([
            'approval_status'  => 'superadmin_review',
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        return $project->fresh();
    }

    private function approveSuperadmin(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['superadmin_review', 'accounting_review', 'supervisor_review'], 'approve_superadmin');
        if (!$actor->isAdmin()) {
            throw new InvalidArgumentException("Action 'approve_superadmin' is only allowed for superadmin/admin.");
        }

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

    private function approveFinal(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['accounting_review'], 'approve_final');
        $this->requireFinalApproverRole($actor, 'approve_final');

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
        $this->requireStatus($current, ['technical_review', 'accounting_review', 'supervisor_review', 'superadmin_review'], 'request_revision');

        if ($current === 'technical_review') {
            $this->requireDepartment($actor, [Department::Technical, Department::Admin], 'request_revision');
        } else {
            $this->requireFinalApproverRole($actor, 'request_revision');
        }

        $project->update([
            'approval_status'  => 'revision_requested',
            'approval_notes'   => $notes,
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        // If this revision request comes after accounting approved, notify accounting and submitter
        if (in_array($current, ['supervisor_review', 'superadmin_review'], true)) {
            $msg = "A higher-level reviewer requested revisions after accounting approval.";
            $this->notifyAccountingAndSubmitter($project, $msg, 'Revision requested on project');
        }

        return $project->fresh();
    }

    private function reject(Project $project, User $actor, string $current, ?string $notes): Project
    {
        $this->requireStatus($current, ['technical_review', 'accounting_review', 'supervisor_review', 'superadmin_review'], 'reject');

        if ($current === 'technical_review') {
            $this->requireDepartment($actor, [Department::Technical, Department::Admin], 'reject');
        } else {
            $this->requireFinalApproverRole($actor, 'reject');
        }

        $project->update([
            'approval_status'  => 'rejected',
            'approval_notes'   => $notes,
            'reviewed_by'      => $actor->id,
            'last_reviewed_at' => now(),
        ]);

        // If rejection occurs after accounting approved, notify accounting and submitter
        if (in_array($current, ['supervisor_review', 'superadmin_review'], true)) {
            $msg = "A higher-level reviewer rejected the project after accounting approval.";
            $this->notifyAccountingAndSubmitter($project, $msg, 'Project rejected by reviewer');
        }

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

    /**
     * Notify accounting department users and the submitting employee about an approval event.
     */
    private function notifyAccountingAndSubmitter(Project $project, string $message, string $subject = 'Project approval update'): void
    {
        try {
            $accountingUsers = User::where('department', Department::Accounting->value)->get();
            $payload = [
                'project_id' => $project->id,
                'message'    => $message,
                'subject'    => $subject,
                'url'        => url('/projects/'.$project->id),
            ];

            foreach ($accountingUsers as $u) {
                Notification::send($u, new ProjectApprovalUpdate($payload));
            }

            if ($project->submitted_by) {
                $submitter = User::find($project->submitted_by);
                if ($submitter) {
                    Notification::send($submitter, new ProjectApprovalUpdate($payload));
                }
            }
        } catch (\Throwable $e) {
            // swallow notification errors to avoid blocking approval flow; auditing will capture events
        }
    }

    private function notifySupervisorAndSuperadmin(Project $project, string $message, string $subject = 'Project approval update'): void
    {
        try {
            $recipients = User::query()
                ->get()
                ->filter(static function (User $user): bool {
                    $role = strtolower(trim((string) ($user->role ?? '')));
                    // Include legacy "admin" role aliases as superadmin-equivalent recipients.
                    return in_array($role, ['supervisor', 'superadmin', 'admin'], true);
                })
                ->values();

            $payload = [
                'project_id' => $project->id,
                'message'    => $message,
                'subject'    => $subject,
                'url'        => url('/admin-monitor'),
            ];

            foreach ($recipients as $user) {
                Notification::send($user, new ProjectApprovalUpdate($payload));
            }
        } catch (\Throwable $e) {
            // Never block state transitions because notification delivery failed.
        }
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

    private function requireFinalApproverRole(User $actor, string $action): void
    {
        if (!$actor->isSupervisor() && !$actor->isAdmin()) {
            throw new InvalidArgumentException(
                "Action '{$action}' is only allowed for supervisor or superadmin.",
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

    private function requireProjectMemberOrElevated(Project $project, User $actor, string $action): void
    {
        if ($actor->isAdmin() || $actor->isSupervisor()) {
            return;
        }

        $this->requireProjectMember($project, $actor, $action);
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
