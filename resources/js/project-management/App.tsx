import React, { useState, useEffect } from 'react';
import {
  AppProvider,
  useAuth,
  useNavigation,
  useData } from
'./context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ChangePasswordModal } from './components/ui/ChangePasswordModal';
import { OverdueWarningModal } from './components/ui/OverdueWarningModal';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { GanttPage } from './pages/admin/GanttPage';
import { MonitorControlPage } from './pages/admin/MonitorControlPage';
import { BudgetApprovalsPage } from './pages/admin/BudgetApprovalsPage';
import { BudgetReportPage } from './pages/admin/BudgetReportPage';
import { TeamManagementPage } from './pages/admin/TeamManagementPage';
import { ReportsMediaPage } from './pages/admin/ReportsMediaPage';
import { TaskReviewsPage } from './pages/admin/TaskReviewsPage';
import { ArchivePage } from './pages/admin/ArchivePage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { CreateProjectPage } from './pages/admin/CreateProjectPage';
// Chat feature removed: chat pages omitted
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MyTasksPage } from './pages/employee/MyTasksPage';
import { ViewGanttPage } from './pages/employee/ViewGanttPage';
import { BudgetRequestPage } from './pages/employee/BudgetRequestPage';
import { LogTimePage } from './pages/employee/LogTimePage';
import { ReportIssuePage } from './pages/employee/ReportIssuePage';
import { ResourcesPage } from './pages/employee/ResourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { isElevatedRole, isEmployeeRole, isSuperadmin, isSupervisor } from './utils/roles';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
function AppContent() {
  const { currentUser } = useAuth();
  const { currentPage } = useNavigation();
  const { tasks } = useData();

  // Force password-change modal when must_change_password is set
  const [showForceChange, setShowForceChange] = useState(false);

  // Overdue warning modal — shows once per login session for employees
  const [showOverdueWarning, setShowOverdueWarning] = useState(false);

  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setShowForceChange(true);
    }
  }, [currentUser]);

  // Show overdue warning when data is loaded AND employee has overdue tasks
  useEffect(() => {
    if (
      currentUser &&
      isEmployeeRole(currentUser.role) &&
      !currentUser.mustChangePassword &&
      tasks.length > 0
    ) {
      const key = `overdue-dismissed-${currentUser.id}`;
      if (sessionStorage.getItem(key)) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasOverdue = tasks.some((t) => {
        if (String(t.assignedTo) !== String(currentUser.id)) return false;
        if (t.status === 'completed') return false;
        const end = new Date(t.endDate + 'T00:00:00');
        return end < today;
      });
      if (hasOverdue) {
        setShowOverdueWarning(true);
      }
    }
  }, [currentUser, tasks]);

  // Not logged in → show login or forgot-password
  if (!currentUser) {
    if (currentPage === 'forgot-password') {
      return <ForgotPasswordPage />;
    }
    return <LoginPage />;
  }
  // Render page based on current navigation and department
  const renderPage = (): { page: React.ReactNode; routeNotice: string | null } => {
    const dept = currentUser.department;
    const redirectedNotice = 'That page is unavailable for your role, so you were redirected to your dashboard.';
    const chatNotice = 'Chat is currently disabled, so you were redirected to your dashboard.';

    // Supervisor role - project and monitoring access only
    if (isSupervisor(currentUser.role)) {
      switch (currentPage) {
        case 'admin-dashboard':
          return { page: <AdminDashboard />, routeNotice: null };
        case 'admin-projects':
          return { page: <ProjectsPage />, routeNotice: null };
        case 'admin-create-project':
          return { page: <CreateProjectPage />, routeNotice: null };
        case 'admin-gantt':
          return { page: <GanttPage />, routeNotice: null };
        case 'admin-monitor':
          return { page: <MonitorControlPage />, routeNotice: null };
        case 'admin-reviews':
          return { page: <TaskReviewsPage />, routeNotice: null };
        case 'admin-chat':
          return { page: <AdminDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <AdminDashboard />, routeNotice: redirectedNotice };
      }
    }

    // Admin department - full access (superadmin)
    if (dept === 'Admin' && isSuperadmin(currentUser.role)) {
      switch (currentPage) {
        case 'admin-dashboard':
          return { page: <AdminDashboard />, routeNotice: null };
        case 'admin-projects':
          return { page: <ProjectsPage />, routeNotice: null };
        case 'admin-create-project':
          return { page: <CreateProjectPage />, routeNotice: null };
        case 'admin-gantt':
          return { page: <GanttPage />, routeNotice: null };
        case 'admin-monitor':
          return { page: <MonitorControlPage />, routeNotice: null };
        case 'admin-budget':
          return { page: <BudgetApprovalsPage />, routeNotice: null };
        case 'admin-budget-report':
          return { page: <BudgetReportPage />, routeNotice: null };
        case 'admin-team':
          return { page: <TeamManagementPage />, routeNotice: null };
        case 'admin-reports':
          return { page: <ReportsMediaPage />, routeNotice: null };
        case 'admin-reviews':
          return { page: <TaskReviewsPage />, routeNotice: null };
        case 'admin-audit-logs':
          return { page: <AuditLogPage />, routeNotice: null };
        case 'admin-archive':
          return { page: <ArchivePage />, routeNotice: null };
        // chat removed -> fall back to dashboard
        case 'admin-chat':
          return { page: <AdminDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <AdminDashboard />, routeNotice: redirectedNotice };
      }
    }

    // Accounting department - budget and financial access
    if (dept === 'Accounting') {
      switch (currentPage) {
        case 'accounting-dashboard':
          return { page: <AdminDashboard />, routeNotice: null };
        case 'admin-budget':
          return { page: <BudgetApprovalsPage />, routeNotice: null };
        case 'admin-budget-report':
          return { page: <BudgetReportPage />, routeNotice: null };
        case 'accounting-review':
          return { page: <TaskReviewsPage />, routeNotice: null };
        // chat removed -> fall back to dashboard
        case 'admin-chat':
          return { page: <AdminDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <AdminDashboard />, routeNotice: redirectedNotice };
      }
    }

    // Technical department - gantt and task management
    if (dept === 'Technical') {
      switch (currentPage) {
        case 'technical-dashboard':
          return { page: <AdminDashboard />, routeNotice: null };
        case 'admin-gantt':
          return { page: <GanttPage />, routeNotice: null };
        case 'admin-projects':
          return { page: <ProjectsPage />, routeNotice: null };
        case 'technical-tasks':
          return { page: <MyTasksPage />, routeNotice: null };
        case 'technical-review':
          return { page: <TaskReviewsPage />, routeNotice: null };
        // chat removed -> fall back to dashboard
        case 'admin-chat':
          return { page: <AdminDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <AdminDashboard />, routeNotice: redirectedNotice };
      }
    }

    // Employee department (default) - assigned tasks and basic access
    // Also fallback for legacy role-based routing
    if (dept === 'Employee' || isEmployeeRole(currentUser.role)) {
      switch (currentPage) {
        case 'employee-dashboard':
          return { page: <EmployeeDashboard />, routeNotice: null };
        case 'employee-tasks':
          return { page: <MyTasksPage />, routeNotice: null };
        case 'employee-gantt':
          return { page: <ViewGanttPage />, routeNotice: null };
        case 'employee-budget':
          return { page: <BudgetRequestPage />, routeNotice: null };
        case 'employee-time':
          return { page: <LogTimePage />, routeNotice: null };
        case 'employee-issues':
          return { page: <ReportIssuePage />, routeNotice: null };
        case 'employee-resources':
          return { page: <ResourcesPage />, routeNotice: null };
        // chat removed -> fall back to employee dashboard
        case 'employee-chat':
          return { page: <EmployeeDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <EmployeeDashboard />, routeNotice: redirectedNotice };
      }
    }

    // Fallback for admin role (legacy)
    if (isSuperadmin(currentUser.role)) {
      switch (currentPage) {
        case 'admin-dashboard':
          return { page: <AdminDashboard />, routeNotice: null };
        case 'admin-projects':
          return { page: <ProjectsPage />, routeNotice: null };
        case 'admin-gantt':
          return { page: <GanttPage />, routeNotice: null };
        case 'admin-monitor':
          return { page: <MonitorControlPage />, routeNotice: null };
        case 'admin-budget':
          return { page: <BudgetApprovalsPage />, routeNotice: null };
        case 'admin-budget-report':
          return { page: <BudgetReportPage />, routeNotice: null };
        case 'admin-team':
          return { page: <TeamManagementPage />, routeNotice: null };
        case 'admin-reports':
          return { page: <ReportsMediaPage />, routeNotice: null };
        case 'admin-reviews':
          return { page: <TaskReviewsPage />, routeNotice: null };
        case 'admin-archive':
          return { page: <ArchivePage />, routeNotice: null };
        // chat removed -> fall back to dashboard
        case 'admin-chat':
          return { page: <AdminDashboard />, routeNotice: chatNotice };
        case 'settings':
          return { page: <SettingsPage />, routeNotice: null };
        case 'calendar':
          return { page: <CalendarPage />, routeNotice: null };
        default:
          return { page: <AdminDashboard />, routeNotice: redirectedNotice };
      }
    }

    return { page: <LoginPage />, routeNotice: redirectedNotice };
  };

  const { page, routeNotice } = renderPage();

  return (
    <>
      <AppLayout>
        {routeNotice && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {routeNotice}
          </div>
        )}
        {page}
      </AppLayout>
      <ChangePasswordModal
        isOpen={showForceChange}
        onClose={() => setShowForceChange(false)}
        forced={true}
      />
      <OverdueWarningModal
        isOpen={showOverdueWarning && !showForceChange}
        onClose={() => {
          setShowOverdueWarning(false);
          if (currentUser) {
            sessionStorage.setItem(`overdue-dismissed-${currentUser.id}`, 'true');
          }
        }}
      />
    </>
  );
}
export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}