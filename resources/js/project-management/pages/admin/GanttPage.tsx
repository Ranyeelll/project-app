import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ZoomInIcon,
  ZoomOutIcon,
  EyeIcon,
  Maximize2Icon,
  CalendarIcon,
} from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { GanttItem, GanttDependency, User } from '../../data/mockData';
import { GanttItemForm } from '../../components/gantt/GanttItemForm';

// ── Types ─────────────────────────────────────────────────────────────────────
type ZoomLevel = 'week' | 'month' | 'quarter';
interface Column { label: string; subLabel?: string; startDate: Date; endDate: Date; }

// ── Constants ─────────────────────────────────────────────────────────────────
const ROW_HEIGHT = 36;
const BAR_H = 20;
const TREE_W = 480;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_COLOR: Record<string, string> = {
  phase:     '#1FAF8E',
  step:      '#8b5cf6',
  subtask:   '#3BC25B',
  milestone: '#f59e0b',
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function parseDate(s: string): Date { return new Date(s + 'T00:00:00'); }
function dateShort(s: string) {
  const d = parseDate(s);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function getWeekNumber(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

// ─────────────────────────────────────────────────────────────────────────────
export function GanttPage() {
  const { projects, users, ganttItems, ganttDependencies, refreshGanttItems, refreshGanttDependencies } = useData();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.department === 'Admin';

  const [selectedProject, setSelectedProject] = useState('');
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [zoomScale, setZoomScale] = useState(1);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [previewAs, setPreviewAs] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<GanttItem | null>(null);
  const [addParent, setAddParent] = useState<GanttItem | null>(null);
  const [saving, setSaving] = useState(false);

  const treeScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // Auto-select first project
  useEffect(() => {
    if (!selectedProject && projects.length > 0) {
      const active = projects.find((p) => p.status === 'active');
      setSelectedProject(active?.id || projects[0].id);
    }
  }, [projects, selectedProject]);

  // Load gantt data when project changes
  useEffect(() => {
    if (selectedProject) {
      const url = previewAs
        ? `/api/projects/${selectedProject}/gantt-items?preview_as=${previewAs}`
        : `/api/projects/${selectedProject}/gantt-items`;
      fetch(url).then(r => r.json()).then(d => { if (Array.isArray(d)) { /* handled by context refresh */ }});
      refreshGanttItems(selectedProject);
      refreshGanttDependencies(selectedProject);
    }
  }, [selectedProject, previewAs]);

  // Sync scroll between tree and timeline
  const handleTreeScroll = useCallback(() => {
    if (timelineScrollRef.current && treeScrollRef.current) {
      timelineScrollRef.current.scrollTop = treeScrollRef.current.scrollTop;
    }
  }, []);
  const handleTimelineScroll = useCallback(() => {
    if (treeScrollRef.current && timelineScrollRef.current) {
      treeScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
    }
  }, []);

  // Zoom controls
  const MIN_SCALE = 0.3; const MAX_SCALE = 3; const SCALE_STEP = 0.15;
  const zoomIn = useCallback(() => setZoomScale(p => Math.min(MAX_SCALE, +(p + SCALE_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoomScale(p => Math.max(MIN_SCALE, +(p - SCALE_STEP).toFixed(2))), []);

  // Mouse wheel zoom on timeline
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoomScale(p => {
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
        return Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(p + delta).toFixed(2)));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const project = projects.find(p => p.id === selectedProject);
  const projectItems = ganttItems.filter(i => i.projectId === selectedProject);
  const projectDeps = ganttDependencies.filter(d => d.projectId === selectedProject);

  // Build flat visible list from context (server already computed treeIndex + depth)
  const visibleItems = useMemo(() => {
    return projectItems.filter(item => {
      if (!item.parentId) return true;
      // Check if any ancestor is collapsed
      let pid: string | null = item.parentId;
      while (pid) {
        if (collapsedIds.has(pid)) return false;
        const parent = projectItems.find(i => i.id === pid);
        pid = parent?.parentId ?? null;
      }
      return true;
    });
  }, [projectItems, collapsedIds]);

  // Timeline range
  const timelineRange = useMemo(() => {
    const dates: Date[] = [];
    projectItems.forEach(i => {
      if (i.startDate) dates.push(parseDate(i.startDate));
      if (i.endDate) dates.push(parseDate(i.endDate));
    });
    if (project?.startDate) dates.push(parseDate(project.startDate));
    if (project?.endDate) dates.push(parseDate(project.endDate));
    if (dates.length === 0) {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end, totalDays: 90 };
    }
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const start = new Date(min.getFullYear(), min.getMonth(), 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 2, 0);
    const totalDays = Math.max(daysBetween(start, end), 1);
    return { start, end, totalDays };
  }, [projectItems, project]);

  // Columns
  const columns = useMemo((): Column[] => {
    const cols: Column[] = [];
    const { start, end } = timelineRange;
    if (zoom === 'week') {
      const cur = new Date(start);
      while (cur <= end) {
        const ws = new Date(cur); const we = new Date(cur); we.setDate(we.getDate() + 6);
        cols.push({ label: `W${getWeekNumber(ws)}`, subLabel: `${MONTHS_SHORT[ws.getMonth()]} ${ws.getDate()}`, startDate: new Date(ws), endDate: we > end ? new Date(end) : we });
        cur.setDate(cur.getDate() + 7);
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

  const COL_BASE = zoom === 'week' ? 80 : zoom === 'month' ? 100 : 140;
  const COL_W = Math.round(COL_BASE * zoomScale);
  const totalW = columns.length * COL_W;

  const barLeft = (s: string) => (daysBetween(timelineRange.start, parseDate(s)) / timelineRange.totalDays) * totalW;
  const barWidth = (s: string, e: string) => Math.max(14, (daysBetween(parseDate(s), parseDate(e)) + 1) / timelineRange.totalDays * totalW);

  const today = new Date();
  const todayX = (() => {
    const d = daysBetween(timelineRange.start, today);
    if (d < 0 || d > timelineRange.totalDays) return null;
    return (d / timelineRange.totalDays) * totalW;
  })();

  // Map item id → row index (for dependency arrows)
  const rowIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleItems.forEach((item, i) => map.set(item.id, i));
    return map;
  }, [visibleItems]);

  // Bar center positions for dependencies
  const barPositions = useMemo(() => {
    const map = new Map<string, { y: number; leftX: number; rightX: number }>();
    visibleItems.forEach((item, i) => {
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2;
      if (!item.startDate) return;
      const x = barLeft(item.startDate);
      const w = item.endDate ? barWidth(item.startDate, item.endDate) : 14;
      map.set(item.id, { y, leftX: x, rightX: x + w });
    });
    return map;
  }, [visibleItems, barLeft, barWidth]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const hasChildren = (itemId: string) => projectItems.some(i => i.parentId === itemId);
  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const projectTeam = useMemo(() => {
    if (!project) return [];
    const ids = new Set([project.managerId, ...(project.teamIds || [])]);
    return users.filter(u => ids.has(u.id));
  }, [project, users]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleSave = async (data: Partial<GanttItem>) => {
    if (!selectedProject) return;
    setSaving(true);
    const payload = { ...data, parent_id: addParent?.id ?? null };
    if (editItem) {
      await fetch(`/api/projects/${selectedProject}/gantt-items/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/projects/${selectedProject}/gantt-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(payload),
      });
    }
    await refreshGanttItems(selectedProject);
    setSaving(false);
    setShowForm(false);
    setEditItem(null);
    setAddParent(null);
  };

  const handleDelete = async (item: GanttItem) => {
    if (!confirm(`Delete "${item.name}" and all its children?`)) return;
    await fetch(`/api/projects/${selectedProject}/gantt-items/${item.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': csrfToken() },
    });
    refreshGanttItems(selectedProject);
    refreshGanttDependencies(selectedProject);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Project tabs */}
        <div className="flex gap-2 flex-wrap flex-1">
          {projects.filter(p => p.status !== 'archived').map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedProject === p.id
                  ? 'bg-green-primary text-black shadow-sm'
                  : 'dark:bg-dark-card dark:border dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Preview as (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <EyeIcon size={13} className="dark:text-dark-muted text-light-muted" />
              <select
                value={previewAs}
                onChange={e => setPreviewAs(e.target.value)}
                className="pl-2 pr-6 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted focus:outline-none"
              >
                <option value="">Admin view</option>
                <option value="Technical">Technical view</option>
                <option value="Accounting">Accounting view</option>
                <option value="Employee">Employee view</option>
              </select>
            </div>
          )}

          {/* Zoom level */}
          <div className="flex items-center dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg overflow-hidden">
            {(['week','month','quarter'] as ZoomLevel[]).map(z => (
              <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${zoom === z ? 'bg-green-primary text-black' : 'dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text'}`}>{z}</button>
            ))}
          </div>

          {/* Zoom scale */}
          <div className="flex items-center gap-1 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg px-1.5 py-1">
            <button onClick={zoomOut} disabled={zoomScale <= MIN_SCALE} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text disabled:opacity-30"><ZoomOutIcon size={13} /></button>
            <button onClick={() => setZoomScale(1)} className="px-1.5 py-0.5 text-[10px] font-semibold rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted min-w-[36px] text-center">{Math.round(zoomScale * 100)}%</button>
            <button onClick={zoomIn} disabled={zoomScale >= MAX_SCALE} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text disabled:opacity-30"><ZoomInIcon size={13} /></button>
            <button onClick={() => setZoomScale(1)} className="p-1 rounded dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text"><Maximize2Icon size={12} /></button>
          </div>

          {/* Add Phase */}
          <button
            onClick={() => { setEditItem(null); setAddParent(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-primary text-black rounded-lg hover:bg-green-progress transition-colors"
          >
            <PlusIcon size={13} /> Add Phase
          </button>
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
        {/* Column header row */}
        <div className="flex dark:border-dark-border border-b border-light-border sticky top-0 z-10 dark:bg-dark-card bg-white">
          {/* Tree header */}
          <div className="flex-shrink-0 flex items-center gap-0 dark:border-dark-border border-r border-light-border" style={{ width: TREE_W }}>
            <div className="w-12 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted border-r dark:border-dark-border border-light-border">#</div>
            <div className="flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted">Name</div>
            <div className="w-16 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">Start</div>
            <div className="w-16 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">End</div>
            <div className="w-14 px-1 py-2 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted text-center">%</div>
          </div>

          {/* Timeline header */}
          <div className="flex-1 overflow-hidden">
            <div className="flex" style={{ width: totalW }}>
              {columns.map((col, i) => {
                const isCur = today >= col.startDate && today <= col.endDate;
                return (
                  <div key={i} className={`flex-shrink-0 py-2 text-center dark:border-dark-border border-r border-light-border last:border-r-0 ${isCur ? 'dark:bg-green-primary/5 bg-green-50/50' : ''}`} style={{ width: COL_W }}>
                    <div className="text-xs font-semibold dark:text-dark-text text-light-text">{col.label}</div>
                    {col.subLabel && <div className="text-[10px] dark:text-dark-subtle text-light-subtle">{col.subLabel}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Body: tree + timeline scrollable */}
        <div className="flex" style={{ maxHeight: '60vh' }}>
          {/* Tree Panel */}
          <div
            ref={treeScrollRef}
            onScroll={handleTreeScroll}
            className="flex-shrink-0 overflow-y-auto dark:border-dark-border border-r border-light-border"
            style={{ width: TREE_W }}
          >
            {visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
                <CalendarIcon size={32} className="mb-2 opacity-30" />
                <p className="text-xs">No gantt items yet. Add a phase to start.</p>
              </div>
            ) : visibleItems.map(item => {
              const depth = item.depth ?? 0;
              const color = TYPE_COLOR[item.type] || '#6b7280';
              const canExpand = hasChildren(item.id);
              const isCollapsed = collapsedIds.has(item.id);
              const assignees = users.filter(u => (item.assigneeIds || []).includes(u.id));

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-0 dark:border-dark-border border-b border-light-border dark:hover:bg-dark-card2/30 hover:bg-gray-50/50 group"
                  style={{ height: ROW_HEIGHT, minHeight: ROW_HEIGHT }}
                >
                  {/* # index */}
                  <div className="w-12 px-2 flex-shrink-0 border-r dark:border-dark-border border-light-border flex items-center justify-end" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle font-mono">{item.treeIndex || ''}</span>
                  </div>

                  {/* Name + expand */}
                  <div className="flex-1 flex items-center gap-1 px-1 min-w-0" style={{ paddingLeft: `${depth * 16 + 4}px` }}>
                    {canExpand ? (
                      <button onClick={() => toggleCollapse(item.id)} className="flex-shrink-0 dark:text-dark-muted text-light-muted">
                        {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
                      </button>
                    ) : (
                      <div className="w-3 flex-shrink-0" />
                    )}
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs truncate dark:text-dark-text text-light-text" title={item.name}>{item.name}</span>
                    {/* assignees */}
                    {assignees.length > 0 && (
                      <div className="flex -space-x-1 ml-auto flex-shrink-0">
                        {assignees.slice(0, 3).map(u => (
                          <div key={u.id} className="w-4 h-4 rounded-full flex items-center justify-center text-black border border-white dark:border-dark-card flex-shrink-0" style={{ backgroundColor: '#63D44A', fontSize: '6px', fontWeight: 700 }} title={u.name}>
                            {u.avatar}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* edit/delete buttons (admin only) */}
                    {(isAdmin || currentUser?.department === 'Technical') && (
                      <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button
                          onClick={() => { setEditItem(item); setAddParent(null); setShowForm(true); }}
                          className="p-0.5 rounded dark:text-dark-muted dark:hover:text-blue-400 text-light-muted hover:text-blue-500"
                          title="Edit"
                        >
                          <PencilIcon size={11} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => { setAddParent(item); setEditItem(null); setShowForm(true); }}
                              className="p-0.5 rounded dark:text-dark-muted dark:hover:text-green-400 text-light-muted hover:text-green-500"
                              title="Add child"
                            >
                              <PlusIcon size={11} />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-0.5 rounded dark:text-dark-muted dark:hover:text-red-400 text-light-muted hover:text-red-500"
                              title="Delete"
                            >
                              <TrashIcon size={11} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Start */}
                  <div className="w-16 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[9px] dark:text-dark-subtle text-light-subtle">{item.startDate ? dateShort(item.startDate) : ''}</span>
                  </div>

                  {/* End */}
                  <div className="w-16 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    <span className="text-[9px] dark:text-dark-subtle text-light-subtle">{item.endDate && item.type !== 'milestone' ? dateShort(item.endDate) : ''}</span>
                  </div>

                  {/* % */}
                  <div className="w-14 px-1 flex-shrink-0 flex items-center justify-center" style={{ height: ROW_HEIGHT }}>
                    {item.type !== 'milestone' ? (
                      <div className="flex items-center gap-1 w-full">
                        <div className="flex-1 h-1 rounded-full dark:bg-dark-border bg-gray-200 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.progress}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-[9px] dark:text-dark-muted text-light-muted w-6 text-right">{item.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-[9px] dark:text-dark-subtle text-light-subtle">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Panel */}
          <div
            ref={timelineScrollRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-auto relative"
          >
            <div style={{ width: totalW, position: 'relative' }}>
              {/* Grid rows */}
              {visibleItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="dark:border-dark-border border-b border-light-border relative"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Column grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {columns.map((col, i) => {
                      const isCur = today >= col.startDate && today <= col.endDate;
                      return (
                        <div key={i} className={`flex-shrink-0 h-full dark:border-dark-border border-r border-light-border last:border-r-0 ${isCur ? 'dark:bg-green-primary/3 bg-green-50/20' : ''}`} style={{ width: COL_W }} />
                      );
                    })}
                  </div>

                  {/* Bar */}
                  {item.startDate && (
                    item.type === 'milestone' ? (
                      // Diamond milestone
                      <div
                        className="absolute top-1/2 z-10 pointer-events-none"
                        style={{ left: barLeft(item.startDate) + 7, transform: 'translate(-50%, -50%)' }}
                      >
                        <div
                          className="w-3.5 h-3.5 rotate-45 border-2 border-white dark:border-dark-card shadow-sm"
                          style={{ backgroundColor: TYPE_COLOR.milestone }}
                          title={item.name}
                        />
                      </div>
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 rounded z-10"
                        style={{
                          left: barLeft(item.startDate),
                          width: item.endDate ? barWidth(item.startDate, item.endDate) : 60,
                          height: BAR_H,
                        }}
                      >
                        {/* Background */}
                        <div className="absolute inset-0 rounded" style={{ backgroundColor: TYPE_COLOR[item.type], opacity: 0.15 }} />
                        {/* Progress fill */}
                        <div className="absolute left-0 top-0 h-full rounded-l" style={{ width: `${item.progress}%`, backgroundColor: TYPE_COLOR[item.type], opacity: 0.8, borderRadius: item.progress === 100 ? '3px' : '3px 0 0 3px' }} />
                        {/* Border */}
                        <div className="absolute inset-0 rounded border" style={{ borderColor: TYPE_COLOR[item.type], borderWidth: '1.5px' }} />
                        {/* Label */}
                        {(item.endDate ? barWidth(item.startDate, item.endDate) : 60) > 40 && (
                          <div className="absolute inset-0 flex items-center px-1.5 z-10">
                            <span className="text-[9px] font-medium dark:text-white text-gray-900 truncate dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] drop-shadow-[0_0px_3px_rgba(255,255,255,0.9)]">{item.name}</span>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Today line */}
                  {todayX !== null && (
                    <div className="absolute top-0 bottom-0 z-20 pointer-events-none w-0.5 bg-red-500/30" style={{ left: todayX }} />
                  )}
                </div>
              ))}

              {/* Dependency arrows SVG */}
              {projectDeps.length > 0 && (
                <svg
                  className="absolute top-0 left-0 pointer-events-none z-30"
                  style={{ width: totalW, height: visibleItems.length * ROW_HEIGHT }}
                >
                  <defs>
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
                    </marker>
                  </defs>
                  {projectDeps.map(dep => {
                    const from = barPositions.get(dep.predecessorId);
                    const to = barPositions.get(dep.successorId);
                    if (!from || !to) return null;
                    const midX = from.rightX + 8;
                    return (
                      <path
                        key={dep.id}
                        d={`M ${from.rightX} ${from.y} H ${midX} V ${to.y} H ${to.leftX}`}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        fill="none"
                        markerEnd="url(#arrow)"
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Today label at top */}
            {todayX !== null && (
              <div className="absolute top-0 z-40 pointer-events-none flex flex-col items-center" style={{ left: todayX, transform: 'translateX(-50%)' }}>
                <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">TODAY</div>
                <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card px-5 py-3">
        <div className="flex items-center gap-5 flex-wrap">
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              {type === 'milestone' ? (
                <div className="w-2.5 h-2.5 rotate-45" style={{ backgroundColor: color }} />
              ) : (
                <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: color }} />
              )}
              <span className="text-[10px] dark:text-dark-muted text-light-muted capitalize">{type}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px bg-red-500" />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-px" style={{ borderTop: '1.5px solid #94a3b8' }} />
            <span className="text-[10px] dark:text-dark-muted text-light-muted">Dependency</span>
          </div>
        </div>
      </div>

      {/* ── GanttItemForm Modal ──────────────────────────────────────────── */}
      <GanttItemForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); setAddParent(null); }}
        onSave={handleSave}
        editItem={editItem}
        parentItem={addParent}
        projectTeam={projectTeam}
        isAdmin={isAdmin}
      />
    </div>
  );
}
