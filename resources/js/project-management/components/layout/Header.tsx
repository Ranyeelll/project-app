import React, { useState, useRef, useEffect, useMemo } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  UserPlusIcon,
  CalendarIcon,
  CameraIcon,
  LogOutIcon,
  UserIcon,
  KeyIcon,
  MenuIcon,
  SearchIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  UsersIcon,
  SettingsIcon,
} from 'lucide-react';
import { ChangePasswordModal } from '../ui/ChangePasswordModal';
import { ProfilePhotoModal } from '../ui/ProfilePhotoModal';
import RetentionModal from '../ui/RetentionModal';
import { useTheme, useAuth, useNavigation, useData } from '../../context/AppContext';
import { isElevatedRole, isSuperadmin } from '../../utils/roles';
import { useEchoNotifications } from '../../hooks/useEchoNotifications';

interface Notification {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  navigateTo?: string;
  read: boolean;
  meta?: any;
  category?: 'tasks' | 'budget' | 'issues' | 'system';
}

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, logout, updateCurrentUser } = useAuth();
  const { currentPage, setCurrentPage } = useNavigation();
  const { tasks, projects, budgetRequests, issues, users } = useData();
  const { liveNotifications, dismissLive, clearAll: clearLive } = useEchoNotifications();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionValue, setRetentionValue] = useState<number | null>(null);
  const [savingRetention, setSavingRetention] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Search results computed from local data
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { projects: [], tasks: [], users: [] };

    const matchedProjects = projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({ id: p.id, title: p.name, subtitle: `${p.status} · ${p.category || 'General'}`, type: 'project' as const }));

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => {
        const proj = projects.find((p) => p.id === t.projectId);
        return { id: t.id, title: t.title, subtitle: proj?.name || 'No project', type: 'task' as const };
      });

    const matchedUsers = users
      .filter((u) => u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((u) => ({ id: u.id, title: u.name, subtitle: `${u.department || ''} · ${u.email || ''}`, type: 'user' as const }));

    return { projects: matchedProjects, tasks: matchedTasks, users: matchedUsers };
  }, [searchQuery, projects, tasks, users]);

  const hasSearchResults = searchResults.projects.length > 0 || searchResults.tasks.length > 0 || searchResults.users.length > 0;

  function handleSearchNavigate(type: string) {
    const isAdmin = isElevatedRole(currentUser?.role);
    if (type === 'project') setCurrentPage(isAdmin ? 'admin-projects' : 'employee-dashboard');
    else if (type === 'task') setCurrentPage(isAdmin ? 'admin-projects' : 'employee-tasks');
    else if (type === 'user') setCurrentPage(isAdmin ? 'admin-team' : 'employee-dashboard');
    setSearchQuery('');
    setShowSearch(false);
  }

  const cachedProfilePhoto = useMemo(() => {
    if (!currentUser?.profilePhoto) return null;
    // Only regenerate the cache-busting token when the photo URL changes.
    return `${currentUser.profilePhoto}?t=${Date.now()}`;
  }, [currentUser?.profilePhoto]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    if (showNotifications || showProfileMenu || showSearch) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotifications, showProfileMenu, showSearch]);

  // Load dismissed IDs from localStorage (user-specific)
  useEffect(() => {
    if (!currentUser?.id) return;
    try {
      const saved = localStorage.getItem(`maptech-dismissed-notifs-${currentUser.id}`);
      if (saved) {
        setDismissedIds(new Set(JSON.parse(saved)));
      } else {
        setDismissedIds(new Set());
      }
    } catch {
      setDismissedIds(new Set());
    }
  }, [currentUser?.id]);

  // Persist dismissed IDs (user-specific)
  useEffect(() => {
    if (!currentUser?.id) return;
    localStorage.setItem(`maptech-dismissed-notifs-${currentUser.id}`, JSON.stringify([...dismissedIds]));
  }, [dismissedIds, currentUser?.id]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // ── Build notifications based on role ──────────────────────────────────
  const notifications = useMemo((): Notification[] => {
    const notifs: Notification[] = [];
    const isAdmin = isElevatedRole(currentUser?.role);
    const isSupervisorUser = currentUser?.role === 'supervisor' && !isSuperadmin(currentUser?.role);
    const isAccountingUser = currentUser?.department === 'Accounting' && !isSuperadmin(currentUser?.role) && !isSupervisorUser;
    const canManageBudget = isSuperadmin(currentUser?.role) || isSupervisorUser || isAccountingUser;
    const budgetQueueStatus = isAccountingUser
      ? 'pending'
      : (isSupervisorUser ? 'accounting_approved' : 'supervisor_approved');

    if (isAdmin) {
      // 1. Pending task reviews
      const pendingReviews = tasks.filter((t) => t.completionReportStatus === 'pending');
      if (pendingReviews.length > 0) {
        notifs.push({
          id: 'admin-pending-reviews',
          icon: <ClipboardCheckIcon size={14} />,
          iconBg: 'bg-blue-500/15 text-blue-400',
          title: 'Pending Task Reviews',
          description: `${pendingReviews.length} task${pendingReviews.length > 1 ? 's' : ''} awaiting your review`,
          time: 'Action needed',
          navigateTo: 'admin-reviews',
          read: false,
        });
      }

      // 2. Pending budget requests
      if (canManageBudget) {
        const pendingBudgets = budgetRequests.filter((b) => b.status === budgetQueueStatus);
        if (pendingBudgets.length > 0) {
          notifs.push({
            id: 'admin-pending-budgets',
            icon: <DollarSignIcon size={14} />,
            iconBg: 'bg-yellow-500/15 text-yellow-400',
            title: 'Budget Requests In Queue',
            description: `${pendingBudgets.length} budget request${pendingBudgets.length > 1 ? 's' : ''} awaiting your approval stage`,
            time: 'Action needed',
            navigateTo: 'admin-budget',
            read: false,
          });
        }

        // Budgets awaiting employee revision
        const revisionBudgets = budgetRequests.filter((b) => b.status === 'revision_requested');
        if (revisionBudgets.length > 0) {
          notifs.push({
            id: 'admin-revision-budgets',
            icon: <ClockIcon size={14} />,
            iconBg: 'bg-purple-500/15 text-purple-400',
            title: 'Budgets Awaiting Revision',
            description: `${revisionBudgets.length} request${revisionBudgets.length > 1 ? 's' : ''} sent back for revision`,
            time: 'Waiting on employee',
            navigateTo: 'admin-budget',
            read: false,
          });
        }
      }

      // Completed projects submitted by employees for elevated review.
      const completedProjectsAwaitingApproval = projects.filter(
        (p) => p.status === 'completed' && (p.approvalStatus || 'draft') === 'supervisor_review'
      );
      if (completedProjectsAwaitingApproval.length > 0) {
        notifs.push({
          id: 'admin-completed-projects-awaiting-approval',
          icon: <CheckCircleIcon size={14} />,
          iconBg: 'bg-emerald-500/15 text-emerald-400',
          title: 'Completed Projects Awaiting Approval',
          description: `${completedProjectsAwaitingApproval.length} completed project${completedProjectsAwaitingApproval.length > 1 ? 's' : ''} awaiting supervisor/superadmin review`,
          time: 'Action needed',
          navigateTo: 'admin-projects',
          read: false,
        });
      }

      // 3. Overdue tasks
      const overdueTasks = tasks.filter(
        (t) => t.status !== 'completed' && t.endDate < todayStr
      );
      if (overdueTasks.length > 0) {
        notifs.push({
          id: 'admin-overdue',
          icon: <AlertTriangleIcon size={14} />,
          iconBg: 'bg-red-500/15 text-red-400',
          title: 'Overdue Tasks',
          description: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} past deadline`,
          time: 'Urgent',
          navigateTo: 'admin-monitor',
          read: false,
        });
      }

      // 4. Open issues
      const openIssues = issues.filter((i) => i.status === 'open');
      if (openIssues.length > 0) {
        notifs.push({
          id: 'admin-open-issues',
          icon: <AlertTriangleIcon size={14} />,
          iconBg: 'bg-orange-500/15 text-orange-400',
          title: 'Open Issues',
          description: `${openIssues.length} unresolved issue${openIssues.length > 1 ? 's' : ''} reported`,
          time: 'Needs attention',
          navigateTo: 'admin-monitor',
          read: false,
        });
      }

      // 5. Tasks in review (ready for checking)
      const reviewTasks = tasks.filter((t) => t.status === 'review');
      if (reviewTasks.length > 0) {
        notifs.push({
          id: 'admin-in-review',
          icon: <ClockIcon size={14} />,
          iconBg: 'bg-purple-500/15 text-purple-400',
          title: 'Tasks In Review',
          description: `${reviewTasks.length} task${reviewTasks.length > 1 ? 's' : ''} submitted for review`,
          time: 'Review when ready',
          navigateTo: 'admin-reviews',
          read: false,
        });
      }

      // 6. Projects nearing deadline (within 7 days)
      const soonProjects = projects.filter((p) => {
        if (p.status !== 'active') return false;
        const end = new Date(p.endDate);
        const diff = (end.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      });
      if (soonProjects.length > 0) {
        notifs.push({
          id: 'admin-deadline-projects',
          icon: <CalendarIcon size={14} />,
          iconBg: 'bg-amber-500/15 text-amber-400',
          title: 'Project Deadlines Approaching',
          description: `${soonProjects.length} project${soonProjects.length > 1 ? 's' : ''} due within 7 days`,
          time: 'Plan ahead',
          navigateTo: 'admin-projects',
          read: false,
        });
      }
    } else {
      // ── Employee Notifications ────────────────────────────────────────
      const myId = currentUser?.id || '';

      // 1. Tasks assigned to me
      const myTasks = tasks.filter((t) => t.assignedTo === myId);

      // 2. Overdue tasks (my)
      const myOverdue = myTasks.filter(
        (t) => t.status !== 'completed' && t.endDate < todayStr
      );
      if (myOverdue.length > 0) {
        notifs.push({
          id: 'emp-overdue',
          icon: <AlertTriangleIcon size={14} />,
          iconBg: 'bg-red-500/15 text-red-400',
          title: 'Overdue Tasks',
          description: `You have ${myOverdue.length} task${myOverdue.length > 1 ? 's' : ''} past deadline`,
          time: 'Urgent',
          navigateTo: 'employee-tasks',
          read: false,
        });
      }

      // 3. Tasks due soon (within 3 days)
      const dueSoon = myTasks.filter((t) => {
        if (t.status === 'completed') return false;
        const end = new Date(t.endDate);
        const diff = (end.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 3;
      });
      if (dueSoon.length > 0) {
        notifs.push({
          id: 'emp-due-soon',
          icon: <ClockIcon size={14} />,
          iconBg: 'bg-amber-500/15 text-amber-400',
          title: 'Tasks Due Soon',
          description: `${dueSoon.length} task${dueSoon.length > 1 ? 's' : ''} due within 3 days`,
          time: 'Coming up',
          navigateTo: 'employee-tasks',
          read: false,
        });
      }

      // 4. Approved completion reports
      const approvedTasks = myTasks.filter((t) => t.completionReportStatus === 'approved');
      if (approvedTasks.length > 0) {
        notifs.push({
          id: 'emp-approved',
          icon: <CheckCircleIcon size={14} />,
          iconBg: 'bg-green-500/15 text-green-400',
          title: 'Tasks Approved',
          description: `${approvedTasks.length} task report${approvedTasks.length > 1 ? 's' : ''} approved by admin`,
          time: 'Good news',
          navigateTo: 'employee-tasks',
          read: false,
        });
      }

      // 5. Rejected completion reports
      const rejectedTasks = myTasks.filter((t) => t.completionReportStatus === 'rejected');
      if (rejectedTasks.length > 0) {
        notifs.push({
          id: 'emp-rejected',
          icon: <XCircleIcon size={14} />,
          iconBg: 'bg-red-500/15 text-red-400',
          title: 'Tasks Rejected',
          description: `${rejectedTasks.length} report${rejectedTasks.length > 1 ? 's' : ''} rejected — resubmit needed`,
          time: 'Action needed',
          navigateTo: 'employee-tasks',
          read: false,
        });
      }

      // 6. Budget request updates
      const myBudgets = budgetRequests.filter((b) => b.requestedBy === myId);
      const approvedBudgets = myBudgets.filter((b) => b.status === 'approved');
      const rejectedBudgets = myBudgets.filter((b) => b.status === 'rejected');
      const pendingBudgets = myBudgets.filter((b) => b.status === 'pending');
      const revisionBudgets = myBudgets.filter((b) => b.status === 'revision_requested');

      if (approvedBudgets.length > 0) {
        notifs.push({
          id: 'emp-budget-approved',
          icon: <CheckCircleIcon size={14} />,
          iconBg: 'bg-green-500/15 text-green-400',
          title: 'Budget Approved',
          description: `${approvedBudgets.length} budget request${approvedBudgets.length > 1 ? 's' : ''} approved`,
          time: 'Funded',
          navigateTo: 'employee-budget',
          read: false,
        });
      }
      if (rejectedBudgets.length > 0) {
        notifs.push({
          id: 'emp-budget-rejected',
          icon: <XCircleIcon size={14} />,
          iconBg: 'bg-red-500/15 text-red-400',
          title: 'Budget Rejected',
          description: `${rejectedBudgets.length} budget request${rejectedBudgets.length > 1 ? 's' : ''} rejected`,
          time: 'Review feedback',
          navigateTo: 'employee-budget',
          read: false,
        });
      }
      if (pendingBudgets.length > 0) {
        notifs.push({
          id: 'emp-budget-pending',
          icon: <DollarSignIcon size={14} />,
          iconBg: 'bg-yellow-500/15 text-yellow-400',
          title: 'Budget Pending',
          description: `${pendingBudgets.length} request${pendingBudgets.length > 1 ? 's' : ''} awaiting admin review`,
          time: 'Waiting',
          navigateTo: 'employee-budget',
          read: false,
        });
      }
      if (revisionBudgets.length > 0) {
        notifs.push({
          id: 'emp-budget-revision',
          icon: <AlertTriangleIcon size={14} />,
          iconBg: 'bg-purple-500/15 text-purple-400',
          title: 'Budget Revision Requested',
          description: `${revisionBudgets.length} request${revisionBudgets.length > 1 ? 's need' : ' needs'} revision — check admin remarks`,
          time: 'Action needed',
          navigateTo: 'employee-budget',
          read: false,
        });
      }

      // 7. Tasks with employee edit enabled
      const editableTasks = myTasks.filter((t) => t.allowEmployeeEdit && t.status !== 'completed');
      if (editableTasks.length > 0) {
        notifs.push({
          id: 'emp-editable',
          icon: <FolderIcon size={14} />,
          iconBg: 'bg-blue-500/15 text-blue-400',
          title: 'Editable Tasks',
          description: `${editableTasks.length} task${editableTasks.length > 1 ? 's' : ''} you can update`,
          time: 'Update progress',
          navigateTo: 'employee-tasks',
          read: false,
        });
      }
    }

    // Mark notifications as read if they've been dismissed, and auto-assign categories
    return notifs.map((n) => {
      let category: Notification['category'] = 'system';
      if (n.id.includes('review') || n.id.includes('task') || n.id.includes('overdue') || n.id.includes('deadline') || n.id.includes('assigned') || n.id.includes('editable')) category = 'tasks';
      else if (n.id.includes('budget') || n.id.includes('revision')) category = 'budget';
      else if (n.id.includes('issue') || n.id.includes('blocker')) category = 'issues';
      else if (n.id.includes('project') || n.id.includes('approval')) category = 'tasks';
      return { ...n, category, read: dismissedIds.has(n.id) };
    });
  }, [currentUser, tasks, projects, budgetRequests, issues, users, todayStr, dismissedIds]);

  // No DB chat notifications — chat feature removed

  const unreadCount = notifications.filter((n) => !n.read).length + liveNotifications.length;

  // Notification category filter
  const [notifFilter, setNotifFilter] = useState<'all' | 'tasks' | 'budget' | 'issues' | 'system'>('all');
  const filteredNotifications = notifFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.category === notifFilter);

  // Browser tab badge for unread notifications
  useEffect(() => {
    const baseTitle = 'MAPTECH PMS';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
  }, [unreadCount]);

  const markAllRead = () => {
    const newDismissed = new Set(dismissedIds);
    notifications.forEach((n) => newDismissed.add(n.id));
    setDismissedIds(newDismissed);
    clearLive();
  };

  const handleNotifClick = (notif: Notification) => {
    // Mark as read
    setDismissedIds((prev) => new Set(prev).add(notif.id));
    // Navigate if specified
    if (notif.navigateTo) {
      setCurrentPage(notif.navigateTo);
    }
    setShowNotifications(false);
  };



  const pageTitles: Record<string, string> = {
    'admin-dashboard': 'Dashboard',
    'admin-projects': 'Projects',
    'admin-gantt': 'Gantt Hub',
    'admin-monitor': 'Analytics',
    'admin-budget': 'Budget Approvals',
    'admin-budget-report': 'Budget Report',
    'admin-team': 'Team Management',
    'admin-reports': 'Reports & Media',
    'admin-reviews': 'Task Reviews',
    'admin-archive': 'Archive',
    'employee-dashboard': 'My Dashboard',
    'employee-tasks': 'My Tasks',
    'employee-board': 'Kanban Board',
    'employee-gantt': 'View Gantt',
    'employee-budget': 'Budget Request',
    'employee-time': 'Log Time',
    'employee-issues': 'Report Issue',
    'employee-resources': 'Resources',
    'settings': 'Settings',
    'calendar': 'Calendar',
    'admin-audit-logs': 'Audit Logs',
  };
  const title = pageTitles[currentPage] || 'Project Management System';

  return (
    <header className="h-14 flex-shrink-0 dark:bg-dark-card dark:border-dark-border bg-white border-b border-light-border flex items-center justify-between px-3 md:px-6 z-20">
      <div className="flex items-center gap-1 min-w-0">
        {/* Hamburger: only on < lg */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 mr-1 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors flex-shrink-0"
          aria-label="Toggle navigation"
        >
          <MenuIcon size={18} />
        </button>
        {/* Page title */}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
            {title}
          </h1>
          <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5 hidden sm:block">
            {isSuperadmin(currentUser?.role)
              ? `Superadmin${currentUser?.department ? ` · ${currentUser.department}` : ''}`
              : (currentUser?.role === 'supervisor'
                ? 'Supervisor'
                : `Employee${currentUser?.department ? ` · ${currentUser.department}` : ''}`)}
          </p>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-4 relative" ref={searchRef}>
        <div className="relative w-full">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-subtle text-light-subtle pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search projects, tasks, people…"
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg dark:bg-dark-card2 bg-light-card2 dark:text-dark-text text-light-text dark:placeholder-dark-subtle placeholder-light-subtle border dark:border-dark-border border-light-border focus:outline-none focus:ring-1 focus:ring-green-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowSearch(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded dark:text-dark-subtle dark:hover:text-dark-text text-light-subtle hover:text-light-text"
            >
              <XCircleIcon size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearch && searchQuery.trim().length >= 1 && (
          <div className="absolute top-full left-0 right-0 mt-1 dark:bg-dark-card bg-white rounded-lg shadow-xl border dark:border-dark-border border-light-border overflow-hidden z-50 max-h-[400px] overflow-y-auto">
            {!hasSearchResults ? (
              <div className="px-4 py-6 text-center">
                <SearchIcon size={20} className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle opacity-40" />
                <p className="text-sm dark:text-dark-muted text-light-muted">No results for "{searchQuery}"</p>
              </div>
            ) : (
              <>
                {searchResults.projects.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle dark:bg-dark-bg bg-light-bg">
                      Projects ({searchResults.projects.length})
                    </div>
                    {searchResults.projects.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSearchNavigate(r.type)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors"
                      >
                        <FolderKanbanIcon size={14} className="text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm dark:text-dark-text text-light-text truncate">{r.title}</p>
                          <p className="text-[11px] dark:text-dark-subtle text-light-subtle truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle dark:bg-dark-bg bg-light-bg">
                      Tasks ({searchResults.tasks.length})
                    </div>
                    {searchResults.tasks.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSearchNavigate(r.type)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors"
                      >
                        <ListTodoIcon size={14} className="text-green-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm dark:text-dark-text text-light-text truncate">{r.title}</p>
                          <p className="text-[11px] dark:text-dark-subtle text-light-subtle truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.users.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle dark:bg-dark-bg bg-light-bg">
                      People ({searchResults.users.length})
                    </div>
                    {searchResults.users.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSearchNavigate(r.type)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors"
                      >
                        <UsersIcon size={14} className="text-purple-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm dark:text-dark-text text-light-text truncate">{r.title}</p>
                          <p className="text-[11px] dark:text-dark-subtle text-light-subtle truncate">{r.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
            aria-label="Notifications"
          >
            <BellIcon size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl shadow-2xl overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 dark:border-dark-border border-b border-light-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-green-primary hover:text-green-400 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              {notifications.length > 0 && (
                <div className="flex gap-0.5 px-2 py-1.5 dark:border-dark-border border-b border-light-border overflow-x-auto">
                  {([['all', 'All'], ['tasks', 'Tasks'], ['budget', 'Budget'], ['issues', 'Issues']] as const).map(([key, label]) => {
                    const count = key === 'all'
                      ? notifications.filter((n) => !n.read).length
                      : notifications.filter((n) => n.category === key && !n.read).length;
                    return (
                      <button
                        key={key}
                        onClick={() => setNotifFilter(key)}
                        className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                          notifFilter === key
                            ? 'bg-green-primary/15 text-green-primary'
                            : 'dark:text-dark-subtle text-light-subtle dark:hover:bg-dark-card2 hover:bg-light-card2'
                        }`}
                      >
                        {label}
                        {count > 0 && (
                          <span className="ml-1 text-[9px] opacity-70">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Notification List */}
              <div className="max-h-[380px] overflow-y-auto">
                {/* Live real-time notifications */}
                {liveNotifications.length > 0 && (
                  <>
                    {liveNotifications.map((ln) => (
                      <div
                        key={ln.id}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left dark:bg-green-900/20 bg-green-50/40 dark:border-dark-border/50 border-b border-light-border/50"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/15 text-green-400">
                          <BellIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold truncate dark:text-dark-text text-light-text">{ln.title}</p>
                            <span className="w-1.5 h-1.5 bg-green-primary rounded-full flex-shrink-0 animate-pulse" />
                          </div>
                          <p className="text-[11px] dark:text-dark-subtle text-light-subtle mt-0.5 truncate">{ln.description}</p>
                          <p className="text-[10px] dark:text-dark-subtle/70 text-light-subtle/70 mt-1 font-medium">{ln.time}</p>
                        </div>
                        <button
                          onClick={() => dismissLive(ln.id)}
                          className="text-[10px] dark:text-dark-subtle text-light-subtle hover:text-red-400 flex-shrink-0 mt-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {filteredNotifications.length === 0 && liveNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <BellIcon size={28} className="dark:text-dark-subtle text-light-subtle opacity-30 mb-2" />
                    <p className="text-xs dark:text-dark-subtle text-light-subtle">No notifications</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors dark:border-dark-border/50 border-b border-light-border/50 last:border-b-0 ${
                        notif.read
                          ? 'dark:hover:bg-dark-card2/50 hover:bg-gray-50/50 opacity-60'
                          : 'dark:bg-dark-card2/30 bg-green-50/20 dark:hover:bg-dark-card2/60 hover:bg-green-50/40'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${notif.iconBg}`}>
                        {notif.icon}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-semibold truncate ${
                            notif.read
                              ? 'dark:text-dark-muted text-light-muted'
                              : 'dark:text-dark-text text-light-text'
                          }`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 bg-green-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] dark:text-dark-subtle text-light-subtle mt-0.5 truncate">
                          {notif.description}
                        </p>
                        <p className="text-[10px] dark:text-dark-subtle/70 text-light-subtle/70 mt-1 font-medium">
                          {notif.time}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 dark:border-dark-border border-t border-light-border text-center">
                  <button
                    onClick={() => {
                      setCurrentPage(isElevatedRole(currentUser?.role) ? 'admin-dashboard' : 'employee-dashboard');
                      setShowNotifications(false);
                    }}
                    className="text-[11px] font-medium text-green-primary hover:text-green-400 transition-colors"
                  >
                    View Dashboard
                  </button>
                </div>
              )}
              {/* Toast */}
              {toastMessage && (
                <div className="absolute left-1/2 transform -translate-x-1/2 bottom-4 z-50">
                  <div className="bg-black text-white px-3 py-1.5 rounded shadow-md text-sm">{toastMessage}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>

        {/* User menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-2 ml-1 dark:border-dark-border border-l border-light-border cursor-pointer hover:opacity-80 transition-opacity"
          >
            {/* Avatar / Photo */}
            {currentUser?.profilePhoto ? (
              <img
                src={cachedProfilePhoto!}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-green-primary/30"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                style={{ backgroundColor: '#63D44A' }}
              >
                {currentUser?.avatar}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium dark:text-dark-text text-light-text leading-none">
                {currentUser?.name}
              </p>
              <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                {currentUser?.position}
              </p>
            </div>
            <ChevronDownIcon size={14} className="dark:text-dark-muted text-light-muted hidden sm:block" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-xl shadow-2xl overflow-hidden z-50">
              {/* User info header */}
              <div className="px-4 py-4 dark:border-dark-border border-b border-light-border">
                <div className="flex items-center gap-3">
                  {/* Profile photo with upload overlay */}
                  <div className="relative group cursor-pointer" onClick={() => setShowProfilePhotoModal(true)}>
                    {currentUser?.profilePhoto ? (
                      <img
                        src={cachedProfilePhoto!}
                        alt={currentUser?.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-green-primary/30"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-black"
                        style={{ backgroundColor: '#63D44A' }}
                      >
                        {currentUser?.avatar}
                      </div>
                    )}
                    {/* Camera overlay */}
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <CameraIcon size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle truncate mt-0.5">
                      {currentUser?.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-primary/15 text-green-primary capitalize">
                        {currentUser?.role}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-gray-500">
                        ID: {currentUser?.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload photo button */}
              <div className="px-2 py-2 dark:border-dark-border border-b border-light-border">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowProfilePhotoModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
                >
                  <span className="h-4 w-4 flex items-center justify-center shrink-0">
                    <CameraIcon size={14} />
                  </span>
                  <span className="leading-5">{currentUser?.profilePhoto ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
                >
                  <span className="h-4 w-4 flex items-center justify-center shrink-0">
                    <KeyIcon size={14} />
                  </span>
                  <span className="leading-5">Change Password</span>
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); setCurrentPage('settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
                >
                  <span className="h-4 w-4 flex items-center justify-center shrink-0">
                    <SettingsIcon size={14} />
                  </span>
                  <span className="leading-5">Settings</span>
                </button>
              {/* Edit Retention (superadmin only) */}
              {String(currentUser?.role).toLowerCase() === 'superadmin' && (
                <div className="px-2 py-2 dark:border-dark-border border-b border-light-border">
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      // load current value then open modal
                      try {
                        const res = await apiFetch('/api/settings/audit-log-retention');
                        if (res.ok) {
                          const data = await res.json();
                          setRetentionValue(data.audit_log_retention_days ?? 365);
                        } else {
                          setRetentionValue(365);
                        }
                      } catch {
                        setRetentionValue(365);
                      }
                      setShowRetentionModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
                  >
                    <span className="h-4 w-4 flex items-center justify-center shrink-0">
                      <ClipboardCheckIcon size={14} />
                    </span>
                    <span className="leading-5">Edit Retention Policy</span>
                  </button>
                </div>
              )}
              </div>

              {/* Logout */}
              <div className="px-2 py-2">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <span className="h-4 w-4 flex items-center justify-center shrink-0">
                    <LogOutIcon size={14} />
                  </span>
                  <span className="leading-5">Logout</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Profile Photo Modal */}
      {currentUser && (
        <ProfilePhotoModal
          isOpen={showProfilePhotoModal}
          onClose={() => setShowProfilePhotoModal(false)}
          user={currentUser}
          onPhotoUpdated={updateCurrentUser}
        />
      )}

      {/* Retention Modal */}
      <RetentionModal
        isOpen={showRetentionModal}
        initialDays={retentionValue}
        onClose={() => setShowRetentionModal(false)}
        onSaved={(days: number) => {
          setToastMessage('Retention policy saved');
          setTimeout(() => setToastMessage(null), 3000);
          setRetentionValue(days);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </header>
  );
}