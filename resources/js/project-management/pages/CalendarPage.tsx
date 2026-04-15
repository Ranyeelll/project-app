import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  FolderKanbanIcon,
  CheckSquareIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import { useData, useAuth, useNavigation } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { isElevatedRole } from '../utils/roles';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task-deadline' | 'project-deadline' | 'project-start' | 'overdue';
  color: string;
  navigateTo: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const { tasks, projects, users } = useData();
  const { currentUser } = useAuth();
  const { setCurrentPage } = useNavigation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const isAdmin = isElevatedRole(currentUser?.role);
  const today = new Date().toISOString().slice(0, 10);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar events from tasks and projects
  const events = useMemo((): CalendarEvent[] => {
    const evts: CalendarEvent[] = [];
    const toDate = (d: string) => d ? d.slice(0, 10) : '';

    // Filter tasks for employee vs admin
    const relevantTasks = isAdmin
      ? tasks
      : tasks.filter((t) => t.assignedTo === currentUser?.id);

    for (const task of relevantTasks) {
      const endDate = toDate(task.endDate);
      if (endDate) {
        const isOverdue = task.status !== 'completed' && endDate < today;
        evts.push({
          id: `task-${task.id}`,
          title: task.title,
          date: endDate,
          type: isOverdue ? 'overdue' : 'task-deadline',
          color: isOverdue ? 'bg-red-500' : 'bg-blue-500',
          navigateTo: isAdmin ? 'admin-projects' : 'employee-tasks',
        });
      }
    }

    for (const project of projects) {
      const startDate = toDate(project.startDate);
      const endDate = toDate(project.endDate);
      if (startDate) {
        evts.push({
          id: `proj-start-${project.id}`,
          title: `▶ ${project.name}`,
          date: startDate,
          type: 'project-start',
          color: 'bg-emerald-600',
          navigateTo: isAdmin ? 'admin-projects' : 'employee-dashboard',
        });
      }
      if (endDate) {
        const isOverdue = project.status === 'active' && endDate < today;
        evts.push({
          id: `proj-${project.id}`,
          title: `📁 ${project.name}`,
          date: endDate,
          type: isOverdue ? 'overdue' : 'project-deadline',
          color: isOverdue ? 'bg-red-500' : 'bg-green-primary',
          navigateTo: isAdmin ? 'admin-projects' : 'employee-dashboard',
        });
      }
    }

    return evts;
  }, [tasks, projects, currentUser, isAdmin, today]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of events) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [events]);

  // Selected date events
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  function goToday() {
    setCurrentDate(new Date());
    setSelectedDate(today);
  }

  if (isLoading) return <LoadingSpinner message="Loading calendar..." />;

  // Build calendar grid (6 rows × 7 cols)
  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: '' });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: '' });

  // Stats
  const overdueCount = events.filter((e) => e.type === 'overdue').length;
  const taskDeadlines = events.filter((e) => e.type === 'task-deadline').length;
  const projectDeadlines = events.filter((e) => e.type === 'project-deadline').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg dark:bg-dark-card2 dark:hover:bg-dark-card dark:text-dark-muted bg-light-card2 hover:bg-light-card text-light-muted transition-colors"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg dark:bg-dark-card2 dark:hover:bg-dark-card dark:text-dark-muted bg-light-card2 hover:bg-light-card text-light-muted transition-colors"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} icon={<CalendarIcon size={14} />}>
          Today
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 dark:bg-dark-card bg-white rounded-lg px-3 py-2 border dark:border-dark-border border-light-border">
          <CheckSquareIcon size={14} className="text-blue-400" />
          <span className="text-xs dark:text-dark-muted text-light-muted">{taskDeadlines} task deadline{taskDeadlines !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 dark:bg-dark-card bg-white rounded-lg px-3 py-2 border dark:border-dark-border border-light-border">
          <FolderKanbanIcon size={14} className="text-green-primary" />
          <span className="text-xs dark:text-dark-muted text-light-muted">{projectDeadlines} project deadline{projectDeadlines !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2 dark:bg-dark-card bg-white rounded-lg px-3 py-2 border dark:border-dark-border border-light-border">
          <AlertTriangleIcon size={14} className="text-red-400" />
          <span className="text-xs dark:text-dark-muted text-light-muted">{overdueCount} overdue</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 dark:bg-dark-card bg-white rounded-card border dark:border-dark-border border-light-border overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 dark:bg-dark-card2 bg-light-card2">
            {DAY_NAMES.map((day) => (
              <div key={day} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              if (cell.day === null) {
                return <div key={idx} className="min-h-[80px] dark:border-dark-border/30 border-light-border/30 border-t border-r last:border-r-0" />;
              }
              const dayEvents = eventsByDate[cell.dateStr] || [];
              const isToday = cell.dateStr === today;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[80px] p-1.5 text-left transition-colors dark:border-dark-border/30 border-light-border/30 border-t border-r last:border-r-0 ${
                    isSelected
                      ? 'dark:bg-green-primary/10 bg-green-50'
                      : 'dark:hover:bg-dark-card2/50 hover:bg-light-card2/50'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    isToday
                      ? 'bg-green-primary text-white'
                      : 'dark:text-dark-text text-light-text'
                  }`}>
                    {cell.day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={`${evt.color} text-white text-[9px] px-1 py-0.5 rounded truncate leading-tight`}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] dark:text-dark-subtle text-light-subtle pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Selected Date Events */}
        <div className="dark:bg-dark-card bg-white rounded-card border dark:border-dark-border border-light-border p-4">
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">
            {selectedDate
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a date'}
          </h3>

          {!selectedDate ? (
            <div className="text-center py-8">
              <CalendarIcon size={24} className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle opacity-40" />
              <p className="text-xs dark:text-dark-muted text-light-muted">Click a date to see deadlines</p>
            </div>
          ) : selectedEvents.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquareIcon size={24} className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle opacity-40" />
              <p className="text-xs dark:text-dark-muted text-light-muted">No deadlines on this date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => setCurrentPage(evt.navigateTo)}
                  className="w-full flex items-start gap-2.5 p-2.5 rounded-lg dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${evt.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium dark:text-dark-text text-light-text truncate">
                      {evt.title}
                    </p>
                    <p className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">
                      {evt.type === 'overdue' && '⚠ Overdue — '}
                      {evt.type === 'task-deadline' && 'Task deadline'}
                      {evt.type === 'project-deadline' && 'Project deadline'}
                      {evt.type === 'project-start' && 'Project starts'}
                      {evt.type === 'overdue' && (evt.id.startsWith('task') ? 'Task overdue' : 'Project overdue')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
