import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface ApprovalReviewFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function ApprovalReviewForm({ onSubmit, loading }: ApprovalReviewFormProps) {
  const [form, setForm] = useState({
    reviewType: '',
    decision: 'approve' as 'approve' | 'reject' | 'revision',
    comments: '',
    conditions: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.reviewType.trim()) { setError('Review Type is required.'); return; }
    setError('');
    await onSubmit(form);
    setForm({ reviewType: '', decision: 'approve', comments: '', conditions: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Review Type *</label>
        <input
          type="text"
          value={form.reviewType}
          onChange={(e) => setForm((f) => ({ ...f, reviewType: e.target.value }))}
          placeholder="e.g. Technical Review, Budget Review..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Decision *</label>
        <select
          value={form.decision}
          onChange={(e) => setForm((f) => ({ ...f, decision: e.target.value as any }))}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        >
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="revision">Request Revision</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Comments</label>
        <textarea
          value={form.comments}
          onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Conditions</label>
        <textarea
          value={form.conditions}
          onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))}
          rows={2}
          placeholder="Any conditions for approval..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button variant="primary" size="sm" loading={loading} onClick={handleSubmit}>Submit</Button>
    </div>
  );
}
