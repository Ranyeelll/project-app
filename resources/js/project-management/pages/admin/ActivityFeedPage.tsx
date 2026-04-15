import React, { useEffect, useState } from 'react';
import { useData } from '../../context/AppContext';
import { ActivityFeedItem } from '../../data/mockData';
import { apiFetch } from '../../utils/apiFetch';
import { ActivityIcon, RefreshCwIcon } from 'lucide-react';

export function ActivityFeedPage() {
  const { users } = useData();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/activity-feed?limit=100', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: ActivityFeedItem[]) => {
        if (Array.isArray(data)) setActivities(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getUserName = (userId: string) => users.find((u) => u.id === userId)?.name || 'System';

  const formatAction = (item: ActivityFeedItem) => {
    const actor = getUserName(item.userId);
    const resource = item.resourceType || '';
    const action = item.action || '';
    return `${actor} ${action.replace(/_/g, ' ')} ${resource} #${item.resourceId}`;
  };

  const timeAgo = (isoStr: string) => {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-gray-900">Activity Feed</h1>
          <p className="text-sm dark:text-dark-muted text-gray-500 mt-1">Recent system-wide activity</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-white bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">
          <RefreshCwIcon size={14} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl dark:bg-dark-card dark:border-dark-border bg-white border border-light-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center dark:text-dark-muted text-gray-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center dark:text-dark-muted text-gray-500">
            <ActivityIcon size={32} className="mx-auto mb-2 opacity-50" />
            No activity recorded yet
          </div>
        ) : (
          <div className="divide-y dark:divide-dark-border divide-light-border">
            {activities.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3 dark:hover:bg-dark-card2 hover:bg-gray-50 transition-colors">
                <div className="p-1.5 rounded-full dark:bg-dark-card2 bg-gray-100 mt-0.5">
                  <ActivityIcon size={12} className="dark:text-dark-muted text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm dark:text-white text-gray-900">{formatAction(item)}</p>
                  {Object.keys(item.changes || {}).length > 0 && (
                    <p className="text-xs dark:text-dark-muted text-gray-500 mt-0.5 truncate">
                      Changed: {Object.keys(item.changes).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs dark:text-dark-muted text-gray-400 whitespace-nowrap">{timeAgo(item.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
