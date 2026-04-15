import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AppContext';
import { WorkloadEntry } from '../../data/mockData';
import { apiFetch } from '../../utils/apiFetch';
import { UsersIcon, ClockIcon, BarChart2Icon, RefreshCwIcon } from 'lucide-react';

export function WorkloadPage() {
  const { currentUser } = useAuth();
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string>('all');

  const loadWorkload = () => {
    setLoading(true);
    apiFetch('/api/workload', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: WorkloadEntry[]) => {
        if (Array.isArray(data)) setWorkload(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkload();
  }, []);

  const departments = ['all', ...new Set(workload.map((w) => w.department).filter(Boolean))];
  const filtered = filterDept === 'all' ? workload : workload.filter((w) => w.department === filterDept);

  const totalTasks = filtered.reduce((a, b) => a + b.activeTasks, 0);
  const totalEstimated = filtered.reduce((a, b) => a + b.estimatedHours, 0);
  const totalLogged = filtered.reduce((a, b) => a + b.loggedHours, 0);
  const avgUtilization = filtered.length > 0
    ? Math.round(filtered.reduce((a, b) => a + b.utilization, 0) / filtered.length)
    : 0;

  const getUtilColor = (util: number) => {
    if (util >= 100) return 'text-red-400';
    if (util >= 75) return 'text-amber-400';
    if (util >= 25) return 'text-green-400';
    return 'text-gray-400';
  };

  const getBarColor = (util: number) => {
    if (util >= 100) return 'bg-red-500';
    if (util >= 75) return 'bg-amber-500';
    if (util >= 25) return 'bg-green-500';
    return 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">Workload & Utilization</h1>
          <p className="text-sm dark:text-dark-muted text-gray-500 mt-1">Team resource allocation and capacity overview</p>
        </div>
        <button onClick={loadWorkload} className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-white bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">
          <RefreshCwIcon size={14} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><UsersIcon size={18} className="text-blue-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Team Members</p>
              <p className="text-xl font-bold dark:text-white text-gray-900">{filtered.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><BarChart2Icon size={18} className="text-purple-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Active Tasks</p>
              <p className="text-xl font-bold dark:text-white text-gray-900">{totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><ClockIcon size={18} className="text-green-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Hours (Logged / Est.)</p>
              <p className="text-xl font-bold dark:text-white text-gray-900">{totalLogged}h / {totalEstimated}h</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><BarChart2Icon size={18} className="text-amber-400" /></div>
            <div>
              <p className="text-xs dark:text-dark-muted text-gray-500">Avg Utilization</p>
              <p className={`text-xl font-bold ${getUtilColor(avgUtilization)}`}>{avgUtilization}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm dark:text-dark-muted text-gray-500">Department:</span>
        {departments.map((d) => (
          <button key={d} onClick={() => setFilterDept(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterDept === d
                ? 'bg-green-primary text-white'
                : 'dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-white bg-gray-100 text-gray-600'
            }`}>
            {d === 'all' ? 'All' : d}
          </button>
        ))}
      </div>

      {/* Workload Table */}
      <div className="rounded-xl dark:bg-dark-card dark:border-dark-border bg-white border border-light-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center dark:text-dark-muted text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center dark:text-dark-muted text-gray-500">No team members found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:bg-dark-card2 bg-gray-50 border-b dark:border-dark-border border-light-border">
                <th className="text-left px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Team Member</th>
                <th className="text-left px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Department</th>
                <th className="text-center px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Tasks</th>
                <th className="text-center px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Est. Hours</th>
                <th className="text-center px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Logged</th>
                <th className="text-left px-4 py-3 font-medium dark:text-dark-muted text-gray-500">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.userId} className="border-b last:border-0 dark:border-dark-border border-light-border dark:hover:bg-dark-card2 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 dark:text-white text-gray-900 font-medium">{entry.userName}</td>
                  <td className="px-4 py-3 dark:text-dark-muted text-gray-500">{entry.department}</td>
                  <td className="px-4 py-3 text-center dark:text-white text-gray-900">{entry.activeTasks}</td>
                  <td className="px-4 py-3 text-center dark:text-white text-gray-900">{entry.estimatedHours}h</td>
                  <td className="px-4 py-3 text-center dark:text-white text-gray-900">{entry.loggedHours}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full dark:bg-dark-card2 bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getBarColor(entry.utilization)}`}
                          style={{ width: `${Math.min(entry.utilization, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-medium min-w-[3rem] text-right ${getUtilColor(entry.utilization)}`}>
                        {entry.utilization}%
                      </span>
                    </div>
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
