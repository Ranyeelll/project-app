import React, { useState, useEffect } from 'react';
import {
  AppProvider,
  useAuth,
  useNavigation,
  useTheme,
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
import { ChatModerationPage } from './pages/admin/ChatModerationPage';
import { ProjectChatPage } from './pages/ProjectChatPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MyTasksPage } from './pages/employee/MyTasksPage';
import { ViewGanttPage } from './pages/employee/ViewGanttPage';
import { BudgetRequestPage } from './pages/employee/BudgetRequestPage';
import { LogTimePage } from './pages/employee/LogTimePage';
import { ReportIssuePage } from './pages/employee/ReportIssuePage';
import { ResourcesPage } from './pages/employee/ResourcesPage';
function AppContent() {
  const { currentUser } = useAuth();
  const { currentPage } = useNavigation();
  const { isDark } = useTheme();
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
      currentUser.role === 'employee' &&
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
  const renderPage = () => {
    const dept = currentUser.department;

    // Admin department - full access
    if (dept === 'Admin') {
      switch (currentPage) {
        case 'admin-dashboard':
          return <AdminDashboard />;
        case 'admin-projects':
          return <ProjectsPage />;
        case 'admin-create-project':
          return <CreateProjectPage />;
        case 'admin-gantt':
          return <GanttPage />;
        case 'admin-monitor':
          return <MonitorControlPage />;
        case 'admin-budget':
          return <BudgetApprovalsPage />;
        case 'admin-budget-report':
          return <BudgetReportPage />;
        case 'admin-team':
          return <TeamManagementPage />;
        case 'admin-reports':
          return <ReportsMediaPage />;
        case 'admin-reviews':
          return <TaskReviewsPage />;
        case 'admin-audit-logs':
          return <AuditLogPage />;
        case 'admin-archive':
          return <ArchivePage />;
        case 'admin-chat':
          return <ProjectChatPage />;
        case 'admin-chat-moderation':
          return <ChatModerationPage />;
        default:
          return <AdminDashboard />;
      }
    }

    // Accounting department - budget and financial access
    if (dept === 'Accounting') {
      switch (currentPage) {
        case 'accounting-dashboard':
          return <AdminDashboard />;
        case 'admin-budget':
          return <BudgetApprovalsPage />;
        case 'admin-budget-report':
          return <BudgetReportPage />;
        case 'accounting-review':
          return <TaskReviewsPage />;
        case 'admin-chat':
          return <ProjectChatPage />;
        default:
          return <AdminDashboard />;
      }
    }

    // Technical department - gantt and task management
    if (dept === 'Technical') {
      switch (currentPage) {
        case 'technical-dashboard':
          return <AdminDashboard />;
        case 'admin-gantt':
          return <GanttPage />;
        case 'admin-projects':
          return <ProjectsPage />;
        case 'technical-tasks':
          return <MyTasksPage />;
        case 'technical-review':
          return <TaskReviewsPage />;
        case 'admin-chat':
          return <ProjectChatPage />;
        default:
          return <AdminDashboard />;
      }
    }

    // Employee department (default) - assigned tasks and basic access
    // Also fallback for legacy role-based routing
    if (dept === 'Employee' || currentUser.role === 'employee') {
      switch (currentPage) {
        case 'employee-dashboard':
          return <EmployeeDashboard />;
        case 'employee-tasks':
          return <MyTasksPage />;
        case 'employee-gantt':
          return <ViewGanttPage />;
        case 'employee-budget':
          return <BudgetRequestPage />;
        case 'employee-time':
          return <LogTimePage />;
        case 'employee-issues':
          return <ReportIssuePage />;
        case 'employee-resources':
          return <ResourcesPage />;
        case 'employee-chat':
          return <ProjectChatPage />;
        default:
          return <EmployeeDashboard />;
      }
    }

    // Fallback for admin role (legacy)
    if (currentUser.role === 'admin') {
      switch (currentPage) {
        case 'admin-dashboard':
          return <AdminDashboard />;
        case 'admin-projects':
          return <ProjectsPage />;
        case 'admin-gantt':
          return <GanttPage />;
        case 'admin-monitor':
          return <MonitorControlPage />;
        case 'admin-budget':
          return <BudgetApprovalsPage />;
        case 'admin-budget-report':
          return <BudgetReportPage />;
        case 'admin-team':
          return <TeamManagementPage />;
        case 'admin-reports':
          return <ReportsMediaPage />;
        case 'admin-reviews':
          return <TaskReviewsPage />;
        case 'admin-archive':
          return <ArchivePage />;
        case 'admin-chat':
          return <ProjectChatPage />;
        default:
          return <AdminDashboard />;
      }
    }

    return <LoginPage />;
  };
  return (
    <>
      <AppLayout>{renderPage()}</AppLayout>
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
    <AppProvider>
      <AppContent />
    </AppProvider>);

}