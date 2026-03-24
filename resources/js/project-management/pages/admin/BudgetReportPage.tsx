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
  DownloadIcon,
  FileTextIcon,
  TableIcon,
} from 'lucide-react';
import { useData } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAuth } from '../../context/AppContext';
import { isSuperadmin } from '../../utils/roles';

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
  const { currentUser } = useAuth();
  const { projects } = useData();

  const canViewBudget = isSuperadmin(currentUser?.role) || currentUser?.department === 'Accounting';
  if (!canViewBudget) {
    return (
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-6">
        <p className="text-sm dark:text-dark-text text-light-text font-medium">Access denied.</p>
        <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
          Budget reports are limited to Accounting and Superadmin.
        </p>
      </div>
    );
  }

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'percentUsed' | 'totalApproved' | 'remaining'>('percentUsed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [exportPeriod, setExportPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'sheet'>('pdf');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/budget-report', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('maptech-current-user');
          window.location.href = '/';
          return;
        }
        setReport(null);
        return;
      }

      const data = await res.json();
      setReport(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleExportPdf = async (period: 'weekly' | 'monthly' | 'yearly') => {
    setExporting(true);
    setShowExportMenu(false);
    setExportError(null);
    const url = `/api/budget-report/export-pdf?period=${period}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/pdf' },
        credentials: 'include',
      });
      if (res.ok && res.headers.get('content-type')?.includes('pdf')) {
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `budget-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
      } else {
        setExportError(`Export failed (${res.status}). Opening in new tab…`);
        window.open(url, '_blank');
      }
    } catch {
      setExportError('Export failed. Opening in new tab…');
      window.open(url, '_blank');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSheet = async (period: 'weekly' | 'monthly' | 'yearly') => {
    setExporting(true);
    setShowExportMenu(false);
    setExportError(null);
    const url = `/api/budget-report/export-sheet?period=${period}`;
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `budget-report-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
      } else {
        setExportError(`Export failed (${res.status}). Opening in new tab…`);
        window.open(url, '_blank');
      }
    } catch {
      setExportError('Export failed. Opening in new tab…');
      window.open(url, '_blank');
    } finally {
      setExporting(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            {exportError && (
              <p className="absolute -top-5 right-0 text-[10px] text-red-400 whitespace-nowrap">{exportError}</p>
            )}
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-primary text-black font-medium hover:bg-green-primary/90 transition-colors disabled:opacity-50">
              {exporting ? (
                <RefreshCwIcon size={12} className="animate-spin" />
              ) : (
                <DownloadIcon size={12} />
              )}
              Export Report
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg shadow-lg overflow-hidden">
                  {/* Format toggle */}
                  <div className="px-3 pt-2.5 pb-2 border-b dark:border-dark-border border-light-border">
                    <p className="text-[10px] font-semibold dark:text-dark-muted text-light-muted mb-1.5 uppercase tracking-wide">Format</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExportFormat('pdf')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          exportFormat === 'pdf'
                            ? 'bg-green-primary text-black'
                            : 'dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-light-muted hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}>
                        <FileTextIcon size={11} /> PDF
                      </button>
                      <button
                        onClick={() => setExportFormat('sheet')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          exportFormat === 'sheet'
                            ? 'bg-green-primary text-black'
                            : 'dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-light-muted hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}>
                        <TableIcon size={11} /> XLS
                      </button>
                    </div>
                  </div>
                  {/* Period options */}
                  <div className="px-3 py-2 text-xs font-semibold dark:text-dark-muted text-light-muted border-b dark:border-dark-border border-light-border">
                    Select Report Period
                  </div>
                  {([
                    { value: 'weekly' as const, label: 'Weekly Report', desc: 'Current week' },
                    { value: 'monthly' as const, label: 'Monthly Report', desc: 'Current month' },
                    { value: 'yearly' as const, label: 'Yearly Report', desc: 'Current year' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => exportFormat === 'pdf' ? handleExportPdf(opt.value) : handleExportSheet(opt.value)}
                      className="w-full text-left px-3 py-2.5 text-xs dark:text-dark-text text-light-text dark:hover:bg-dark-card2 hover:bg-gray-50 transition-colors">
                      <div className="font-medium">{opt.label}</div>
                      <div className="dark:text-dark-subtle text-light-subtle text-[10px]">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text transition-colors">
            <RefreshCwIcon size={12} /> Refresh
          </button>
        </div>
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
