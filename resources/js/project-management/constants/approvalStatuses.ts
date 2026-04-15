/**
 * Standardized approval statuses shared across projects, budgets, tasks, and forms.
 * Must match the backend App\Enums\ApprovalStatus enum.
 */

export const APPROVAL_STATUS = {
  // Initial
  DRAFT: 'draft',
  
  // Multi-stage review pipeline (projects)
  TECHNICAL_REVIEW: 'technical_review',
  ACCOUNTING_REVIEW: 'accounting_review',
  SUPERVISOR_REVIEW: 'supervisor_review',
  SUPERADMIN_REVIEW: 'superadmin_review',
  
  // Staged budget approvals
  PENDING: 'pending',
  ACCOUNTING_APPROVED: 'accounting_approved',
  SUPERVISOR_APPROVED: 'supervisor_approved',
  
  // Form-specific
  SUBMITTED: 'submitted',
  REVIEWED: 'reviewed',
  
  // Terminal / shared
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_REQUESTED: 'revision_requested',
  
  // Task completion report
  NONE: 'none',
} as const;

export type ApprovalStatusValue = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];

/** Statuses valid for project approval_status */
export const PROJECT_STATUSES: ApprovalStatusValue[] = [
  APPROVAL_STATUS.DRAFT,
  APPROVAL_STATUS.TECHNICAL_REVIEW,
  APPROVAL_STATUS.ACCOUNTING_REVIEW,
  APPROVAL_STATUS.SUPERVISOR_REVIEW,
  APPROVAL_STATUS.SUPERADMIN_REVIEW,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
  APPROVAL_STATUS.REVISION_REQUESTED,
];

/** Statuses valid for budget request status */
export const BUDGET_STATUSES: ApprovalStatusValue[] = [
  APPROVAL_STATUS.PENDING,
  APPROVAL_STATUS.ACCOUNTING_APPROVED,
  APPROVAL_STATUS.SUPERVISOR_APPROVED,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
  APPROVAL_STATUS.REVISION_REQUESTED,
];

/** Statuses valid for task completion_report_status */
export const TASK_COMPLETION_STATUSES: ApprovalStatusValue[] = [
  APPROVAL_STATUS.NONE,
  APPROVAL_STATUS.PENDING,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
  APPROVAL_STATUS.REVISION_REQUESTED,
];

/** Statuses valid for form submission status */
export const FORM_STATUSES: ApprovalStatusValue[] = [
  APPROVAL_STATUS.SUBMITTED,
  APPROVAL_STATUS.REVIEWED,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
  APPROVAL_STATUS.REVISION_REQUESTED,
];

/** Human-readable labels */
export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  [APPROVAL_STATUS.DRAFT]: 'Draft',
  [APPROVAL_STATUS.TECHNICAL_REVIEW]: 'Technical Review',
  [APPROVAL_STATUS.ACCOUNTING_REVIEW]: 'Accounting Review',
  [APPROVAL_STATUS.SUPERVISOR_REVIEW]: 'Supervisor Review',
  [APPROVAL_STATUS.SUPERADMIN_REVIEW]: 'Superadmin Review',
  [APPROVAL_STATUS.PENDING]: 'Pending',
  [APPROVAL_STATUS.ACCOUNTING_APPROVED]: 'Accounting Approved',
  [APPROVAL_STATUS.SUPERVISOR_APPROVED]: 'Supervisor Approved',
  [APPROVAL_STATUS.SUBMITTED]: 'Submitted',
  [APPROVAL_STATUS.REVIEWED]: 'Reviewed',
  [APPROVAL_STATUS.APPROVED]: 'Approved',
  [APPROVAL_STATUS.REJECTED]: 'Rejected',
  [APPROVAL_STATUS.REVISION_REQUESTED]: 'Revision Requested',
  [APPROVAL_STATUS.NONE]: 'None',
};

/** Check if a status is terminal (approved or rejected) */
export function isTerminalStatus(status: string): boolean {
  return status === APPROVAL_STATUS.APPROVED || status === APPROVAL_STATUS.REJECTED;
}

/** Check if a status is pending some form of review */
export function isPendingReview(status: string): boolean {
  return ([
    APPROVAL_STATUS.PENDING,
    APPROVAL_STATUS.SUBMITTED,
    APPROVAL_STATUS.TECHNICAL_REVIEW,
    APPROVAL_STATUS.ACCOUNTING_REVIEW,
    APPROVAL_STATUS.SUPERVISOR_REVIEW,
    APPROVAL_STATUS.SUPERADMIN_REVIEW,
    APPROVAL_STATUS.ACCOUNTING_APPROVED,
    APPROVAL_STATUS.SUPERVISOR_APPROVED,
  ] as string[]).includes(status);
}
