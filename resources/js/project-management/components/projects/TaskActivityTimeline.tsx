import React, { useState, useEffect } from 'react';
import {
  ActivityIcon,
  CheckCircleIcon,
  EditIcon,
  UserPlusIcon,
  PlayIcon,
  PauseIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  ClockIcon,
  FlagIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  LoaderIcon,
} from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

interface Activity {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  actionType: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdAtFormatted: string;
}

interface TaskActivityTimelineProps {
  taskId: string;
  taskTitle?: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  task_created:     { icon: <PlayIcon size={14} />,           color: 'text-green-400',  label: 'Created' },
  created:          { icon: <PlayIcon size={14} />,           color: 'text-green-400',  label: 'Created' },
  task_updated:     { icon: <EditIcon size={14} />,           color: 'text-blue-400',   label: 'Updated' },
  updated:          { icon: <EditIcon size={14} />,           color: 'text-blue-400',   label: 'Updated' },
  status_changed:   { icon: <RefreshCwIcon size={14} />,      color: 'text-amber-400',  label: 'Status Changed' },
  task_assigned:    { icon: <UserPlusIcon size={14} />,       color: 'text-purple-400', label: 'Assigned' },
  assigned:         { icon: <UserPlusIcon size={14} />,       color: 'text-purple-400', label: 'Assigned' },
  progress_updated: { icon: <ClockIcon size={14} />,          color: 'text-cyan-400',   label: 'Progress' },
  completed:        { icon: <CheckCircleIcon size={14} />,    color: 'text-green-500',  label: 'Completed' },
  task_completed:   { icon: <CheckCircleIcon size={14} />,    color: 'text-green-500',  label: 'Completed' },
  blocker_reported: { icon: <AlertTriangleIcon size={14} />,  color: 'text-red-400',    label: 'Blocker' },
  comment_added:    { icon: <MessageSquareIcon size={14} />,  color: 'text-indigo-400', label: 'Comment' },
  review_submitted: { icon: <FlagIcon size={14} />,           color: 'text-orange-400', label: 'Review' },
  paused:           { icon: <PauseIcon size={14} />,          color: 'text-gray-400',   label: 'Paused' },
};

function getActionConfig(actionType: string) {
  return ACTION_CONFIG[actionType] || {
    icon: <ActivityIcon size={14} />,
    color: 'text-gray-400',
    label: actionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  };
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderMetadata(metadata: Record<string, unknown>, actionType: string): React.ReactNode {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  if (actionType === 'status_changed' && metadata.from && metadata.to) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-xs px-1.5 py-0.5 rounded dark:bg-dark-card bg-light-card dark:text-dark-subtle text-light-subtle">
          {String(metadata.from).replace(/_/g, ' ')}
        </span>
        <ArrowRightIcon size={10} className="dark:text-dark-subtle text-light-subtle" />
        <span className="text-xs px-1.5 py-0.5 rounded dark:bg-dark-card bg-light-card dark:text-dark-text text-light-text font-medium">
          {String(metadata.to).replace(/_/g, ' ')}
        </span>
      </div>
    );
  }

  if (actionType === 'progress_updated' && metadata.progress !== undefined) {
    const progress = Number(metadata.progress);
    return (
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full dark:bg-dark-card bg-light-card max-w-[120px]">
          <div
            className="h-full rounded-full bg-green-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs dark:text-dark-muted text-light-muted">{progress}%</span>
      </div>
    );
  }

  return null;
}

export function TaskActivityTimeline({ taskId, taskTitle }: TaskActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/tasks/${taskId}/activities`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load activities (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setActivities(data.activities || []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoaderIcon size={20} className="animate-spin dark:text-dark-muted text-light-muted" />
        <span className="ml-2 text-sm dark:text-dark-muted text-light-muted">Loading activity…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <AlertTriangleIcon size={24} className="mx-auto mb-2 text-red-400 opacity-60" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <ActivityIcon size={28} className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle opacity-40" />
        <p className="text-sm dark:text-dark-muted text-light-muted">No activity recorded yet</p>
      </div>
    );
  }

  // Group activities by date
  const grouped: Record<string, Activity[]> = {};
  for (const a of activities) {
    const dateKey = new Date(a.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(a);
  }

  // Reverse to show newest first
  const sortedDates = Object.keys(grouped).reverse();

  return (
    <div className="space-y-4">
      {taskTitle && (
        <div className="flex items-center gap-2 mb-3">
          <ActivityIcon size={16} className="text-green-primary" />
          <h4 className="text-sm font-semibold dark:text-dark-text text-light-text">
            Activity Timeline
          </h4>
          <span className="text-xs dark:text-dark-subtle text-light-subtle">
            ({activities.length} {activities.length === 1 ? 'event' : 'events'})
          </span>
        </div>
      )}

      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 dark:bg-dark-border bg-light-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider dark:text-dark-subtle text-light-subtle">
              {dateKey}
            </span>
            <div className="h-px flex-1 dark:bg-dark-border bg-light-border" />
          </div>

          <div className="relative ml-3">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-0 bottom-0 w-px dark:bg-dark-border bg-light-border" />

            {grouped[dateKey].slice().reverse().map((activity, idx) => {
              const config = getActionConfig(activity.actionType);
              return (
                <div key={activity.id || idx} className="relative flex items-start gap-3 pb-3 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full dark:bg-dark-bg bg-light-bg border-2 dark:border-dark-border border-light-border ${config.color}`}>
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-medium dark:text-dark-text text-light-text">
                        {activity.userName}
                      </span>
                      <span className="text-xs dark:text-dark-muted text-light-muted">
                        {activity.description}
                      </span>
                    </div>

                    {renderMetadata(activity.metadata, activity.actionType)}

                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5 block">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
