import React from 'react';
import {
  CheckSquareIcon,
  ClockIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  ArrowUpRightIcon,
  FolderKanbanIcon } from
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
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { UserAvatar } from '../../components/ui/UserAvatar';
export function EmployeeDashboard() {
  const { tasks, projects, timeLogs, budgetRequests } = useData();
  const { currentUser } = useAuth();
  const { setCurrentPage } = useNavigation();
  const today = new Date();
  const myProjects = projects.filter((p) => p.teamIds?.includes(currentUser?.id || ''));
  const myProjectIds = myProjects.map((p) => p.id);
  // Show only tasks assigned to the current user
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
  const recentTasks = [...myTasks].slice(0, 4);
  const myTaskStatusChartData = [
  { name: 'To Do', count: myTasks.filter((t) => t.status === 'todo').length },
  { name: 'In Progress', count: myTasks.filter((t) => t.status === 'in-progress').length },
  { name: 'Review', count: myTasks.filter((t) => t.status === 'review').length },
  { name: 'Done', count: myTasks.filter((t) => t.status === 'completed').length }
  ];
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
  const myActivityLineData = dayLabels.map((day) => {
    const completed = myTasks.filter((t) => {
      if (t.status !== 'completed') return false;
      const d = new Date(t.endDate);
      return !isNaN(d.getTime()) && dateKey(d) === day.key;
    }).length;
    const started = myTasks.filter((t) => {
      const d = new Date(t.startDate);
      return !isNaN(d.getTime()) && dateKey(d) === day.key;
    }).length;
    return {
      day: day.label,
      completed,
      started
    };
  });
  const myWorkloadChannelData = dayLabels.map((day) => {
    const dueToday = myTasks.filter((t) => {
      const d = new Date(t.endDate);
      return !isNaN(d.getTime()) && dateKey(d) === day.key;
    });
    return {
      day: day.label,
      critical: dueToday.filter((t) => t.priority === 'critical').length,
      high: dueToday.filter((t) => t.priority === 'high').length,
      medium: dueToday.filter((t) => t.priority === 'medium').length,
      low: dueToday.filter((t) => t.priority === 'low').length
    };
  });
  const weekLabels = Array.from({ length: 6 }, (_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (5 - index) * 7);
    return {
      label: `W${index + 1}`,
      start: new Date(d.getFullYear(), d.getMonth(), d.getDate())
    };
  });
  const myHoursTrendData = weekLabels.map((week) => {
    const end = new Date(week.start);
    end.setDate(week.start.getDate() + 6);
    const loggedHours = myTimeLogs.filter((log) => {
      const d = new Date(log.date);
      if (isNaN(d.getTime())) return false;
      return d >= week.start && d <= end;
    }).reduce((sum, log) => sum + log.hours, 0);
    const completedInWeek = myTasks.filter((task) => {
      if (task.status !== 'completed') return false;
      const d = new Date(task.endDate);
      if (isNaN(d.getTime())) return false;
      return d >= week.start && d <= end;
    }).length;
    return {
      week: week.label,
      hours: loggedHours,
      completed: completedInWeek
    };
  });
  const myProjectHealthData = [
  {
    name: 'On Track',
    value: myProjects.filter((p) => p.progress >= 70).length,
    color: '#22c55e'
  },
  {
    name: 'Needs Attention',
    value: myProjects.filter((p) => p.progress >= 40 && p.progress < 70).length,
    color: '#f59e0b'
  },
  {
    name: 'At Risk',
    value: myProjects.filter((p) => p.progress < 40).length,
    color: '#ef4444'
  }
  ];
  const hasMyActivityData = myActivityLineData.some((d) => d.completed > 0 || d.started > 0);
  const hasMyWorkloadData = myWorkloadChannelData.some((d) => d.critical > 0 || d.high > 0 || d.medium > 0 || d.low > 0);
  const hasMyTaskBreakdownData = myTaskStatusChartData.some((d) => d.count > 0);
  const hasMyHoursTrendData = myHoursTrendData.some((d) => d.hours > 0 || d.completed > 0);
  const myProjectHealthTotal = myProjectHealthData.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 flex items-center gap-4">
        <UserAvatar
          name={currentUser?.name || 'User'}
          avatarText={currentUser?.avatar}
          profilePhoto={currentUser?.profilePhoto}
          className="w-12 h-12"
          textClassName="text-base font-bold text-black"
          fallbackStyle={{ backgroundColor: '#63D44A' }}
        />
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

      {/* Analytics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              My Work Activity Trend
            </h2>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Last 7 days</span>
          </div>
          <div className="text-2xl font-bold dark:text-dark-text text-light-text tabular-nums mb-3">
            {completedTasks}
            <span className="ml-1 text-xs font-medium dark:text-dark-subtle text-light-subtle">completed tasks</span>
          </div>
          <ResponsiveContainer width="100%" height={235}>
            <LineChart data={myActivityLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#0E8F79" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="started" name="Started" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {!hasMyActivityData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No activity records found for this period.</p>
          )}
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
              My Due Workload by Priority
            </h2>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={275}>
            <BarChart data={myWorkloadChannelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReBar dataKey="critical" name="Critical" stackId="work" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <ReBar dataKey="high" name="High" stackId="work" fill="#f97316" radius={[3, 3, 0, 0]} />
              <ReBar dataKey="medium" name="Medium" stackId="work" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <ReBar dataKey="low" name="Low" stackId="work" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {!hasMyWorkloadData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No due-priority records found for this period.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">My Task Breakdown</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Current</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={myTaskStatusChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReBar dataKey="count" fill="#1FAF8E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {!hasMyTaskBreakdownData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No task breakdown records available.</p>
          )}
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">Hours vs Completion</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Last 6 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={myHoursTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#33415522" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" name="Hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke="#63D44A" strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
          {!hasMyHoursTrendData && (
            <p className="mt-2 text-xs dark:text-dark-subtle text-light-subtle">No hours trend records found for this period.</p>
          )}
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">My Project Health</h3>
            <span className="text-xs dark:text-dark-subtle text-light-subtle">Progress bands</span>
          </div>
          {myProjectHealthTotal > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={myProjectHealthData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {myProjectHealthData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs dark:text-dark-subtle text-light-subtle">
              No project health records available.
            </div>
          )}
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