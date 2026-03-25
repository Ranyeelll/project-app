import React from 'react';
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  GanttChartIcon,
  DollarSignIcon,
  UsersIcon,
  FileTextIcon,
  ArchiveIcon,
  LogOutIcon,
  CheckSquareIcon,
  ClockIcon,
  AlertTriangleIcon,
  WalletIcon,
  FolderOpenIcon,
  BarChart2Icon,
  ClipboardCheckIcon,
  XIcon,
  ShieldIcon,
  ShieldAlertIcon } from
'lucide-react';
import { useAuth, useNavigation } from '../../context/AppContext';
import { isElevatedRole, isSupervisor } from '../../utils/roles';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Department-based navigation
const DEPARTMENT_NAV: Record<string, NavItem[]> = {
  Admin: [
    { id: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon size={16} /> },
    { id: 'admin-projects', label: 'Projects', icon: <FolderKanbanIcon size={16} /> },
    { id: 'admin-gantt', label: 'Gantt Hub', icon: <GanttChartIcon size={16} /> },
    { id: 'admin-monitor', label: 'Analytics', icon: <BarChart2Icon size={16} /> },
    { id: 'admin-budget', label: 'Budget Approvals', icon: <DollarSignIcon size={16} /> },
    { id: 'admin-budget-report', label: 'Budget Report', icon: <BarChart2Icon size={16} /> },
    { id: 'admin-team', label: 'Team Management', icon: <UsersIcon size={16} /> },
    { id: 'admin-reports', label: 'Reports & Media', icon: <FileTextIcon size={16} /> },
    { id: 'admin-reviews', label: 'Task Reviews', icon: <ClipboardCheckIcon size={16} /> },
    { id: 'admin-audit-logs', label: 'Audit Logs', icon: <ShieldIcon size={16} /> },
    { id: 'admin-archive', label: 'Archive', icon: <ArchiveIcon size={16} /> },
    { id: 'admin-chat-moderation', label: 'Chat Moderation', icon: <ShieldAlertIcon size={16} /> },
  ],
  Accounting: [
    { id: 'accounting-dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon size={16} /> },
    { id: 'admin-budget', label: 'Budget Approvals', icon: <DollarSignIcon size={16} /> },
    { id: 'admin-budget-report', label: 'Budget Report', icon: <BarChart2Icon size={16} /> },
    { id: 'accounting-review', label: 'Accounting Review', icon: <ClipboardCheckIcon size={16} /> },
  ],
  Technical: [
    { id: 'technical-dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon size={16} /> },
    { id: 'admin-gantt', label: 'Gantt Chart', icon: <GanttChartIcon size={16} /> },
    { id: 'admin-projects', label: 'Projects', icon: <FolderKanbanIcon size={16} /> },
    { id: 'technical-tasks', label: 'Task Management', icon: <CheckSquareIcon size={16} /> },
    { id: 'technical-review', label: 'Technical Review', icon: <ClipboardCheckIcon size={16} /> },
  ],
  Employee: [
    { id: 'employee-dashboard', label: 'My Dashboard', icon: <LayoutDashboardIcon size={16} /> },
    { id: 'employee-tasks', label: 'My Tasks', icon: <CheckSquareIcon size={16} /> },
    { id: 'employee-gantt', label: 'View Gantt', icon: <GanttChartIcon size={16} /> },
    { id: 'employee-budget', label: 'Budget Request', icon: <WalletIcon size={16} /> },
    { id: 'employee-time', label: 'Log Time', icon: <ClockIcon size={16} /> },
    { id: 'employee-issues', label: 'Report Issue', icon: <AlertTriangleIcon size={16} /> },
    { id: 'employee-resources', label: 'Resources', icon: <FolderOpenIcon size={16} /> },
  ],
};

// Keep legacy role-based navigation as fallback
const ADMIN_NAV: NavItem[] = DEPARTMENT_NAV.Admin;
const EMPLOYEE_NAV: NavItem[] = DEPARTMENT_NAV.Employee;
const SUPERVISOR_NAV: NavItem[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon size={16} /> },
  { id: 'admin-projects', label: 'Projects', icon: <FolderKanbanIcon size={16} /> },
  { id: 'admin-gantt', label: 'Gantt Hub', icon: <GanttChartIcon size={16} /> },
  { id: 'admin-monitor', label: 'Analytics', icon: <BarChart2Icon size={16} /> },
  { id: 'admin-reviews', label: 'Task Reviews', icon: <ClipboardCheckIcon size={16} /> },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser, logout } = useAuth();
  const { currentPage, setCurrentPage } = useNavigation();

  // Use department-based navigation with fallback to role-based
  const department = currentUser?.department;
  const navItems = isSupervisor(currentUser?.role)
    ? SUPERVISOR_NAV
    : department && DEPARTMENT_NAV[department]
      ? DEPARTMENT_NAV[department]
      : (isElevatedRole(currentUser?.role) ? ADMIN_NAV : EMPLOYEE_NAV);
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-full
      lg:static lg:w-56 lg:flex-shrink-0 lg:z-auto lg:translate-x-0
      dark:bg-dark-card dark:border-dark-border bg-white border-r border-light-border
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo + mobile close */}
      <div className="flex flex-col items-center justify-center px-4 py-3 dark:border-dark-border border-b border-light-border flex-shrink-0 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 lg:hidden p-1.5 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Close menu"
        >
          <XIcon size={15} />
        </button>
        <img
          src="/Maptech_Official_Logo_version2_(1).png"
          alt="Maptech Information Solutions Inc."
          className="h-14 w-auto object-contain brightness-100 dark:brightness-150 dark:contrast-110" />
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2"
        aria-label="Main navigation">

        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); onClose(); }}
                className={`
                  relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
                  ${isActive ? 'bg-green-primary/10 text-green-primary sidebar-active' : 'dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text'}
                `}
                aria-current={isActive ? 'page' : undefined}>

                <span className={isActive ? 'text-green-primary' : ''}>
                  {item.icon}
                </span>
                {item.label}
              </button>);

          })}
        </div>
      </nav>

      {/* Bottom: logout */}
      <div className="p-3 dark:border-dark-border border-t border-light-border flex-shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors">

          <LogOutIcon size={16} />
          Logout
        </button>
      </div>
    </aside>);

}