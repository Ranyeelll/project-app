import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface ProgressUpdateFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function ProgressUpdateForm({ onSubmit, loading }: ProgressUpdateFormProps) {
  const [form, setForm] = useState({
    overallProgress: 0,
    completedTasks: '',
    upcomingTasks: '',
    blockers: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.completedTasks.trim()) { setError('Completed Tasks is required.'); return; }
    if (!form.upcomingTasks.trim()) { setError('Upcoming Tasks is required.'); return; }
    setError('');
    await onSubmit(form);
    setForm({ overallProgress: 0, completedTasks: '', upcomingTasks: '', blockers: '', notes: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
          Overall Progress: {form.overallProgress}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={form.overallProgress}
          onChange={(e) => setForm((f) => ({ ...f, overallProgress: Number(e.target.value) }))}
          className="w-full accent-green-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Completed Tasks *</label>
        <textarea
          value={form.completedTasks}
          onChange={(e) => setForm((f) => ({ ...f, completedTasks: e.target.value }))}
          rows={3}
          placeholder="List tasks completed since the last update..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Upcoming Tasks *</label>
        <textarea
          value={form.upcomingTasks}
          onChange={(e) => setForm((f) => ({ ...f, upcomingTasks: e.target.value }))}
          rows={3}
          placeholder="List tasks planned for the next period..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Blockers</label>
        <textarea
          value={form.blockers}
          onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))}
          rows={2}
          placeholder="Any blockers or impediments..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
