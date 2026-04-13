import React, { useState, useEffect, useRef } from 'react';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  TrashIcon,
  SearchIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { apiFetch } from '../../utils/apiFetch';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
export function ArchivePage() {
  const { projects, setProjects, tasks, users, refreshProjects } = useData();
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const archived = projects.
  filter((p) => p.status === 'archived' || p.status === 'completed').
  filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const handleRestore = async (id: string) => {
    setRestoring(true);
    try {
      const res = await apiFetch(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => p.id === id ? updated : p));
        refreshProjects();
        return;
      }
    } catch {
      // Fallback to local update below when request fails.
    } finally {
      setRestoring(false);
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'active',
            }
          : p
      )
    );
  };
  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  };
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);

  if (isLoading) return <LoadingSpinner message="Loading archive..." />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm dark:text-dark-muted text-light-muted">
            {archived.length} archived / completed project
            {archived.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search archive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<SearchIcon size={14} />} />

        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {archived.map((project) => {
          const ptasks = tasks.filter((t) => t.projectId === project.id);
          const completed = ptasks.filter(
            (t) => t.status === 'completed'
          ).length;
          return (
            <div
              key={project.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 flex items-center gap-5">

              <div className="w-10 h-10 rounded-lg dark:bg-dark-card2 bg-light-card2 flex items-center justify-center flex-shrink-0">
                <ArchiveIcon
                  size={18}
                  className="dark:text-dark-muted text-light-muted" />

              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                    {project.name}
                  </h3>
                  <Badge
                    variant={
                    project.status === 'completed' ? 'success' : 'muted'
                    }
                    size="sm">

                    {project.status}
                  </Badge>
                  <PriorityBadge priority={project.priority} />
                </div>
                <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">
                  {project.description}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <ProgressBar value={project.progress} size="sm" showLabel />
                  <span className="text-xs dark:text-dark-subtle text-light-subtle flex-shrink-0">
                    {completed}/{ptasks.length} tasks ·{' '}
                    {formatCurrency(project.spent)}
                  </span>
                  <span className="text-xs dark:text-dark-subtle text-light-subtle flex-shrink-0">
                    {project.startDate} → {project.endDate}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArchiveRestoreIcon size={13} />}
                  onClick={() => handleRestore(project.id)}
                  disabled={restoring}>

                  {restoring ? 'Restoring...' : 'Restore'}
                </Button>
                <button
                  onClick={() => setDeleteConfirm(project.id)}
                  className="p-2 rounded-lg dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Permanently delete">

                  <TrashIcon size={14} />
                </button>
              </div>
            </div>);

        })}

        {archived.length === 0 &&
        <div className="flex flex-col items-center justify-center py-20 dark:text-dark-subtle text-light-subtle">
            <ArchiveIcon size={48} className="mb-3 opacity-20" />
            <p className="text-sm">No archived projects</p>
            <p className="text-xs mt-1">
              Archived and completed projects will appear here
            </p>
          </div>
        }
      </div>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Permanently Delete Project"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>

              Delete Permanently
            </Button>
          </>
        }>

        <p className="text-sm dark:text-dark-muted text-light-muted">
          This will permanently delete the project and all associated data. This
          action cannot be undone.
        </p>
      </Modal>
    </div>);

}