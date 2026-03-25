import React from 'react';
import {
  FolderKanbanIcon,
  CheckSquareIcon,
  UsersIcon,
  DollarSignIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowUpRightIcon } from
'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useData, useNavigation } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { UserAvatar } from '../../components/ui/UserAvatar';
function StatCard({
  label,
  value,
  sub,
  icon,
  color






}: {label: string;value: string | number;sub?: string;icon: React.ReactNode;color: string;}) {
  return (
    <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${color}18`
          }}>

          <span
            style={{
              color
            }}>

            {icon}
          </span>
        </div>
      </div>
      <div className="text-2xl font-bold dark:text-dark-text text-light-text tabular-nums">
        {value}
      </div>
      <div className="text-sm dark:text-dark-muted text-light-muted mt-0.5">
        {label}
      </div>
      {sub &&
      <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
          {sub}
        </div>
      }
    </div>);

}
export function AdminDashboard() {
  const { projects, tasks, users, budgetRequests, issues } = useData();
  const { setCurrentPage } = useNavigation();
  const today = new Date();
  const nonArchivedProjects = projects.filter((p) => p.status !== 'archived');
  const scopedProjectIds = new Set(nonArchivedProjects.map((p) => p.id));
  const scopedTasks = tasks.filter((t) => scopedProjectIds.has(t.projectId));
  const scopedIssues = issues.filter((i) => scopedProjectIds.has(i.projectId));
  const scopedBudgetRequests = budgetRequests.filter((b) => scopedProjectIds.has(b.projectId));

  const activeProjects = nonArchivedProjects.filter((p) => p.status === 'active').length;
  const completedProjects = nonArchivedProjects.filter((p) => p.status === 'completed').length;
  const totalTasks = scopedTasks.length;
  const completedTasks = scopedTasks.filter((t) => t.status === 'completed').length;
  const activeEmployees = users.filter(
    (u) => u.role === 'employee' && u.status === 'active'
  ).length;
  const pendingBudgets = scopedBudgetRequests.filter(
    (b) => b.status === 'pending'
  ).length;
  const employeeCompletionSubmissions = nonArchivedProjects.filter((p) => {
    if ((p.approvalStatus || 'draft') !== 'technical_review') return false;
    if (!p.submittedBy) return false;
    const submitter = users.find((u) => u.id === p.submittedBy);
    return submitter?.department === 'Employee';
  }).length;
  const openIssues = scopedIssues.filter(
    (i) => i.status === 'open' || i.status === 'in-progress'
  ).length;
  const totalBudget = nonArchivedProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = nonArchivedProjects.reduce((s, p) => s + p.spent, 0);
  const budgetUtilization = totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0;
  const recentProjects = [...nonArchivedProjects].
  filter((p) => p.status !== 'archived').
  sort(
    (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).
  slice(0, 4);
  const recentTasks = [...scopedTasks].
  filter((t) => t.status === 'in-progress').
  slice(0, 5);
  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const shortDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayLabels = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - index));
    return {
      label: shortDay(d),
      key: dateKey(d)
    };
  });
  const activityLineData = dayLabels.map((day) => {
    const completed = tasks.filter((t) => {
      if (!scopedProjectIds.has(t.projectId)) return false;
      if (t.status !== 'completed') return false;
      const d = new Date(t.endDate);
      return !isNaN(d.getTime()) && dateKey(d) === day.key;
    }).length;
    const started = tasks.filter((t) => {
      if (!scopedProjectIds.has(t.projectId)) return false;
      const d = new Date(t.startDate);
      return !isNaN(d.getTime()) && dateKey(d) === day.key;
    }).length;
    return {
      day: day.label,
      completed,
      started
    };
  });
  const projectPriorityData = [
    {
      priority: 'Critical',
      count: nonArchivedProjects.filter((p) => p.priority === 'critical').length,
      color: '#ef4444',
    },
    {
      priority: 'High',
      count: nonArchivedProjects.filter((p) => p.priority === 'high').length,
      color: '#f97316',
    },
    {
      priority: 'Medium',
      count: nonArchivedProjects.filter((p) => p.priority === 'medium').length,
      color: '#f59e0b',
    },
    {
      priority: 'Low',
      count: nonArchivedProjects.filter((p) => p.priority === 'low').length,
      color: '#3b82f6',
    },
  ];
  const teamLoadData = users
  .filter((u) => {
    if (u.status !== 'active') return false;
    return scopedTasks.some((t) => String(t.assignedTo) === String(u.id));
  })
  .map((u) => {
    const assigned = scopedTasks.filter((t) => String(t.assignedTo) === String(u.id));
    const done = assigned.filter((t) => t.status === 'completed').length;
    return {
      name: u.name.split(' ')[0],
      assigned: assigned.length,
      done
    };
  })
  .sort((a, b) => b.assigned - a.assigned)
  .slice(0, 6);
  const severityData = [
  {
    name: 'Critical',
    value: scopedIssues.filter((i) => i.severity === 'critical' && (i.status === 'open' || i.status === 'in-progress')).length,
    color: '#ef4444'
  },
  {
    name: 'High',
    value: scopedIssues.filter((i) => i.severity === 'high' && (i.status === 'open' || i.status === 'in-progress')).length,
    color: '#f97316'
  },
  {
    name: 'Medium',
    value: scopedIssues.filter((i) => i.severity === 'medium' && (i.status === 'open' || i.status === 'in-progress')).length,
    color: '#f59e0b'
  },
  {
    name: 'Low',
    value: scopedIssues.filter((i) => i.severity === 'low' && (i.status === 'open' || i.status === 'in-progress')).length,
    color: '#3b82f6'
  }
  ];
  const monthLabels = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    return {
      label: d.toLocaleString('en-US', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    };
  });
  const completionTrendData = monthLabels.map((month) => {
    const completed = tasks.filter((t) => {
      if (!scopedProjectIds.has(t.projectId)) return false;
      if (t.status !== 'completed') return false;
      const d = new Date(t.endDate);
      if (isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month.key;
    }).length;
    const startedProjects = nonArchivedProjects.filter((p) => {
      const d = new Date(p.startDate);
      if (isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month.key;
    }).length;
    return {
      month: month.label,
      completedTasks: completed,
      startedProjects
    };
  });
  const hasActivityData = activityLineData.some((d) => d.completed > 0 || d.started > 0);
  const completedTasksLast7Days = activityLineData.reduce((sum, day) => sum + day.completed, 0);
  const hasWorkloadData = projectPriorityData.some((d) => d.count > 0);
  const hasTeamLoadData = teamLoadData.length > 0;
  const severityTotal = severityData.reduce((sum, item) => sum + item.value, 0);
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={activeProjects}
          sub={`${completedProjects} completed`}
          icon={<FolderKanbanIcon size={18} />}
          color="#63D44A" />

        <StatCard
          label="Total Tasks"
          value={totalTasks}
          sub={`${completedTasks} completed`}
          icon={<CheckSquareIcon size={18} />}
          color="#1FAF8E" />

        <StatCard
          label="Team Members"
          value={activeEmployees}
          sub="Active employees"
          icon={<UsersIcon size={18} />}
          color="#3BC25B" />

        <StatCard
          label="Budget Utilization"
          value={`${budgetUtilization}%`}
          sub={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)}`}
          icon={<DollarSignIcon size={18} />}
          color="#0E8F79" />

      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="dark:bg-yellow-500/5 dark:border-yellow-500/20 bg-yellow-50 border border-yellow-200 rounded-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0">
            <DollarSignIcon size={16} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-lg font-bold dark:text-dark-text text-light-text">
              {pendingBudgets}
            </div>
            <div className="text-xs dark:text-yellow-400 text-yellow-600">
              Pending Budget Requests
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('admin-budget')}
            className="ml-auto text-yellow-400 hover:text-yellow-300">

            <ArrowUpRightIcon size={14} />
          </button>
        </div>
        <div className="dark:bg-blue-500/5 dark:border-blue-500/20 bg-blue-50 border border-blue-200 rounded-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <ClockIcon size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-lg font-bold dark:text-dark-text text-light-text">
              {tasks.filter((t) => t.completionReportStatus === 'pending').length}
            </div>
            <div className="text-xs dark:text-blue-400 text-blue-600">
              Pending Task Reviews
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('admin-reviews')}
            className="ml-auto text-blue-400 hover:text-blue-300">

            <ArrowUpRightIcon size={14} />
          </button>
        </div>
        <div className="dark:bg-green-primary/5 dark:border-green-primary/20 bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
            <FolderKanbanIcon size={16} className="text-green-primary" />
          </div>
          <div>
            <div className="text-lg font-bold dark:text-dark-text text-light-text">
              {employeeCompletionSubmissions}
            </div>
            <div className="text-xs text-green-primary">
              Employee Completion Submissions
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('admin-projects')}
            className="ml-auto text-green-primary hover:text-green-progress"
            title="Open Projects"
          >
            <ArrowUpRightIcon size={14} />
          </button>
        </div>
        <div className="dark:bg-red-500/5 dark:border-red-500/20 bg-red-50 border border-red-200 rounded-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangleIcon size={16} className="text-red-400" />
          </div>
          <div>
            <div className="text-lg font-bold dark:text-dark-text text-light-text">
              {openIssues}
            </div>
            <div className="text-xs dark:text-red-400 text-red-600">
              Open Issues / Risks
            </div>
          </div>
          <button
            onClick={() => setCurrentPage('admin-monitor')}
            className="ml-auto text-red-400 hover:text-red-300">

            <ArrowUpRightIcon size={14} />
          </button>
        </div>
        <div className="dark:bg-green-primary/5 dark:border-green-primary/20 bg-green-50 border border-green-200 rounded-card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
            <TrendingUpIcon size={16} className="text-green-primary" />
          </div>
          <div>
            <div className="text-lg font-bold dark:text-dark-text text-light-text">
              {Math.round(
                nonArchivedProjects.length > 0
                  ? nonArchivedProjects.reduce((s, p) => s + p.progress, 0) / nonArchivedProjects.length
                  : 0
              )}
              %
            </div>
            <div className="text-xs text-green-primary">
              Avg Project Progress
            </div>
          </div>
        </div>
      </div>

      {/* Analytics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              Work Activity Trend
            </h2>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Last 7 days</span>
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text tabular-nums mb-3">
            {completedTasksLast7Days}
            <span className="ml-1 text-xs font-medium dark:text-dark-subtle text-light-subtle">completed in last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={activityLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#0E8F79" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="started" name="Started" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {!hasActivityData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No activity records found for this period.</p>
          )}
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              Projects by Priority
            </h2>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Based on project count</span>
          </div>
          <ResponsiveContainer width="100%" height={275}>
            <BarChart data={projectPriorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number | undefined) => [value ?? 0, 'Projects']}
                contentStyle={{
                  backgroundColor: '#0f1115',
                  border: '1px solid #2a303c',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#cbd5e1' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <ReBar dataKey="count" name="Projects" radius={[6, 6, 0, 0]}>
                {projectPriorityData.map((entry) => (
                  <Cell key={entry.priority} fill={entry.color} />
                ))}
              </ReBar>
            </BarChart>
          </ResponsiveContainer>
          {!hasWorkloadData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No project-priority records found.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">Top Active Projects</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">This month</span>
          </div>
          <div className="space-y-2.5">
            {recentProjects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between">
                <span className="text-xs dark:text-dark-text text-light-text truncate pr-2">{project.name}</span>
                <span className="text-xs font-semibold text-green-primary tabular-nums">{project.progress}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">Team Task Load</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Top 6</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={teamLoadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReBar dataKey="assigned" name="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <ReBar dataKey="done" name="Done" fill="#63D44A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {!hasTeamLoadData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No team workload records available.</p>
          )}
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">Issue Severity</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Open / In-progress</span>
          </div>
          {severityTotal > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs dark:text-dark-subtle text-light-subtle">
              No issue severity records available.
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Projects */}
        <div className="lg:col-span-3 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card">
          <div className="flex items-center justify-between px-5 py-4 dark:border-dark-border border-b border-light-border">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              Active Projects
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('admin-projects')}>

              View all
            </Button>
          </div>
          <div className="divide-y dark:divide-dark-border divide-light-border">
            {recentProjects.map((project) =>
            <div key={project.id} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                      {project.name}
                    </p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5 truncate">
                      {project.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={project.status} />
                    <PriorityBadge priority={project.priority} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar
                  value={project.progress}
                  size="sm"
                  showLabel
                  animated />

                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs dark:text-dark-subtle text-light-subtle">
                    {formatCurrency(project.spent)} /{' '}
                    {formatCurrency(project.budget)}
                  </span>
                  <span className="text-xs dark:text-dark-subtle text-light-subtle">
                    Due{' '}
                    {new Date(project.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* In-progress tasks */}
        <div className="lg:col-span-2 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card">
          <div className="flex items-center justify-between px-5 py-4 dark:border-dark-border border-b border-light-border">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              In-Progress Tasks
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('admin-projects')}>

              View all
            </Button>
          </div>
          <div className="divide-y dark:divide-dark-border divide-light-border">
            {recentTasks.map((task) => {
              const assignee = users.find(
                (u) => u.id === task.assignedTo
              );
              return (
                <div key={task.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={assignee?.name || 'Unknown User'}
                      avatarText={assignee?.avatar}
                      profilePhoto={assignee?.profilePhoto}
                      className="w-6 h-6 mt-0.5"
                      textClassName="text-xs font-bold text-black"
                      fallbackStyle={{ backgroundColor: '#63D44A' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-dark-text text-light-text font-medium truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <PriorityBadge priority={task.priority} />
                        <span className="text-xs dark:text-dark-subtle text-light-subtle">
                          {assignee?.name}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar
                          value={task.progress}
                          size="sm"
                          showLabel />

                      </div>
                    </div>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </div>
    </div>);

}