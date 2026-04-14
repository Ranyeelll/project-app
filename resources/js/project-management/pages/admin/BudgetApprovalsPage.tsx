import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import {
  CheckIcon,
  XIcon,
  DollarSignIcon,
  ClockIcon,
  FilterIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  AlertTriangleIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { useAuth } from '../../context/AppContext';
import { BudgetRequest } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { isSuperadmin, isSupervisor } from '../../utils/roles';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export function BudgetApprovalsPage() {
  const { currentUser } = useAuth();
  const { budgetRequests, setBudgetRequests, projects, users, refreshBudgetRequests, refreshProjects } = useData();

  const isSuperadminUser = isSuperadmin(currentUser?.role);
  const isSupervisorUser = isSupervisor(currentUser?.role) && !isSuperadminUser;
  const isAccountingUser = currentUser?.department === 'Accounting' && !isSuperadminUser && !isSupervisorUser;
  const canManageBudget = isSuperadminUser || isSupervisorUser || isAccountingUser;
  const queueStatus = isAccountingUser
    ? 'pending'
    : (isSupervisorUser ? 'accounting_approved' : 'supervisor_approved');
  const queueLabel = isAccountingUser
    ? 'Accounting Queue'
    : (isSupervisorUser ? 'Supervisor Queue' : 'Superadmin Queue');

  const [reviewModal, setReviewModal] = useState<{
    request: BudgetRequest;
    action: 'approve' | 'reject' | 'revision';
  } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  if (!canManageBudget) {
    return (
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-6">
        <p className="text-sm dark:text-dark-text text-light-text font-medium">Access denied.</p>
        <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
          Budget approvals are limited to Accounting, Supervisor, and Superadmin.
        </p>
      </div>
    );
  }

  const visibleRequests = budgetRequests.filter((b) => b.status === queueStatus);
  const filtered = visibleRequests;
  const queueAmount = visibleRequests.reduce((s, b) => s + b.amount, 0);
  const queueProjectCount = new Set(visibleRequests.map((b) => b.projectId)).size;

  // Budget utilization helpers
  const getProjectBudgetInfo = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return { budget: 0, spent: 0, remaining: 0, pct: 0 };
    const spent = project.spent;
    const remaining = project.budget - spent;
    const pct = project.budget > 0 ? Math.round((spent / project.budget) * 100) : 0;
    return { budget: project.budget, spent, remaining, pct };
  };

  const getApprovalWarning = (req: BudgetRequest) => {
    if ((req.type || 'spending') === 'additional_budget') return null;
    const info = getProjectBudgetInfo(req.projectId);
    const afterApproval = info.spent + req.amount;
    if (info.budget <= 0) return null;
    if (afterApproval > info.budget) {
      return {
        type: 'over' as const,
        message: `Approving this will exceed the project budget by ${formatCurrency(afterApproval - info.budget)}`,
        remaining: info.remaining,
      };
    }
    if (afterApproval > info.budget * 0.9) {
      return {
        type: 'warn' as const,
        message: `This will use ${Math.round((afterApproval / info.budget) * 100)}% of the project budget`,
        remaining: info.remaining,
      };
    }
    return null;
  };
  const handleReview = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    const approveStatus = isAccountingUser
      ? 'accounting_approved'
      : (isSupervisorUser ? 'supervisor_approved' : 'approved');
    const statusMap = {
      approve: approveStatus,
      reject: 'rejected',
      revision: 'revision_requested',
    } as const;
    const newStatus = statusMap[reviewModal.action];
    try {
      const body: Record<string, any> = {
        status: newStatus,
        review_comment: reviewComment || null,
      };
      if (reviewModal.action === 'revision') {
        body.admin_remarks = reviewComment || null;
      }
      const response = await apiFetch(`/api/budget-requests/${reviewModal.request.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let message = `Failed to update request (${response.status})`;
        try {
          const payload = await response.json();
          if (payload?.message && typeof payload.message === 'string') {
            message = payload.message;
          }
        } catch {
          // Keep generic fallback when response is not JSON.
        }
        throw new Error(message);
      }
      refreshBudgetRequests();
      refreshProjects();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update budget request.';
      alert(message);
      // Fallback to local update
      setBudgetRequests((prev) =>
        prev.map((b) =>
          b.id === reviewModal.request.id
            ? {
                ...b,
                status: newStatus as any,
                reviewedAt: new Date().toISOString().split('T')[0],
                reviewComment: reviewComment || undefined,
                adminRemarks: reviewModal.action === 'revision' ? reviewComment : b.adminRemarks,
              }
            : b
        )
      );
    } finally {
      setSubmitting(false);
    }
    setReviewModal(null);
    setReviewComment('');
  };
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);
  if (isLoading) return <LoadingSpinner message="Loading data..." />;
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            {queueLabel}
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {visibleRequests.length}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            Requests in current stage
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Queue Amount
          </div>
          <div className="text-xl font-bold text-blue-400">
            {formatCurrency(queueAmount)}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            Total at this stage
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Projects Impacted
          </div>
          <div className="text-xl font-bold text-green-primary">
            {queueProjectCount}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            Distinct projects
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Next Step
          </div>
          <div className="text-sm font-semibold text-purple-400">
            {isAccountingUser ? 'Supervisor Review' : isSupervisorUser ? 'Superadmin Review' : 'Final Approval'}
          </div>
        </div>
      </div>

      {/* Project Budget Overview */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
        <h3 className="text-xs font-semibold dark:text-dark-muted text-light-muted mb-3 uppercase tracking-wider">
          Budget Utilization by Project
        </h3>
        <div className="space-y-3">
          {projects.filter((p) => p.status !== 'archived').map((project) => {
            const info = getProjectBudgetInfo(project.id);
            if (info.budget <= 0) return null;
            const isOver = info.pct > 100;
            const isHigh = info.pct > 90 && info.pct <= 100;
            return (
              <div key={project.id} className="flex items-center gap-3">
                <div className="w-36 flex-shrink-0">
                  <p className="text-xs font-medium dark:text-dark-text text-light-text truncate">{project.name}</p>
                </div>
                <div className="flex-1">
                  <div className="w-full h-2 rounded-full dark:bg-dark-card2 bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-green-primary'
                      }`}
                      style={{ width: `${Math.min(info.pct, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-40 flex-shrink-0 text-right">
                  <span className={`text-xs font-semibold ${isOver ? 'text-red-400' : isHigh ? 'text-amber-400' : 'dark:text-dark-text text-light-text'}`}>
                    {formatCurrency(info.spent)}
                  </span>
                  <span className="text-xs dark:text-dark-subtle text-light-subtle"> / {formatCurrency(info.budget)}</span>
                  {isOver && (
                    <span className="text-[10px] text-red-400 ml-1">({info.pct}%)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Queue indicator */}
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-primary text-black"
          disabled
        >
          {queueLabel}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((req) => {
          const project = projects.find((p) => p.id === req.projectId);
          const requester = users.find((u) => u.id === req.requestedBy);
          return (
            <div
              key={req.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                      <DollarSignIcon
                        size={15}
                        className="text-green-primary" />

                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold dark:text-dark-text text-light-text">
                          {formatCurrency(req.amount)}
                        </span>
                        <StatusBadge status={req.status} />
                        {req.type === 'additional_budget' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">
                            Additional Budget
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/15 dark:text-dark-muted text-light-muted font-medium">
                            Spending
                          </span>
                        )}
                      </div>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle">
                        {project?.name} · Requested by {requester?.name}
                      </p>
                    </div>
                  </div>
                  {/* Budget warning */}
                  {req.status === queueStatus && (() => {
                    const info = getProjectBudgetInfo(req.projectId);

                    // Additional budget requests don't need overage warnings
                    if (req.type === 'additional_budget') {
                      return info.budget > 0 ? (
                        <div className="mt-2 text-[10px] text-blue-400">
                          Will add {formatCurrency(req.amount)} to project budget (currently {formatCurrency(info.budget)})
                        </div>
                      ) : null;
                    }

                    const warning = getApprovalWarning(req);
                    return warning ? (
                      <div className={`mt-2 px-3 py-2 rounded-lg border flex items-start gap-2 ${
                        warning.type === 'over'
                          ? 'dark:bg-red-500/5 bg-red-50 dark:border-red-500/20 border-red-200'
                          : 'dark:bg-amber-500/5 bg-amber-50 dark:border-amber-500/20 border-amber-200'
                      }`}>
                        <AlertTriangleIcon size={13} className={`mt-0.5 flex-shrink-0 ${warning.type === 'over' ? 'text-red-400' : 'text-amber-500'}`} />
                        <div>
                          <p className={`text-xs font-medium ${warning.type === 'over' ? 'text-red-400' : 'text-amber-500'}`}>
                            {warning.message}
                          </p>
                          <p className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">
                            Project budget: {formatCurrency(info.budget)} · Spent: {formatCurrency(info.spent)} · Remaining: {formatCurrency(Math.max(info.remaining, 0))}
                          </p>
                        </div>
                      </div>
                    ) : info.budget > 0 ? (
                      <div className="mt-2 text-[10px] dark:text-dark-subtle text-light-subtle">
                        Remaining budget: {formatCurrency(info.remaining)} of {formatCurrency(info.budget)}
                      </div>
                    ) : null;
                  })()}
                  <p className="text-sm dark:text-dark-muted text-light-muted">
                    {req.purpose}
                  </p>
                  {/* Revision info */}
                  {req.originalAmount && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs dark:text-dark-subtle text-light-subtle line-through">
                        {formatCurrency(req.originalAmount)}
                      </span>
                      <span className="text-xs text-green-primary font-medium">→ {formatCurrency(req.amount)}</span>
                      {(req.revisionCount ?? 0) > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">
                          Revised {req.revisionCount}×
                        </span>
                      )}
                    </div>
                  )}
                  {req.adminRemarks &&
                  <div className="mt-2 px-3 py-2 dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-200 rounded-lg">
                      <p className="text-xs font-medium text-amber-500">
                        Admin Remarks:
                      </p>
                      <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
                        {req.adminRemarks}
                      </p>
                    </div>
                  }
                  {req.reviewComment &&
                  <div className="mt-3 px-3 py-2 dark:bg-dark-card2 bg-light-card2 rounded-lg">
                      <p className="text-xs dark:text-dark-subtle text-light-subtle">
                        Review comment:
                      </p>
                      <p className="text-sm dark:text-dark-muted text-light-muted mt-0.5">
                        {req.reviewComment}
                      </p>
                    </div>
                  }
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs dark:text-dark-subtle text-light-subtle">
                    {req.createdAt}
                  </span>
                  {req.status === queueStatus &&
                  <div className="flex gap-2">
                      <Button
                      variant="danger"
                      size="sm"
                      icon={<XIcon size={12} />}
                      onClick={() => {
                        setReviewModal({
                          request: req,
                          action: 'reject'
                        });
                        setReviewComment('');
                      }}>

                        Reject
                      </Button>
                      <Button
                      variant="secondary"
                      size="sm"
                      icon={<MessageSquareIcon size={12} />}
                      onClick={() => {
                        setReviewModal({
                          request: req,
                          action: 'revision'
                        });
                        setReviewComment('');
                      }}>

                        Request Revision
                      </Button>
                      <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckIcon size={12} />}
                      onClick={() => {
                        setReviewModal({
                          request: req,
                          action: 'approve'
                        });
                        setReviewComment('');
                      }}>

                        Approve
                      </Button>
                    </div>
                  }
                </div>
              </div>
            </div>);

        })}

        {filtered.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <DollarSignIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No requests in your queue</p>
          </div>
        }
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={
        reviewModal?.action === 'approve' ?
        (isAccountingUser ? 'Forward to Supervisor' : isSupervisorUser ? 'Forward to Superadmin' : 'Final Approval') :
        reviewModal?.action === 'revision' ?
        'Request Revision' :
        'Reject Budget Request'
        }
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setReviewModal(null)}>
              Cancel
            </Button>
            <Button
            variant={reviewModal?.action === 'approve' ? 'primary' : reviewModal?.action === 'revision' ? 'secondary' : 'danger'}
            onClick={handleReview}
            disabled={submitting || (reviewModal?.action === 'revision' && !reviewComment.trim())}>

              {reviewModal?.action === 'approve' ?
            (isAccountingUser ? 'Confirm and Forward' : isSupervisorUser ? 'Confirm and Escalate' : 'Confirm Final Approval') :
            reviewModal?.action === 'revision' ?
            'Send Revision Request' :
            'Confirm Rejection'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          {reviewModal &&
          <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
              <p className="text-sm font-medium dark:text-dark-text text-light-text">
                {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'PHP'
              }).format(reviewModal.request.amount)}
                {reviewModal.request.type === 'additional_budget' && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">
                    Additional Budget
                  </span>
                )}
              </p>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                {reviewModal.request.purpose}
              </p>
              {reviewModal.action === 'approve' && reviewModal.request.type === 'additional_budget' && (
                <p className="text-xs text-blue-400 mt-2">
                  This will add {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(reviewModal.request.amount)} to the project's total budget.
                </p>
              )}
              {reviewModal.action === 'revision' && (
                <p className="text-xs text-amber-400 mt-2">
                  The employee will be able to revise and resubmit this request.
                </p>
              )}
            </div>
          }
          {/* Budget overage warning in modal */}
          {reviewModal?.action === 'approve' && (() => {
            const project = projects.find((p) => p.id === reviewModal.request.projectId);
            const info = getProjectBudgetInfo(reviewModal.request.projectId);

            // Additional budget requests increase budget, so no overage warning needed
            if (reviewModal.request.type === 'additional_budget') {
              return (
                <div className="px-3 py-2.5 rounded-lg border dark:bg-blue-500/5 bg-blue-50 dark:border-blue-500/20 border-blue-200">
                  <p className="text-xs dark:text-dark-muted text-light-muted">
                    <span className="font-medium">{project?.name}</span>: Current budget {formatCurrency(info.budget)}
                  </p>
                  <p className="text-xs text-blue-400 mt-0.5">
                    After approval: {formatCurrency(info.budget + reviewModal.request.amount)} total budget
                  </p>
                </div>
              );
            }

            const warning = getApprovalWarning(reviewModal.request);
            return (
              <div className={`px-3 py-2.5 rounded-lg border ${
                warning?.type === 'over'
                  ? 'dark:bg-red-500/10 bg-red-50 dark:border-red-500/30 border-red-200'
                  : warning?.type === 'warn'
                  ? 'dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/30 border-amber-200'
                  : 'dark:bg-green-primary/5 bg-green-50 dark:border-green-primary/20 border-green-200'
              }`}>
                {warning?.type === 'over' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangleIcon size={13} className="text-red-400" />
                    <p className="text-xs font-semibold text-red-400">Budget Overage Warning</p>
                  </div>
                )}
                {warning?.type === 'warn' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangleIcon size={13} className="text-amber-500" />
                    <p className="text-xs font-semibold text-amber-500">Approaching budget limit</p>
                  </div>
                )}
                <p className="text-xs dark:text-dark-muted text-light-muted">
                  <span className="font-medium">{project?.name}</span>: {formatCurrency(info.spent)} spent of {formatCurrency(info.budget)} budget
                </p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                  After approval: {formatCurrency(info.spent + reviewModal.request.amount)} ({Math.round(((info.spent + reviewModal.request.amount) / (info.budget || 1)) * 100)}%)
                </p>
              </div>
            );
          })()}
          <Textarea
            label={
            reviewModal?.action === 'reject' ?
            'Rejection Reason (required)' :
            reviewModal?.action === 'revision' ?
            'Remarks / Question (required)' :
            'Comment (optional)'
            }
            placeholder={
            reviewModal?.action === 'reject' ?
            'Explain why this request is rejected...' :
            reviewModal?.action === 'revision' ?
            'e.g. Why ₱2,500? Can it be reduced to ₱2,000?' :
            'Add a note for the requester...'
            }
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={3} />

        </div>
      </Modal>
    </div>);

}