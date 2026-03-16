import React, { useState } from 'react';
import { Button } from '../../ui/Button';

interface AnalyticsKpiFormProps {
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
}

export function AnalyticsKpiForm({ onSubmit, loading }: AnalyticsKpiFormProps) {
  const [form, setForm] = useState({
    kpiName: '',
    targetValue: '',
    actualValue: '',
    unit: '',
    period: '',
    trend: 'stable' as 'up' | 'down' | 'stable',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.kpiName.trim()) { setError('KPI Name is required.'); return; }
    if (!form.targetValue) { setError('Target Value is required.'); return; }
    if (!form.actualValue) { setError('Actual Value is required.'); return; }
    if (!form.unit.trim()) { setError('Unit is required.'); return; }
    setError('');
    await onSubmit({
      ...form,
      targetValue: Number(form.targetValue),
      actualValue: Number(form.actualValue),
    });
    setForm({ kpiName: '', targetValue: '', actualValue: '', unit: '', period: '', trend: 'stable', notes: '' });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">KPI Name *</label>
        <input
          type="text"
          value={form.kpiName}
          onChange={(e) => setForm((f) => ({ ...f, kpiName: e.target.value }))}
          placeholder="e.g. Budget Utilization, Task Completion Rate..."
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Target Value *</label>
          <input
            type="number"
            value={form.targetValue}
            onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Actual Value *</label>
          <input
            type="number"
            value={form.actualValue}
            onChange={(e) => setForm((f) => ({ ...f, actualValue: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Unit *</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="e.g. %, PHP, hours..."
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Period</label>
          <input
            type="text"
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
            placeholder="e.g. Q1 2026, March 2026..."
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">Trend</label>
        <select
          value={form.trend}
          onChange={(e) => setForm((f) => ({ ...f, trend: e.target.value as any }))}
          className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
        >
          <option value="up">Trending Up</option>
          <option value="down">Trending Down</option>
          <option value="stable">Stable</option>
        </select>
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
