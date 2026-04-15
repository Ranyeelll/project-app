import React, { useEffect, useState } from 'react';
import { BudgetVariance } from '../../data/mockData';
import { apiFetch } from '../../utils/apiFetch';
import { DollarSignIcon, TrendingUpIcon, AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

export function BudgetVariancePage() {
  const [data, setData] = useState<BudgetVariance[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/budget-variance', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: BudgetVariance[]) => { if (Array.isArray(d)) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalBudget = data.reduce((a, b) => a + b.budget, 0);
  const totalSpent = data.reduce((a, b) => a + b.spent, 0);
  const overBudgetCount = data.filter((d) => d.status === 'over-budget').length;

  const statusColors: Record<string, string> = {
    'healthy': 'bg-green-500/10 text-green-400 border-green-500/20',
    'warning': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'over-budget': 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">Budget Variance</h1>
          <p className="text-sm dark:text-dark-muted text-gray-500 mt-1">Burn rate and cost projection analysis</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-white bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">
          <RefreshCwIcon size={14} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><DollarSignIcon size={18} className="text-blue-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Total Budget</p>
              <p className="text-lg font-bold dark:text-white text-gray-900">{fmt(totalBudget)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><TrendingUpIcon size={18} className="text-green-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Total Spent</p>
              <p className="text-lg font-bold dark:text-white text-gray-900">{fmt(totalSpent)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertTriangleIcon size={18} className="text-red-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Over Budget</p>
              <p className="text-lg font-bold text-red-400">{overBudgetCount} projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl dark:bg-dark-card dark:border-dark-border bg-white border border-light-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center dark:text-dark-muted text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:bg-dark-card2 bg-gray-50 border-b dark:border-dark-border border-light-border">
                <th className="text-left px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Project</th>
                <th className="text-right px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Budget</th>
                <th className="text-right px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Spent</th>
                <th className="text-right px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Variance</th>
                <th className="text-right px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Burn Rate/Day</th>
                <th className="text-right px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Projected Total</th>
                <th className="text-center px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.projectId} className="border-b last:border-0 dark:border-dark-border border-light-border dark:hover:bg-dark-card2 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 dark:text-white text-gray-900 font-medium">{item.projectName}</td>
                  <td className="px-4 py-3 text-right dark:text-white text-gray-900">{fmt(item.budget)}</td>
                  <td className="px-4 py-3 text-right dark:text-white text-gray-900">{fmt(item.spent)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${item.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt(item.variance)} ({item.variancePercent}%)
                  </td>
                  <td className="px-4 py-3 text-right dark:text-dark-muted text-gray-500">{fmt(item.burnRate)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${item.projectedTotal > item.budget ? 'text-red-400' : 'dark:text-white text-gray-900'}`}>
                    {fmt(item.projectedTotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[item.status] || ''}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
