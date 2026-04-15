import { useEffect, useState, useCallback } from 'react';
import { useAuth, useData } from '../context/AppContext';

export interface LiveNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'task' | 'project' | 'system';
}

/**
 * Hook that listens to Laravel Echo channels for real-time events.
 * Falls back gracefully when Echo (Reverb/Pusher) isn't configured.
 */
export function useEchoNotifications() {
  const { currentUser } = useAuth();
  const { refreshAll } = useData();
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);

  const pushNotification = useCallback((notif: LiveNotification) => {
    setLiveNotifications((prev) => [notif, ...prev].slice(0, 50));
  }, []);

  const dismissLive = useCallback((id: string) => {
    setLiveNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setLiveNotifications([]);
  }, []);

  useEffect(() => {
    // @ts-ignore — Echo is set on window by bootstrap.js
    const echo = (window as any).Echo;
    if (!echo || !currentUser?.id) return;

    // Private channel for user-specific notifications
    const userChannel = echo.private(`user.${currentUser.id}`);

    userChannel.listen('.task.assigned', (e: any) => {
      pushNotification({
        id: `live-task-assigned-${e.taskId}-${Date.now()}`,
        title: 'New Task Assigned',
        description: e.taskTitle || 'You have been assigned a new task',
        time: 'Just now',
        type: 'task',
      });
      refreshAll();
    });

    userChannel.listen('.task.status.changed', (e: any) => {
      pushNotification({
        id: `live-task-status-${e.taskId}-${Date.now()}`,
        title: 'Task Status Updated',
        description: `${e.taskTitle || 'A task'} is now ${e.status}`,
        time: 'Just now',
        type: 'task',
      });
      refreshAll();
    });

    userChannel.listen('.budget.status.changed', (e: any) => {
      pushNotification({
        id: `live-budget-${e.budgetRequestId}-${Date.now()}`,
        title: 'Budget Request Updated',
        description: e.message || 'A budget request status has changed',
        time: 'Just now',
        type: 'project',
      });
      refreshAll();
    });

    userChannel.listen('.project.approval.updated', (e: any) => {
      pushNotification({
        id: `live-project-approval-${e.projectId}-${Date.now()}`,
        title: 'Project Approval Update',
        description: e.message || 'A project approval status has changed',
        time: 'Just now',
        type: 'project',
      });
      refreshAll();
    });

    return () => {
      echo.leave(`user.${currentUser.id}`);
    };
  }, [currentUser?.id, pushNotification, refreshAll]);

  return { liveNotifications, dismissLive, clearAll };
}
