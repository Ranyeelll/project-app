import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  SearchIcon,
  GripVerticalIcon,
  FolderKanbanIcon,
  UserIcon,
  ClockIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  ActivityIcon,
  DownloadIcon,
} from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Task } from '../../data/mockData';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';
import { TaskComments } from '../../components/projects/TaskComments';
import { TaskActivityTimeline } from '../../components/projects/TaskActivityTimeline';
import { apiFetch } from '../../utils/apiFetch';
import { downloadCsv } from '../../utils/exportCsv';
import { isElevatedRole } from '../../utils/roles';

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';

const COLUMNS: { status: TaskStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'todo', label: 'To Do', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/30' },
  { status: 'in-progress', label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  { status: 'review', label: 'In Review', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  { status: 'completed', label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' },
];

export function KanbanPage() {
  const { tasks, setTasks, projects, users, refreshTasks } = useData();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [commentsTarget, setCommentsTarget] = useState<{ id: string; title: string } | null>(null);
  const [activityTarget, setActivityTarget] = useState<{ id: string; title: string } | null>(null);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const elevated = isElevatedRole(currentUser?.role);

  // Filter tasks visible to this user
  const myTasks = useMemo(() => {
    if (elevated) return tasks;
    return tasks.filter((t) => {
      if (String(t.assignedTo) === String(currentUser?.id)) return true;
      const proj = projects.find((p) => p.id === t.projectId);
      return proj && (proj.teamIds || []).map(String).includes(String(currentUser?.id));
    });
  }, [tasks, currentUser, projects, elevated]);

  const filtered = useMemo(() => {
    return myTasks.filter((t) => {
      const s = search.toLowerCase();
      const projName = projects.find((p) => p.id === t.projectId)?.name || '';
      const assigneeName = users.find((u) => String(u.id) === String(t.assignedTo))?.name || '';
      const matchSearch =
        !s ||
        t.title.toLowerCase().includes(s) ||
        projName.toLowerCase().includes(s) ||
        assigneeName.toLowerCase().includes(s);
      const matchProject = projectFilter === 'all' || t.projectId === projectFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      return matchSearch && matchProject && matchPriority;
    });
  }, [myTasks, search, projectFilter, priorityFilter, projects, users]);

  const columnTasks = useCallback(
    (status: TaskStatus) =>
      filtered
        .filter((t) => t.status === status)
        .sort((a, b) => {
          const pOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
        }),
    [filtered]
  );

  const handleDrop = async (targetStatus: TaskStatus) => {
    if (!dragTask || dragTask.status === targetStatus) {
      setDragTask(null);
      setDragOverCol(null);
      return;
    }

    // Optimistic update
    const oldStatus = dragTask.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === dragTask.id ? { ...t, status: targetStatus } : t))
    );
    setDragTask(null);
    setDragOverCol(null);

    try {
      const res = await apiFetch(`/api/tasks/${dragTask.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => (t.id === dragTask.id ? { ...t, status: oldStatus } : t))
        );
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === dragTask.id ? { ...t, status: oldStatus } : t))
      );
    }
  };

  const relevantProjects = useMemo(() => {
    const ids = new Set(myTasks.map((t) => t.projectId));
    return projects.filter((p) => ids.has(p.id));
  }, [myTasks, projects]);

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (task: Task) => {
    if (task.status === 'completed') return false;
    const end = new Date(task.endDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<SearchIcon size={14} />}
          />
        </div>
        <Select
          options={[
            { value: 'all', label: 'All Projects' },
            ...relevantProjects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={[
            { value: 'all', label: 'All Priorities' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="w-40"
        />
        <Button
          variant="outline"
          size="sm"
          icon={<DownloadIcon size={14} />}
          onClick={() => {
            const headers = ['Task', 'Project', 'Status', 'Priority', 'Progress', 'Assignee', 'Due'];
            const rows = filtered.map((t) => [
              t.title,
              projects.find((p) => p.id === t.projectId)?.name || '',
              t.status,
              t.priority,
              String(t.progress),
              users.find((u) => String(u.id) === String(t.assignedTo))?.name || '',
              t.endDate || '',
            ]);
            downloadCsv('kanban-export', headers, rows);
          }}
        >
          Export
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const count = columnTasks(col.status).length;
          return (
            <div
              key={col.status}
              className={`rounded-lg border px-3 py-2 text-center ${col.bgColor}`}
            >
              <span className={`text-lg font-bold ${col.color}`}>{count}</span>
              <p className="text-[10px] dark:text-dark-muted text-light-muted mt-0.5">{col.label}</p>
            </div>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = columnTasks(col.status);
          return (
            <div
              key={col.status}
              className={`dark:bg-dark-card bg-white border rounded-card min-h-[300px] flex flex-col ${
                dragOverCol === col.status
                  ? 'border-green-primary ring-1 ring-green-primary/30'
                  : 'dark:border-dark-border border-light-border'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.status);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(col.status);
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b dark:border-dark-border border-light-border">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    col.status === 'todo' ? 'bg-zinc-400' :
                    col.status === 'in-progress' ? 'bg-blue-400' :
                    col.status === 'review' ? 'bg-amber-400' : 'bg-green-400'
                  }`} />
                  <span className="text-xs font-semibold dark:text-dark-text text-light-text">
                    {col.label}
                  </span>
                </div>
                <span className="text-[10px] dark:text-dark-muted text-light-muted font-medium">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
                {colTasks.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const assignee = users.find((u) => String(u.id) === String(task.assignedTo));
                  const overdue = isOverdue(task);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragTask(task)}
                      onDragEnd={() => { setDragTask(null); setDragOverCol(null); }}
                      className={`dark:bg-dark-card2 bg-light-card2 rounded-lg p-3 cursor-grab active:cursor-grabbing border transition-all hover:border-green-primary/40 ${
                        overdue
                          ? 'border-red-500/40'
                          : 'dark:border-dark-border border-light-border'
                      } ${dragTask?.id === task.id ? 'opacity-50' : ''}`}
                    >
                      {/* Top row */}
                      <div className="flex items-start gap-2 mb-2">
                        <GripVerticalIcon size={12} className="dark:text-dark-subtle text-light-subtle mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold dark:text-dark-text text-light-text line-clamp-2">
                            {task.title}
                          </p>
                          <p className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5 truncate">
                            <FolderKanbanIcon size={9} className="inline mr-1" />
                            {project?.name || 'Unknown'}
                          </p>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      {/* Progress */}
                      <div className="mb-2">
                        <ProgressBar value={task.progress} size="sm" />
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] dark:text-dark-muted text-light-muted">
                            {task.progress}%
                          </span>
                          {overdue && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                              <AlertTriangleIcon size={9} />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-green-primary/15 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-green-primary">
                              {assignee?.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-[10px] dark:text-dark-muted text-light-muted truncate max-w-[80px]">
                            {assignee?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {task.endDate && (
                            <span className={`text-[10px] ${overdue ? 'text-red-400' : 'dark:text-dark-subtle text-light-subtle'}`}>
                              {formatDate(task.endDate)}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setCommentsTarget({ id: task.id, title: task.title }); }}
                            className="p-1 rounded dark:text-dark-muted text-light-muted hover:text-green-primary transition-colors"
                            title="Discussion"
                          >
                            <MessageSquareIcon size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActivityTarget({ id: task.id, title: task.title }); }}
                            className="p-1 rounded dark:text-dark-muted text-light-muted hover:text-green-primary transition-colors"
                            title="Activity"
                          >
                            <ActivityIcon size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-center">
                    <p className="text-[10px] dark:text-dark-subtle text-light-subtle">
                      {dragTask ? 'Drop here' : 'No tasks'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Discussion Modal */}
      <Modal
        isOpen={!!commentsTarget}
        onClose={() => setCommentsTarget(null)}
        title={commentsTarget ? `Discussion — ${commentsTarget.title}` : 'Discussion'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setCommentsTarget(null)}>
            Close
          </Button>
        }
      >
        {commentsTarget && (
          <TaskComments taskId={commentsTarget.id} taskTitle={commentsTarget.title} />
        )}
      </Modal>

      {/* Task Activity Modal */}
      <Modal
        isOpen={!!activityTarget}
        onClose={() => setActivityTarget(null)}
        title={activityTarget ? `Activity — ${activityTarget.title}` : 'Task Activity'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setActivityTarget(null)}>
            Close
          </Button>
        }
      >
        {activityTarget && (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <TaskActivityTimeline taskId={activityTarget.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default KanbanPage;
