import React, { useState } from 'react';
import {
  FileTextIcon,
  VideoIcon,
  TypeIcon,
  EyeIcon,
  DownloadIcon,
  SearchIcon,
  FolderOpenIcon,
} from 'lucide-react';
import { MediaUpload } from '../../data/mockData';
import { useData, useAuth } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { isSuperadmin } from '../../utils/roles';

export function ResourcesPage() {
  const { media, projects, users } = useData();
  const { currentUser } = useAuth();

  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaUpload | null>(null);

  // Only show media uploaded by admins AND visible to this employee
  const adminMedia = media.filter((m) => {
    const uploader = users.find((u) => u.id === m.uploadedBy);
    if (!isSuperadmin(uploader?.role)) return false;
    // If visibleTo is empty/null, visible to all employees
    if (!m.visibleTo || m.visibleTo.length === 0) return true;
    // Otherwise, only show if current user is in the list
    return m.visibleTo.includes(currentUser?.id || '');
  });

  const filtered = adminMedia.filter((m) => {
    const matchProject = projectFilter === 'all' || m.projectId === projectFilter;
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    const matchSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchProject && matchType && matchSearch;
  });

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    file: <FileTextIcon size={16} />,
    video: <VideoIcon size={16} />,
    text: <TypeIcon size={16} />,
  };

  const TYPE_COLORS: Record<string, string> = {
    file: '#1FAF8E',
    video: '#8b5cf6',
    text: '#63D44A',
  };

  const totalFiles = adminMedia.filter((m) => m.type === 'file').length;
  const totalVideos = adminMedia.filter((m) => m.type === 'video').length;
  const totalTexts = adminMedia.filter((m) => m.type === 'text').length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4 text-center">
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">{adminMedia.length}</div>
          <div className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">Total Resources</div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4 text-center">
          <div className="text-2xl font-bold text-green-primary">{totalFiles}</div>
          <div className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">Documents</div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{totalVideos}</div>
          <div className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">Videos</div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{totalTexts}</div>
          <div className="text-[10px] dark:text-dark-subtle text-light-subtle mt-0.5">Announcements</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-dark-subtle text-light-subtle" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-text bg-white border border-light-border text-light-text w-48 focus:outline-none focus:ring-1 focus:ring-green-primary/50"
            />
          </div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="pl-3 pr-7 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="pl-3 pr-7 py-1.5 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted bg-white border border-light-border text-light-muted focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_6px_center] bg-no-repeat"
          >
            <option value="all">All Types</option>
            <option value="file">Documents</option>
            <option value="video">Videos</option>
            <option value="text">Announcements</option>
          </select>
        </div>
        <div className="text-xs dark:text-dark-subtle text-light-subtle">
          {filtered.length} of {adminMedia.length} resources
        </div>
      </div>

      {/* Media List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const uploader = users.find((u) => u.id === item.uploadedBy);

          return (
            <div
              key={item.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 flex gap-4"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `${TYPE_COLORS[item.type]}18`,
                  color: TYPE_COLORS[item.type],
                }}
              >
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
                          item.type === 'file'
                            ? 'info'
                            : item.type === 'video'
                            ? 'purple'
                            : 'success'
                        }
                        size="sm"
                      >
                        {item.type === 'file' ? 'Document' : item.type === 'video' ? 'Video' : 'Announcement'}
                      </Badge>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        {project?.name}
                      </span>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">·</span>
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        by {uploader?.name || 'Admin'}
                      </span>
                      {item.fileSize && (
                        <>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">·</span>
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            {item.fileSize}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs dark:text-dark-subtle text-light-subtle flex-shrink-0">
                    {item.createdAt}
                  </span>
                </div>

                {/* Content preview */}
                {item.content && (
                  <p className="text-sm dark:text-dark-muted text-light-muted mt-2 line-clamp-2">
                    {item.content}
                  </p>
                )}

                {/* View / Download actions for files & videos */}
                {item.type !== 'text' && item.filePath && (
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md dark:bg-dark-card2 dark:text-dark-text dark:hover:bg-dark-border bg-light-card2 text-light-text hover:bg-light-border transition-colors"
                    >
                      <EyeIcon size={12} />
                      View
                    </button>
                    <a
                      href={`/api/media/${item.id}/download`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md dark:bg-dark-card2 dark:text-green-primary dark:hover:bg-dark-border bg-light-card2 text-green-primary hover:bg-light-border transition-colors"
                    >
                      <DownloadIcon size={12} />
                      Download
                    </a>
                    {item.originalFilename && (
                      <span className="text-xs dark:text-dark-subtle text-light-subtle">
                        {item.originalFilename}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <FolderOpenIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No resources found</p>
            <p className="text-xs mt-1 opacity-60">Resources uploaded by admin will appear here</p>
          </div>
        )}
      </div>

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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:opacity-90 transition-opacity"
            >
              <DownloadIcon size={14} />
              Download File
            </a>
            <Button variant="secondary" onClick={() => setPreviewItem(null)}>
              Close
            </Button>
          </>
        }
      >
        <div>
          {previewItem?.type === 'video' && previewItem.filePath && (
            <video
              src={previewItem.filePath}
              controls
              autoPlay
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '60vh' }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {previewItem?.type === 'file' && previewItem.filePath && (
            /\.(pdf)$/i.test(previewItem.originalFilename || '') ? (
              <iframe
                src={previewItem.filePath}
                className="w-full rounded-lg border dark:border-dark-border border-light-border"
                style={{ height: '60vh' }}
                title={previewItem.title}
              />
            ) : /\.(png|jpe?g|gif|webp|svg)$/i.test(previewItem.originalFilename || '') ? (
              <img
                src={previewItem.filePath}
                alt={previewItem.title}
                className="w-full rounded-lg object-contain"
                style={{ maxHeight: '60vh' }}
              />
            ) : (
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
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-primary text-white hover:opacity-90 transition-opacity"
                >
                  <DownloadIcon size={14} />
                  Download to View
                </a>
              </div>
            )
          )}
          {previewItem?.content && (
            <p className="text-sm dark:text-dark-muted text-light-muted mt-3">
              {previewItem.content}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
