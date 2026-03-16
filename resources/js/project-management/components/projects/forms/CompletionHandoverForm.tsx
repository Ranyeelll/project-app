import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface CompletionHandoverFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function CompletionHandoverForm({ onSubmit, loading }: CompletionHandoverFormProps) {
  const [form, setForm] = useState({
    completionSummary: '',
    deliverables: [''],
    lessonsLearned: '',
    handoverNotes: '',
    pendingItems: '',
    markComplete: false,
  });
  const [error, setError] = useState('');

  const addDeliverable = () => {
    setForm((f) => ({ ...f, deliverables: [...f.deliverables, ''] }));
  };

  const removeDeliverable = (index: number) => {
    setForm((f) => ({ ...f, deliverables: f.deliverables.filter((_, i) => i !== index) }));
  };

  const updateDeliverable = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      deliverables: f.deliverables.map((d, i) => (i === index ? value : d)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.completionSummary.trim()) { setError('Completion Summary is required.'); return; }
    const nonEmpty = form.deliverables.filter((d) => d.trim());
    if (nonEmpty.length === 0) { setError('At least one deliverable is required.'); return; }
    setError('');
    await onSubmit({ ...form, deliverables: nonEmpty });
    setForm({ completionSummary: '', deliverables: [''], lessonsLearned: '', handoverNotes: '', pendingItems: '', markComplete: false });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Completion Summary *</label>
        <textarea
          value={form.completionSummary}
          onChange={(e) => setForm((f) => ({ ...f, completionSummary: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Deliverables *</label>
        <div className="space-y-2">
          {form.deliverables.map((d, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={d}
                onChange={(e) => updateDeliverable(i, e.target.value)}
                placeholder={`Deliverable ${i + 1}`}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
              />
              {form.deliverables.length > 1 && (
                <button type="button" onClick={() => removeDeliverable(i)} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addDeliverable} className="text-xs text-green-primary hover:underline">+ Add deliverable</button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Lessons Learned</label>
        <textarea
          value={form.lessonsLearned}
          onChange={(e) => setForm((f) => ({ ...f, lessonsLearned: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Handover Notes</label>
        <textarea
          value={form.handoverNotes}
          onChange={(e) => setForm((f) => ({ ...f, handoverNotes: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Pending Items</label>
        <textarea
          value={form.pendingItems}
          onChange={(e) => setForm((f) => ({ ...f, pendingItems: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.markComplete}
          onChange={(e) => setForm((f) => ({ ...f, markComplete: e.target.checked }))}
          className="w-4 h-4 rounded accent-green-500"
        />
        <span className="text-xs dark:text-dark-text text-light-text">Mark project as completed</span>
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
