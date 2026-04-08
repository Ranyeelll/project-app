import React, { useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { GanttItem, User } from '../../data/mockData';
import { UserAvatar } from '../ui/UserAvatar';

interface GanttCalendarViewProps {
  items: GanttItem[];
  users: User[];
  onItemClick?: (item: GanttItem) => void;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function parseDate(s: string): Date {
  if (!s) return new Date(NaN);
  if (s.includes('T') || /[zZ]|[+-]\d{2}:?\d{2}/.test(s)) {
    return new Date(s);
  }
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isDateInRange(date: Date, start: string, end: string): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = parseDate(start);
  const e = parseDate(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ITEM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  phase: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  step: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-600 dark:text-purple-400' },
  subtask: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  milestone: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-600 dark:text-green-400' },
};

export function GanttCalendarView({ items, users, onItemClick }: GanttCalendarViewProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  
  const usersById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Get calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Map items to their dates
  const itemsByDate = useMemo(() => {
    const map = new Map<string, GanttItem[]>();
    
    items.forEach(item => {
      if (!item.startDate || !item.endDate) return;
      
      calendarDays.forEach(day => {
        if (isDateInRange(day, item.startDate, item.endDate)) {
          const key = toYmd(day);
          const existing = map.get(key) || [];
          existing.push(item);
          map.set(key, existing);
        }
      });
    });
    
    return map;
  }, [items, calendarDays]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 dark:border-dark-border border-b border-light-border">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text min-w-[180px] text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
          >
            <ChevronRightIcon size={18} />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-xs font-medium rounded-lg dark:bg-dark-card2 dark:text-dark-text dark:hover:bg-dark-border bg-light-card2 text-light-text hover:bg-light-border transition-colors"
        >
          Today
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 dark:border-dark-border border-b border-light-border">
        {DAYS.map(day => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider dark:text-dark-muted text-light-muted dark:border-dark-border border-r border-light-border last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: 'minmax(120px, 1fr)' }}>
          {calendarDays.map((day, index) => {
            const dateKey = toYmd(day);
            const dayItems = itemsByDate.get(dateKey) || [];
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, today);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={index}
                className={`
                  relative p-1 dark:border-dark-border border-r border-b border-light-border
                  ${!isCurrentMonth ? 'dark:bg-dark-bg/50 bg-gray-50/50' : ''}
                  ${isWeekend && isCurrentMonth ? 'dark:bg-dark-card2/30 bg-gray-50/30' : ''}
                  ${isToday ? 'dark:bg-green-primary/5 bg-green-50/50' : ''}
                `}
              >
                {/* Date number */}
                <div className={`
                  flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1
                  ${isToday 
                    ? 'bg-green-primary text-black' 
                    : isCurrentMonth 
                      ? 'dark:text-dark-text text-light-text' 
                      : 'dark:text-dark-subtle text-light-subtle'
                  }
                `}>
                  {day.getDate()}
                </div>

                {/* Items */}
                <div className="space-y-0.5 overflow-y-auto max-h-[85px]">
                  {dayItems.slice(0, 4).map(item => {
                    const colors = ITEM_COLORS[item.type] || ITEM_COLORS.subtask;
                    const isStart = isSameDay(parseDate(item.startDate), day);
                    const isEnd = isSameDay(parseDate(item.endDate), day);
                    const assignees = (item.assigneeIds || [])
                      .map(id => usersById.get(id))
                      .filter((u): u is User => Boolean(u))
                      .slice(0, 2);

                    return (
                      <button
                        key={item.id}
                        onClick={() => onItemClick?.(item)}
                        className={`
                          w-full text-left px-1.5 py-0.5 text-[10px] font-medium rounded truncate
                          ${colors.bg} ${colors.text} border-l-2 ${colors.border}
                          hover:opacity-80 transition-opacity
                          ${item.type === 'milestone' ? 'italic' : ''}
                        `}
                        title={`${item.name}${isStart ? ' (Start)' : ''}${isEnd ? ' (End)' : ''}`}
                      >
                        <span className="flex items-center gap-1">
                          {item.type === 'milestone' && '◆ '}
                          <span className="truncate flex-1">{item.name}</span>
                          {assignees.length > 0 && (
                            <span className="flex -space-x-1 flex-shrink-0">
                              {assignees.map(u => (
                                <UserAvatar key={u.id} user={u} size="xs" />
                              ))}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                  {dayItems.length > 4 && (
                    <div className="text-[10px] dark:text-dark-subtle text-light-subtle text-center">
                      +{dayItems.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 dark:border-dark-border border-t border-light-border dark:bg-dark-card2/50 bg-gray-50/50">
        <span className="text-[10px] font-medium uppercase tracking-wider dark:text-dark-muted text-light-muted">Legend:</span>
        {Object.entries(ITEM_COLORS).map(([type, colors]) => (
          <span key={type} className={`flex items-center gap-1.5 text-xs ${colors.text}`}>
            <span className={`w-2.5 h-2.5 rounded-sm ${colors.bg} border ${colors.border}`} />
            <span className="capitalize">{type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
