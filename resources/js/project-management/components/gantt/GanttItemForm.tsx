import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { VisibilityEditor } from './VisibilityEditor';
import { GanttItem, GanttItemType, User } from '../../data/mockData';

interface GanttItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<GanttItem>) => Promise<void>;
  editItem?: GanttItem | null;
  parentItem?: GanttItem | null;
  projectTeam: User[];
  isAdmin: boolean;
}

function allowedTypes(parentItem?: GanttItem | null): GanttItemType[] {
  if (!parentItem) return ['phase'];
  if (parentItem.type === 'phase') return ['step'];
  if (parentItem.type === 'step') return ['subtask', 'milestone'];
  if (parentItem.type === 'subtask') return ['milestone'];
  return ['milestone'];
}

export function GanttItemForm({
  isOpen,
  onClose,
  onSave,
  editItem,
  parentItem,
  projectTeam,
  isAdmin,
}: GanttItemFormProps) {
  const types = editItem ? [editItem.type] : allowedTypes(parentItem);

  const [form, setForm] = useState({
    type: (editItem?.type || types[0]) as GanttItemType,
    name: editItem?.name || '',
    description: editItem?.description || '',
    startDate: editItem?.startDate || '',
    endDate: editItem?.endDate || '',
    progress: editItem?.progress ?? 0,
    assigneeIds: editItem?.assigneeIds ?? [],
    visibleToRoles: editItem?.visibleToRoles ?? [],
    visibleToUsers: editItem?.visibleToUsers ?? [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm({
        type: (editItem?.type || types[0]) as GanttItemType,
        name: editItem?.name || '',
        description: editItem?.description || '',
        startDate: editItem?.startDate || '',
        endDate: editItem?.endDate || '',
        progress: editItem?.progress ?? 0,
        assigneeIds: editItem?.assigneeIds ?? [],
        visibleToRoles: editItem?.visibleToRoles ?? [],
        visibleToUsers: editItem?.visibleToUsers ?? [],
      });
      setError('');
    }
  }, [isOpen, editItem]);

  const isMilestone = form.type === 'milestone';

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.startDate) {
      setError(isMilestone ? 'Date is required for milestone.' : 'Start date is required.');
      return;
    }
    if (!isMilestone && !form.endDate) {
      setError('End date is required.');
      return;
    }
    if (!isMilestone && form.endDate < form.startDate) {
      setError('End date must be the same as or after start date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({
        ...form,
        endDate: isMilestone ? form.startDate : form.endDate,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((a) => a !== id)
        : [...f.assigneeIds, id],
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Gantt Item' : 'Add Gantt Item'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>
            {editItem ? 'Save Changes' : 'Create Item'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Type */}
        {types.length > 1 && (
          <div>
            <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Type</label>
            <div className="flex gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-all ${
                    form.type === t
                      ? 'bg-green-primary text-black'
                      : 'dark:bg-dark-card2 dark:border dark:border-dark-border dark:text-dark-muted bg-gray-100 border border-light-border text-light-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Enter item name..."
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Optional description..."
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
              {isMilestone ? 'Date' : 'Start Date'}
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
            />
          </div>
          {!isMilestone && (
            <div>
              <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
              />
            </div>
          )}
        </div>

        {/* Progress */}
        {!isMilestone && (
          <div>
            <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
              Progress: {form.progress}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
              className="w-full accent-green-500"
            />
          </div>
        )}

        {/* Assignees */}
        {projectTeam.length > 0 && (
          <div>
            <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Assignees</label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {projectTeam.map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.assigneeIds.includes(u.id)}
                    onChange={() => toggleAssignee(u.id)}
                    className="w-3.5 h-3.5 rounded accent-green-500"
                  />
                  <span className="text-xs dark:text-dark-muted text-light-muted">{u.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Visibility (Admin only) */}
        {isAdmin && (
          <div className="pt-2 border-t dark:border-dark-border border-light-border">
            <p className="text-xs font-semibold dark:text-dark-text text-light-text mb-2">Visibility Control</p>
            <VisibilityEditor
              visibleToRoles={form.visibleToRoles}
              visibleToUsers={form.visibleToUsers}
              teamUsers={projectTeam}
              onChange={(roles, users) => setForm((f) => ({ ...f, visibleToRoles: roles, visibleToUsers: users }))}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
