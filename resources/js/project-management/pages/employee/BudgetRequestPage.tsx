import React, { useState } from 'react';
import { PlusIcon, DollarSignIcon, EditIcon, TrashIcon } from 'lucide-react';
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
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);
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
      <div className="grid grid-cols-3 gap-4">
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
    </div>);

}