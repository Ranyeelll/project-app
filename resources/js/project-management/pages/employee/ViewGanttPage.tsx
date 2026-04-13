import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
  CalendarIcon,
  GanttChartIcon,
} from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { GanttItem } from '../../data/mockData';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { GanttCalendarView } from '../../components/gantt/GanttCalendarView';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type ZoomLevel = 'week' | 'month' | 'quarter';
interface Column { label: string; subLabel?: string; startDate: Date; endDate: Date; }
interface VisualDependency { id: string; predecessorId: string; successorId: string; auto?: boolean; }

const ROW_HEIGHT = 34;
const BAR_H = 16;
const TREE_W = 720;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Pastel palette (Gelato Days) provided by design
// #FFCBE1 pink, #D6E5BD green, #F9E1A8 yellow, #BCD8EC blue, #DCCCEC purple, #FFDAB4 peach
const GANTT_STATUS_COLOR = {
  done: '#D6E5BD',      // pastel green
  working: '#F9E1A8',   // pastel yellow
  stuck: '#FFCBE1',     // pastel pink
  milestone: '#BCD8EC', // pastel blue
} as const;

function getItemColor(item: GanttItem): string {
  if (item.type === 'milestone') return GANTT_STATUS_COLOR.milestone;
  if (item.progress >= 100) return GANTT_STATUS_COLOR.done;
  if (item.progress <= 0) return GANTT_STATUS_COLOR.stuck;
  return GANTT_STATUS_COLOR.working;
}

function getStateMeta(item: GanttItem): { label: 'planned' | 'in process' | 'completed'; dot: string } {
  if (item.progress >= 100) return { label: 'completed', dot: GANTT_STATUS_COLOR.done };
  if (item.progress <= 0) return { label: 'planned', dot: GANTT_STATUS_COLOR.stuck };
  return { label: 'in process', dot: GANTT_STATUS_COLOR.working };
}

function daysBetween(a: Date, b: Date) { return Math.floor((b.getTime() - a.getTime()) / 86400000); }
function parseDate(s: string): Date {
  // Accept ISO timestamps from API (with time / timezone). If the string
  // is date-only (YYYY-MM-DD) construct a local Date at midnight to avoid
  // implicit UTC parsing that shifts days in some browsers.
  if (!s) return new Date(NaN);
  if (s.includes('T') || /[zZ]|[+-]\d{2}:?\d{2}/.test(s)) {
    return new Date(s);
  }
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function toYmd(d: Date): string { return d.toISOString().slice(0, 10); }
function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}
function durationByType(type: GanttItem['type']): number {
  if (type === 'phase') return 10;
  if (type === 'step') return 7;
  if (type === 'subtask') return 4;
  return 1;
}
function dependencyPath(from: { y: number; rightX: number }, to: { y: number; leftX: number }): string {
  const x1 = from.rightX + 3;
  const y1 = from.y;
  const x2 = to.leftX - 3;
  const y2 = to.y;

  const lead = 10;
  if (x2 >= x1 + lead) {
    const pivotX = x1 + lead;
    return `M ${x1} ${y1} H ${pivotX} V ${y2} H ${x2}`;
  }

  const detourX = Math.max(x1 + 22, x2 + 22);
  return `M ${x1} ${y1} H ${detourX} V ${y2} H ${x2}`;
}
function dateShort(s: string) {
  const d = parseDate(s);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function dateLong(s: string) {
  const d = parseDate(s);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
function getWeekNumber(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}
function dayLabel(d: Date): string {
  const labels = ['S', 'M', 'T', 'W', 'Th', 'F', 'S'];
  return labels[d.getDay()];
}

export function ViewGanttPage() {
  const { projects, users, ganttItems, ganttDependencies, refreshGanttItems, refreshGanttDependencies } = useData();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const myProjects = projects.filter(
    p => p.status !== 'archived' && (
      String(p.managerId) === String(currentUser?.id)
      || String(p.leaderId || '') === String(currentUser?.id)
      || (p.teamIds || []).map(String).includes(String(currentUser?.id))
    )
  );

  const [selectedProject, setSelectedProject] = useState('');
  const [viewMode, setViewMode] = useState<'gantt' | 'calendar'>('gantt');
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [zoomScale, setZoomScale] = useState(1);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const treeScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedProject && myProjects.length > 0) setSelectedProject(myProjects[0].id);
  }, [myProjects, selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      refreshGanttItems(selectedProject);
      refreshGanttDependencies(selectedProject);
    }
  }, [selectedProject]);

  const handleTreeScroll = useCallback(() => {
    if (timelineScrollRef.current && treeScrollRef.current) timelineScrollRef.current.scrollTop = treeScrollRef.current.scrollTop;
  }, []);
  const handleTimelineScroll = useCallback(() => {
    if (treeScrollRef.current && timelineScrollRef.current) treeScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
  }, []);

  const MIN_SCALE = 0.3; const MAX_SCALE = 3; const SCALE_STEP = 0.15;
  const zoomIn = useCallback(() => setZoomScale(p => Math.min(MAX_SCALE, +(p + SCALE_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoomScale(p => Math.max(MIN_SCALE, +(p - SCALE_STEP).toFixed(2))), []);

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoomScale(p => { const d = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP; return Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(p + d).toFixed(2))); });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const project = projects.find(p => p.id === selectedProject);
  const projectItems = ganttItems.filter(i => i.projectId === selectedProject);
  const projectDeps = ganttDependencies.filter(d => d.projectId === selectedProject);

  const visibleItems = useMemo(() => {
    return projectItems.filter(item => {
      if (!item.parentId) return true;
      let pid: string | null = item.parentId;
      while (pid) {
        if (collapsedIds.has(pid)) return false;
        const parent = projectItems.find(i => i.id === pid);
        pid = parent?.parentId ?? null;
      }
      return true;
    });
  }, [projectItems, collapsedIds]);

  const timelineRange = useMemo(() => {
    if (project?.startDate && project?.endDate) {
      const start = parseDate(project.startDate);
      const end = parseDate(project.endDate);
      if (end >= start) {
        return { start, end, totalDays: Math.max(daysBetween(start, end) + 1, 1) };
      }
    }

    const dates: Date[] = [];
    projectItems.forEach(i => { if (i.startDate) dates.push(parseDate(i.startDate)); if (i.endDate) dates.push(parseDate(i.endDate)); });
    if (project?.startDate) dates.push(parseDate(project.startDate));
    if (project?.endDate) dates.push(parseDate(project.endDate));
    if (dates.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      return { start, end, totalDays: daysBetween(start, end) + 1 };
    }
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const start = min;
    const end = max;
    return { start, end, totalDays: Math.max(daysBetween(start, end) + 1, 1) };
  }, [projectItems, project]);

  const columns = useMemo((): Column[] => {
    const cols: Column[] = [];
    const { start, end } = timelineRange;
    if (zoom === 'week') {
      const cur = new Date(start);
      while (cur <= end) {
        cols.push({
          label: dayLabel(cur),
          subLabel: String(cur.getDate()),
          startDate: new Date(cur),
          endDate: new Date(cur),
        });
        cur.setDate(cur.getDate() + 1);
      }
    } else if (zoom === 'month') {
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        const me = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        cols.push({ label: MONTHS_SHORT[cur.getMonth()], subLabel: String(cur.getFullYear()), startDate: new Date(cur), endDate: me > end ? new Date(end) : me });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      const cur = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
      while (cur <= end) {
        const qe = new Date(cur.getFullYear(), cur.getMonth() + 3, 0);
        cols.push({ label: `Q${Math.floor(cur.getMonth() / 3) + 1}`, subLabel: String(cur.getFullYear()), startDate: new Date(cur), endDate: qe > end ? new Date(end) : qe });
        cur.setMonth(cur.getMonth() + 3);
      }
    }
    return cols;
  }, [timelineRange, zoom]);

  const DAY_BASE = zoom === 'week' ? 34 : zoom === 'month' ? 10 : 6;
  const DAY_W = Math.max(4, Math.round(DAY_BASE * zoomScale));
  const colWidth = (col: Column) => (daysBetween(col.startDate, col.endDate) + 1) * DAY_W;
  const totalW = columns.reduce((sum, col) => sum + colWidth(col), 0);

  const barLeft = (s: string) => daysBetween(timelineRange.start, parseDate(s)) * DAY_W;
  const barWidth = (s: string, e: string) => Math.max(14, (daysBetween(parseDate(s), parseDate(e)) + 1) * DAY_W);
  const effectiveDatesById = useMemo(() => {
    const map = new Map<string, { start: string; end: string }>();
    const anchor = project?.startDate || toYmd(timelineRange.start);
    const projectStart = project?.startDate ? parseDate(project.startDate) : null;
    const projectEnd = project?.endDate ? parseDate(project.endDate) : null;

    visibleItems.forEach((item, idx) => {
      const parentRange = item.parentId ? map.get(item.parentId) : null;
      let start = item.startDate || item.endDate || (parentRange ? addDays(parentRange.end, 1) : addDays(anchor, idx * 4));
      let end = item.endDate || item.startDate || addDays(start, durationByType(item.type) - 1);
      if (parseDate(end) < parseDate(start)) end = start;

      if (projectStart && parseDate(start) < projectStart) {
        start = toYmd(projectStart);
      }
      if (projectEnd && parseDate(end) > projectEnd) {
        end = toYmd(projectEnd);
      }
      if (parseDate(end) < parseDate(start)) {
        end = start;
      }

      map.set(item.id, { start, end });
    });

    return map;
  }, [visibleItems, project?.startDate, project?.endDate, timelineRange.start]);
  const getEffectiveDates = (item: GanttItem): { start: string; end: string } => (
    effectiveDatesById.get(item.id) || { start: project?.startDate || toYmd(timelineRange.start), end: project?.startDate || toYmd(timelineRange.start) }
  );

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayX = (() => {
    const d = daysBetween(timelineRange.start, today);
    if (d < 0 || d >= timelineRange.totalDays) return null;
    return d * DAY_W;
  })();

  const barPositions = useMemo(() => {
    const map = new Map<string, { y: number; leftX: number; rightX: number }>();
    visibleItems.forEach((item, i) => {
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const range = getEffectiveDates(item);
      const x = barLeft(range.start);
      const w = barWidth(range.start, range.end);
      map.set(item.id, { y, leftX: x, rightX: x + w });
    });
    return map;
  }, [visibleItems, effectiveDatesById, timelineRange.start, project?.startDate]);

  const rowIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleItems.forEach((item, i) => map.set(item.id, i));
    return map;
  }, [visibleItems]);

  // Slider state for horizontal navigation
  const [scrollMax, setScrollMax] = useState(0);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const update = () => {
      setScrollMax(Math.max(0, el.scrollWidth - el.clientWidth));
      setScrollPos(el.scrollLeft);
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    el.addEventListener('scroll', update);
    return () => {
      obs.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [totalW, columns.length]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    const el = timelineScrollRef.current;
    if (el) el.scrollLeft = v;
    setScrollPos(v);
  };

  // Auto-scroll timeline to show rightmost bar when items/zoom change
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const rights = Array.from(barPositions.values()).map(v => v.rightX);
    if (rights.length === 0) return;
    const rightmost = Math.max(...rights);
    // If rightmost bar is outside visible area, scroll so it's visible with a small margin
    requestAnimationFrame(() => {
      const target = Math.max(0, rightmost - el.clientWidth + 80);
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      if (target > el.scrollLeft && target <= max) {
        el.scrollLeft = Math.min(max, target);
      } else if (target > max) {
        el.scrollLeft = max;
      }
    });
  }, [barPositions, DAY_W, zoom, zoomScale, totalW]);

  const visualDeps = useMemo<VisualDependency[]>(() => {
    if (projectDeps.length > 0) {
      return projectDeps.map((dep) => ({
        id: dep.id,
        predecessorId: dep.predecessorId,
        successorId: dep.successorId,
      }));
    }

    return visibleItems
      .filter((item) => !!item.parentId && rowIndex.has(item.parentId as string))
      .map((item) => ({
        id: `auto-${item.parentId}-${item.id}`,
        predecessorId: item.parentId as string,
        successorId: item.id,
        auto: true,
      }));
  }, [projectDeps, visibleItems, rowIndex]);

  const hasChildren = (id: string) => projectItems.some(i => i.parentId === id);
  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  if (isLoading) return <LoadingSpinner message="Loading Gantt chart..." />;

  return (
    <div className="space-y-4">
      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-4 py-2 dark:bg-dark-card2 dark:border-dark-border bg-light-card2 border border-light-border rounded-lg">
        <LockIcon size={12} className="dark:text-dark-muted text-light-muted flex-shrink-0" />
        <p className="text-xs dark:text-dark-muted text-light-muted">
          Gantt chart is in <strong>read-only mode</strong>. Only items visible to you are shown.
        </p>
      </div>

      {/* Project tabs + zoom */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {myProjects.map(p => (
            <button key={p.id} onClick={() => setSelectedProject(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedProject === p.id ? 'bg-green-primary text-black shadow-sm' : 'dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted hover:text-light-text'}`}
            >{p.name}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'gantt' ? 'bg-green-primary text-black' : 'dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text'
              }`}
            >
              <GanttChartIcon size={13} /> Gantt
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-green-primary text-black' : 'dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text'
              }`}
            >
              <CalendarIcon size={13} /> Calendar
            </button>
          </div>

          {/* Zoom level - only show in gantt view */}
          {viewMode === 'gantt' && (
          <div className="flex items-center dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg overflow-hidden">
            {(['week','month','quarter'] as ZoomLevel[]).map(z => (
              <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${zoom === z ? 'bg-green-primary text-black' : 'dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text'}`}>{z}</button>
            ))}
          </div>
          )}
          {viewMode === 'gantt' && (
          <div className="flex items-center gap-1 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg px-1.5 py-1">
            <button onClick={zoomOut} disabled={zoomScale <= MIN_SCALE} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted disabled:opacity-30"><ZoomOutIcon size={13} /></button>
            <button onClick={() => setZoomScale(1)} className="px-1.5 py-0.5 text-[10px] font-semibold rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted min-w-[36px] text-center">{Math.round(zoomScale * 100)}%</button>
            <button onClick={zoomIn} disabled={zoomScale >= MAX_SCALE} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted disabled:opacity-30"><ZoomInIcon size={13} /></button>
            <button onClick={() => setZoomScale(1)} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted"><Maximize2Icon size={12} /></button>
          </div>
          )}
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden" style={{ height: '70vh' }}>
          <GanttCalendarView
            items={projectItems}
            users={users}
          />
        </div>
      )}

      {/* Chart */}
      {viewMode === 'gantt' && (
      <>
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
        {/* Column headers */}
        <div className="flex dark:border-dark-border border-b border-light-border sticky top-0 z-10 dark:bg-dark-card bg-white">
          <div className="flex-shrink-0 flex items-center dark:border-dark-border border-r border-light-border" style={{ width: TREE_W }}>
            <div className="w-10 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted border-r dark:border-dark-border border-light-border">#</div>
            <div className="flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted">Task Name</div>
            <div className="w-20 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">Duration</div>
            <div className="w-24 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">Start</div>
            <div className="w-24 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">End</div>
            <div className="w-36 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">State</div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex" style={{ width: totalW + 80 }}>
              {columns.map((col, i) => {
                const isCur = today >= col.startDate && today <= col.endDate;
                return (
                  <div key={i} className={`flex-shrink-0 py-2 text-center dark:border-dark-border border-r border-light-border last:border-r-0 overflow-hidden ${isCur ? 'dark:bg-green-primary/5 bg-green-50/50' : ''}`} style={{ width: colWidth(col) }}>
                    <div className="text-xs font-semibold dark:text-dark-text text-light-text whitespace-nowrap">{col.label}</div>
                    {col.subLabel && <div className="text-[10px] dark:text-dark-subtle text-light-subtle whitespace-nowrap">{col.subLabel}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex" style={{ maxHeight: '60vh' }}>
          {/* Tree panel */}
          <div ref={treeScrollRef} onScroll={handleTreeScroll} className="flex-shrink-0 overflow-y-auto dark:border-dark-border border-r border-light-border" style={{ width: TREE_W }}>
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
                <CalendarIcon size={32} className="mb-2 opacity-30" />
                <p className="text-xs">No visible gantt items for this project.</p>
              </div>
            ) : visibleItems.map(item => {
              const depth = item.depth ?? 0;
              const color = getItemColor(item);
              const range = getEffectiveDates(item);
              const canExpand = hasChildren(item.id);
              const isCollapsed = collapsedIds.has(item.id);
              const assignees = users.filter(u => (item.assigneeIds || []).includes(u.id));
              const durationDays = Math.max(daysBetween(parseDate(range.start), parseDate(range.end)) + 1, 1);
              const durationLabel = `${durationDays} day${durationDays === 1 ? '' : 's'}`;
              const state = getStateMeta(item);

              return (
                <div key={item.id} className="flex items-center dark:border-dark-border border-b border-light-border" style={{ height: ROW_HEIGHT }}>
                  <div className="w-10 px-2 flex-shrink-0 border-r dark:border-dark-border border-light-border flex items-center justify-end" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle font-mono">{item.treeIndex || ''}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1 px-2 min-w-0" style={{ paddingLeft: `${depth * 16 + 6}px` }}>
                    {canExpand ? (
                      <button onClick={() => toggleCollapse(item.id)} className="flex-shrink-0 dark:text-dark-muted text-light-muted">
                        {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                      </button>
                    ) : <div className="w-3 flex-shrink-0" />}
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs truncate dark:text-dark-text text-light-text" title={item.name}>{item.name}</span>
                    {assignees.length > 0 && (
                      <div className="flex -space-x-1 ml-auto flex-shrink-0">
                        {assignees.slice(0, 3).map(u => (
                          <UserAvatar
                            key={u.id}
                            name={u.name}
                            avatarText={u.avatar}
                            profilePhoto={u.profilePhoto}
                            className="w-4 h-4 border border-white dark:border-dark-card"
                            textClassName="text-[6px] font-bold text-black"
                            fallbackStyle={{ backgroundColor: '#63D44A' }}
                            title={u.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-20 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle">{durationLabel}</span>
                  </div>

                  <div className="w-24 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle" title={dateShort(range.start)}>{dateLong(range.start)}</span>
                  </div>

                  <div className="w-24 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle" title={dateShort(range.end)}>{dateLong(range.end)}</span>
                  </div>

                  <div className="w-36 px-1 flex-shrink-0 flex items-center" style={{ height: ROW_HEIGHT }}>
                    <div className="w-full h-6 rounded-sm dark:bg-dark-card2 bg-gray-100 border dark:border-dark-border border-gray-200 flex items-center px-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: state.dot }} />
                        <span className="text-[10px] dark:text-dark-text text-light-text lowercase truncate">{state.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div ref={timelineScrollRef} onScroll={handleTimelineScroll} className="flex-1 overflow-auto relative">
            <div style={{ width: totalW + 80, position: 'relative' }}>
              {visibleItems.map((item) => (
                <div key={item.id} className="dark:border-dark-border border-b border-light-border relative" style={{ height: ROW_HEIGHT }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {columns.map((col, i) => {
                      const isCur = today >= col.startDate && today <= col.endDate;
                      return <div key={i} className={`flex-shrink-0 h-full dark:border-dark-border border-r border-light-border last:border-r-0 ${isCur ? 'dark:bg-green-primary/3 bg-green-50/20' : ''}`} style={{ width: colWidth(col) }} />;
                    })}
                  </div>
                  {(() => {
                    const range = getEffectiveDates(item);
                    const w = barWidth(range.start, range.end);
                    const x = barLeft(range.start);
                    return item.type === 'milestone' ? (
                      <div className="absolute top-1/2 z-20 pointer-events-none" style={{ left: x + 7, transform: 'translate(-50%, -50%)' }}>
                        <div className="w-3.5 h-3.5 rotate-45 border-2 border-white dark:border-dark-card shadow-sm" style={{ backgroundColor: GANTT_STATUS_COLOR.milestone }} title={item.name} />
                      </div>
                    ) : (
                      <div className="absolute top-1/2 -translate-y-1/2 rounded-[3px] z-20" style={{ left: x, width: w, height: BAR_H, backgroundColor: getItemColor(item), border: '1px solid rgba(15, 23, 42, 0.35)', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)' }} title={`${item.name} (${dateShort(range.start)} - ${dateShort(range.end)})`}>
                        <div className="absolute -left-[1px] top-1/2 h-2 w-px -translate-y-1/2 bg-slate-500/60" />
                        <div className="absolute -right-[1px] top-1/2 h-2 w-px -translate-y-1/2 bg-slate-500/60" />
                        {w > 90 ? (
                          <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-black/85 truncate">
                            {item.name}
                          </span>
                        ) : (
                          <span className="absolute top-1/2 -translate-y-1/2 text-[9px] font-semibold dark:text-dark-text text-light-text whitespace-nowrap" style={{ left: w + 6 }}>
                            {item.name}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  {todayX !== null && <div className="absolute top-0 bottom-0 z-20 pointer-events-none w-0.5 bg-red-500/30" style={{ left: todayX }} />}
                </div>
              ))}

              {visualDeps.length > 0 && (
                <svg className="absolute top-0 left-0 pointer-events-none z-[5]" style={{ width: totalW + 80, height: visibleItems.length * ROW_HEIGHT }}>
                  <defs>
                    <marker id="arrow-emp" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <path d="M0,0 L0,7 L7,3.5 z" fill="#6b7280" />
                    </marker>
                    <marker id="arrow-auto-emp" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <path d="M0,0 L0,7 L7,3.5 z" fill="#6b7280" />
                    </marker>
                  </defs>
                  {visualDeps.map(dep => {
                    const from = barPositions.get(dep.predecessorId);
                    const to = barPositions.get(dep.successorId);
                    if (!from || !to) return null;
                    const stroke = '#6b7280';
                    return (
                      <path key={dep.id} d={dependencyPath(from, to)} stroke={stroke} strokeWidth="1.35" fill="none" strokeLinecap="square" strokeLinejoin="miter" markerEnd={dep.auto ? 'url(#arrow-auto-emp)' : 'url(#arrow-emp)'} />
                    );
                  })}
                </svg>
              )}
            </div>
            {todayX !== null && (
              <div className="absolute top-0 z-40 pointer-events-none flex flex-col items-center" style={{ left: todayX, transform: 'translateX(-50%)' }}>
                <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">TODAY</div>
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline slider (horizontal) */}
      <div className="px-4 mt-2">
          <style>{`
            .timeline-range { -webkit-appearance:none; appearance:none; height:10px; background:#f3f4f6; border-radius:999px; outline:none; }
            .timeline-range:focus { box-shadow: none; }
            .timeline-range::-webkit-slider-runnable-track { height:10px; background:transparent; }
            .timeline-range::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#9ca3af; margin-top:-1px; box-shadow: 0 1px 0 rgba(0,0,0,0.08); }
            .timeline-range::-moz-range-track { height:10px; background:transparent; }
            .timeline-range::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:#9ca3af; border:none; }
          `}</style>
          <input
              aria-label="Timeline horizontal scroll"
              type="range"
              min={0}
              max={scrollMax}
              value={scrollPos}
              onChange={handleSliderChange}
              className="timeline-range w-full"
            />
      </div>

      {/* Legend */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card px-5 py-3">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: GANTT_STATUS_COLOR.done }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: GANTT_STATUS_COLOR.stuck }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Stuck</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: GANTT_STATUS_COLOR.working }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Working on it</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rotate-45" style={{ backgroundColor: GANTT_STATUS_COLOR.milestone }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Milestone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px bg-red-500" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px" style={{ borderTop: '2px solid #4b5563' }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Dependency</span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
