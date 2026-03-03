import React, { useState } from 'react';
import { PlusIcon, ClockIcon, TrashIcon } from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
export function LogTimePage() {
  const { tasks, timeLogs, setTimeLogs, refreshTimeLogs, refreshTasks } = useData();
  const { currentUser } = useAuth();
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    taskId: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.id);
  const allAvailableTasks = myTasks.length > 0 ? myTasks : tasks;
  const myLogs = timeLogs.filter((l) => l.userId === currentUser?.id);
  const totalHours = myLogs.reduce((s, l) => s + l.hours, 0);
  const thisWeekLogs = myLogs.filter((l) => {
    const logDate = new Date(l.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return logDate >= weekAgo;
  });
  const weekHours = thisWeekLogs.reduce((s, l) => s + l.hours, 0);
  const [submitting, setSubmitting] = useState(false);
  const handleCreate = async () => {
    setSubmitting(true);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
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
        refreshTasks(); // updates loggedHours on the task
      }
    } catch { /* ignore */ } finally {
      setSubmitting(false);
      setCreateModal(false);
      setForm({
        taskId: '',
        hours: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  };
  const handleDelete = async (id: string) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      await fetch(`/api/time-logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
      });
      refreshTimeLogs();
      refreshTasks();
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };
  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
          onClick={() => setCreateModal(true)}>

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
            ...allAvailableTasks.map((t) => ({
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