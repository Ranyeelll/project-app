import React, { useState } from 'react';
import {
  SearchIcon,
  UploadIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  VideoIcon,
  TypeIcon } from
'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Task } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
export function MyTasksPage() {
  const { tasks, setTasks, projects, media, refreshMedia } = useData();
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [progressModal, setProgressModal] = useState<Task | null>(null);
  const [reportModal, setReportModal] = useState<Task | null>(null);
  const [newProgress, setNewProgress] = useState(0);
  const [reportForm, setReportForm] = useState({
    type: 'text',
    title: '',
    content: ''
  });
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.id);
  const filtered = myTasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const openProgress = (task: Task) => {
    setProgressModal(task);
    setNewProgress(task.progress);
  };
  const handleProgressSave = async () => {
    if (!progressModal) return;
    const newStatus = newProgress === 100 ? 'completed' : newProgress > 0 ? 'in-progress' : progressModal.status;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      await fetch(`/api/tasks/${progressModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ progress: newProgress, status: newStatus }),
      });
    } catch { /* continue with local update */ }
    setTasks((prev) =>
    prev.map((t) =>
    t.id === progressModal.id ?
    {
      ...t,
      progress: newProgress,
      status: newStatus
    } :
    t
    )
    );
    setProgressModal(null);
  };
  const handleReportSubmit = async () => {
    if (!reportModal) return;
    setSubmittingReport(true);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    try {
      const formData = new FormData();
      formData.append('project_id', reportModal.projectId);
      formData.append('task_id', reportModal.id);
      formData.append('uploaded_by', currentUser?.id || '');
      formData.append('type', reportForm.type);
      formData.append('title', reportForm.title);
      formData.append('content', reportForm.content);
      if (reportFile) {
        formData.append('file', reportFile);
      }

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: formData,
      });

      if (res.ok) {
        // Update task completion report status via API
        await fetch(`/api/tasks/${reportModal.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({ completion_report_status: 'pending' }),
        });

        // Refresh media and tasks from server
        refreshMedia();
        setTasks((prev) =>
          prev.map((t) =>
            t.id === reportModal.id ? { ...t, completionReportStatus: 'pending' } : t
          )
        );
      }
    } catch {
      /* continue with local update as fallback */
    } finally {
      setSubmittingReport(false);
      setReportModal(null);
      setReportForm({ type: 'text', title: '', content: '' });
      setReportFile(null);
    }
  };
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<SearchIcon size={14} />} />

        </div>
        <Select
          options={[
          {
            value: 'all',
            label: 'All Status'
          },
          {
            value: 'todo',
            label: 'To Do'
          },
          {
            value: 'in-progress',
            label: 'In Progress'
          },
          {
            value: 'review',
            label: 'In Review'
          },
          {
            value: 'completed',
            label: 'Completed'
          }]
          }
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40" />

      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.map((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          const taskMedia = media.filter((m) => m.taskId === task.id);
          return (
            <div
              key={task.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">

              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
                    {task.title}
                  </h3>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                    {project?.name}
                  </p>
                  <p className="text-xs dark:text-dark-muted text-light-muted mt-1 line-clamp-2">
                    {task.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs dark:text-dark-muted text-light-muted">
                    Progress
                  </span>
                  <span className="text-xs font-medium dark:text-dark-text text-light-text">
                    {task.progress}%
                  </span>
                </div>
                <ProgressBar value={task.progress} size="md" animated />
              </div>

              {/* Meta */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold dark:text-dark-text text-light-text">
                    {task.loggedHours}h
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Logged
                  </div>
                </div>
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold dark:text-dark-text text-light-text">
                    {task.estimatedHours}h
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Estimated
                  </div>
                </div>
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold dark:text-dark-text text-light-text">
                    {taskMedia.length}
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Uploads
                  </div>
                </div>
              </div>

              {/* Completion report status */}
              {task.completionReportStatus !== 'none' &&
              <div className="mb-3 px-3 py-2 dark:bg-dark-card2 bg-light-card2 rounded-lg flex items-center gap-2">
                  <span className="text-xs dark:text-dark-muted text-light-muted">
                    Completion Report:
                  </span>
                  <StatusBadge status={task.completionReportStatus} />
                </div>
              }

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-1 dark:border-dark-border border-t border-light-border">
                <span className="text-xs dark:text-dark-subtle text-light-subtle mr-auto">
                  Due {task.endDate}
                  {task.allowEmployeeEdit &&
                  <span className="ml-2 text-green-primary">
                      · Timeline edit enabled
                    </span>
                  }
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ClockIcon size={12} />}
                  onClick={() => openProgress(task)}>

                  Update Progress
                </Button>
                {task.completionReportStatus !== 'approved' &&
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UploadIcon size={12} />}
                  onClick={() => setReportModal(task)}>

                      Submit Report
                    </Button>
                }
              </div>
            </div>);

        })}

        {filtered.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <CheckCircleIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No tasks found</p>
          </div>
        }
      </div>

      {/* Progress Modal */}
      <Modal
        isOpen={!!progressModal}
        onClose={() => setProgressModal(null)}
        title="Update Task Progress"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setProgressModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProgressSave}>
              Save Progress
            </Button>
          </>
        }>

        <div className="space-y-4">
          <p className="text-sm dark:text-dark-muted text-light-muted">
            {progressModal?.title}
          </p>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium dark:text-dark-text text-light-text">
                Progress
              </label>
              <span className="text-sm font-bold text-green-primary">
                {newProgress}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={newProgress}
              onChange={(e) => setNewProgress(Number(e.target.value))}
              className="w-full accent-green-primary" />

            <div className="flex justify-between text-xs dark:text-dark-subtle text-light-subtle mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <ProgressBar value={newProgress} size="lg" animated />
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={!!reportModal}
        onClose={() => setReportModal(null)}
        title="Submit Completion Report"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setReportModal(null)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleReportSubmit}
            disabled={!reportForm.title || !reportForm.content || submittingReport}>

              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          <div className="px-3 py-2 dark:bg-dark-card2 bg-light-card2 rounded-lg">
            <p className="text-xs dark:text-dark-subtle text-light-subtle">
              Task
            </p>
            <p className="text-sm font-medium dark:text-dark-text text-light-text mt-0.5">
              {reportModal?.title}
            </p>
          </div>
          <Select
            label="Report Type"
            value={reportForm.type}
            onChange={(e) => {
            setReportForm({
              ...reportForm,
              type: e.target.value
            });
            if (e.target.value === 'text') setReportFile(null);
            }}
            options={[
            {
              value: 'text',
              label: 'Text Summary'
            },
            {
              value: 'file',
              label: 'File Upload'
            },
            {
              value: 'video',
              label: 'Video'
            }]
            } />

          <Input
            label="Title"
            placeholder="e.g. Task Completion Summary"
            value={reportForm.title}
            onChange={(e) =>
            setReportForm({
              ...reportForm,
              title: e.target.value
            })
            } />

          <Textarea
            label="Summary / Notes"
            placeholder="Describe what was completed, any blockers, and next steps..."
            value={reportForm.content}
            onChange={(e) =>
            setReportForm({
              ...reportForm,
              content: e.target.value
            })
            }
            rows={4} />

          {reportForm.type !== 'text' &&
          <div className="border-2 border-dashed dark:border-dark-border border-light-border rounded-lg p-5 text-center">
              <input
                type="file"
                accept={reportForm.type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'}
                onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                className="hidden"
                id="report-file-input" />
              <label htmlFor="report-file-input" className="cursor-pointer">
                <UploadIcon
                  size={20}
                  className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle" />
                <p className="text-sm dark:text-dark-muted text-light-muted">
                  {reportFile ? reportFile.name : 'Click to attach file'}
                </p>
                {reportFile &&
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                    {(reportFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                }
              </label>
            </div>
          }
        </div>
      </Modal>
    </div>);

}