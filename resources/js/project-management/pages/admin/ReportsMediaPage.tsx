import React, { useState } from 'react';
import {
  PlusIcon,
  FileTextIcon,
  VideoIcon,
  TypeIcon,
  TrashIcon,
  UploadIcon,
  CalendarIcon,
  EyeIcon,
  DownloadIcon,
  UsersIcon } from
'lucide-react';
import { MediaUpload } from '../../data/mockData';
import { useData, useAuth } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { isSuperadmin } from '../../utils/roles';
export function ReportsMediaPage() {
  const { media, projects, users, refreshMedia } = useData();
  const { currentUser } = useAuth();
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadModal, setUploadModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaUpload | null>(null);
  const [form, setForm] = useState({
    projectId: projects[0]?.id || '',
    type: 'text',
    title: '',
    content: '',
    visibleTo: [] as string[]
  });

  // Get employees for visibility selector
  const employees = users.filter((u) => u.role === 'employee');
  const filtered = media.filter((m) => {
    const matchProject =
    projectFilter === 'all' || m.projectId === projectFilter;
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchProject && matchType;
  });
  const handleUpload = async () => {
    // Ensure a valid project is selected
    const projectId = form.projectId || projects[0]?.id || '';
    if (!projectId) {
      alert('Please select a project first.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('uploaded_by', currentUser?.id || '');
      formData.append('type', form.type);
      formData.append('title', form.title);
      formData.append('content', form.content);
      if (form.visibleTo.length > 0) {
        formData.append('visible_to', form.visibleTo.join(','));
      }
      if (uploadFile) {
        formData.append('file', uploadFile);
      }

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (res.ok) {
        refreshMedia();
      } else {
        const err = await res.json().catch(() => null);
        alert('Upload failed: ' + (err?.message || res.statusText));
      }
    } catch (e: any) {
      alert('Upload failed: ' + (e?.message || 'Network error'));
    } finally {
      setSubmitting(false);
      setUploadModal(false);
      setUploadFile(null);
      setForm({
        projectId: projects[0]?.id || '',
        type: 'text',
        title: '',
        content: '',
        visibleTo: []
      });
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        alert('Failed to delete media.');
      }
      refreshMedia();
    } catch { /* ignore */ }
    setDeleteConfirm(null);
  };
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    file: <FileTextIcon size={16} />,
    video: <VideoIcon size={16} />,
    text: <TypeIcon size={16} />
  };
  const TYPE_COLORS: Record<string, string> = {
    file: '#1FAF8E',
    video: '#8b5cf6',
    text: '#63D44A'
  };
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Select
            options={[
            {
              value: 'all',
              label: 'All Projects'
            },
            ...projects.map((p) => ({
              value: p.id,
              label: p.name
            }))]
            }
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-48" />

          <Select
            options={[
            {
              value: 'all',
              label: 'All Types'
            },
            {
              value: 'file',
              label: 'Files'
            },
            {
              value: 'video',
              label: 'Videos'
            },
            {
              value: 'text',
              label: 'Text Reports'
            }]
            }
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-36" />

        </div>
        <Button
          variant="primary"
          icon={<UploadIcon size={14} />}
          onClick={() => {
            setForm(prev => ({ ...prev, projectId: prev.projectId || projects[0]?.id || '' }));
            setUploadModal(true);
          }}>

          Upload Media
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const uploader = users.find((u) => u.id === item.uploadedBy);
          const canDelete =
          isSuperadmin(currentUser?.role) || String(item.uploadedBy) === String(currentUser?.id);
          return (
            <div
              key={item.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 flex gap-4">

              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${TYPE_COLORS[item.type]}18`,
                  color: TYPE_COLORS[item.type]
                }}>

                {TYPE_ICONS[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        variant={
                        item.type === 'file' ?
                        'info' :
                        item.type === 'video' ?
                        'purple' :
                        'success'
                        }
                        size="sm">

                        {item.type}
                      </Badge>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        {project?.name}
                      </span>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        ·
                      </span>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        {uploader?.name}
                      </span>
                      {item.fileSize &&
                      <>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            ·
                          </span>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            {item.fileSize}
                          </span>
                        </>
                      }
                      {item.visibleTo && item.visibleTo.length > 0 ? (
                        <>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">·</span>
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <UsersIcon size={10} />
                            {item.visibleTo.length} employee{item.visibleTo.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">·</span>
                          <span className="flex items-center gap-1 text-xs text-green-primary">
                            <UsersIcon size={10} />
                            All employees
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs dark:text-dark-subtle text-light-subtle">
                      {item.createdAt}
                    </span>
                    {canDelete &&
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors">

                        <TrashIcon size={13} />
                      </button>
                    }
                  </div>
                </div>
                {item.type === 'text' &&
                <p className="text-sm dark:text-dark-muted text-light-muted mt-2 line-clamp-2">
                    {item.content}
                  </p>
                }
                {item.type !== 'text' && item.content &&
                <p className="text-sm dark:text-dark-muted text-light-muted mt-2 line-clamp-2">
                    {item.content}
                  </p>
                }
                {item.type !== 'text' && item.filePath &&
                <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md dark:bg-dark-card2 dark:text-dark-text dark:hover:bg-dark-border bg-light-card2 text-light-text hover:bg-light-border transition-colors">
                      <EyeIcon size={12} />
                      View
                    </button>
                    <a
                      href={`/api/media/${item.id}/download`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md dark:bg-dark-card2 dark:text-green-primary dark:hover:bg-dark-border bg-light-card2 text-green-primary hover:bg-light-border transition-colors">
                      <DownloadIcon size={12} />
                      Download
                    </a>
                    {item.originalFilename &&
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        {item.originalFilename}
                      </span>
                    }
                  </div>
                }
              </div>
            </div>);

        })}

        {filtered.length === 0 &&
        <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <FileTextIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No media uploads found</p>
          </div>
        }
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title="Upload Media / Report"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setUploadModal(false)}>
              Cancel
            </Button>
            <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!form.title || !form.content || submitting}>

              {submitting ? 'Uploading...' : 'Upload'}
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

          <Select
            label="Type"
            value={form.type}
            onChange={(e) => {
            setForm({
              ...form,
              type: e.target.value
            });
            if (e.target.value === 'text') setUploadFile(null);
            }}
            options={[
            {
              value: 'text',
              label: 'Text Report / Announcement'
            },
            {
              value: 'file',
              label: 'File (PDF, DOCX, Excel)'
            },
            {
              value: 'video',
              label: 'Video'
            }]
            } />

          <Input
            label="Title"
            placeholder="e.g. Q2 Progress Report"
            value={form.title}
            onChange={(e) =>
            setForm({
              ...form,
              title: e.target.value
            })
            } />

          <Textarea
            label={form.type === 'text' ? 'Content' : 'Description / Notes'}
            placeholder={
            form.type === 'text' ?
            'Write your report or announcement...' :
            'Describe the uploaded file...'
            }
            value={form.content}
            onChange={(e) =>
            setForm({
              ...form,
              content: e.target.value
            })
            }
            rows={5} />

          {form.type !== 'text' &&
          <div className="border-2 border-dashed dark:border-dark-border border-light-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept={form.type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'}
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="admin-media-file-input" />
              <label htmlFor="admin-media-file-input" className="cursor-pointer">
                <UploadIcon
                  size={24}
                  className="mx-auto mb-2 dark:text-dark-subtle text-light-subtle" />
                <p className="text-sm dark:text-dark-muted text-light-muted">
                  {uploadFile ? uploadFile.name : 'Click to upload or drag and drop'}
                </p>
                {uploadFile ?
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                    {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                :
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                    {form.type === 'file' ?
                  'PDF, DOCX, XLSX up to 50MB' :
                  'MP4, MOV up to 500MB'}
                  </p>
                }
              </label>
            </div>
          }

          {/* Employee Visibility Selector */}
          <div>
            <label className="block text-sm font-medium dark:text-dark-text text-light-text mb-2">
              Visible To
            </label>
            <p className="text-xs dark:text-dark-subtle text-light-subtle mb-2">
              {form.visibleTo.length === 0
                ? 'All employees can see this (default)'
                : `${form.visibleTo.length} employee${form.visibleTo.length !== 1 ? 's' : ''} selected`}
            </p>
            <div className="max-h-40 overflow-y-auto border dark:border-dark-border border-light-border rounded-lg divide-y dark:divide-dark-border divide-light-border">
              {employees.map((emp) => (
                <label
                  key={emp.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer dark:hover:bg-dark-card2 hover:bg-light-card2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.visibleTo.includes(emp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, visibleTo: [...form.visibleTo, emp.id] });
                      } else {
                        setForm({ ...form, visibleTo: form.visibleTo.filter((id) => id !== emp.id) });
                      }
                    }}
                    className="w-3.5 h-3.5 rounded accent-green-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm dark:text-dark-text text-light-text truncate">{emp.name}</p>
                    <p className="text-[10px] dark:text-dark-subtle text-light-subtle truncate">{emp.position || emp.email}</p>
                  </div>
                </label>
              ))}
              {employees.length === 0 && (
                <p className="text-xs dark:text-dark-subtle text-light-subtle p-3">No employees found</p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Preview'}
        size="xl"
        footer={
        <>
            <a
              href={previewItem ? `/api/media/${previewItem.id}/download` : '#'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:opacity-90 transition-opacity">
              <DownloadIcon size={14} />
              Download File
            </a>
            <Button variant="secondary" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </>
        }>
        <div>
          {previewItem?.type === 'video' && previewItem.filePath &&
            <video
              src={previewItem.filePath}
              controls
              autoPlay
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '60vh' }}>
              Your browser does not support the video tag.
            </video>
          }
          {previewItem?.type === 'file' && previewItem.filePath && (
            /\.(pdf)$/i.test(previewItem.originalFilename || '') ?
              <iframe
                src={previewItem.filePath}
                className="w-full rounded-lg border dark:border-dark-border border-light-border"
                style={{ height: '60vh' }}
                title={previewItem.title} />
            : /\.(png|jpe?g|gif|webp|svg)$/i.test(previewItem.originalFilename || '') ?
              <img
                src={previewItem.filePath}
                alt={previewItem.title}
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: '60vh' }} />
            :
              <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
                <FileTextIcon size={48} className="mb-3 opacity-40" />
                <p className="text-sm font-medium dark:text-dark-text text-light-text">
                  {previewItem.originalFilename}
                </p>
                <p className="text-xs mt-1">
                  {previewItem.fileSize} · This file type cannot be previewed inline
                </p>
                <a
                  href={`/api/media/${previewItem.id}/download`}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:opacity-90 transition-opacity">
                  <DownloadIcon size={14} />
                  Download to View
                </a>
              </div>
          )}
          {previewItem?.content &&
            <p className="text-sm dark:text-dark-muted text-light-muted mt-3">
              {previewItem.content}
            </p>
          }
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Upload"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>

              Delete
            </Button>
          </>
        }>

        <p className="text-sm dark:text-dark-muted text-light-muted">
          Are you sure you want to delete this upload? This action cannot be
          undone.
        </p>
      </Modal>
    </div>);

}