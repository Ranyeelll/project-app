import React, { useState } from 'react';
import {
  CheckIcon,
  XIcon,
  ClipboardCheckIcon,
  EyeIcon,
  DownloadIcon,
  FileTextIcon,
  VideoIcon,
  ImageIcon,
  FileIcon,
  UserIcon } from
'lucide-react';
import { useData, useAuth } from '../../context/AppContext';
import { Task } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

export function TaskReviewsPage() {
  const { tasks, setTasks, refreshTasks, projects, users, media } = useData();
  const { currentUser } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<{
    task: Task;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [previewItem, setPreviewItem] = useState<any>(null);

  // Tasks with completion reports
  const reviewableTasks = tasks.filter(
    (t) => t.completionReportStatus && t.completionReportStatus !== 'none'
  );

  const filtered = reviewableTasks.filter(
    (t) => statusFilter === 'all' || t.completionReportStatus === statusFilter
  );

  const pendingCount = tasks.filter((t) => t.completionReportStatus === 'pending').length;
  const approvedCount = tasks.filter((t) => t.completionReportStatus === 'approved').length;
  const rejectedCount = tasks.filter((t) => t.completionReportStatus === 'rejected').length;

  const handleReview = async () => {
    if (!reviewModal) return;
    const newStatus = reviewModal.action === 'approve' ? 'approved' : 'rejected';
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      await fetch(`/api/tasks/${reviewModal.task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ completion_report_status: newStatus }),
      });
      refreshTasks();
    } catch {
      // Fallback to local update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === reviewModal.task.id
            ? { ...t, completionReportStatus: newStatus as any }
            : t
        )
      );
    }
    setReviewModal(null);
    setReviewComment('');
  };

  const getFileIcon = (type: string) => {
    if (type === 'video') return <VideoIcon size={14} className="text-purple-400" />;
    if (type === 'file') return <FileIcon size={14} className="text-blue-400" />;
    return <FileTextIcon size={14} className="text-green-primary" />;
  };

  const isPreviewable = (item: any) => {
    if (!item.filePath) return false;
    const ext = item.originalFilename?.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'ogg', 'pdf'].includes(ext);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Pending Reviews
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {pendingCount}
          </div>
          <div className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
            Awaiting your review
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Approved
          </div>
          <div className="text-xl font-bold text-green-primary">
            {approvedCount}
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-xs dark:text-dark-muted text-light-muted mb-1">
            Rejected
          </div>
          <div className="text-xl font-bold text-red-400">
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              statusFilter === s
                ? 'bg-green-primary text-black'
                : 'dark:bg-dark-card dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-white border border-light-border text-light-muted hover:text-light-text'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            {s === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((task) => {
          const project = projects.find((p) => p.id === task.projectId);
          const assignee = users.find((u) => u.id === task.assignedTo);
          const taskMedia = media.filter((m) => m.taskId === task.id);

          return (
            <div
              key={task.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Task header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <Badge
                      variant={
                        task.completionReportStatus === 'pending'
                          ? 'warning'
                          : task.completionReportStatus === 'approved'
                          ? 'success'
                          : 'danger'
                      }
                      size="sm"
                    >
                      Report: {task.completionReportStatus}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
                    {task.title}
                  </h3>
                  <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                    {task.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 mt-2 text-xs dark:text-dark-subtle text-light-subtle">
                    <span className="flex items-center gap-1">
                      <UserIcon size={11} />
                      {assignee?.name || 'Unassigned'}
                    </span>
                    <span>{project?.name}</span>
                    <span>{task.startDate} → {task.endDate}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <ProgressBar value={task.progress} size="sm" showLabel animated />
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                    {task.loggedHours}h / {task.estimatedHours}h logged
                  </div>

                  {/* Attached reports/media */}
                  {taskMedia.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium dark:text-dark-muted text-light-muted">
                        Submitted Reports ({taskMedia.length})
                      </p>
                      {taskMedia.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 dark:bg-dark-card2 bg-light-card2 rounded-lg px-3 py-2"
                        >
                          {getFileIcon(item.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs dark:text-dark-text text-light-text truncate">
                              {item.title}
                            </p>
                            {item.originalFilename && (
                              <p className="text-[10px] dark:text-dark-subtle text-light-subtle">
                                {item.originalFilename}
                                {item.fileSize ? ` · ${(Number(item.fileSize) / 1024).toFixed(0)} KB` : ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isPreviewable(item) && (
                              <button
                                onClick={() => setPreviewItem(item)}
                                className="p-1 rounded dark:text-dark-muted dark:hover:text-green-primary text-light-muted hover:text-green-600 transition-colors"
                                title="Preview"
                              >
                                <EyeIcon size={13} />
                              </button>
                            )}
                            {item.filePath && (
                              <a
                                href={`/api/media/${item.id}/download`}
                                className="p-1 rounded dark:text-dark-muted dark:hover:text-blue-400 text-light-muted hover:text-blue-500 transition-colors"
                                title="Download"
                              >
                                <DownloadIcon size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Show text content if any text reports */}
                      {taskMedia
                        .filter((m) => m.type === 'text' && m.content)
                        .map((m) => (
                          <div
                            key={`content-${m.id}`}
                            className="dark:bg-dark-card2 bg-light-card2 rounded-lg px-3 py-2 mt-1"
                          >
                            <p className="text-xs font-medium dark:text-dark-muted text-light-muted mb-1">
                              {m.title}
                            </p>
                            <p className="text-xs dark:text-dark-subtle text-light-subtle whitespace-pre-wrap">
                              {m.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs dark:text-dark-subtle text-light-subtle">
                    {task.endDate}
                  </span>
                  {task.completionReportStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XIcon size={12} />}
                        onClick={() => {
                          setReviewModal({ task, action: 'reject' });
                          setReviewComment('');
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckIcon size={12} />}
                        onClick={() => {
                          setReviewModal({ task, action: 'approve' });
                          setReviewComment('');
                        }}
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <ClipboardCheckIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">
              {statusFilter === 'pending'
                ? 'No pending completion reports to review'
                : 'No completion reports found'}
            </p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={
          reviewModal?.action === 'approve'
            ? 'Approve Completion Report'
            : 'Reject Completion Report'
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewModal(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewModal?.action === 'approve' ? 'primary' : 'danger'}
              onClick={handleReview}
            >
              {reviewModal?.action === 'approve'
                ? 'Confirm Approval'
                : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {reviewModal && (
            <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
              <p className="text-sm font-medium dark:text-dark-text text-light-text">
                {reviewModal.task.title}
              </p>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                Progress: {reviewModal.task.progress}% · {reviewModal.task.loggedHours}h logged
              </p>
            </div>
          )}
          <Textarea
            label={
              reviewModal?.action === 'reject'
                ? 'Rejection Reason (required)'
                : 'Comment (optional)'
            }
            placeholder={
              reviewModal?.action === 'reject'
                ? 'Explain why this report is being rejected...'
                : 'Add a note for the employee...'
            }
            value={reviewComment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setReviewComment(e.target.value)
            }
            rows={3}
          />
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Preview'}
        size="xl"
      >
        {previewItem && (
          <div className="flex items-center justify-center min-h-[300px]">
            {(() => {
              const ext = previewItem.originalFilename
                ?.split('.')
                .pop()
                ?.toLowerCase() || '';
              const url = `/storage/${previewItem.filePath}`;
              if (['mp4', 'webm', 'ogg'].includes(ext)) {
                return (
                  <video controls className="max-w-full max-h-[70vh] rounded-lg">
                    <source src={url} type={`video/${ext}`} />
                    Your browser does not support the video tag.
                  </video>
                );
              }
              if (ext === 'pdf') {
                return (
                  <iframe
                    src={url}
                    className="w-full rounded-lg"
                    style={{ height: '70vh' }}
                    title={previewItem.title}
                  />
                );
              }
              if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                return (
                  <img
                    src={url}
                    alt={previewItem.title}
                    className="max-w-full max-h-[70vh] rounded-lg object-contain"
                  />
                );
              }
              return (
                <div className="text-center py-8">
                  <FileIcon size={48} className="mx-auto mb-3 dark:text-dark-muted text-light-muted opacity-30" />
                  <p className="text-sm dark:text-dark-muted text-light-muted">
                    Preview not available for this file type
                  </p>
                  <a
                    href={`/api/media/${previewItem.id}/download`}
                    className="text-sm text-green-primary hover:underline mt-2 inline-block"
                  >
                    Download instead
                  </a>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
