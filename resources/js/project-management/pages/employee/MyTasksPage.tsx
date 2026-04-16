import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SearchIcon,
  UploadIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  VideoIcon,
  TypeIcon,
  FolderKanbanIcon,
  UserIcon,
  UsersIcon,
  AlertTriangleIcon,
  EyeIcon,
  DownloadIcon,
  ActivityIcon,
  MessageSquareIcon } from
'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { Task, MediaUpload } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { isElevatedRole } from '../../utils/roles';
import { apiFetch } from '../../utils/apiFetch';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { TaskActivityTimeline } from '../../components/projects/TaskActivityTimeline';
import { TaskComments } from '../../components/projects/TaskComments';
import { Pagination } from '../../components/ui/Pagination';
import { downloadCsv } from '../../utils/exportCsv';
export function MyTasksPage() {
  const { tasks, setTasks, projects, users, media, refreshMedia, refreshProjects, refreshTasks, refreshAll } = useData();
  const { currentUser } = useAuth();
  const { setCurrentPage } = useNavigation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [progressModal, setProgressModal] = useState<Task | null>(null);
  const [reportModal, setReportModal] = useState<Task | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaUpload | null>(null);
  const [newProgress, setNewProgress] = useState(0);
  const [reportForm, setReportForm] = useState({
    type: 'text',
    title: '',
    content: '',
    cost: ''
  });
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [teamModal, setTeamModal] = useState<string | null>(null); // project id
  const [activityModal, setActivityModal] = useState<Task | null>(null);
  const [commentsModal, setCommentsModal] = useState<Task | null>(null);
  const [taskPage, setTaskPage] = useState(0);
  const taskPageSize = 10;
  const [submittingProjectId, setSubmittingProjectId] = useState<string | null>(null);
  const [notifyFeedback, setNotifyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const myProjects = projects.filter((p) => (p.teamIds || []).map(String).includes(String(currentUser?.id)));
  const myProjectIds = myProjects.map((p) => p.id);

  const isLeaderForProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || !currentUser?.id) return false;
    return (project.teamIds?.length || 0) >= 2 && String(project.leaderId) === String(currentUser?.id);
  };

  // Leaders in multi-member projects can manage progress for all project tasks.
  const myTasks = tasks.filter((t) => String(t.assignedTo) === String(currentUser?.id) || isLeaderForProject(t.projectId));
  const filtered = myTasks.filter((t) => {
    const s = search.toLowerCase();
    const projectName = projects.find((p) => p.id === t.projectId)?.name || '';
    const assigneeName = users.find((u) => String(u.id) === String(t.assignedTo))?.name || '';
    const matchSearch = !s ||
      t.title.toLowerCase().includes(s) ||
      (t.description && t.description.toLowerCase().includes(s)) ||
      t.status.toLowerCase().includes(s) ||
      t.priority.toLowerCase().includes(s) ||
      projectName.toLowerCase().includes(s) ||
      assigneeName.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchProject = projectFilter === 'all' || t.projectId === projectFilter;
    return matchSearch && matchStatus && matchProject;
  });

  // Reset page when filters change
  useEffect(() => { setTaskPage(0); }, [search, statusFilter, projectFilter]);

  const openProgress = (task: Task) => {
    setProgressModal(task);
    setNewProgress(task.progress);
  };
  const handleProgressSave = async () => {
    if (!progressModal) return;
    try {
      const response = await apiFetch(`/api/tasks/${progressModal.id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({ percentage_completed: newProgress }),
      });
      
      if (response.ok) {
        // Immediately refresh all data to sync across all clients
        refreshAll();
        const newStatus = newProgress === 100 ? 'completed' : newProgress > 0 ? 'in-progress' : progressModal.status;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === progressModal.id ? { ...t, progress: newProgress, status: newStatus } : t
          )
        );
      } else {
        alert('Failed to update progress. Please try again.');
      }
    } catch {
      alert('Network error. Could not update progress.');
    }
    
    setProgressModal(null);
  };

  const handleReportSubmit = async () => {
    if (!reportModal) return;
    setSubmittingReport(true);

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

      const res = await apiFetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        // Update task completion report status and cost via API
        const taskRes = await apiFetch(`/api/tasks/${reportModal.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            completion_report_status: 'pending',
            report_cost: Number(reportForm.cost) || 0,
          }),
        });

        if (!taskRes.ok) {
          const errBody = await taskRes.json().catch(() => null);
          alert('Report uploaded but failed to update task status: ' + (errBody?.message || errBody?.error || taskRes.status + ' ' + taskRes.statusText));
        } else {
          // Only update local state when API confirms success
          setTasks((prev) =>
            prev.map((t) =>
              t.id === reportModal.id ? { ...t, completionReportStatus: 'pending', reportCost: Number(reportForm.cost) || 0 } : t
            )
          );
        }

        // Refresh media, tasks, and projects from server
        refreshMedia();
        refreshProjects();
      } else {
        const err = await res.json().catch(() => null);
        alert('Report submission failed: ' + (err?.message || res.statusText));
      }
    } catch (e: any) {
      alert('Report submission failed: ' + (e?.message || 'Network error'));
    } finally {
      setSubmittingReport(false);
      setReportModal(null);
      setReportForm({ type: 'text', title: '', content: '', cost: '' });
      setReportFile(null);
    }
  };

  const handleFinishProject = async (projectId: string) => {
    setNotifyFeedback(null);
    setSubmittingProjectId(projectId);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/approval`, {
        method: 'POST',
        body: JSON.stringify({ action: 'finish_project', notes: 'Project marked as complete by project member.' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Your session expired. Please log in again.');
        }
        throw new Error(data?.message || 'Failed to notify admin.');
      }

      await refreshProjects();
      await refreshTasks();
      setNotifyFeedback({
        type: 'success',
           text: 'Project marked as finished. Supervisor and superadmin have been notified.',
      });

      // Route users to analytics context after finishing a project.
      if (isElevatedRole(currentUser?.role)) {
        setCurrentPage('admin-monitor');
      } else {
        setCurrentPage('employee-dashboard');
      }
    } catch (e: any) {
      setNotifyFeedback({ type: 'error', text: e?.message || 'Failed to finish project.' });
    } finally {
      setSubmittingProjectId(null);
    }
  };

  const projectFinishStates = myProjects.map((project) => {
    if (['completed', 'archived'].includes(project.status)) {
      return { project, canFinish: false, reason: 'Already completed' };
    }

    if (project.progress < 100) {
      return { project, canFinish: false, reason: `Progress is ${project.progress}%. Reach 100% first.` };
    }

    return { project, canFinish: true, reason: '' };
  });

  const formatDateShort = (value: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const finishableProjects = projectFinishStates.filter((entry) => entry.canFinish);

  if (isLoading) return <LoadingSpinner message="Loading data..." />;
  return (
    <div className="space-y-5">
      {/* My Projects Summary */}
      {myProjects.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myProjects.map((project) => {
            const projectTasks = tasks.filter((t) => t.projectId === project.id);
            const taskCount = projectTasks.length;
            const completedCount = projectTasks.filter((t) => t.status === 'completed').length;
            return (
              <button
                key={project.id}
                onClick={() => setProjectFilter(projectFilter === project.id ? 'all' : project.id)}
                className={`dark:bg-dark-card dark:border-dark-border bg-white border rounded-card p-4 text-left transition-all ${
                  projectFilter === project.id
                    ? 'border-green-primary ring-1 ring-green-primary/30'
                    : 'border-light-border hover:border-green-primary/40'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                    <FolderKanbanIcon size={13} className="text-green-primary" />
                  </div>
                  <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                    {project.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs dark:text-dark-muted text-light-muted">
                  <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
                  <span>{completedCount} done</span>
                  <StatusBadge status={project.status} />
                </div>
                {taskCount > 0 && (
                  <div className="mt-2"><ProgressBar value={Math.round((completedCount / taskCount) * 100)} size="sm" /></div>
                )}
                {taskCount === 0 && (
                  <p className="text-[10px] dark:text-dark-subtle text-light-subtle mt-2 italic">No tasks created yet</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {projectFinishStates.length > 0 && (
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold dark:text-dark-text text-light-text">
              Ready to finish
            </p>
            <Badge variant="info">{finishableProjects.length} ready</Badge>
          </div>
          {notifyFeedback && (
            <div
              className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                notifyFeedback.type === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-primary'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              {notifyFeedback.text}
            </div>
          )}
          <div className="space-y-2">
            {projectFinishStates.map(({ project, canFinish, reason }) => {
              return (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 dark:bg-dark-card2 bg-light-card2 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm dark:text-dark-text text-light-text">{project.name}</p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle">
                      {canFinish ? 'Project progress is 100%' : reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={canFinish ? 'primary' : 'secondary'}
                    loading={submittingProjectId === project.id}
                    disabled={!canFinish}
                    onClick={() => handleFinishProject(project.id)}
                  >
                    {canFinish ? 'Finish Project' : 'Not Ready'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            label: 'All Projects'
          },
          ...myProjects.map((p) => ({
            value: p.id,
            label: p.name
          }))]}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="w-44" />
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

        <Button
          variant="outline"
          size="sm"
          icon={<DownloadIcon size={14} />}
          onClick={() => {
            const headers = ['Task', 'Project', 'Status', 'Priority', 'Progress', 'Start Date', 'End Date', 'Assigned To'];
            const rows = filtered.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const assignee = users.find((u) => u.id === t.assignedTo);
              return [t.title, proj?.name || '', t.status, t.priority, String(t.progress), t.startDate || '', t.endDate || '', assignee?.name || ''];
            });
            downloadCsv('my-tasks', headers, rows);
          }}
        >
          Export
        </Button>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filtered.slice(taskPage * taskPageSize, (taskPage + 1) * taskPageSize).map((task) => {
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs dark:text-dark-subtle text-light-subtle">
                      {project?.name}
                    </p>
                    {project && (project.teamIds?.length || 0) > 1 && (
                      <button
                        onClick={() => setTeamModal(project.id)}
                        className="flex items-center gap-1 text-[10px] text-green-primary hover:text-green-600 transition-colors font-medium"
                      >
                        <UsersIcon size={10} />
                        View Team ({project.teamIds?.length})
                      </button>
                    )}
                  </div>
                  <p className="text-xs dark:text-dark-muted text-light-muted mt-1 line-clamp-2">
                    {task.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle">Task</span>
                    <StatusBadge status={task.status} />
                  </div>
                  {project && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] dark:text-dark-subtle text-light-subtle">Project</span>
                      <StatusBadge status={project.status} />
                    </div>
                  )}
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

              {/* Submitted reports / media for this task */}
              {taskMedia.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <p className="text-xs font-medium dark:text-dark-muted text-light-muted">
                    Submitted Reports ({taskMedia.length})
                  </p>
                  {taskMedia.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 dark:bg-dark-card2 bg-light-card2 rounded-lg px-3 py-2"
                    >
                      {item.type === 'video' ? <VideoIcon size={14} className="text-purple-400 flex-shrink-0" /> :
                       item.type === 'file' ? <FileTextIcon size={14} className="text-blue-400 flex-shrink-0" /> :
                       <TypeIcon size={14} className="text-green-primary flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs dark:text-dark-text text-light-text truncate">{item.title}</p>
                        {item.type === 'text' && item.content && (
                          <p className="text-[10px] dark:text-dark-subtle text-light-subtle line-clamp-1 mt-0.5">{item.content}</p>
                        )}
                        {item.originalFilename && (
                          <p className="text-[10px] dark:text-dark-subtle text-light-subtle">{item.originalFilename}{item.fileSize ? ` · ${item.fileSize}` : ''}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.filePath && (
                          <>
                            <button
                              onClick={() => setPreviewItem(item)}
                              className="p-1 rounded dark:text-dark-muted dark:hover:text-green-primary text-light-muted hover:text-green-600 transition-colors"
                              title="Preview"
                            >
                              <EyeIcon size={13} />
                            </button>
                            <a
                              href={`/api/media/${item.id}/download`}
                              className="p-1 rounded dark:text-dark-muted dark:hover:text-blue-400 text-light-muted hover:text-blue-500 transition-colors"
                              title="Download"
                            >
                              <DownloadIcon size={13} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-1 dark:border-dark-border border-t border-light-border">
                <span className="text-xs dark:text-dark-subtle text-light-subtle mr-auto">
                  Due {formatDateShort(task.endDate)}
                  {task.allowEmployeeEdit &&
                  <span className="ml-2 text-green-primary">
                      · Timeline edit enabled
                    </span>
                  }
                </span>

                {(() => {
                  const teamSize = project?.teamIds?.length || 0;
                  const hasLeaderRule = teamSize >= 2 && !!project?.leaderId;
                  const canUpdateProgress = !hasLeaderRule || String(project?.leaderId) === String(currentUser?.id);
                  const projectLocked = currentUser?.department === 'Employee' && ['completed', 'archived'].includes(project?.status || '');

                  return (
                    <>
                      {hasLeaderRule && !canUpdateProgress && (
                        <span className="text-[10px] dark:text-dark-subtle text-light-subtle">
                          Only the project leader can update progress.
                        </span>
                      )}

                      {projectLocked && (
                        <span className="text-[10px] text-amber-400">
                          Project is finished. Employee updates are locked.
                        </span>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ClockIcon size={12} />}
                        onClick={() => openProgress(task)}
                        disabled={!canUpdateProgress || projectLocked}
                      >
                        Update Progress
                      </Button>
                    </>
                  );
                })()}
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UploadIcon size={12} />}
                  onClick={() => { refreshProjects(); setReportModal(task); }}
                  disabled={currentUser?.department === 'Employee' && ['completed', 'archived'].includes(project?.status || '')}
                >

                      {task.completionReportStatus !== 'none' ? 'Resubmit Report' : 'Submit Report'}
                    </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<MessageSquareIcon size={12} />}
                  onClick={() => setCommentsModal(task)}
                >
                  Discussion
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ActivityIcon size={12} />}
                  onClick={() => setActivityModal(task)}
                >
                  Activity
                </Button>
              </div>
            </div>);

        })}

        {filtered.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <CheckCircleIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">
              {projectFilter !== 'all'
                ? `No tasks in "${projects.find((p) => p.id === projectFilter)?.name || 'this project'}" yet`
                : myTasks.length === 0
                  ? 'No tasks in your projects yet'
                  : 'No tasks match your filters'}
            </p>
          </div>
        }
      </div>

      <Pagination
        currentPage={taskPage}
        totalPages={Math.ceil(filtered.length / taskPageSize)}
        totalItems={filtered.length}
        pageSize={taskPageSize}
        onPageChange={setTaskPage}
        label="tasks"
      />

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

          <Input
            label="Total Cost (PHP)"
            type="number"
            placeholder="0"
            value={reportForm.cost}
            onChange={(e) =>
            setReportForm({
              ...reportForm,
              cost: e.target.value
            })
            } />

          {/* Budget context & over-budget warning */}
          {reportModal && (() => {
            const proj = projects.find((p) => p.id === reportModal.projectId);
            if (!proj) return null;
            const costNum = Number(reportForm.cost) || 0;
            // When re-submitting for an already-approved task, the new cost is ADDED
            // to the existing approved cost. proj.spent already includes the old cost,
            // so remaining already accounts for previously approved report costs.
            const remaining = proj.budget - proj.spent;
            const wouldExceed = costNum > 0 && costNum > remaining;
            return (
              <div className={`px-3 py-2 rounded-lg text-xs ${
                wouldExceed
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'dark:bg-dark-card2 bg-light-card2'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="dark:text-dark-muted text-light-muted">Project Budget:</span>
                  <span className="font-medium dark:text-dark-text text-light-text">
                    ₱{proj.budget.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="dark:text-dark-muted text-light-muted">Remaining:</span>
                  <span className={`font-medium ${remaining < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ₱{remaining.toLocaleString()}
                  </span>
                </div>
                {wouldExceed && (
                  <div className="flex items-center gap-1.5 mt-2 text-red-400">
                    <AlertTriangleIcon size={12} />
                    <span>This cost exceeds the remaining budget by ₱{(costNum - remaining).toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })()}

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

      {/* Media Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Preview'}
        size="xl"
        footer={
          <>
            {previewItem?.filePath && (
              <a
                href={`/api/media/${previewItem.id}/download`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:opacity-90 transition-opacity">
                <DownloadIcon size={14} />
                Download
              </a>
            )}
            <Button variant="secondary" onClick={() => setPreviewItem(null)}>Close</Button>
          </>
        }>
        {previewItem && (
          <div className="flex items-center justify-center min-h-[200px]">
            {(() => {
              const ext = previewItem.originalFilename?.split('.').pop()?.toLowerCase() || '';
              const url = previewItem.filePath;
              if (previewItem.type === 'video' && url) {
                return (
                  <video controls className="max-w-full max-h-[60vh] rounded-lg">
                    <source src={url} type={`video/${ext || 'mp4'}`} />
                  </video>
                );
              }
              if (ext === 'pdf' && url) {
                return <iframe src={url} className="w-full rounded-lg" style={{ height: '60vh' }} title={previewItem.title} />;
              }
              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) && url) {
                return <img src={url} alt={previewItem.title} className="max-w-full max-h-[60vh] rounded-lg object-contain" />;
              }
              if (previewItem.type === 'text' && previewItem.content) {
                return (
                  <div className="w-full dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
                    <p className="text-sm dark:text-dark-text text-light-text whitespace-pre-wrap">{previewItem.content}</p>
                  </div>
                );
              }
              return (
                <div className="text-center py-8">
                  <FileTextIcon size={48} className="mx-auto mb-3 dark:text-dark-muted text-light-muted opacity-30" />
                  <p className="text-sm dark:text-dark-muted text-light-muted">Preview not available</p>
                  {url && (
                    <a href={`/api/media/${previewItem.id}/download`} className="text-sm text-green-primary hover:underline mt-2 inline-block">
                      Download instead
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Team Members Modal */}
      <Modal
        isOpen={!!teamModal}
        onClose={() => setTeamModal(null)}
        title="Team Members"
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setTeamModal(null)}>
            Close
          </Button>
        }>
        {(() => {
          const project = projects.find((p) => p.id === teamModal);
          if (!project) return null;
          const teamMembers = (project.teamIds || [])
            .map((id: string) => users.find((u) => u.id === id))
            .filter(Boolean);
          return (
            <div className="space-y-2">
              <div className="px-3 py-2 dark:bg-dark-card2 bg-light-card2 rounded-lg mb-3">
                <p className="text-xs dark:text-dark-subtle text-light-subtle">Project</p>
                <p className="text-sm font-medium dark:text-dark-text text-light-text mt-0.5">
                  {project.name}
                </p>
              </div>
              {teamMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-2.5 dark:bg-dark-card2 bg-light-card2 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-green-primary/15 flex items-center justify-center flex-shrink-0">
                    {member.profilePhoto ? (
                      <img
                        src={member.profilePhoto}
                        alt={member.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon size={14} className="text-green-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                      {member.name}
                      {String(member.id) === String(currentUser?.id) && (
                        <span className="text-[10px] text-green-primary ml-1.5">(You)</span>
                      )}
                    </p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>

      {/* Task Activity Timeline Modal */}
      <Modal
        isOpen={!!activityModal}
        onClose={() => setActivityModal(null)}
        title={activityModal ? `Activity — ${activityModal.title}` : 'Task Activity'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setActivityModal(null)}>
            Close
          </Button>
        }>
        {activityModal && (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <TaskActivityTimeline taskId={activityModal.id} />
          </div>
        )}
      </Modal>

      {/* Task Discussion Modal */}
      <Modal
        isOpen={!!commentsModal}
        onClose={() => setCommentsModal(null)}
        title={commentsModal ? `Discussion — ${commentsModal.title}` : 'Discussion'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setCommentsModal(null)}>
            Close
          </Button>
        }>
        {commentsModal && (
          <TaskComments taskId={commentsModal.id} taskTitle={commentsModal.title} />
        )}
      </Modal>
    </div>);

}