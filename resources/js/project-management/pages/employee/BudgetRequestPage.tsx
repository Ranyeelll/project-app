import React, { useState } from 'react';
import { PlusIcon, DollarSignIcon, EditIcon, TrashIcon, RotateCcwIcon, MessageSquareIcon, InfoIcon } from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { BudgetRequest } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
export function BudgetRequestPage() {
  const { budgetRequests, setBudgetRequests, projects, refreshBudgetRequests } = useData();
  const { currentUser } = useAuth();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<BudgetRequest | null>(null);
  const [reviseModal, setReviseModal] = useState<BudgetRequest | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id || '',
    amount: '',
    purpose: ''
  });
  const myRequests = budgetRequests.filter(
    (b) => b.requestedBy === currentUser?.id
  );
  const handleCreate = async () => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/budget-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          project_id: form.projectId,
          requested_by: currentUser?.id || '',
          amount: Number(form.amount),
          purpose: form.purpose,
        }),
      });
      if (res.ok) {
        refreshBudgetRequests();
      }
    } catch { /* ignore */ }
    setCreateModal(false);
    setForm({
      projectId: projects[0]?.id || '',
      amount: '',
      purpose: ''
    });
  };
  const handleEdit = async () => {
    if (!editModal) return;
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`/api/budget-requests/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          project_id: form.projectId,
          amount: Number(form.amount),
          purpose: form.purpose,
        }),
      });
      if (res.ok) {
        refreshBudgetRequests();
      }
    } catch { /* ignore */ }
    setEditModal(null);
  };
  const openEdit = (req: BudgetRequest) => {
    setEditModal(req);
    setForm({
      projectId: req.projectId,
      amount: String(req.amount),
      purpose: req.purpose
    });
  };
  const handleDelete = async (id: string) => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`/api/budget-requests/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      });
      if (res.ok) {
        refreshBudgetRequests();
      }
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };
  const openRevise = (req: BudgetRequest) => {
    setReviseModal(req);
    setForm({
      projectId: req.projectId,
      amount: String(req.amount),
      purpose: req.purpose
    });
  };
  const handleRevise = async () => {
    if (!reviseModal) return;
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`/api/budget-requests/${reviseModal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          amount: Number(form.amount),
          purpose: form.purpose,
          status: 'pending',
        }),
      });
      if (res.ok) {
        refreshBudgetRequests();
      }
    } catch { /* ignore */ }
    setReviseModal(null);
    setForm({
      projectId: projects[0]?.id || '',
      amount: '',
      purpose: ''
    });
  };
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);

  // Budget info for selected project
  const getProjectBudgetInfo = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;
    const spent = budgetRequests
      .filter((b) => b.projectId === projectId && b.status === 'approved')
      .reduce((s, b) => s + b.amount, 0);
    const pending = budgetRequests
      .filter((b) => b.projectId === projectId && b.status === 'pending')
      .reduce((s, b) => s + b.amount, 0);
    const remaining = project.budget - spent;
    const pct = project.budget > 0 ? Math.round((spent / project.budget) * 100) : 0;
    return { budget: project.budget, spent, pending, remaining, pct, name: project.name };
  };

  const selectedBudgetInfo = getProjectBudgetInfo(form.projectId);
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm dark:text-dark-muted text-light-muted">
          {myRequests.length} total requests
        </p>
        <Button
          variant="primary"
          icon={<PlusIcon size={14} />}
          onClick={() => {
            setForm({
              projectId: projects[0]?.id || '',
              amount: '',
              purpose: ''
            });
            setCreateModal(true);
          }}>

          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xl font-bold text-yellow-400">
            {myRequests.filter((b) => b.status === 'pending').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Pending
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle">
            {formatCurrency(
              myRequests.
              filter((b) => b.status === 'pending').
              reduce((s, b) => s + b.amount, 0)
            )}
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xl font-bold text-purple-400">
            {myRequests.filter((b) => b.status === 'revision_requested').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Needs Revision
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle">
            Action needed
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xl font-bold text-green-primary">
            {myRequests.filter((b) => b.status === 'approved').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Approved
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle">
            {formatCurrency(
              myRequests.
              filter((b) => b.status === 'approved').
              reduce((s, b) => s + b.amount, 0)
            )}
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xl font-bold text-red-400">
            {myRequests.filter((b) => b.status === 'rejected').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Rejected
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {myRequests.map((req) => {
          const project = projects.find((p) => p.id === req.projectId);
          const canEdit = req.status === 'pending';
          return (
            <div
              key={req.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                    <DollarSignIcon size={16} className="text-green-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold dark:text-dark-text text-light-text">
                        {formatCurrency(req.amount)}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle mb-1">
                      {project?.name}
                    </p>
                    <p className="text-sm dark:text-dark-muted text-light-muted">
                      {req.purpose}
                    </p>
                    {/* Revision info: original amount and revision count */}
                    {req.originalAmount && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs dark:text-dark-subtle text-light-subtle">
                          Original: <span className="line-through">{formatCurrency(req.originalAmount)}</span>
                        </span>
                        {(req.revisionCount ?? 0) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">
                            Revised {req.revisionCount}×
                          </span>
                        )}
                      </div>
                    )}
                    {/* Admin remarks (revision requested) */}
                    {req.adminRemarks && (
                      <div className="mt-2 px-3 py-2 dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-200 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MessageSquareIcon size={12} className="text-amber-500" />
                          <p className="text-xs font-medium text-amber-500">
                            Admin Remarks:
                          </p>
                        </div>
                        <p className="text-xs dark:text-dark-muted text-light-muted">
                          {req.adminRemarks}
                        </p>
                      </div>
                    )}
                    {req.reviewComment &&
                    <div className="mt-2 px-3 py-2 dark:bg-dark-card2 bg-light-card2 rounded-lg">
                        <p className="text-xs dark:text-dark-subtle text-light-subtle">
                          Admin comment:
                        </p>
                        <p className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
                          {req.reviewComment}
                        </p>
                      </div>
                    }
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs dark:text-dark-subtle text-light-subtle">
                    {req.createdAt}
                  </span>
                  {canEdit &&
                  <div className="flex gap-1">
                      <button
                      onClick={() => openEdit(req)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors"
                      title="Edit">

                        <EditIcon size={13} />
                      </button>
                      <button
                      onClick={() => setDeleteConfirm(req.id)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete">

                        <TrashIcon size={13} />
                      </button>
                    </div>
                  }
                  {req.status === 'revision_requested' && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<RotateCcwIcon size={12} />}
                      onClick={() => openRevise(req)}>
                      Revise & Resubmit
                    </Button>
                  )}
                </div>
              </div>
            </div>);

        })}

        {myRequests.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <DollarSignIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No budget requests yet</p>
          </div>
        }
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="New Budget Request"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!form.amount || !form.purpose}>

              Submit Request
            </Button>
          </>
        }>

        <div className="space-y-4">
          <Select
            label="Project"
            value={form.projectId}
            onChange={(e) =>
            setForm({
              ...form,
              projectId: e.target.value
            })
            }
            options={projects.
            filter((p) => p.status === 'active').
            map((p) => ({
              value: p.id,
              label: p.name
            }))} />

          {/* Project budget info */}
          {selectedBudgetInfo && selectedBudgetInfo.budget > 0 && (
            <div className="px-3 py-2.5 rounded-lg dark:bg-dark-card2 bg-light-card2 border dark:border-dark-border border-light-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <InfoIcon size={12} className="text-green-primary" />
                <p className="text-xs font-medium dark:text-dark-text text-light-text">Project Budget</p>
              </div>
              <div className="w-full h-1.5 rounded-full dark:bg-dark-bg bg-gray-200 overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedBudgetInfo.pct > 100 ? 'bg-red-500' : selectedBudgetInfo.pct > 90 ? 'bg-amber-500' : 'bg-green-primary'
                  }`}
                  style={{ width: `${Math.min(selectedBudgetInfo.pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="dark:text-dark-subtle text-light-subtle">
                  Spent: {formatCurrency(selectedBudgetInfo.spent)} of {formatCurrency(selectedBudgetInfo.budget)}
                </span>
                <span className={`font-medium ${selectedBudgetInfo.remaining <= 0 ? 'text-red-400' : 'text-green-primary'}`}>
                  Remaining: {formatCurrency(Math.max(selectedBudgetInfo.remaining, 0))}
                </span>
              </div>
              {selectedBudgetInfo.pending > 0 && (
                <p className="text-[10px] dark:text-dark-subtle text-light-subtle mt-1">
                  {formatCurrency(selectedBudgetInfo.pending)} in pending requests
                </p>
              )}
            </div>
          )}

          <Input
            label="Amount (PHP)"
            type="number"
            placeholder="e.g. 5000"
            value={form.amount}
            onChange={(e) =>
            setForm({
              ...form,
              amount: e.target.value
            })
            }
            icon={<DollarSignIcon size={14} />} />

          <Textarea
            label="Purpose"
            placeholder="Describe what this budget will be used for..."
            value={form.purpose}
            onChange={(e) =>
            setForm({
              ...form,
              purpose: e.target.value
            })
            }
            rows={4} />

        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Budget Request"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEdit}>
              Save Changes
            </Button>
          </>
        }>

        <div className="space-y-4">
          <Select
            label="Project"
            value={form.projectId}
            onChange={(e) =>
            setForm({
              ...form,
              projectId: e.target.value
            })
            }
            options={projects.
            filter((p) => p.status === 'active').
            map((p) => ({
              value: p.id,
              label: p.name
            }))} />

          <Input
            label="Amount (PHP)"
            type="number"
            value={form.amount}
            onChange={(e) =>
            setForm({
              ...form,
              amount: e.target.value
            })
            }
            icon={<DollarSignIcon size={14} />} />

          <Textarea
            label="Purpose"
            value={form.purpose}
            onChange={(e) =>
            setForm({
              ...form,
              purpose: e.target.value
            })
            }
            rows={4} />

        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Request"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>

              Delete
            </Button>
          </>
        }>

        <p className="text-sm dark:text-dark-muted text-light-muted">
          Are you sure you want to delete this budget request?
        </p>
      </Modal>

      {/* Revise & Resubmit Modal */}
      <Modal
        isOpen={!!reviseModal}
        onClose={() => setReviseModal(null)}
        title="Revise & Resubmit"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setReviseModal(null)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleRevise}
            disabled={!form.amount || !form.purpose}>

              Resubmit Request
            </Button>
          </>
        }>

        <div className="space-y-4">
          {/* Admin remarks */}
          {reviseModal?.adminRemarks && (
            <div className="px-3 py-3 dark:bg-amber-500/5 bg-amber-50 border dark:border-amber-500/20 border-amber-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquareIcon size={12} className="text-amber-500" />
                <p className="text-xs font-semibold text-amber-500">Admin's Remarks:</p>
              </div>
              <p className="text-sm dark:text-dark-muted text-light-muted">
                {reviseModal.adminRemarks}
              </p>
            </div>
          )}

          {/* Original amount reference */}
          {reviseModal && (
            <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
              <p className="text-xs dark:text-dark-subtle text-light-subtle">
                Previous amount: <span className="font-semibold dark:text-dark-text text-light-text">{formatCurrency(reviseModal.amount)}</span>
              </p>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                {reviseModal.purpose}
              </p>
            </div>
          )}

          <Input
            label="Revised Amount (PHP)"
            type="number"
            placeholder="e.g. 2000"
            value={form.amount}
            onChange={(e) =>
            setForm({
              ...form,
              amount: e.target.value
            })
            }
            icon={<DollarSignIcon size={14} />} />

          <Textarea
            label="Updated Purpose / Justification"
            placeholder="Explain the revised budget..."
            value={form.purpose}
            onChange={(e) =>
            setForm({
              ...form,
              purpose: e.target.value
            })
            }
            rows={4} />

        </div>
      </Modal>
    </div>);

}