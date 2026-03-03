import React from 'react';
import {
  CheckSquareIcon,
  ClockIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  ArrowUpRightIcon,
  FolderKanbanIcon } from
'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
export function EmployeeDashboard() {
  const { tasks, projects, timeLogs, budgetRequests } = useData();
  const { currentUser } = useAuth();
  const { setCurrentPage } = useNavigation();
  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.id);
  const myTimeLogs = timeLogs.filter((t) =>
  myTasks.some((mt) => mt.id === t.taskId)
  );
  const myBudgets = budgetRequests.filter(
    (b) => b.requestedBy === currentUser?.id
  );
  const completedTasks = myTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = myTasks.filter(
    (t) => t.status === 'in-progress'
  ).length;
  const totalHours = myTimeLogs.reduce((s, l) => s + l.hours, 0);
  const pendingBudgets = myBudgets.filter((b) => b.status === 'pending').length;
  const myProjects = projects.filter((p) => p.teamIds?.includes(currentUser?.id || ''));
  const recentTasks = [...myTasks].slice(0, 4);
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-black flex-shrink-0"
          style={{
            backgroundColor: '#63D44A'
          }}>

          {currentUser?.avatar}
        </div>
        <div>
          <h2 className="text-base font-semibold dark:text-dark-text text-light-text">
            Welcome back, {currentUser?.name?.split(' ')[0]}
          </h2>
          <p className="text-sm dark:text-dark-muted text-light-muted">
            {currentUser?.position} · {currentUser?.department}
          </p>
        </div>
        <div className="ml-auto hidden sm:block">
          <p className="text-xs dark:text-dark-subtle text-light-subtle text-right">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="w-8 h-8 rounded-lg bg-green-primary/15 flex items-center justify-center mb-3">
            <CheckSquareIcon size={16} className="text-green-primary" />
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {myTasks.length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Assigned Tasks
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            {completedTasks} completed
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center mb-3">
            <TrendingUpIcon size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {inProgressTasks}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            In Progress
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="w-8 h-8 rounded-lg bg-green-interactive/15 flex items-center justify-center mb-3">
            <ClockIcon size={16} className="text-green-interactive" />
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {totalHours}h
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Hours Logged
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center mb-3">
            <AlertTriangleIcon size={16} className="text-yellow-400" />
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {pendingBudgets}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Pending Requests
          </div>
        </div>
      </div>

      {/* My tasks */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card">
        <div className="flex items-center justify-between px-5 py-4 dark:border-dark-border border-b border-light-border">
          <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
            My Active Tasks
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('employee-tasks')}>

            View all
          </Button>
        </div>
        <div className="divide-y dark:divide-dark-border divide-light-border">
          {recentTasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <div key={task.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                      {task.title}
                    </p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                      {project?.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
                <ProgressBar
                  value={task.progress}
                  size="sm"
                  showLabel
                  animated />

                <div className="flex items-center justify-between mt-2 text-xs dark:text-dark-subtle text-light-subtle">
                  <span>
                    {task.loggedHours}h / {task.estimatedHours}h logged
                  </span>
                  <span>Due {task.endDate}</span>
                </div>
              </div>);

          })}
          {recentTasks.length === 0 &&
          <div className="px-5 py-10 text-center text-sm dark:text-dark-subtle text-light-subtle">
              No tasks assigned yet
            </div>
          }
        </div>
      </div>

      {/* My Projects */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card">
        <div className="flex items-center justify-between px-5 py-4 dark:border-dark-border border-b border-light-border">
          <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
            My Projects
          </h2>
          <span className="text-xs dark:text-dark-muted text-light-muted">
            {myProjects.length} project{myProjects.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="divide-y dark:divide-dark-border divide-light-border">
          {myProjects.map((project) => {
            const projectTaskCount = tasks.filter((t) => t.projectId === project.id).length;
            return (
              <div key={project.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                      <FolderKanbanIcon size={14} className="text-green-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                        {project.name}
                      </p>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                        {projectTaskCount} task{projectTaskCount !== 1 ? 's' : ''} · Due {project.endDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={project.status} />
                    <PriorityBadge priority={project.priority} />
                  </div>
                </div>
                <ProgressBar value={project.progress} size="sm" showLabel animated />
              </div>
            );
          })}
          {myProjects.length === 0 && (
            <div className="px-5 py-10 text-center text-sm dark:text-dark-subtle text-light-subtle">
              No projects assigned yet
            </div>
          )}
        </div>
      </div>
    </div>);

}