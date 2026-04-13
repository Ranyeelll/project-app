import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, ClockIcon, TrashIcon } from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { apiFetch } from '../../utils/apiFetch';
import { parseApiError } from '../../utils/parseApiError';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export function LogTimePage() {
  const { tasks, projects, users, timeLogs, setTimeLogs, refreshTimeLogs, refreshTasks } = useData();
  const { currentUser } = useAuth();
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    taskId: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const myProjectIds = projects.filter((p) => (p.teamIds || []).map(String).includes(String(currentUser?.id))).map((p) => p.id);
  const myTasks = tasks.filter((t) => String(t.assignedTo) === String(currentUser?.id));
  const myLogs = timeLogs.filter((l) => String(l.userId) === String(currentUser?.id));
  const totalHours = myLogs.reduce((s, l) => s + l.hours, 0);
  const thisWeekLogs = myLogs.filter((l) => {
    const logDate = new Date(l.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  });
  const weekHours = thisWeekLogs.reduce((s, l) => s + l.hours, 0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const handleCreate = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/time-logs', {
        method: 'POST',
        body: JSON.stringify({
          task_id: form.taskId,
          user_id: currentUser?.id || '',
          hours: Number(form.hours),
          description: form.description,
          date: form.date,
        }),
      });
      if (res.ok) {
        refreshTimeLogs();
        refreshTasks();
        setCreateModal(false);
        setForm({
          taskId: '',
          hours: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        setFormError(await parseApiError(res, 'Failed to log time.'));
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/time-logs/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        refreshTimeLogs();
        refreshTasks();
      } else {
        const msg = await parseApiError(res, 'Failed to delete time log.');
        alert(msg);
      }
    } catch {
      alert('Network error. Please check your connection and try again.');
    }
    setDeleteConfirm(null);
  };
  if (isLoading) return <LoadingSpinner message="Loading data..." />;
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {totalHours}h
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Total Hours Logged
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold text-green-primary">
            {weekHours}h
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            This Week
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {myLogs.length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Log Entries
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
          Time Log History
        </h2>
        <Button
          variant="primary"
          icon={<PlusIcon size={14} />}
          onClick={() => { setFormError(null); setCreateModal(true); }}>

          Log Time
        </Button>
      </div>

      {/* Log list */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="dark:border-dark-border border-b border-light-border">
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Task
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Description
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Date
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Hours
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-dark-border divide-light-border">
              {myLogs.map((log) => {
                const task = tasks.find((t) => t.id === log.taskId);
                return (
                  <tr key={log.id} className="table-row-hover">
                    <td className="px-5 py-3.5">
                      <p className="text-sm dark:text-dark-text text-light-text">
                        {task?.title || 'Unknown Task'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm dark:text-dark-muted text-light-muted">
                        {log.description}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm dark:text-dark-muted text-light-muted">
                        {log.date}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-medium text-green-primary">
                        {log.hours}h
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setDeleteConfirm(log.id)}
                        className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors">

                        <TrashIcon size={13} />
                      </button>
                    </td>
                  </tr>);

              })}
              {myLogs.length === 0 &&
              <tr>
                  <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm dark:text-dark-subtle text-light-subtle">

                    No time logs yet. Start logging your work hours.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Log Time"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!form.taskId || !form.hours || submitting}>

              {submitting ? 'Saving...' : 'Log Hours'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          <Select
            label="Task"
            value={form.taskId}
            onChange={(e) =>
            setForm({
              ...form,
              taskId: e.target.value
            })
            }
            options={[
            {
              value: '',
              label: 'Select a task...'
            },
            ...myTasks.map((t) => ({
              value: t.id,
              label: t.title
            }))]
            } />

          <Input
            label="Hours"
            type="number"
            placeholder="e.g. 4"
            min="0.5"
            max="24"
            step="0.5"
            value={form.hours}
            onChange={(e) =>
            setForm({
              ...form,
              hours: e.target.value
            })
            }
            icon={<ClockIcon size={14} />} />

          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) =>
            setForm({
              ...form,
              date: e.target.value
            })
            } />

          <Textarea
            label="Description"
            placeholder="What did you work on?"
            value={form.description}
            onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value
            })
            }
            rows={3} />

          {formError && <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">{formError}</div>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Log Entry"
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
          Are you sure you want to delete this time log entry?
        </p>
      </Modal>
    </div>);

}