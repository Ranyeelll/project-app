import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  DownloadIcon,
  FileTextIcon,
  TableIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Badge } from '../../components/ui/Badge';

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  userId: string | null;
  changes: Record<string, any> | null;
  snapshot: Record<string, any> | null;
  context: Record<string, any> | null;
  sensitive: boolean;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login_success': 'LOGIN',
  'auth.login_failed': 'LOGIN_FAILED',
  'auth.logout': 'LOGOUT',
  'auth.password_changed': 'PASSWORD_CHANGED',
  'auth.password_reset': 'PASSWORD_RESET',
  'project.created': 'CREATE',
  'project.updated': 'UPDATE',
  'project.deleted': 'DELETE',
  'project.approved': 'APPROVE',
  'task.created': 'CREATE',
  'task.updated': 'UPDATE',
  'task.deleted': 'DELETE',
  'task.resolved': 'RESOLVE',
  'task.blocked': 'BLOCK',
  'gantt_item.created': 'CREATE',
  'gantt_item.deleted': 'DELETE',
  'approval.transition': 'TRANSITION',
  'project_form.submitted': 'SUBMIT',
  'project_form.reviewed': 'REVIEW',
  'budget.approved': 'APPROVE',
  'audit_log.report_exported': 'EXPORT',
};

const ACTION_COLORS: Record<string, string> = {
  'LOGIN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'LOGOUT': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  'CREATE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'UPDATE': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'APPROVE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'RESOLVE': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'SUBMIT': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'REVIEW': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'EXPORT': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const RESOURCE_LABELS: Record<string, string> = {
  'project': 'Project',
  'task': 'Task',
  'user': 'User',
  'gantt_item': 'Gantt Item',
  'project_form': 'Form',
  'budget_request': 'Budget',
};

export function AuditLogPage() {
  const { projects, users } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.department === 'Admin';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'sheet'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pageSize = 15;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = selectedProject && selectedProject !== 'global'
        ? `/api/projects/${selectedProject}/audit-logs`
        : '/api/audit-logs';

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterAction) params.append('action', filterAction);
      if (filterResourceType) params.append('resourceType', filterResourceType);
      if (selectedProject === 'global' && isAdmin) params.append('limit', '200');

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setCurrentPage(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, isAdmin]);

  useEffect(() => {
    if (isAdmin || selectedProject) {
      fetchLogs();
    }
  }, [selectedProject, search, filterAction, filterResourceType]);

  const userName = (userId: string | null) => {
    if (!userId) return 'System';
    return users.find((u) => u.id === userId)?.name || `User ${userId}`;
  };

  const userEmail = (userId: string | null) => {
    if (!userId) return '';
    return users.find((u) => u.id === userId)?.email || '';
  };

  const getActionLabel = (action: string) => ACTION_LABELS[action] || action.toUpperCase();
  const getActionColor = (action: string) => {
    const label = getActionLabel(action);
    return ACTION_COLORS[label] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };
  const getResourceLabel = (type: string) => RESOURCE_LABELS[type] || type;

  const actionOptions = [...new Set(logs.map((l) => l.action))].sort();
  const resourceOptions = [...new Set(logs.map((l) => l.resourceType))].sort();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
  };

  const filteredLogs = logs.filter((log) => {
    if (search.toLowerCase()) {
      const searchLower = search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.resourceType.toLowerCase().includes(searchLower) ||
        getResourceLabel(log.resourceType).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Calculate stats
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last24h = filteredLogs.filter((l) => new Date(l.createdAt) > oneDayAgo).length;
  const userActions = filteredLogs.filter((l) => l.resourceType === 'user').length;
  const taskActions = filteredLogs.filter((l) => l.resourceType === 'task').length;

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const buildExportUrl = (period: 'weekly' | 'monthly' | 'yearly', format: 'pdf' | 'sheet') => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (search) params.append('search', search);
    if (filterAction) params.append('action', filterAction);
    if (filterResourceType) params.append('resourceType', filterResourceType);
    if (selectedProject && selectedProject !== 'global') params.append('projectId', selectedProject);

    const base = format === 'pdf' ? '/api/audit-logs/export-pdf' : '/api/audit-logs/export-sheet';
    return `${base}?${params.toString()}`;
  };

  const handleExportPdf = async (period: 'weekly' | 'monthly' | 'yearly') => {
    setExporting(true);
    setShowExportMenu(false);
    setExportError(null);
    const url = buildExportUrl(period, 'pdf');
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
        a.download = `audit-logs-${period}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
    const url = buildExportUrl(period, 'sheet');
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `audit-logs-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold dark:text-dark-text text-light-text">Audit Logs</h1>
        <p className="text-sm dark:text-dark-subtle text-light-subtle mt-1">Track all system activities and changes across the platform</p>
      </div>

      {/* Retention Policy Warning */}
      <div className="flex gap-3 p-3.5 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-700/30 dark:text-yellow-300 bg-yellow-50 border border-yellow-200 text-yellow-800">
        <AlertCircleIcon size={18} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm font-medium">Retention Policy: Audit logs are retained for 365 days and automatically removed thereafter.</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-4">
          <p className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wider mb-1">Total Logs</p>
          <p className="text-2xl font-bold dark:text-dark-text text-light-text">{filteredLogs.length}</p>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-4">
          <p className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wider mb-1">Last 24 Hours</p>
          <p className="text-2xl font-bold dark:text-dark-text text-light-text">{last24h}</p>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-4">
          <p className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wider mb-1">User Actions</p>
          <p className="text-2xl font-bold dark:text-dark-text text-light-text">{userActions}</p>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-4">
          <p className="text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wider mb-1">Task Actions</p>
          <p className="text-2xl font-bold dark:text-dark-text text-light-text">{taskActions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <SearchIcon size={16} className="dark:text-dark-muted text-light-muted" />
            <span className="text-sm font-medium dark:text-dark-text text-light-text">Filters</span>
          </div>

          <div className="relative">
            {exportError && (
              <p className="absolute -top-5 right-0 text-[10px] text-red-400 whitespace-nowrap">{exportError}</p>
            )}
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-green-primary text-black font-medium hover:bg-green-primary/90 transition-colors disabled:opacity-50"
            >
              {exporting ? <RefreshCwIcon size={12} className="animate-spin" /> : <DownloadIcon size={12} />}
              Export Logs
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 pt-2.5 pb-2 border-b dark:border-dark-border border-light-border">
                    <p className="text-[10px] font-semibold dark:text-dark-muted text-light-muted mb-1.5 uppercase tracking-wide">Format</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExportFormat('pdf')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          exportFormat === 'pdf'
                            ? 'bg-green-primary text-black'
                            : 'dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-light-muted hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}
                      >
                        <FileTextIcon size={11} /> PDF
                      </button>
                      <button
                        onClick={() => setExportFormat('sheet')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          exportFormat === 'sheet'
                            ? 'bg-green-primary text-black'
                            : 'dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-light-muted hover:bg-gray-200 dark:hover:bg-dark-border'
                        }`}
                      >
                        <TableIcon size={11} /> XLS
                      </button>
                    </div>
                  </div>

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
                      className="w-full text-left px-3 py-2.5 text-xs dark:text-dark-text text-light-text dark:hover:bg-dark-card2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="dark:text-dark-subtle text-light-subtle text-[10px]">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-2.5 dark:text-dark-muted text-light-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          >
            <option value="">All Actions</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>{getActionLabel(action)}</option>
            ))}
          </select>

          {/* Resource Type Filter */}
          <select
            value={filterResourceType}
            onChange={(e) => setFilterResourceType(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          >
            <option value="">All Entities</option>
            {resourceOptions.map((type) => (
              <option key={type} value={type}>{getResourceLabel(type)}</option>
            ))}
          </select>

          {/* Project Filter */}
          {isAdmin && (
            <select
              value={selectedProject || 'global'}
              onChange={(e) => setSelectedProject(e.target.value === 'global' ? 'global' : e.target.value)}
              className="px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
            >
              <option value="global">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-sm dark:text-dark-muted text-light-muted">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-sm dark:text-dark-muted text-light-muted">No audit logs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b dark:border-dark-border border-light-border dark:bg-dark-bg bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">DATE</th>
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">ENTITY</th>
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">ACTIVITY</th>
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">ACTION</th>
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">ACTOR</th>
                    <th className="px-4 py-3 text-left font-semibold dark:text-dark-text text-light-text">DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="border-b dark:border-dark-border border-light-border hover:dark:bg-dark-card2 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="px-4 py-3 dark:text-dark-muted text-light-muted whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium dark:bg-blue-900/30 dark:text-blue-300 bg-blue-100 text-blue-800">
                          {getResourceLabel(log.resourceType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 dark:text-dark-text text-light-text max-w-xs truncate">
                        {log.resourceType} #{log.resourceId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 dark:text-dark-text text-light-text">
                        {userName(log.userId)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-green-primary hover:text-green-600 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t dark:border-dark-border border-light-border px-4 py-3 flex items-center justify-between">
              <p className="text-xs dark:text-dark-muted text-light-muted">
                Showing {Math.min(currentPage * pageSize + 1, filteredLogs.length)}–{Math.min((currentPage + 1) * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-1.5 rounded dark:hover:bg-dark-card2 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeftIcon size={16} className="dark:text-dark-muted text-light-muted" />
                </button>
                <span className="text-xs dark:text-dark-text text-light-text font-medium">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-1.5 rounded dark:hover:bg-dark-card2 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRightIcon size={16} className="dark:text-dark-muted text-light-muted" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 dark:bg-dark-bg dark:border-dark-border bg-gray-50 border-b border-light-border px-8 py-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold dark:text-dark-text text-light-text">Audit Log Entry</h2>
                <p className="text-sm dark:text-dark-subtle text-light-subtle mt-1">ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg hover:dark:bg-dark-card2 hover:bg-gray-200 transition-colors"
              >
                <XIcon size={24} className="dark:text-dark-muted text-light-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-8">
              {/* Section 1: Event Information */}
              <div>
                <h3 className="text-sm font-bold dark:text-dark-text text-light-text uppercase tracking-widest mb-4 pb-2 border-b dark:border-dark-border border-light-border">
                  Event Information
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">Timestamp</p>
                    <p className="text-base dark:text-dark-text text-light-text font-medium">{formatFullDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">Action</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-3 py-1.5 rounded text-xs font-bold ${getActionColor(selectedLog.action)}`}>
                        {getActionLabel(selectedLog.action)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Entity & Resource */}
              <div>
                <h3 className="text-sm font-bold dark:text-dark-text text-light-text uppercase tracking-widest mb-4 pb-2 border-b dark:border-dark-border border-light-border">
                  Resource Information
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">Entity Type</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1.5 rounded text-xs font-medium dark:bg-blue-900/30 dark:text-blue-300 bg-blue-100 text-blue-800">
                        {getResourceLabel(selectedLog.resourceType)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">Resource ID</p>
                    <p className="text-base dark:text-dark-text text-light-text font-mono font-semibold">#{selectedLog.resourceId}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Actor Information */}
              <div>
                <h3 className="text-sm font-bold dark:text-dark-text text-light-text uppercase tracking-widest mb-4 pb-2 border-b dark:border-dark-border border-light-border">
                  Actor Information
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">User Name</p>
                    <p className="text-base dark:text-dark-text text-light-text font-medium">{userName(selectedLog.userId)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-2">Email Address</p>
                    <p className="text-base dark:text-dark-text text-light-text">{userEmail(selectedLog.userId) || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section 4: Activity Details */}
              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold dark:text-dark-text text-light-text uppercase tracking-widest mb-4 pb-2 border-b dark:border-dark-border border-light-border">
                    Activity Details
                  </h3>
                  <div className="dark:bg-dark-bg bg-gray-50 rounded-lg p-5 border dark:border-dark-border border-light-border">
                    <div className="space-y-2">
                      {Object.entries(selectedLog.context).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-4">
                          <span className="text-xs font-semibold dark:text-blue-400 text-blue-600 min-w-max">{key}:</span>
                          <span className="text-xs dark:text-dark-text text-light-text break-all">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Changes Made */}
              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold dark:text-dark-text text-light-text uppercase tracking-widest mb-4 pb-2 border-b dark:border-dark-border border-light-border">
                    Changes Made
                  </h3>
                  <div className="dark:bg-dark-bg bg-gray-50 rounded-lg p-5 border dark:border-dark-border border-light-border">
                    <div className="space-y-3">
                      {Object.entries(selectedLog.changes).map(([key, value]: [string, any]) => (
                        <div key={key} className="border-l-2 border-blue-400 pl-3">
                          <p className="text-xs font-semibold dark:text-blue-400 text-blue-600 mb-1">{key}</p>
                          <div className="flex items-start gap-3 text-xs dark:text-dark-text text-light-text">
                            {value && typeof value === 'object' && value.old !== undefined && value.new !== undefined ? (
                              <>
                                <div className="flex-1">
                                  <span className="text-red-500 dark:text-red-400 font-mono">Old: </span>
                                  <span className="break-all">{String(value.old)}</span>
                                </div>
                                <div className="flex-1">
                                  <span className="text-green-500 dark:text-green-400 font-mono">New: </span>
                                  <span className="break-all">{String(value.new)}</span>
                                </div>
                              </>
                            ) : (
                              <span className="break-all">{JSON.stringify(value)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 6: Sensitive Data Warning */}
              {selectedLog.sensitive && (
                <div className="border-l-4 border-red-500 dark:bg-red-900/20 bg-red-50 rounded-r-lg p-5">
                  <div className="flex gap-3 items-start">
                    <AlertCircleIcon size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-600 dark:text-red-300 mb-1">SENSITIVE DATA WARNING</p>
                      <p className="text-sm text-red-600 dark:text-red-300">This audit log entry involves sensitive security information. Access to this information is restricted and logged.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="dark:bg-dark-bg dark:border-dark-border bg-gray-50 border-t border-light-border px-8 py-4 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 rounded-lg dark:bg-green-primary/10 dark:text-green-primary dark:hover:bg-green-primary/20 bg-green-100 text-green-700 hover:bg-green-200 font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
