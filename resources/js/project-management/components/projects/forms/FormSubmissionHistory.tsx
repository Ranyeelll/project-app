import React, { useState } from 'react';
import { ProjectFormSubmission, User } from '../../../data/mockData';
import { StatusBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

interface FormSubmissionHistoryProps {
  submissions: ProjectFormSubmission[];
  users: User[];
  canReview: boolean;
  onReview: (submissionId: string, status: string, notes: string) => Promise<void>;
}

const FORM_DATA_LABELS: Record<string, string> = {
  projectName: 'Project Name',
  projectScope: 'Project Scope',
  objectives: 'Objectives',
  stakeholders: 'Stakeholders',
  startDate: 'Start Date',
  endDate: 'End Date',
  planSummary: 'Plan Summary',
  milestones: 'Milestones',
  resources: 'Resources',
  constraints: 'Constraints',
  overallProgress: 'Overall Progress',
  completedTasks: 'Completed Tasks',
  upcomingTasks: 'Upcoming Tasks',
  blockers: 'Blockers',
  title: 'Title',
  type: 'Type',
  severity: 'Severity',
  description: 'Description',
  mitigation: 'Mitigation',
  assignedTo: 'Assigned To',
  reviewType: 'Review Type',
  decision: 'Decision',
  comments: 'Comments',
  conditions: 'Conditions',
  completionSummary: 'Completion Summary',
  deliverables: 'Deliverables',
  lessonsLearned: 'Lessons Learned',
  handoverNotes: 'Handover Notes',
  pendingItems: 'Pending Items',
  markComplete: 'Mark Complete',
  kpiName: 'KPI Name',
  targetValue: 'Target Value',
  actualValue: 'Actual Value',
  unit: 'Unit',
  period: 'Period',
  trend: 'Trend',
  notes: 'Notes',
};

export function FormSubmissionHistory({ submissions, users, canReview, onReview }: FormSubmissionHistoryProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getUserName = (id: string | null) => {
    if (!id) return 'Unknown';
    return users.find((u) => u.id === id)?.name || 'Unknown';
  };

  const handleReview = async (submissionId: string) => {
    setReviewLoading(true);
    try {
      await onReview(submissionId, reviewStatus, reviewNotes);
      setReviewingId(null);
      setReviewNotes('');
    } finally {
      setReviewLoading(false);
    }
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return '-';
      if (typeof value[0] === 'object') {
        return value.map((v) => `${v.name || ''} (${v.date || ''})`).join(', ');
      }
      return value.join(', ');
    }
    if (key === 'overallProgress') return `${value}%`;
    return String(value);
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 dark:text-dark-muted text-light-muted text-sm">
        No submissions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => (
        <div
          key={s.id}
          className="rounded-lg dark:bg-dark-card2 bg-light-card2 border dark:border-dark-border border-light-border p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium dark:text-dark-text text-light-text">
                {getUserName(s.submittedBy)}
              </span>
              <StatusBadge status={s.status} />
            </div>
            <span className="text-xs dark:text-dark-muted text-light-muted">
              {s.createdAt ? new Date(s.createdAt).toLocaleString() : ''}
            </span>
          </div>

          {/* Expandable data */}
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            className="text-xs text-green-primary hover:underline mb-2"
          >
            {expandedId === s.id ? 'Hide details' : 'Show details'}
          </button>

          {expandedId === s.id && (
            <div className="mt-2 space-y-1 p-2 rounded dark:bg-dark-bg bg-gray-50">
              {Object.entries(s.data || {}).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs">
                  <span className="font-medium dark:text-dark-muted text-light-muted min-w-[120px]">
                    {FORM_DATA_LABELS[key] || key}:
                  </span>
                  <span className="dark:text-dark-text text-light-text whitespace-pre-wrap">
                    {formatValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reviewer notes */}
          {s.notes && (
            <div className="mt-2 p-2 rounded dark:bg-dark-bg bg-gray-50">
              <span className="text-xs font-medium dark:text-dark-muted text-light-muted">Review Notes: </span>
              <span className="text-xs dark:text-dark-text text-light-text">{s.notes}</span>
              {s.reviewedBy && (
                <span className="text-xs dark:text-dark-muted text-light-muted ml-2">
                  — {getUserName(s.reviewedBy)}
                  {s.reviewedAt ? ` at ${new Date(s.reviewedAt).toLocaleString()}` : ''}
                </span>
              )}
            </div>
          )}

          {/* Review actions */}
          {canReview && s.status === 'submitted' && (
            <>
              {reviewingId === s.id ? (
                <div className="mt-2 space-y-2 p-2 rounded dark:bg-dark-bg bg-gray-50">
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded dark:bg-dark-card dark:border-dark-border dark:text-dark-text bg-white border border-light-border text-light-text"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                    <option value="revision_requested">Request Revision</option>
                    <option value="reviewed">Mark as Reviewed</option>
                  </select>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={2}
                    placeholder="Review notes..."
                    className="w-full px-2 py-1 text-xs rounded dark:bg-dark-card dark:border-dark-border dark:text-dark-text bg-white border border-light-border text-light-text resize-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" loading={reviewLoading} onClick={() => handleReview(s.id)}>
                      Confirm
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setReviewingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewingId(s.id)}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  Review this submission
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
