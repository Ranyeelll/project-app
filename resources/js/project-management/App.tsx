import React, { useState, useEffect } from 'react';
import {
  AppProvider,
  useAuth,
  useNavigation,
  useTheme } from
'./context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ChangePasswordModal } from './components/ui/ChangePasswordModal';
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

  // Force password-change modal when must_change_password is set
  const [showForceChange, setShowForceChange] = useState(false);

  useEffect(() => {
    if (currentUser?.mustChangePassword) {
      setShowForceChange(true);
    }
  }, [currentUser]);

  // Not logged in → show login or forgot-password
  if (!currentUser) {
    if (currentPage === 'forgot-password') {
      return <ForgotPasswordPage />;
    }
    return <LoginPage />;
  }
  // Render page based on current navigation
  const renderPage = () => {
    // Admin pages
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
        default:
          return <AdminDashboard />;
      }
    }
    // Employee pages
    if (currentUser.role === 'employee') {
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
        default:
          return <EmployeeDashboard />;
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
    </>
  );
}
export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>);

}