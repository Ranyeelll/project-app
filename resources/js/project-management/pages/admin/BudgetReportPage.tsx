import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  PieChartIcon,
  BarChart2Icon,
  FilterIcon,
  RefreshCwIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from 'lucide-react';
import { useData } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface CategoryItem {
  category: string;
  amount: number;
  count: number;
}

interface MonthlyItem {
  month: string;
  amount: number;
  count: number;
}

interface ProjectReport {
  projectId: string;
  projectName: string;
  projectStatus: string;
  budget: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  remaining: number;
  percentUsed: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalRequests: number;
  categories: CategoryItem[];
  monthlyTrend: MonthlyItem[];
}

interface ReportSummary {
  totalBudget: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalRequests: number;
  projectCount: number;
  overBudgetProjects: number;
  atRiskProjects: number;
}

interface ReportData {
  summary: ReportSummary;
  projects: ProjectReport[];
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(n);

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400',
  'on-hold': 'text-yellow-400',
  completed: 'text-blue-400',
  archived: 'text-gray-400',
};

/* ═══════════════════════════════════════════════════════════════════════ */
export function BudgetReportPage() {
  const { projects } = useData();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'percentUsed' | 'totalApproved' | 'remaining'>('percentUsed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/budget-report', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  /* ── Derived ──────────────────────────────────────────────────────── */
  const filteredProjects = useMemo(() => {
    if (!report) return [];
    let list = report.projects;
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.projectStatus === statusFilter);
    }
    list = [...list].sort((a, b) => {
      const aV = sortField === 'name' ? a.projectName.toLowerCase() : a[sortField];
      const bV = sortField === 'name' ? b.projectName.toLowerCase() : b[sortField];
      if (aV < bV) return sortDir === 'asc' ? -1 : 1;
      if (aV > bV) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [report, statusFilter, sortField, sortDir]);

  const selectedDetail = useMemo(() => {
    if (!selectedProject || !report) return null;
    return report.projects.find((p) => p.projectId === selectedProject) || null;
  }, [selectedProject, report]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCwIcon size={24} className="animate-spin dark:text-dark-muted text-light-muted" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 dark:text-dark-muted text-light-muted">
        Failed to load budget report.
      </div>
    );
  }

  const { summary } = report;

  return (
    <div className="space-y-5">
      {/* ── Portfolio Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs dark:text-dark-muted text-light-muted mb-1">
            <DollarSignIcon size={14} /> Total Budget
          </div>
          <div className="text-xl font-bold dark:text-dark-text text-light-text">
            {formatCurrency(summary.totalBudget)}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
            Across {summary.projectCount} projects
          </div>
        </div>

        {/* Total Approved/Spent */}
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-green-400 mb-1">
            <CheckCircleIcon size={14} /> Total Spent
          </div>
          <div className="text-xl font-bold text-green-400">
            {formatCurrency(summary.totalApproved)}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
            {summary.totalBudget > 0
              ? `${Math.round((summary.totalApproved / summary.totalBudget) * 100)}% of total budget`
              : '—'}
          </div>
        </div>

        {/* Pending */}
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-yellow-400 mb-1">
            <ClockIcon size={14} /> Pending Requests
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {formatCurrency(summary.totalPending)}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
            {summary.totalRequests} total requests
          </div>
        </div>

        {/* At Risk / Over Budget */}
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs text-red-400 mb-1">
            <AlertTriangleIcon size={14} /> Budget Alerts
          </div>
          <div className="text-xl font-bold text-red-400">
            {summary.overBudgetProjects}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
            Over budget &bull; {summary.atRiskProjects} at risk (&ge;80%)
          </div>
        </div>
      </div>

      {/* ── Filters & Refresh ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterIcon size={14} className="dark:text-dark-muted text-light-muted" />
          {['all', 'active', 'on-hold', 'completed', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-green-primary text-black'
                  : 'dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text'
              }`}>

              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text transition-colors">

          <RefreshCwIcon size={12} /> Refresh
        </button>

      </div>

      {/* ── Project Budget Table ──────────────────────────────────────── */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="dark:bg-dark-card2 bg-gray-50 text-xs dark:text-dark-muted text-light-muted">
                <th
                  className="text-left px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">
                    Project <SortIcon field="name" />
                  </span>
                </th>
                <th className="text-right px-4 py-3">Budget</th>
                <th
                  className="text-right px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSort('totalApproved')}>
                  <span className="flex items-center justify-end gap-1">
                    Spent <SortIcon field="totalApproved" />
                  </span>
                </th>
                <th
                  className="text-right px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSort('remaining')}>
                  <span className="flex items-center justify-end gap-1">
                    Remaining <SortIcon field="remaining" />
                  </span>
                </th>
                <th
                  className="text-center px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSort('percentUsed')}>
                  <span className="flex items-center justify-center gap-1">
                    % Used <SortIcon field="percentUsed" />
                  </span>
                </th>
                <th className="text-center px-4 py-3">Requests</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => {
                const isOver = p.remaining < 0;
                const isRisk = p.percentUsed >= 80 && p.percentUsed < 100;
                return (
                  <tr
                    key={p.projectId}
                    onClick={() => setSelectedProject(p.projectId === selectedProject ? null : p.projectId)}
                    className={`border-t dark:border-dark-border border-light-border cursor-pointer transition-colors
                      ${selectedProject === p.projectId
                        ? 'dark:bg-green-primary/10 bg-green-50'
                        : 'dark:hover:bg-dark-card2 hover:bg-gray-50'
                      }`}>

                    <td className="px-4 py-3">
                      <div className="font-medium dark:text-dark-text text-light-text">
                        {p.projectName}
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 dark:text-dark-muted text-light-muted">
                      {formatCurrency(p.budget)}
                    </td>
                    <td className="text-right px-4 py-3 font-medium text-green-400">
                      {formatCurrency(p.totalApproved)}
                    </td>
                    <td className={`text-right px-4 py-3 font-medium ${isOver ? 'text-red-400' : 'dark:text-dark-text text-light-text'}`}>
                      {formatCurrency(p.remaining)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20">
                          <ProgressBar
                            value={Math.min(p.percentUsed, 100)}
                            max={100}
                            color={isOver ? 'red' : isRisk ? 'yellow' : 'green'}
                            size="sm"
                          />
                        </div>
                        <span className={`text-xs font-medium ${isOver ? 'text-red-400' : isRisk ? 'text-yellow-400' : 'dark:text-dark-muted text-light-muted'}`}>
                          {p.percentUsed}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5 text-xs">
                        <span className="text-green-400" title="Approved">{p.approvedCount}</span>
                        <span className="dark:text-dark-subtle text-light-subtle">/</span>
                        <span className="text-yellow-400" title="Pending">{p.pendingCount}</span>
                        <span className="dark:text-dark-subtle text-light-subtle">/</span>
                        <span className="text-red-400" title="Rejected">{p.rejectedCount}</span>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${STATUS_COLORS[p.projectStatus] || ''}`}>
                        {p.projectStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 dark:text-dark-muted text-light-muted">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Selected Project Detail Panel ─────────────────────────────── */}
      {selectedDetail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Spending Breakdown by Category */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-5">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3 flex items-center gap-2">
              <PieChartIcon size={14} className="text-green-primary" />
              Spending Breakdown — {selectedDetail.projectName}
            </h3>
            {selectedDetail.categories.length > 0 ? (
              <div className="space-y-2">
                {selectedDetail.categories
                  .sort((a, b) => b.amount - a.amount)
                  .map((cat, i) => {
                    const pct = selectedDetail.totalApproved > 0
                      ? Math.round((cat.amount / selectedDetail.totalApproved) * 100)
                      : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="dark:text-dark-muted text-light-muted truncate max-w-[200px]" title={cat.category}>
                            {cat.category}
                          </span>
                          <span className="dark:text-dark-text text-light-text font-medium">
                            {formatCurrency(cat.amount)} ({pct}%)
                          </span>
                        </div>
                        <ProgressBar value={pct} max={100} size="sm" />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs dark:text-dark-subtle text-light-subtle">
                No approved spending yet.
              </p>
            )}
          </div>

          {/* Monthly Spending Trend */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-5">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3 flex items-center gap-2">
              <BarChart2Icon size={14} className="text-green-primary" />
              Monthly Trend — {selectedDetail.projectName}
            </h3>
            {selectedDetail.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {selectedDetail.monthlyTrend.map((m, i) => {
                  const maxAmount = Math.max(...selectedDetail.monthlyTrend.map((t) => t.amount));
                  const barPct = maxAmount > 0 ? Math.round((m.amount / maxAmount) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="dark:text-dark-muted text-light-muted">{m.month}</span>
                        <span className="dark:text-dark-text text-light-text font-medium">
                          {formatCurrency(m.amount)} ({m.count} req)
                        </span>
                      </div>
                      <div className="w-full h-2 dark:bg-dark-border bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-primary rounded-full transition-all"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs dark:text-dark-subtle text-light-subtle">
                No monthly data available yet.
              </p>
            )}
          </div>

          {/* Budget Health Summary */}
          <div className="md:col-span-2 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl p-5">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">
              Budget Health — {selectedDetail.projectName}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-xs dark:text-dark-muted text-light-muted mb-0.5">Total Budget</div>
                <div className="text-lg font-bold dark:text-dark-text text-light-text">
                  {formatCurrency(selectedDetail.budget)}
                </div>
              </div>
              <div>
                <div className="text-xs dark:text-dark-muted text-light-muted mb-0.5">Approved Spent</div>
                <div className="text-lg font-bold text-green-400">
                  {formatCurrency(selectedDetail.totalApproved)}
                </div>
              </div>
              <div>
                <div className="text-xs dark:text-dark-muted text-light-muted mb-0.5">Remaining</div>
                <div className={`text-lg font-bold ${selectedDetail.remaining < 0 ? 'text-red-400' : 'dark:text-dark-text text-light-text'}`}>
                  {formatCurrency(selectedDetail.remaining)}
                </div>
              </div>
              <div>
                <div className="text-xs dark:text-dark-muted text-light-muted mb-0.5">Pending</div>
                <div className="text-lg font-bold text-yellow-400">
                  {formatCurrency(selectedDetail.totalPending)}
                </div>
              </div>
              <div>
                <div className="text-xs dark:text-dark-muted text-light-muted mb-0.5">
                  If All Approved
                </div>
                <div className={`text-lg font-bold ${
                  (selectedDetail.totalApproved + selectedDetail.totalPending) > selectedDetail.budget
                    ? 'text-red-400'
                    : 'dark:text-dark-text text-light-text'
                }`}>
                  {formatCurrency(selectedDetail.budget - selectedDetail.totalApproved - selectedDetail.totalPending)}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar
                value={Math.min(selectedDetail.percentUsed, 100)}
                max={100}
                color={
                  selectedDetail.remaining < 0
                    ? 'red'
                    : selectedDetail.percentUsed >= 80
                      ? 'yellow'
                      : 'green'
                }
                size="md"
              />
              <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                {selectedDetail.percentUsed}% of budget used
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
