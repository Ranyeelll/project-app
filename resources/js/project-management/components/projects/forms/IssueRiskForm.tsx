import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { User } from '../../../data/mockData';

interface IssueRiskFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
  projectTeam: User[];
}

export function IssueRiskForm({ onSubmit, loading, projectTeam }: IssueRiskFormProps) {
  const [form, setForm] = useState({
    title: '',
    type: 'issue' as 'issue' | 'risk',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    description: '',
    mitigation: '',
    assignedTo: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    setError('');
    await onSubmit(form);
    setForm({ title: '', type: 'issue', severity: 'medium', description: '', mitigation: '', assignedTo: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Type *</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'issue' | 'risk' }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          >
            <option value="issue">Issue</option>
            <option value="risk">Risk</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Severity *</label>
          <select
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as any }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Description *</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Mitigation / Resolution Plan</label>
        <textarea
          value={form.mitigation}
          onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      {projectTeam.length > 0 && (
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Assigned To</label>
          <select
            value={form.assignedTo}
            onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          >
            <option value="">Unassigned</option>
            {projectTeam.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
