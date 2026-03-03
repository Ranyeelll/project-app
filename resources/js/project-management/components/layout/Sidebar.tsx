import React from 'react';
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  GanttChartIcon,
  ActivityIcon,
  DollarSignIcon,
  UsersIcon,
  FileTextIcon,
  ArchiveIcon,
  LogOutIcon,
  CheckSquareIcon,
  ClockIcon,
  AlertTriangleIcon,
  WalletIcon,
  BarChart2Icon,
  ClipboardCheckIcon } from
'lucide-react';
import { useAuth, useNavigation, useTheme } from '../../context/AppContext';
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}
const ADMIN_NAV: NavItem[] = [
{
  id: 'admin-dashboard',
  label: 'Dashboard',
  icon: <LayoutDashboardIcon size={16} />
},
{
  id: 'admin-projects',
  label: 'Projects',
  icon: <FolderKanbanIcon size={16} />
},
{
  id: 'admin-gantt',
  label: 'Gantt Hub',
  icon: <GanttChartIcon size={16} />
},
{
  id: 'admin-monitor',
  label: 'Monitor & Control',
  icon: <ActivityIcon size={16} />
},
{
  id: 'admin-budget',
  label: 'Budget Approvals',
  icon: <DollarSignIcon size={16} />
},
{
  id: 'admin-team',
  label: 'Team Management',
  icon: <UsersIcon size={16} />
},
{
  id: 'admin-reports',
  label: 'Reports & Media',
  icon: <FileTextIcon size={16} />
},
{
  id: 'admin-reviews',
  label: 'Task Reviews',
  icon: <ClipboardCheckIcon size={16} />
},
{
  id: 'admin-archive',
  label: 'Archive',
  icon: <ArchiveIcon size={16} />
}];

const EMPLOYEE_NAV: NavItem[] = [
{
  id: 'employee-dashboard',
  label: 'My Dashboard',
  icon: <LayoutDashboardIcon size={16} />
},
{
  id: 'employee-tasks',
  label: 'My Tasks',
  icon: <CheckSquareIcon size={16} />
},
{
  id: 'employee-gantt',
  label: 'View Gantt',
  icon: <GanttChartIcon size={16} />
},
{
  id: 'employee-budget',
  label: 'Budget Request',
  icon: <WalletIcon size={16} />
},
{
  id: 'employee-time',
  label: 'Log Time',
  icon: <ClockIcon size={16} />
},
{
  id: 'employee-issues',
  label: 'Report Issue',
  icon: <AlertTriangleIcon size={16} />
}];

export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const { currentPage, setCurrentPage } = useNavigation();
  const { isDark } = useTheme();
  const navItems = currentUser?.role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV;
  return (
    <aside className="w-56 flex-shrink-0 dark:bg-dark-card dark:border-dark-border bg-white border-r border-light-border flex flex-col h-full">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center px-4 py-3 dark:border-dark-border border-b border-light-border flex-shrink-0">
        <img
          src="/Maptech_Official_Logo_version2_(1).png"
          alt="Maptech Information Solutions Inc."
          className="h-14 w-auto object-contain"
          style={{
            filter: isDark ? 'brightness(1.5) contrast(1.1)' : 'brightness(1)'
          }} />
        <p className="mt-1.5 text-[10px] font-medium tracking-wide dark:text-dark-muted text-gray-500 text-center">
          Maptech Information Solutions Inc.
        </p>
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
                onClick={() => setCurrentPage(item.id)}
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