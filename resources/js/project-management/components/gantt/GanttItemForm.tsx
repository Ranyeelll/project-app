import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { VisibilityEditor } from './VisibilityEditor';
import { GanttItem, GanttItemType, User } from '../../data/mockData';

/** Extract YYYY-MM-DD from an ISO 8601 or date string. */
function toYmd(dateStr?: string): string {
  if (!dateStr?.trim()) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // ISO 8601 — take the date portion
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD string for display. */
function formatDate(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface GanttItemFormProps {
  isOpen: boolean;
  inline?: boolean; // render inline instead of inside Modal
  onClose: () => void;
  onSave: (data: Partial<GanttItem>) => Promise<void>;
  editItem?: GanttItem | null;
  parentItem?: GanttItem | null;
  projectTeam: User[];
  isAdmin: boolean;
  projectStartDate?: string;
  projectEndDate?: string;
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
  inline = false,
  onClose,
  onSave,
  editItem,
  parentItem,
  projectTeam,
  isAdmin,
  projectStartDate,
  projectEndDate,
}: GanttItemFormProps) {
  const types = editItem ? [editItem.type] : allowedTypes(parentItem);

  // Normalize project dates to YYYY-MM-DD for <input type="date"> min/max
  const projStart = useMemo(() => toYmd(projectStartDate), [projectStartDate]);
  const projEnd = useMemo(() => toYmd(projectEndDate), [projectEndDate]);

  const makeDefaults = (): Partial<GanttItem> => ({
    type: (editItem?.type || types[0]) as GanttItemType,
    name: editItem?.name || '',
    description: editItem?.description || '',
    startDate: editItem?.startDate || projStart,
    endDate: editItem?.endDate || projEnd,
    progress: editItem?.progress ?? 0,
    assigneeIds: editItem?.assigneeIds ?? [],
    visibleToRoles: editItem?.visibleToRoles ?? [],
    visibleToUsers: editItem?.visibleToUsers ?? [],
  });

  const [form, setForm] = useState<Partial<GanttItem>>(makeDefaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setForm(makeDefaults());
      setError('');
    }
  }, [isOpen, editItem, projStart, projEnd]);

  const isMilestone = (form.type as GanttItemType) === 'milestone';

  const handleSubmit = async () => {
    if (!form.name || !String(form.name).trim()) { setError('Name is required.'); return; }
    if (!form.startDate) { setError(isMilestone ? 'Date is required for milestone.' : 'Start date is required.'); return; }
    if (!isMilestone && !form.endDate) { setError('End date is required.'); return; }
    if (!isMilestone && (form.endDate as string) < (form.startDate as string)) { setError('End date must be the same as or after start date.'); return; }

    const effectiveEndDate = isMilestone ? form.startDate : form.endDate;
    if (projStart && (form.startDate as string) < projStart) {
      setError(`Start date must be on or after project start (${formatDate(projStart)}).`);
      return;
    }
    if (projEnd && (effectiveEndDate as string) > projEnd) {
      setError(`End date must be on or before project end (${formatDate(projEnd)}).`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Auto-include assigned users in visibility so they can always see the item
      const assignees = form.assigneeIds ?? [];
      const explicitUsers = form.visibleToUsers ?? [];
      const mergedVisibleUsers = (form.visibleToRoles?.length || explicitUsers.length)
        ? [...new Set([...explicitUsers, ...assignees])]
        : explicitUsers;

      await onSave({
        type: form.type,
        name: form.name,
        description: form.description,
        startDate: form.startDate,
        endDate: isMilestone ? form.startDate : form.endDate,
        progress: typeof form.progress === 'number' ? form.progress : 0,
        assigneeIds: assignees,
        visibleToRoles: form.visibleToRoles ?? [],
        visibleToUsers: mergedVisibleUsers,
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
      assigneeIds: (f.assigneeIds || []).includes(id)
        ? (f.assigneeIds || []).filter((a: string) => a !== id)
        : [...(f.assigneeIds || []), id],
    }));
  };

  const formBody = (
    <div className="space-y-4">
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

      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Name *</label>
        <input
          type="text"
          value={form.name as string}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Enter item name..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        />
      </div>

      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Description</label>
        <textarea
          value={form.description as string}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Optional description..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
            {isMilestone ? 'Date' : 'Start Date'}
          </label>
          <input
            type="date"
            value={form.startDate as string}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            min={projStart || undefined}
            max={projEnd || undefined}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
        {!isMilestone && (
          <div>
            <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">End Date</label>
            <input
              type="date"
              value={form.endDate as string}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              min={(form.startDate as string) || projStart || undefined}
              max={projEnd || undefined}
              className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
            />
          </div>
        )}
      </div>
      {(projStart || projEnd) && (
        <p className="text-xs dark:text-gray-400 text-gray-500 -mt-1">
          Project timeline: {formatDate(projStart)} – {formatDate(projEnd)}
        </p>
      )}

      {!isMilestone && editItem && (
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
            Progress: {form.progress}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.progress as number}
            onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
            className="w-full accent-green-500"
          />
        </div>
      )}

      {projectTeam.length > 0 && (
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Assignees</label>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
            {projectTeam.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form.assigneeIds || []).includes(u.id)}
                  onChange={() => toggleAssignee(u.id)}
                  className="w-3.5 h-3.5 rounded accent-green-500"
                />
                <span className="text-xs dark:text-dark-muted text-light-muted">{u.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="pt-2 border-t dark:border-dark-border border-light-border">
          <p className="text-xs font-semibold dark:text-dark-text text-light-text mb-2">Visibility Control</p>
          <VisibilityEditor
            visibleToRoles={form.visibleToRoles ?? []}
            visibleToUsers={form.visibleToUsers ?? []}
            teamUsers={projectTeam}
            onChange={(roles, users) => setForm((f) => ({ ...f, visibleToRoles: roles, visibleToUsers: users }))}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );

  // panel wrapper used when inline
  const panel = (
    <div className="w-full max-w-2xl bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-modal shadow-modal p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold dark:text-dark-text text-light-text">{editItem ? 'Edit Gantt Item' : 'Add Gantt Item'}</h3>
        <div>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" size="sm" className="ml-2" loading={loading} onClick={handleSubmit}>{editItem ? 'Save Changes' : 'Create Item'}</Button>
        </div>
      </div>
      {formBody}
    </div>
  );

  if (inline) return panel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Edit Gantt Item' : 'Add Gantt Item'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>{editItem ? 'Save Changes' : 'Create Item'}</Button>
        </>
      }
    >
      {formBody}
    </Modal>
  );
}
