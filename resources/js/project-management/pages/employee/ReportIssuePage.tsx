import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, AlertTriangleIcon, EditIcon } from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Issue } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { apiFetch } from '../../utils/apiFetch';
import { parseApiError } from '../../utils/parseApiError';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export function ReportIssuePage() {
  const { issues, setIssues, projects, users, refreshIssues } = useData();
  const { currentUser } = useAuth();
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Issue | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id || '',
    title: '',
    description: '',
    type: 'issue',
    severity: 'medium'
  });
  const myIssues = issues.filter((i) => String(i.reportedBy) === String(currentUser?.id));
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const handleCreate = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch('/api/issues', {
        method: 'POST',
        body: JSON.stringify({
          project_id: form.projectId,
          title: form.title,
          description: form.description,
          type: form.type,
          severity: form.severity,
          reported_by: currentUser?.id || '',
        }),
      });
      if (res.ok) {
        refreshIssues();
        setCreateModal(false);
        setForm({
          projectId: projects[0]?.id || '',
          title: '',
          description: '',
          type: 'issue',
          severity: 'medium'
        });
      } else {
        setFormError(await parseApiError(res, 'Failed to report issue.'));
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const openEdit = (issue: Issue) => {
    setFormError(null);
    setEditModal(issue);
    setForm({
      projectId: issue.projectId,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      severity: issue.severity
    });
  };
  const handleEdit = async () => {
    if (!editModal) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await apiFetch(`/api/issues/${editModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          severity: form.severity,
        }),
      });
      if (res.ok) {
        refreshIssues();
        setEditModal(null);
      } else {
        setFormError(await parseApiError(res, 'Failed to update issue.'));
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };
  const TYPE_COLORS: Record<string, string> = {
    risk: 'danger',
    assumption: 'warning',
    issue: 'danger',
    dependency: 'info'
  };
  if (isLoading) return <LoadingSpinner message="Loading data..." />;
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm dark:text-dark-muted text-light-muted">
          {myIssues.length} reported issues
        </p>
        <Button
          variant="primary"
          icon={<PlusIcon size={14} />}
          onClick={() => {
            setForm({
              projectId: projects[0]?.id || '',
              title: '',
              description: '',
              type: 'issue',
              severity: 'medium'
            });
            setFormError(null);
            setCreateModal(true);
          }}>

          Report Issue
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {myIssues.map((issue) => {
          const project = projects.find((p) => p.id === issue.projectId);
          const canEdit = issue.status === 'open';
          return (
            <div
              key={issue.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor:
                      issue.severity === 'critical' ||
                      issue.severity === 'high' ?
                      'rgba(239,68,68,0.12)' :
                      'rgba(245,158,11,0.12)'
                    }}>

                    <AlertTriangleIcon
                      size={16}
                      className={
                      issue.severity === 'critical' ||
                      issue.severity === 'high' ?
                      'text-red-400' :
                      'text-yellow-400'
                      } />

                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={TYPE_COLORS[issue.type] as any} size="sm">
                        {issue.type.toUpperCase()}
                      </Badge>
                      <PriorityBadge priority={issue.severity} />
                      <StatusBadge status={issue.status} />
                    </div>
                    <h3 className="text-sm font-medium dark:text-dark-text text-light-text">
                      {issue.title}
                    </h3>
                    <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                      {issue.description}
                    </p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1.5">
                      {project?.name} · Reported {issue.createdAt}
                    </p>
                  </div>
                </div>
                {canEdit &&
                <button
                  onClick={() => openEdit(issue)}
                  className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors flex-shrink-0"
                  title="Edit">

                    <EditIcon size={13} />
                  </button>
                }
              </div>
            </div>);

        })}

        {myIssues.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <AlertTriangleIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No issues reported yet</p>
          </div>
        }
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Report Issue / Risk"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleCreate}
            disabled={submitting || !form.title || !form.description}>

              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          <Select
            label="Project"
            value={form.projectId}
            onChange={(e) =>
            setForm({
              ...form,
              projectId: e.target.value
            })
            }
            options={projects.map((p) => ({
              value: p.id,
              label: p.name
            }))} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value
              })
              }
              options={[
              {
                value: 'issue',
                label: 'Issue'
              },
              {
                value: 'risk',
                label: 'Risk'
              },
              {
                value: 'assumption',
                label: 'Assumption'
              },
              {
                value: 'dependency',
                label: 'Dependency'
              }]
              } />

            <Select
              label="Severity"
              value={form.severity}
              onChange={(e) =>
              setForm({
                ...form,
                severity: e.target.value
              })
              }
              options={[
              {
                value: 'low',
                label: 'Low'
              },
              {
                value: 'medium',
                label: 'Medium'
              },
              {
                value: 'high',
                label: 'High'
              },
              {
                value: 'critical',
                label: 'Critical'
              }]
              } />

          </div>
          <Input
            label="Title"
            placeholder="Brief description of the issue..."
            value={form.title}
            onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value
            })
            } />

          <Textarea
            label="Description"
            placeholder="Provide detailed information about the issue, its impact, and any suggested resolution..."
            value={form.description}
            onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value
            })
            }
            rows={4} />

          {formError && <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">{formError}</div>}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Issue"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value
              })
              }
              options={[
              {
                value: 'issue',
                label: 'Issue'
              },
              {
                value: 'risk',
                label: 'Risk'
              },
              {
                value: 'assumption',
                label: 'Assumption'
              },
              {
                value: 'dependency',
                label: 'Dependency'
              }]
              } />

            <Select
              label="Severity"
              value={form.severity}
              onChange={(e) =>
              setForm({
                ...form,
                severity: e.target.value
              })
              }
              options={[
              {
                value: 'low',
                label: 'Low'
              },
              {
                value: 'medium',
                label: 'Medium'
              },
              {
                value: 'high',
                label: 'High'
              },
              {
                value: 'critical',
                label: 'Critical'
              }]
              } />

          </div>
          <Input
            label="Title"
            value={form.title}
            onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value
            })
            } />

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value
            })
            }
            rows={4} />

          {formError && <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-2">{formError}</div>}
        </div>
      </Modal>
    </div>);

}