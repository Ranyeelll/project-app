import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface ProjectDetailsFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function ProjectDetailsForm({ onSubmit, loading }: ProjectDetailsFormProps) {
  const [form, setForm] = useState({
    projectName: '',
    projectScope: '',
    objectives: '',
    stakeholders: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.projectName.trim()) { setError('Project Name is required.'); return; }
    if (!form.projectScope.trim()) { setError('Project Scope is required.'); return; }
    if (!form.objectives.trim()) { setError('Objectives are required.'); return; }
    if (!form.stakeholders.trim()) { setError('Stakeholders are required.'); return; }
    if (!form.startDate) { setError('Start Date is required.'); return; }
    if (!form.endDate) { setError('End Date is required.'); return; }
    setError('');
    await onSubmit(form);
    setForm({ projectName: '', projectScope: '', objectives: '', stakeholders: '', startDate: '', endDate: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Project Name *</label>
        <input
          type="text"
          value={form.projectName}
          onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Project Scope *</label>
        <textarea
          value={form.projectScope}
          onChange={(e) => setForm((f) => ({ ...f, projectScope: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Objectives *</label>
        <textarea
          value={form.objectives}
          onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Stakeholders *</label>
        <textarea
          value={form.stakeholders}
          onChange={(e) => setForm((f) => ({ ...f, stakeholders: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">End Date *</label>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
