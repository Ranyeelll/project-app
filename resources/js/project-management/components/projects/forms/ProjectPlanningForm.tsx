import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface ProjectPlanningFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function ProjectPlanningForm({ onSubmit, loading }: ProjectPlanningFormProps) {
  const [form, setForm] = useState({
    planSummary: '',
    milestones: [{ name: '', date: '' }],
    resources: '',
    constraints: '',
  });
  const [error, setError] = useState('');

  const addMilestone = () => {
    setForm((f) => ({ ...f, milestones: [...f.milestones, { name: '', date: '' }] }));
  };

  const removeMilestone = (index: number) => {
    setForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== index) }));
  };

  const updateMilestone = (index: number, field: 'name' | 'date', value: string) => {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.planSummary.trim()) { setError('Plan Summary is required.'); return; }
    setError('');
    await onSubmit(form);
    setForm({ planSummary: '', milestones: [{ name: '', date: '' }], resources: '', constraints: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Plan Summary *</label>
        <textarea
          value={form.planSummary}
          onChange={(e) => setForm((f) => ({ ...f, planSummary: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Milestones</label>
        <div className="space-y-2">
          {form.milestones.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Milestone name"
                value={m.name}
                onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
              />
              <input
                type="date"
                value={m.date}
                onChange={(e) => updateMilestone(i, 'date', e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
              />
              {form.milestones.length > 1 && (
                <button type="button" onClick={() => removeMilestone(i)} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addMilestone} className="text-xs text-green-primary hover:underline">+ Add milestone</button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Resources</label>
        <textarea
          value={form.resources}
          onChange={(e) => setForm((f) => ({ ...f, resources: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Constraints</label>
        <textarea
          value={form.constraints}
          onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
