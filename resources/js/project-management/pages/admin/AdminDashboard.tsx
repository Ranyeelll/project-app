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
import { useData, useNavigation } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
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
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedProjects = projects.filter(
    (p) => p.status === 'completed'
  ).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const activeEmployees = users.filter(
    (u) => u.role === 'employee' && u.status === 'active'
  ).length;
  const pendingBudgets = budgetRequests.filter(
    (b) => b.status === 'pending'
  ).length;
  const openIssues = issues.filter(
    (i) => i.status === 'open' || i.status === 'in-progress'
  ).length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const recentProjects = [...projects].
  filter((p) => p.status !== 'archived').
  sort(
    (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).
  slice(0, 4);
  const recentTasks = [...tasks].
  filter((t) => t.status === 'in-progress').
  slice(0, 5);
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
          value={`${Math.round(totalSpent / totalBudget * 100)}%`}
          sub={`${formatCurrency(totalSpent)} of ${formatCurrency(totalBudget)}`}
          icon={<DollarSignIcon size={18} />}
          color="#0E8F79" />

      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                projects.reduce((s, p) => s + p.progress, 0) / projects.length
              )}
              %
            </div>
            <div className="text-xs text-green-primary">
              Avg Project Progress
            </div>
          </div>
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
              const assignee = useData().users.find(
                (u) => u.id === task.assignedTo
              );
              return (
                <div key={task.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: '#63D44A'
                      }}>

                      {assignee?.avatar}
                    </div>
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