import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  CalendarIcon,
  LockIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
} from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Task } from '../../data/mockData';
import { Badge, PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

// ── Types ────────────────────────────────────────────────────────────────────
type ZoomLevel = 'week' | 'month' | 'quarter';

interface Column {
  label: string;
  subLabel?: string;
  startDate: Date;
  endDate: Date;
}

// ── Date Helpers ─────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

function formatDateShort(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

// ── Colors ───────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  completed: '#3BC25B',
  'in-progress': '#1FAF8E',
  review: '#8b5cf6',
  todo: '#64748b',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
};

// ═════════════════════════════════════════════════════════════════════════════
export function ViewGanttPage() {
  const { projects, tasks, users } = useData();
  const { currentUser } = useAuth();

  // Only show projects where the current user is a team member
  const myProjects = projects.filter(
    (p) => p.status !== 'archived' && p.teamIds?.includes(currentUser?.id || '')
  );

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedProject, setSelectedProject] = useState('');
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showMyOnly, setShowMyOnly] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const chartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Zoom helpers ───────────────────────────────────────────────────────
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.15;

  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => Math.min(MAX_SCALE, +(prev + SCALE_STEP).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => Math.max(MIN_SCALE, +(prev - SCALE_STEP).toFixed(2)));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomScale(1);
  }, []);

  // Ctrl + mouse wheel zoom on chart
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomScale((prev) => {
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
        return Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(prev + delta).toFixed(2)));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProject && myProjects.length > 0) {
      setSelectedProject(myProjects[0].id);
    }
  }, [myProjects, selectedProject]);

  const project = projects.find((p) => p.id === selectedProject);
  const allProjectTasks = tasks.filter((t) => t.projectId === selectedProject);

  // ── Filters ────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return allProjectTasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (showMyOnly && t.assignedTo !== currentUser?.id) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allProjectTasks, statusFilter, showMyOnly, searchQuery, currentUser]);

  // ── Timeline Range ─────────────────────────────────────────────────────
  const timelineRange = useMemo(() => {
    if (!project) return { start: new Date(), end: new Date(), totalDays: 1 };
    let earliest = parseDate(project.startDate);
    let latest = parseDate(project.endDate);
    allProjectTasks.forEach((t) => {
      const ts = parseDate(t.startDate);
      const te = parseDate(t.endDate);
      if (ts < earliest) earliest = ts;
      if (te > latest) latest = te;
    });
    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth() + 2, 0);
    const totalDays = daysBetween(start, end);
    return { start, end, totalDays: Math.max(totalDays, 1) };
  }, [project, allProjectTasks]);

  // ── Columns ────────────────────────────────────────────────────────────
  const columns = useMemo((): Column[] => {
    const cols: Column[] = [];
    const { start, end } = timelineRange;
    if (zoom === 'week') {
      const cur = new Date(start);
      while (cur <= end) {
        const weekStart = new Date(cur);
        const weekEnd = new Date(cur);
        weekEnd.setDate(weekEnd.getDate() + 6);
        cols.push({
          label: `W${getWeekNumber(weekStart)}`,
          subLabel: `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}`,
          startDate: new Date(weekStart),
          endDate: weekEnd > end ? new Date(end) : weekEnd,
        });
        cur.setDate(cur.getDate() + 7);
      }
    } else if (zoom === 'month') {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        cols.push({
          label: MONTHS_SHORT[cur.getMonth()],
          subLabel: String(cur.getFullYear()),
          startDate: new Date(cur),
          endDate: monthEnd > end ? new Date(end) : monthEnd,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      const cur = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
      while (cur <= end) {
        const qEnd = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
        cols.push({
          label: `Q${Math.floor(cur.getMonth() / 3) + 1}`,
          subLabel: String(cur.getFullYear()),
          startDate: new Date(cur),
          endDate: qEnd > end ? new Date(end) : qEnd,
        });
        cur.setMonth(cur.getMonth() + 3);
      }
    }
    return cols;
  }, [timelineRange, zoom]);

  // ── Pixel helpers ──────────────────────────────────────────────────────
  const COL_BASE_WIDTH = zoom === 'week' ? 80 : zoom === 'month' ? 100 : 140;
  const COL_MIN_WIDTH = Math.round(COL_BASE_WIDTH * zoomScale);
  const totalWidth = columns.length * COL_MIN_WIDTH;

  function getBarLeft(taskStart: string): number {
    const days = daysBetween(timelineRange.start, parseDate(taskStart));
    return (days / timelineRange.totalDays) * totalWidth;
  }

  function getBarWidth(taskStart: string, taskEnd: string): number {
    const days = daysBetween(parseDate(taskStart), parseDate(taskEnd)) + 1;
    return Math.max(16, (days / timelineRange.totalDays) * totalWidth);
  }

  // ── Today marker ───────────────────────────────────────────────────────
  const today = new Date();
  const todayOffset = (() => {
    const days = daysBetween(timelineRange.start, today);
    if (days < 0 || days > timelineRange.totalDays) return null;
    return (days / timelineRange.totalDays) * totalWidth;
  })();

  // ── Group tasks by status ──────────────────────────────────────────────
  const groups = useMemo(() => {
    const order = ['in-progress', 'todo', 'review', 'completed'];
    const map = new Map<string, Task[]>();
    order.forEach((s) => map.set(s, []));
    filteredTasks.forEach((t) => {
      const arr = map.get(t.status) || [];
      arr.push(t);
      map.set(t.status, arr);
    });
    return Array.from(map.entries()).filter(([, tasks]) => tasks.length > 0);
  }, [filteredTasks]);

  const toggleGroup = (status: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // ── Stats ──────────────────────────────────────────────────────────────
  const myTasks = allProjectTasks.filter((t) => t.assignedTo === currentUser?.id);
  const myCompleted = myTasks.filter((t) => t.status === 'completed').length;
  const myOverdue = myTasks.filter((t) => t.status !== 'completed' && parseDate(t.endDate) < today).length;
  const completedCount = allProjectTasks.filter((t) => t.status === 'completed').length;

  // ── Tooltip handler ────────────────────────────────────────────────────
  const handleBarHover = (task: Task, e: React.MouseEvent) => {
    setHoveredTask(task.id);
    const rect = chartRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const hoveredTaskObj = hoveredTask ? filteredTasks.find((t) => t.id === hoveredTask) : null;

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* ── Read-Only Notice ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 dark:bg-dark-card2 dark:border-dark-border bg-light-card2 border border-light-border rounded-lg">
        <LockIcon size={13} className="dark:text-dark-muted text-light-muted flex-shrink-0" />
        <p className="text-xs dark:text-dark-muted text-light-muted">
          Gantt chart is in <strong>read-only mode</strong>. Contact your admin to enable timeline editing.
        </p>
      </div>

      {/* ── Project Tabs + Zoom ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {myProjects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedProject === p.id
                  ? 'bg-green-primary text-black shadow-sm'
                  : 'dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text dark:hover:border-green-primary/30 bg-white border border-light-border text-light-muted hover:text-light-text hover:border-green-600/30'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom level selector */}
          <div className="flex items-center dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg overflow-hidden">
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                  zoom === z
                    ? 'bg-green-primary text-black'
                    : 'dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
          {/* Zoom in/out controls */}
          <div className="flex items-center gap-1 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg px-1.5 py-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomScale <= MIN_SCALE}
              className="p-1 rounded transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-border/50 text-light-muted hover:text-light-text hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <ZoomOutIcon size={14} />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-border/50 text-light-muted hover:text-light-text hover:bg-gray-100 min-w-[38px] text-center"
              title="Reset zoom to 100%"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomScale >= MAX_SCALE}
              className="p-1 rounded transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-border/50 text-light-muted hover:text-light-text hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <ZoomInIcon size={14} />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1 rounded transition-colors dark:text-dark-muted dark:hover:text-dark-text dark:hover:bg-dark-border/50 text-light-muted hover:text-light-text hover:bg-gray-100"
              title="Fit to screen"
            >
              <Maximize2Icon size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── My Tasks Summary ────────────────────────────────────────────── */}
      {project && (
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold dark:text-dark-text text-light-text">
                {project.name}
              </h2>
              <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                {formatDateShort(parseDate(project.startDate))} → {formatDateShort(parseDate(project.endDate))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
          </div>
          <ProgressBar value={project.progress} size="lg" animated showLabel />
          <div className="grid grid-cols-4 gap-4 mt-3">
            <div className="text-center">
              <div className="text-lg font-bold dark:text-dark-text text-light-text">{myTasks.length}</div>
              <div className="text-[10px] dark:text-dark-subtle text-light-subtle">My Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-primary">{myCompleted}</div>
              <div className="text-[10px] dark:text-dark-subtle text-light-subtle">Completed</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${myOverdue > 0 ? 'text-red-400' : 'dark:text-dark-text text-light-text'}`}>{myOverdue}</div>
              <div className="text-[10px] dark:text-dark-subtle text-light-subtle">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold dark:text-dark-text text-light-text">
                {completedCount}<span className="text-xs font-normal dark:text-dark-subtle text-light-subtle">/{allProjectTasks.length}</span>
              </div>
              <div className="text-[10px] dark:text-dark-subtle text-light-subtle">Team Total</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-dark-subtle text-light-subtle" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-text bg-white border border-light-border text-light-text w-48 focus:outline-none focus:ring-1 focus:ring-green-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="review">In Review</option>
          <option value="completed">Completed</option>
        </select>
        <button
          onClick={() => setShowMyOnly(!showMyOnly)}
          className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
            showMyOnly
              ? 'bg-green-primary text-black'
              : 'dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted'
          }`}
        >
          My Tasks Only
        </button>
        <div className="ml-auto text-xs dark:text-dark-subtle text-light-subtle">
          {filteredTasks.length} of {allProjectTasks.length} tasks
        </div>
      </div>

      {/* ── Gantt Chart ─────────────────────────────────────────────────── */}
      <div
        ref={chartRef}
        className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden relative"
      >
        <div ref={scrollContainerRef} className="overflow-x-auto">
          <div style={{ minWidth: `${Math.max(totalWidth + 260, 900)}px` }}>
            {/* Column Headers */}
            <div className="flex dark:border-dark-border border-b border-light-border sticky top-0 z-10 dark:bg-dark-card bg-white">
              <div className="w-[260px] flex-shrink-0 px-4 py-2 dark:border-dark-border border-r border-light-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted">
                  Task / Assignee
                </span>
              </div>
              <div className="flex-1 flex">
                {columns.map((col, i) => {
                  const now = new Date();
                  const isCurrent = now >= col.startDate && now <= col.endDate;
                  return (
                    <div
                      key={i}
                      className={`flex-shrink-0 py-2 text-center dark:border-dark-border border-r border-light-border last:border-r-0 ${
                        isCurrent ? 'dark:bg-green-primary/5 bg-green-50/50' : ''
                      }`}
                      style={{ width: `${COL_MIN_WIDTH}px` }}
                    >
                      <div className="text-xs font-semibold dark:text-dark-text text-light-text">{col.label}</div>
                      {col.subLabel && (
                        <div className="text-[10px] dark:text-dark-subtle text-light-subtle">{col.subLabel}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grouped Task Rows */}
            {groups.map(([status, groupTasks]) => {
              const isCollapsed = collapsedGroups.has(status);
              const statusColor = STATUS_COLORS[status] || '#6b7280';

              return (
                <div key={status}>
                  {/* Group Header */}
                  <div
                    className="flex items-center gap-2 py-1.5 px-4 cursor-pointer select-none dark:bg-dark-card2/50 bg-light-card2/50 dark:border-dark-border border-b border-light-border transition-colors hover:dark:bg-dark-card2 hover:bg-light-card2"
                    onClick={() => toggleGroup(status)}
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon size={13} className="dark:text-dark-muted text-light-muted" />
                    ) : (
                      <ChevronDownIcon size={13} className="dark:text-dark-muted text-light-muted" />
                    )}
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: statusColor }} />
                    <span className="text-xs font-semibold dark:text-dark-text text-light-text capitalize">
                      {status.replace('-', ' ')}
                    </span>
                    <Badge variant="muted" size="sm">{groupTasks.length}</Badge>
                  </div>

                  {/* Tasks */}
                  {!isCollapsed &&
                    groupTasks.map((task, taskIdx) => {
                      const assignee = users.find((u) => u.id === task.assignedTo);
                      const barLeft = getBarLeft(task.startDate);
                      const barWidth = getBarWidth(task.startDate, task.endDate);
                      const barColor = STATUS_COLORS[task.status] || '#6b7280';
                      const isOverdue = task.status !== 'completed' && parseDate(task.endDate) < today;
                      const isMilestone = task.progress === 100;
                      const isMyTask = task.assignedTo === currentUser?.id;

                      return (
                        <div
                          key={task.id}
                          className={`flex dark:border-dark-border border-b border-light-border last:border-b-0 transition-colors ${
                            isMyTask
                              ? 'dark:bg-green-primary/5 bg-green-50/40'
                              : hoveredTask === task.id
                              ? 'dark:bg-green-primary/3 bg-green-50/20'
                              : taskIdx % 2 === 0
                              ? ''
                              : 'dark:bg-dark-card2/20 bg-gray-50/30'
                          }`}
                        >
                          {/* Left — Task Info */}
                          <div className="w-[260px] flex-shrink-0 px-4 py-2.5 dark:border-dark-border border-r border-light-border">
                            <div className="flex items-start gap-2">
                              <div
                                className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#6b7280' }}
                                title={`${task.priority} priority`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  {isMyTask && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-primary flex-shrink-0" />
                                  )}
                                  <p className="text-xs font-medium dark:text-dark-text text-light-text truncate">
                                    {task.title}
                                  </p>
                                  {isOverdue && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 font-medium flex-shrink-0">
                                      LATE
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-black flex-shrink-0"
                                    style={{ backgroundColor: '#63D44A', fontSize: '7px', fontWeight: 700 }}
                                  >
                                    {assignee?.avatar}
                                  </div>
                                  <span className="text-[10px] dark:text-dark-subtle text-light-subtle truncate">
                                    {assignee?.name || 'Unassigned'}
                                  </span>
                                  <span className="text-[10px] dark:text-dark-subtle text-light-subtle ml-auto flex-shrink-0">
                                    {task.progress}%
                                  </span>
                                </div>
                                <div className="mt-1">
                                  <div className="h-1.5 rounded-full dark:bg-dark-border bg-gray-200 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${task.progress}%`, backgroundColor: barColor }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right — Gantt Bar */}
                          <div className="flex-1 relative" style={{ height: '56px' }}>
                            {/* Grid columns */}
                            <div className="absolute inset-0 flex">
                              {columns.map((col, i) => {
                                const now = new Date();
                                const isCurrent = now >= col.startDate && now <= col.endDate;
                                return (
                                  <div
                                    key={i}
                                    className={`flex-shrink-0 h-full dark:border-dark-border border-r border-light-border last:border-r-0 ${
                                      isCurrent ? 'dark:bg-green-primary/3 bg-green-50/20' : ''
                                    }`}
                                    style={{ width: `${COL_MIN_WIDTH}px` }}
                                  />
                                );
                              })}
                            </div>

                            {/* Bar */}
                            <div
                              className="absolute top-1/2 -translate-y-1/2 rounded-md cursor-default group transition-all"
                              style={{ left: `${barLeft}px`, width: `${barWidth}px`, height: '28px', zIndex: 5 }}
                              onMouseEnter={(e) => handleBarHover(task, e)}
                              onMouseMove={(e) => handleBarHover(task, e)}
                              onMouseLeave={() => { setHoveredTask(null); setTooltipPos(null); }}
                            >
                              {/* Bar background */}
                              <div
                                className="absolute inset-0 rounded-md"
                                style={{ backgroundColor: barColor, opacity: task.status === 'todo' ? 0.2 : 0.15 }}
                              />
                              {/* Progress fill */}
                              <div
                                className="absolute left-0 top-0 h-full rounded-l-md transition-all"
                                style={{
                                  width: `${task.progress}%`,
                                  backgroundColor: barColor,
                                  opacity: task.status === 'todo' ? 0.5 : 0.85,
                                  borderRadius: task.progress === 100 ? '0.375rem' : '0.375rem 0 0 0.375rem',
                                }}
                              />
                              {/* Border */}
                              <div
                                className="absolute inset-0 rounded-md border transition-all"
                                style={{
                                  borderColor: isMyTask ? '#63D44A' : barColor,
                                  borderWidth: isMyTask ? '2px' : '1.5px',
                                  boxShadow: hoveredTask === task.id ? `0 0 12px ${barColor}40` : 'none',
                                }}
                              />
                              {/* Label */}
                              {barWidth > 50 && (
                                <div className="absolute inset-0 flex items-center px-2 z-10">
                                  <span className="dark:text-white text-gray-900 font-semibold truncate" style={{ fontSize: '10px' }}>
                                    <span className="dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] drop-shadow-[0_0px_3px_rgba(255,255,255,0.9)]">{task.title}</span>
                                  </span>
                                  <span className="ml-auto dark:text-white/80 text-gray-800 font-medium flex-shrink-0" style={{ fontSize: '9px' }}>
                                    <span className="dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] drop-shadow-[0_0px_3px_rgba(255,255,255,0.9)]">{task.progress}%</span>
                                  </span>
                                </div>
                              )}
                              {/* Milestone diamond */}
                              {isMilestone && (
                                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-green-primary border-2 border-white dark:border-dark-card z-20" />
                              )}
                              {/* Overdue end marker */}
                              {isOverdue && (
                                <div className="absolute -right-0.5 top-0 bottom-0 w-1 rounded-r-md bg-red-500" />
                              )}
                            </div>

                            {/* Today line */}
                            {todayOffset !== null && (
                              <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${todayOffset}px` }}>
                                <div className="w-px h-full bg-red-500/60" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
                <CalendarIcon size={40} className="mb-3 opacity-30" />
                <p className="text-sm">No tasks found for the current filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Today Label */}
        {todayOffset !== null && (
          <div className="absolute top-0 z-30 pointer-events-none" style={{ left: `${todayOffset + 260}px` }}>
            <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b-md">TODAY</div>
          </div>
        )}

        {/* Tooltip */}
        {hoveredTaskObj && tooltipPos && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: `${Math.min(tooltipPos.x + 12, (chartRef.current?.offsetWidth || 600) - 260)}px`,
              top: `${tooltipPos.y - 10}px`,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg shadow-xl p-3 w-60">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[hoveredTaskObj.status] }} />
                <p className="text-xs font-semibold dark:text-dark-text text-light-text truncate">{hoveredTaskObj.title}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Status</span>
                  <span className="dark:text-dark-text text-light-text capitalize font-medium">{hoveredTaskObj.status.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Priority</span>
                  <span className="font-medium capitalize" style={{ color: PRIORITY_COLORS[hoveredTaskObj.priority] }}>{hoveredTaskObj.priority}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Timeline</span>
                  <span className="dark:text-dark-text text-light-text font-medium">
                    {formatDateShort(parseDate(hoveredTaskObj.startDate))} → {formatDateShort(parseDate(hoveredTaskObj.endDate))}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Progress</span>
                  <span className="dark:text-dark-text text-light-text font-medium">{hoveredTaskObj.progress}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Hours</span>
                  <span className="dark:text-dark-text text-light-text font-medium">{hoveredTaskObj.loggedHours}h / {hoveredTaskObj.estimatedHours}h</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="dark:text-dark-subtle text-light-subtle">Assignee</span>
                  <span className="dark:text-dark-text text-light-text font-medium">
                    {users.find((u) => u.id === hoveredTaskObj.assignedTo)?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="pt-1">
                  <div className="h-1.5 rounded-full dark:bg-dark-border bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${hoveredTaskObj.progress}%`, backgroundColor: STATUS_COLORS[hoveredTaskObj.status] }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card px-5 py-3">
        <div className="flex items-center gap-6 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] dark:text-dark-muted text-light-muted capitalize">{status.replace('-', ' ')}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rotate-45 bg-green-primary" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Milestone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px bg-red-500" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-primary" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">My Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm bg-red-500/60" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Overdue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
