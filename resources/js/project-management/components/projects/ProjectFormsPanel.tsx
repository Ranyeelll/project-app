import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Project, ProjectFormType, ProjectFormSubmission, User } from '../../data/mockData';
import { useAuth, useData } from '../../context/AppContext';
import { ProjectDetailsForm } from './forms/ProjectDetailsForm';
import { ProjectPlanningForm } from './forms/ProjectPlanningForm';
import { ProgressUpdateForm } from './forms/ProgressUpdateForm';
import { IssueRiskForm } from './forms/IssueRiskForm';
import { ApprovalReviewForm } from './forms/ApprovalReviewForm';
import { CompletionHandoverForm } from './forms/CompletionHandoverForm';
import { AnalyticsKpiForm } from './forms/AnalyticsKpiForm';
import { FormSubmissionHistory } from './forms/FormSubmissionHistory';

interface ProjectFormsPanelProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

const FORM_TABS: { key: ProjectFormType; label: string }[] = [
  { key: 'project_details', label: 'Details / Setup' },
  { key: 'project_planning', label: 'Planning' },
  { key: 'progress_update', label: 'Progress' },
  { key: 'issue_risk', label: 'Issue / Risk' },
  { key: 'approval_review', label: 'Approval' },
  { key: 'completion_handover', label: 'Completion' },
  { key: 'analytics_kpi', label: 'KPI' },
];

export function ProjectFormsPanel({ project, isOpen, onClose }: ProjectFormsPanelProps) {
  const { currentUser } = useAuth();
  const { users, formSubmissions, refreshFormSubmissions, refreshProjects, refreshAll } = useData();
  const [activeTab, setActiveTab] = useState<ProjectFormType>('project_details');
  const [loading, setLoading] = useState(false);

  const canReview = ['Admin', 'Technical', 'Accounting'].includes(currentUser?.department as string);
  const projectTeam = users.filter((u) => project.teamIds?.includes(u.id));

  const loadSubmissions = useCallback(() => {
    if (isOpen && project?.id) {
      refreshFormSubmissions(project.id, activeTab);
    }
  }, [isOpen, project?.id, activeTab]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const handleSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ form_type: activeTab, data }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMsg = json.errors
          ? Object.values(json.errors).flat().join(', ')
          : json.message || 'Submission failed.';
        throw new Error(errorMsg);
      }
      loadSubmissions();
      // Refresh all data to sync across all clients including admin dashboard
      refreshAll();
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submissionId: string, status: string, notes: string) => {
    const res = await fetch(`/api/projects/${project.id}/form-submissions/${submissionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) throw new Error('Review failed.');
    loadSubmissions();
  };

  const renderForm = () => {
    switch (activeTab) {
      case 'project_details':
        return <ProjectDetailsForm onSubmit={handleSubmit} loading={loading} />;
      case 'project_planning':
        return <ProjectPlanningForm onSubmit={handleSubmit} loading={loading} />;
      case 'progress_update':
        return <ProgressUpdateForm onSubmit={handleSubmit} loading={loading} />;
      case 'issue_risk':
        return <IssueRiskForm onSubmit={handleSubmit} loading={loading} projectTeam={projectTeam} />;
      case 'approval_review':
        return <ApprovalReviewForm onSubmit={handleSubmit} loading={loading} />;
      case 'completion_handover':
        return <CompletionHandoverForm onSubmit={handleSubmit} loading={loading} />;
      case 'analytics_kpi':
        return <AnalyticsKpiForm onSubmit={handleSubmit} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Project Forms — ${project.name}`} size="xl">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b dark:border-dark-border border-light-border">
        {FORM_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-green-primary text-black'
                : 'dark:bg-dark-card2 dark:border dark:border-dark-border dark:text-dark-muted bg-gray-100 border border-light-border text-light-muted hover:dark:text-dark-text hover:text-light-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">New Submission</h3>
        {renderForm()}
      </div>

      {/* Submission History */}
      <div>
        <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">Submission History</h3>
        <FormSubmissionHistory
          submissions={formSubmissions}
          users={users}
          canReview={canReview}
          onReview={handleReview}
        />
      </div>
    </Modal>
  );
}
