<?php

namespace App\Enums;

/**
 * Standardized approval statuses shared across projects, budgets, tasks, and forms.
 *
 * Canonical flow:
 *   draft → technical_review → accounting_review → supervisor_review → superadmin_review → approved
 *   At any review stage: → revision_requested | rejected
 *   From revision_requested: → (resubmit to first review stage)
 *
 * Not all entities use every status:
 *   Projects:  all statuses (full multi-stage pipeline)
 *   Budgets:   pending → accounting_approved → supervisor_approved → approved | rejected | revision_requested
 *   Tasks:     none | pending | approved | rejected | revision_requested (completion reports)
 *   Forms:     submitted → reviewed → approved | rejected | revision_requested
 */
enum ApprovalStatus: string
{
    // Initial / pre-submission
    case DRAFT = 'draft';

    // Multi-stage review pipeline (primarily for projects)
    case TECHNICAL_REVIEW = 'technical_review';
    case ACCOUNTING_REVIEW = 'accounting_review';
    case SUPERVISOR_REVIEW = 'supervisor_review';
    case SUPERADMIN_REVIEW = 'superadmin_review';

    // Staged budget approvals (mapped to review stages)
    case PENDING = 'pending';
    case ACCOUNTING_APPROVED = 'accounting_approved';
    case SUPERVISOR_APPROVED = 'supervisor_approved';

    // Form-specific
    case SUBMITTED = 'submitted';
    case REVIEWED = 'reviewed';

    // Terminal / shared
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case REVISION_REQUESTED = 'revision_requested';

    // Task completion report (no review needed)
    case NONE = 'none';

    /**
     * Statuses valid for project approval_status column.
     */
    public static function projectStatuses(): array
    {
        return [
            self::DRAFT,
            self::TECHNICAL_REVIEW,
            self::ACCOUNTING_REVIEW,
            self::SUPERVISOR_REVIEW,
            self::SUPERADMIN_REVIEW,
            self::APPROVED,
            self::REJECTED,
            self::REVISION_REQUESTED,
        ];
    }

    /**
     * Statuses valid for budget request status column.
     */
    public static function budgetStatuses(): array
    {
        return [
            self::PENDING,
            self::ACCOUNTING_APPROVED,
            self::SUPERVISOR_APPROVED,
            self::APPROVED,
            self::REJECTED,
            self::REVISION_REQUESTED,
        ];
    }

    /**
     * Statuses valid for task completion_report_status column.
     */
    public static function taskCompletionStatuses(): array
    {
        return [
            self::NONE,
            self::PENDING,
            self::APPROVED,
            self::REJECTED,
            self::REVISION_REQUESTED,
        ];
    }

    /**
     * Statuses valid for form submission status column.
     */
    public static function formStatuses(): array
    {
        return [
            self::SUBMITTED,
            self::REVIEWED,
            self::APPROVED,
            self::REJECTED,
            self::REVISION_REQUESTED,
        ];
    }

    /**
     * Get string values from an array of enum cases.
     */
    public static function values(array $cases = null): array
    {
        $cases = $cases ?? self::cases();
        return array_map(fn (self $c) => $c->value, $cases);
    }

    /**
     * Whether this status represents a terminal (final) state.
     */
    public function isTerminal(): bool
    {
        return in_array($this, [self::APPROVED, self::REJECTED]);
    }

    /**
     * Whether this status is pending some form of review.
     */
    public function isPendingReview(): bool
    {
        return in_array($this, [
            self::PENDING,
            self::SUBMITTED,
            self::TECHNICAL_REVIEW,
            self::ACCOUNTING_REVIEW,
            self::SUPERVISOR_REVIEW,
            self::SUPERADMIN_REVIEW,
            self::ACCOUNTING_APPROVED,
            self::SUPERVISOR_APPROVED,
        ]);
    }

    /**
     * Human-readable label.
     */
    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Draft',
            self::TECHNICAL_REVIEW => 'Technical Review',
            self::ACCOUNTING_REVIEW => 'Accounting Review',
            self::SUPERVISOR_REVIEW => 'Supervisor Review',
            self::SUPERADMIN_REVIEW => 'Superadmin Review',
            self::PENDING => 'Pending',
            self::ACCOUNTING_APPROVED => 'Accounting Approved',
            self::SUPERVISOR_APPROVED => 'Supervisor Approved',
            self::SUBMITTED => 'Submitted',
            self::REVIEWED => 'Reviewed',
            self::APPROVED => 'Approved',
            self::REJECTED => 'Rejected',
            self::REVISION_REQUESTED => 'Revision Requested',
            self::NONE => 'None',
        };
    }
}
