import React, { useState } from 'react';
import {
  CheckIcon,
  XIcon,
  DollarSignIcon,
  ClockIcon,
  FilterIcon,
  MessageSquareIcon,
  RotateCcwIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { BudgetRequest } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { Badge, StatusBadge } from '../../components/ui/Badge';
export function BudgetApprovalsPage() {
  const { budgetRequests, setBudgetRequests, projects, users, refreshBudgetRequests } = useData();
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewModal, setReviewModal] = useState<{
    request: BudgetRequest;
    action: 'approve' | 'reject' | 'revision';
  } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const filtered = budgetRequests.filter(
    (b) => statusFilter === 'all' || b.status === statusFilter
  );
  const totalPending = budgetRequests.
  filter((b) => b.status === 'pending').
  reduce((s, b) => s + b.amount, 0);
  const totalApproved = budgetRequests.
  filter((b) => b.status === 'approved').
  reduce((s, b) => s + b.amount, 0);
  const handleReview = async () => {
    if (!reviewModal) return;
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      revision: 'revision_requested',
    } as const;
    const newStatus = statusMap[reviewModal.action];
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const body: Record<string, any> = {
        status: newStatus,
        review_comment: reviewComment || null,
      };
      if (reviewModal.action === 'revision') {
        body.admin_remarks = reviewComment || null;
      }
      await fetch(`/api/budget-requests/${reviewModal.request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(body),
      });
      refreshBudgetRequests();
    } catch {
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
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Pending Requests
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {budgetRequests.filter((b) => b.status === 'pending').length}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            {formatCurrency(totalPending)} total
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Revision Requested
          </div>
          <div className="text-xl font-bold text-purple-400">
            {budgetRequests.filter((b) => b.status === 'revision_requested').length}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            Awaiting employee revision
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Approved
          </div>
          <div className="text-xl font-bold text-green-primary">
            {budgetRequests.filter((b) => b.status === 'approved').length}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            {formatCurrency(totalApproved)} total
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Rejected
          </div>
          <div className="text-xl font-bold text-red-400">
            {budgetRequests.filter((b) => b.status === 'rejected').length}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'revision_requested', 'approved', 'rejected'].map((s) =>
        <button
          key={s}
          onClick={() => setStatusFilter(s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${statusFilter === s ? 'bg-green-primary text-black' : 'dark:bg-dark-card dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text'}`}>

            {s === 'all' ? 'All' : s === 'revision_requested' ? 'Revision Requested' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        )}
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
                      </div>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle">
                        {project?.name} · Requested by {requester?.name}
                      </p>
                    </div>
                  </div>
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
                  {req.status === 'pending' &&
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
            <p className="text-sm">No budget requests found</p>
          </div>
        }
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={
        reviewModal?.action === 'approve' ?
        'Approve Budget Request' :
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
            disabled={reviewModal?.action === 'revision' && !reviewComment.trim()}>

              {reviewModal?.action === 'approve' ?
            'Confirm Approval' :
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
              </p>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                {reviewModal.request.purpose}
              </p>
              {reviewModal.action === 'revision' && (
                <p className="text-xs text-amber-400 mt-2">
                  The employee will be able to revise and resubmit this request.
                </p>
              )}
            </div>
          }
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