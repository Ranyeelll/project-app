import React, { useState, useMemo } from 'react';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  FolderKanbanIcon,
  UsersIcon,
  EditIcon,
  TrashIcon } from
'lucide-react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useData, useTheme } from '../../context/AppContext';
import { Issue } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

export function MonitorControlPage() {
  const { projects, tasks, issues, setIssues, users, budgetRequests, timeLogs } = useData();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'team' | 'raid'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Issue | null>(null);
  const [editForm, setEditForm] = useState({ status: '', assignedTo: '' });

  const openEdit = (issue: Issue) => {
    setEditModal(issue);
    setEditForm({ status: issue.status, assignedTo: issue.assignedTo || '' });
  };
  const handleEditSave = () => {
    if (!editModal) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === editModal.id
          ? { ...i, status: editForm.status as Issue['status'], assignedTo: editForm.assignedTo || undefined, updatedAt: new Date().toISOString().split('T')[0] }
          : i
      )
    );
    setEditModal(null);
  };
  const handleDelete = (id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);

  const TYPE_COLORS: Record<string, string> = {
    risk: 'danger', assumption: 'warning', issue: 'danger', dependency: 'info'
  };

  // ── Theme-aware colors ──
  const textColor = isDark ? '#c4c4c4' : '#555';
  const gridColor = isDark ? '#2d2d2d' : '#e5e7eb';
  const tooltipBg = isDark ? '#1e1e1e' : '#ffffff';
  const tooltipBorder = isDark ? '#333' : '#e5e7eb';

  // ── Computed analytics ──
  const analytics = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'active');
    const nonArchivedProjects = projects.filter((p) => p.status !== 'archived');

    const totalProjects = nonArchivedProjects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
    const todoTasks = tasks.filter((t) => t.status === 'todo').length;
    const reviewTasks = tasks.filter((t) => t.status === 'review').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalBudget = nonArchivedProjects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = nonArchivedProjects.reduce((s, p) => s + p.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const pendingRequests = budgetRequests.filter((b) => b.status === 'pending').length;
    const approvedRequests = budgetRequests.filter((b) => b.status === 'approved').length;
    const totalRequestedAmount = budgetRequests.filter((b) => b.status === 'pending').reduce((s, b) => s + b.amount, 0);

    const totalHoursLogged = timeLogs.reduce((s, t) => s + t.hours, 0);
    const totalEstimatedHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);

    const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in-progress').length;
    const resolvedIssues = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const criticalIssues = issues.filter((i) => i.severity === 'critical' && (i.status === 'open' || i.status === 'in-progress')).length;

    const projectBreakdown = nonArchivedProjects.map((project) => {
      const ptasks = tasks.filter((t) => t.projectId === project.id);
      const pCompleted = ptasks.filter((t) => t.status === 'completed').length;
      const pInProgress = ptasks.filter((t) => t.status === 'in-progress').length;
      const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
      const health =
        project.progress >= budgetPct - 10 ? 'on-track' :
        project.progress >= budgetPct - 25 ? 'at-risk' : 'critical';
      const pIssues = issues.filter((i) => i.projectId === project.id && (i.status === 'open' || i.status === 'in-progress')).length;
      return { ...project, ptasks: ptasks.length, pCompleted, pInProgress, budgetPct, health, pIssues };
    });

    const teamMembers = users.filter((u) => u.role === 'employee' && u.status === 'active');
    const teamWorkload = teamMembers.map((member) => {
      const memberTasks = tasks.filter((t) => t.assignedTo === member.id);
      const memberCompleted = memberTasks.filter((t) => t.status === 'completed').length;
      const memberInProgress = memberTasks.filter((t) => t.status === 'in-progress').length;
      const memberHours = timeLogs.filter((t) => t.userId === member.id).reduce((s, t) => s + t.hours, 0);
      const memberProjects = [...new Set(memberTasks.map((t) => t.projectId))].length;
      return { ...member, totalTasks: memberTasks.length, completed: memberCompleted, inProgress: memberInProgress, hoursLogged: memberHours, projectCount: memberProjects };
    });

    const priorityDist = {
      critical: tasks.filter((t) => t.priority === 'critical').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    return {
      totalProjects, totalTasks, completedTasks, inProgressTasks, todoTasks, reviewTasks,
      taskCompletionRate, totalBudget, totalSpent, totalRemaining, budgetUtilization,
      pendingRequests, approvedRequests, totalRequestedAmount,
      totalHoursLogged, totalEstimatedHours,
      openIssues, resolvedIssues, criticalIssues,
      projectBreakdown, teamWorkload, priorityDist, activeProjects
    };
  }, [projects, tasks, issues, budgetRequests, timeLogs, users]);

  // ── Chart data ──
  const taskStatusData = [
    { name: 'Completed', value: analytics.completedTasks, color: '#22c55e' },
    { name: 'In Progress', value: analytics.inProgressTasks, color: '#3b82f6' },
    { name: 'In Review', value: analytics.reviewTasks, color: '#f59e0b' },
    { name: 'To Do', value: analytics.todoTasks, color: '#94a3b8' },
  ];

  const budgetBarData = analytics.projectBreakdown.map((p) => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    Budget: p.budget,
    Spent: p.spent,
    Remaining: Math.max(p.budget - p.spent, 0),
  }));

  const priorityBarData = [
    { name: 'Critical', count: analytics.priorityDist.critical, fill: '#ef4444' },
    { name: 'High', count: analytics.priorityDist.high, fill: '#f97316' },
    { name: 'Medium', count: analytics.priorityDist.medium, fill: '#f59e0b' },
    { name: 'Low', count: analytics.priorityDist.low, fill: '#94a3b8' },
  ];

  const timeBarData = analytics.projectBreakdown.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const estimated = pTasks.reduce((s, t) => s + t.estimatedHours, 0);
    const logged = timeLogs
      .filter((tl) => pTasks.some((t) => t.id === tl.taskId))
      .reduce((s, tl) => s + tl.hours, 0);
    return {
      name: p.name.length > 15 ? p.name.substring(0, 15) + '…' : p.name,
      Estimated: estimated,
      Logged: logged,
    };
  });

  const issueBarData = [
    { name: 'Open', count: issues.filter((i) => i.status === 'open').length, fill: '#ef4444' },
    { name: 'In Progress', count: issues.filter((i) => i.status === 'in-progress').length, fill: '#f59e0b' },
    { name: 'Resolved', count: issues.filter((i) => i.status === 'resolved').length, fill: '#22c55e' },
    { name: 'Closed', count: issues.filter((i) => i.status === 'closed').length, fill: '#94a3b8' },
  ];

  const teamBarData = analytics.teamWorkload.map((m) => ({
    name: m.name.split(' ')[0],
    'In Progress': m.inProgress,
    Completed: m.completed,
    'To Do': m.totalTasks - m.completed - m.inProgress,
  }));

  // ── Stat card helper ──
  const StatCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) => (
    <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs dark:text-dark-muted text-light-muted">{label}</p>
          <p className="text-lg font-bold dark:text-dark-text text-light-text leading-tight">{value}</p>
          {sub && <p className="text-[11px] dark:text-dark-subtle text-light-subtle">{sub}</p>}
        </div>
      </div>
    </div>
  );

  // ── Shared tooltip style ──
  const customTooltipStyle = { backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: textColor };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 dark:bg-dark-card2 bg-light-card2 p-1 rounded-lg w-fit">
        {(['overview', 'projects', 'team', 'raid'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'dark:bg-dark-card bg-white dark:text-dark-text text-light-text shadow-sm' : 'dark:text-dark-muted text-light-muted'}`}>
            {tab === 'overview' ? 'Overview' : tab === 'projects' ? 'Projects' : tab === 'team' ? 'Team' : 'RAID Log'}
          </button>
        ))}
      </div>

      {/* ════════════ OVERVIEW TAB ════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<FolderKanbanIcon size={16} className="text-white" />}
              label="Active Projects"
              value={analytics.activeProjects.length}
              sub={`${analytics.totalProjects} total`}
              color="bg-blue-500/90"
            />
            <StatCard
              icon={<CheckCircleIcon size={16} className="text-white" />}
              label="Task Completion"
              value={`${analytics.taskCompletionRate}%`}
              sub={`${analytics.completedTasks} of ${analytics.totalTasks} tasks`}
              color="bg-green-500/90"
            />
            <StatCard
              icon={<DollarSignIcon size={16} className="text-white" />}
              label="Budget Utilization"
              value={`${analytics.budgetUtilization}%`}
              sub={`${formatCurrency(analytics.totalSpent)} of ${formatCurrency(analytics.totalBudget)}`}
              color="bg-amber-500/90"
            />
            <StatCard
              icon={<AlertTriangleIcon size={16} className="text-white" />}
              label="Open Issues"
              value={analytics.openIssues}
              sub={analytics.criticalIssues > 0 ? `${analytics.criticalIssues} critical` : 'No critical'}
              color={analytics.criticalIssues > 0 ? 'bg-red-500/90' : 'bg-slate-500/90'}
            />
          </div>

          {/* Row 2: Donut Chart (Task Status) + Bar Chart (Budget per Project) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── DONUT PIE CHART: Task Status ── */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Task Status Distribution</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    style={{ fontSize: '11px' }}
                  >
                    {taskStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* ── BAR CHART: Budget vs Spent per Project ── */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Budget vs Spent per Project</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={budgetBarData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} tickFormatter={(v: number) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReBar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <ReBar dataKey="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Priority Bar + Time Tracking Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── HORIZONTAL BAR CHART: Task Priority ── */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Task Priority Breakdown</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityBarData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: textColor }} width={65} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <ReBar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]}>
                    {priorityBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </ReBar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── GROUPED BAR CHART: Time Tracking (Estimated vs Logged) ── */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Time Tracking per Project</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timeBarData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                  <YAxis tick={{ fontSize: 11, fill: textColor }} unit="h" />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => `${value}h`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <ReBar dataKey="Estimated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <ReBar dataKey="Logged" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-2 mt-2">
                {analytics.totalHoursLogged > analytics.totalEstimatedHours ? (
                  <>
                    <TrendingUpIcon size={14} className="text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Over estimate by {analytics.totalHoursLogged - analytics.totalEstimatedHours}h total</span>
                  </>
                ) : (
                  <>
                    <TrendingDownIcon size={14} className="text-green-500" />
                    <span className="text-xs text-green-500 font-medium">{analytics.totalEstimatedHours - analytics.totalHoursLogged}h remaining overall</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Horizontal Bar Chart (Issue Summary) + Budget summary numbers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ── HORIZONTAL BAR CHART: Issues by Status ── */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Issue Summary</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={issueBarData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: textColor }} width={80} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <ReBar dataKey="count" radius={[0, 4, 4, 0]}>
                    {issueBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </ReBar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Budget Summary Numbers */}
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-4">Budget Summary</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs dark:text-dark-muted text-light-muted">Total Budget</span>
                  <span className="text-sm font-bold dark:text-dark-text text-light-text">{formatCurrency(analytics.totalBudget)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs dark:text-dark-muted text-light-muted">Total Spent</span>
                  <span className={`text-sm font-bold ${analytics.budgetUtilization > 90 ? 'text-red-400' : 'text-amber-500'}`}>{formatCurrency(analytics.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs dark:text-dark-muted text-light-muted">Remaining</span>
                  <span className={`text-sm font-bold ${analytics.totalRemaining < 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(analytics.totalRemaining)}</span>
                </div>
                <div className="pt-3 dark:border-dark-border border-t border-light-border">
                  <div className="w-full h-3 rounded-full dark:bg-dark-card2 bg-light-card2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${analytics.budgetUtilization > 90 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(analytics.budgetUtilization, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] dark:text-dark-subtle text-light-subtle mt-1 text-right">{analytics.budgetUtilization}% used</p>
                </div>
                <div className="pt-2 dark:border-dark-border border-t border-light-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs dark:text-dark-muted text-light-muted">Pending Requests</span>
                    <span className="text-xs font-medium text-amber-500">{analytics.pendingRequests} ({formatCurrency(analytics.totalRequestedAmount)})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs dark:text-dark-muted text-light-muted">Approved Requests</span>
                    <span className="text-xs font-medium text-green-500">{analytics.approvedRequests}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ PROJECTS TAB ════════════ */}
      {activeTab === 'projects' && (
        <div className="space-y-5">
          {/* Per-project cards */}
          {analytics.projectBreakdown.map((project) => (
            <div key={project.id} className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">{project.name}</h3>
                    <Badge
                      variant={project.health === 'on-track' ? 'success' : project.health === 'at-risk' ? 'warning' : 'danger'}
                      dot>
                      {project.health === 'on-track' ? 'On Track' : project.health === 'at-risk' ? 'At Risk' : 'Critical'}
                    </Badge>
                    <Badge variant={project.status === 'active' ? 'success' : project.status === 'on-hold' ? 'warning' : 'info'}>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">{project.startDate} → {project.endDate}</p>
                </div>
                {project.pIssues > 0 && (
                  <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangleIcon size={13} />
                    <span className="text-xs font-medium">{project.pIssues} open issue{project.pIssues !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              <ProgressBar value={project.progress} size="sm" showLabel animated />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-3 dark:border-dark-border border-t border-light-border">
                <div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">Budget</p>
                  <p className="text-sm font-bold dark:text-dark-text text-light-text">{formatCurrency(project.budget)}</p>
                </div>
                <div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">Spent</p>
                  <p className={`text-sm font-bold ${project.budgetPct > 90 ? 'text-red-400' : 'dark:text-dark-text text-light-text'}`}>{formatCurrency(project.spent)} ({project.budgetPct}%)</p>
                </div>
                <div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">Total Tasks</p>
                  <p className="text-sm font-bold dark:text-dark-text text-light-text">{project.ptasks}</p>
                </div>
                <div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">In Progress</p>
                  <p className="text-sm font-bold text-blue-500">{project.pInProgress}</p>
                </div>
                <div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">Completed</p>
                  <p className="text-sm font-bold text-green-500">{project.pCompleted}</p>
                </div>
              </div>
            </div>
          ))}

          {analytics.projectBreakdown.length === 0 && (
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-10 text-center">
              <p className="text-sm dark:text-dark-muted text-light-muted">No projects to show.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════ TEAM TAB ════════════ */}
      {activeTab === 'team' && (
        <div className="space-y-5">
          {/* Team summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<UsersIcon size={16} className="text-white" />}
              label="Active Members"
              value={analytics.teamWorkload.length}
              color="bg-blue-500/90"
            />
            <StatCard
              icon={<ClockIcon size={16} className="text-white" />}
              label="Total Hours Logged"
              value={`${analytics.totalHoursLogged}h`}
              color="bg-purple-500/90"
            />
            <StatCard
              icon={<CheckCircleIcon size={16} className="text-white" />}
              label="Tasks Completed"
              value={analytics.completedTasks}
              sub={`${analytics.taskCompletionRate}% rate`}
              color="bg-green-500/90"
            />
            <StatCard
              icon={<FolderKanbanIcon size={16} className="text-white" />}
              label="Avg Tasks/Member"
              value={analytics.teamWorkload.length > 0 ? Math.round(analytics.totalTasks / analytics.teamWorkload.length) : 0}
              color="bg-amber-500/90"
            />
          </div>

          {/* ── STACKED BAR CHART: Team Task Distribution ── */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-2">Team Task Distribution</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={teamBarData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis tick={{ fontSize: 11, fill: textColor }} allowDecimals={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <ReBar dataKey="Completed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <ReBar dataKey="In Progress" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <ReBar dataKey="To Do" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Team workload table */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
            <div className="px-5 py-4 dark:border-dark-border border-b border-light-border">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">Team Workload Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:bg-dark-card2 bg-light-card2">
                    <th className="text-left px-5 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">Member</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">Projects</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">Tasks</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">In Progress</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">Completed</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted">Hours</th>
                    <th className="px-5 py-2.5 text-xs font-medium dark:text-dark-muted text-light-muted text-left">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-dark-border divide-light-border">
                  {analytics.teamWorkload.map((member) => {
                    const rate = member.totalTasks > 0 ? Math.round((member.completed / member.totalTasks) * 100) : 0;
                    return (
                      <tr key={member.id} className="dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-primary/10 text-green-primary flex items-center justify-center text-xs font-bold">{member.avatar}</div>
                            <div>
                              <p className="text-sm font-medium dark:text-dark-text text-light-text">{member.name}</p>
                              <p className="text-[11px] dark:text-dark-subtle text-light-subtle">{member.position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 text-sm dark:text-dark-text text-light-text">{member.projectCount}</td>
                        <td className="text-center px-3 py-3 text-sm font-medium dark:text-dark-text text-light-text">{member.totalTasks}</td>
                        <td className="text-center px-3 py-3 text-sm text-blue-500 font-medium">{member.inProgress}</td>
                        <td className="text-center px-3 py-3 text-sm text-green-500 font-medium">{member.completed}</td>
                        <td className="text-center px-3 py-3 text-sm dark:text-dark-text text-light-text">{member.hoursLogged}h</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full dark:bg-dark-card2 bg-light-card2 overflow-hidden">
                              <div className={`h-full rounded-full ${rate >= 50 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs font-medium dark:text-dark-text text-light-text">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {analytics.teamWorkload.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-sm dark:text-dark-muted text-light-muted">No team members found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ RAID LOG TAB ════════════ */}
      {activeTab === 'raid' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm dark:text-dark-muted text-light-muted">
              {issues.length} total entries
            </p>
          </div>

          {issues.map((issue) => {
            const project = projects.find((p) => p.id === issue.projectId);
            const reporter = users.find((u) => u.id === issue.reportedBy);
            const assignee = users.find((u) => u.id === issue.assignedTo);
            return (
              <div
                key={issue.id}
                className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={TYPE_COLORS[issue.type] as any}>
                        {issue.type.toUpperCase()}
                      </Badge>
                      <PriorityBadge priority={issue.severity} />
                      <StatusBadge status={issue.status} />
                    </div>
                    <h3 className="text-sm font-medium dark:text-dark-text text-light-text mt-2">
                      {issue.title}
                    </h3>
                    <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                      {issue.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs dark:text-dark-subtle text-light-subtle">
                      <span>{project?.name}</span>
                      <span>·</span>
                      <span>Reported by {reporter?.name}</span>
                      {assignee && (
                        <>
                          <span>·</span>
                          <span>Assigned to {assignee.name}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{issue.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(issue)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors"
                      title="Edit">
                      <EditIcon size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(issue.id)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete">
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Issue Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Update Issue"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave}>Save</Button>
          </>
        }>
        <div className="space-y-4">
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
          <Select
            label="Assign To"
            value={editForm.assignedTo}
            onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Issue"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </>
        }>
        <p className="text-sm dark:text-dark-muted text-light-muted">
          Are you sure you want to delete this RAID log entry?
        </p>
      </Modal>
    </div>
  );
}