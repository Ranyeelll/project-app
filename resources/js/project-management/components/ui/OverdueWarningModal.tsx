import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangleIcon, XIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from './Button';
import { useAuth, useData, useNavigation } from '../../context/AppContext';
import { isEmployeeRole } from '../../utils/roles';

interface OverdueWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OverdueWarningModal({ isOpen, onClose }: OverdueWarningModalProps) {
  const { currentUser } = useAuth();
  const { tasks, projects } = useData();
  const { setCurrentPage } = useNavigation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [animateIn, setAnimateIn] = useState(false);

  // Trigger entrance animation after mount
  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setAnimateIn(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  // Find overdue tasks assigned to the current employee
  const overdueTasks = useMemo(() => {
    if (!currentUser || !isEmployeeRole(currentUser.role)) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (String(t.assignedTo) !== String(currentUser.id)) return false;
      if (t.status === 'completed') return false;
      const end = new Date(t.endDate + 'T00:00:00');
      return end < today;
    });
  }, [tasks, currentUser]);

  // Group overdue tasks by project
  const overdueByProject = useMemo(() => {
    const map = new Map<string, { projectName: string; tasks: typeof overdueTasks }>();
    overdueTasks.forEach((t) => {
      const project = projects.find((p) => p.id === t.projectId);
      const key = t.projectId;
      if (!map.has(key)) {
        map.set(key, { projectName: project?.name || 'Unknown Project', tasks: [] });
      }
      map.get(key)!.tasks.push(t);
    });
    return Array.from(map.values());
  }, [overdueTasks, projects]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || overdueTasks.length === 0) return null;

  const handleViewTasks = () => {
    onClose();
    setCurrentPage('employee-tasks');
  };

  // Calculate days overdue for display
  const getDaysOverdue = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate + 'T00:00:00');
    return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out"
      style={{
        backgroundColor: animateIn ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
      }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`w-full max-w-md dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-modal shadow-modal flex flex-col max-h-[90vh] overflow-hidden transition-all duration-400 ease-out ${
          animateIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          animation: animateIn ? 'overdue-heartbeat 1.8s ease-in-out infinite' : 'none',
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="overdue-title"
      >
        {/* Striped top bar */}
        <div
          className="h-2 w-full flex-shrink-0"
          style={{
            background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 8px, #fca5a5 8px, #fca5a5 16px)',
          }}
        />

        {/* Inline keyframes */}
        <style>{`
          @keyframes overdue-heartbeat {
            0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            7%   { transform: scale(1.025); box-shadow: 0 0 16px 2px rgba(239, 68, 68, 0.15); }
            14%  { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            21%  { transform: scale(1.015); box-shadow: 0 0 10px 1px rgba(239, 68, 68, 0.1); }
            28%  { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `}</style>

        {/* Close button */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
            aria-label="Close warning"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Icon + Title */}
        <div className="flex flex-col items-center px-6 pb-2">
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mb-3">
            <AlertTriangleIcon size={28} className="text-red-500" />
          </div>
          <h2
            id="overdue-title"
            className="text-xl font-bold text-red-500 tracking-wide"
          >
            WARNING!
          </h2>
          <p className="text-sm dark:text-dark-muted text-light-muted text-center mt-2 leading-relaxed">
            You have <span className="font-semibold dark:text-dark-text text-light-text">{overdueTasks.length}</span> overdue{' '}
            {overdueTasks.length === 1 ? 'task' : 'tasks'} that{' '}
            {overdueTasks.length === 1 ? 'has' : 'have'} passed the deadline.
            Please review and take action immediately.
          </p>
        </div>

        {/* Overdue task list */}
        <div className="px-6 py-3 flex-1 overflow-y-auto">
          <div className="space-y-3 max-h-48">
            {overdueByProject.map((group, gi) => (
              <div key={group.projectName}>
                <p
                  className="text-xs font-semibold dark:text-dark-subtle text-light-subtle uppercase tracking-wider mb-1.5"
                >
                  {group.projectName}
                </p>
                {group.tasks.map((task, ti) => {
                  const days = getDaysOverdue(task.endDate);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg dark:bg-red-500/5 bg-red-50 mb-1 transition-colors hover:dark:bg-red-500/10 hover:bg-red-100"
                    >
                      <span className="text-sm dark:text-dark-text text-light-text truncate flex-1 mr-2">
                        {task.title}
                      </span>
                      <span className="text-xs font-medium text-red-500 whitespace-nowrap">
                        {days}d overdue
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Dismiss
          </Button>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={handleViewTasks}
            iconRight={<ArrowRightIcon size={14} />}
          >
            View My Tasks
          </Button>
        </div>

        {/* Striped bottom bar */}
        <div
          className="h-2 w-full flex-shrink-0"
          style={{
            background: 'repeating-linear-gradient(45deg, #ef4444, #ef4444 8px, #fca5a5 8px, #fca5a5 16px)',
          }}
        />
      </div>
    </div>
  );
}
