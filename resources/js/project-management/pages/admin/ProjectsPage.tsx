import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  ArchiveIcon,
  TrashIcon,
  EyeIcon,
  FolderKanbanIcon,
  AlertTriangleIcon,
  CalendarIcon,
  DollarSignIcon,
  UsersIcon } from
'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { Project, Task, ApprovalStatus } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { ApprovalActionModal } from '../../components/projects/ApprovalActionModal';
import { isSupervisor } from '../../utils/roles';
type ModalMode = 'create' | 'edit' | 'view' | null;
export function ProjectsPage() {
  const { projects, setProjects, users, tasks, setTasks, refreshTasks, refreshProjects } = useData();
  const { currentUser } = useAuth();
  const { setCurrentPage } = useNavigation();
  const isAdmin = currentUser?.department === 'Admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [approvalProject, setApprovalProject] = useState<Project | null>(null);
  const [approvalAction, setApprovalAction] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [budgetWarningProjects, setBudgetWarningProjects] = useState<Project[]>([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    startDate: '',
    endDate: '',
    estimatedHours: ''
  });
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    teamIds: [] as string[],
    leaderId: ''
  });

  // ─── Auto-refresh projects every 5 seconds (pause while modal is open) ───
  useEffect(() => {
    if (modalMode) return;

    const interval = setInterval(() => {
      fetch('/api/projects')
        .then((res) => res.json())
        .then((data: Project[]) => { if (Array.isArray(data)) setProjects(data); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [setProjects, modalMode]);

  // Warn once per newly over-budget project in the current browser session.
  useEffect(() => {
    const overBudget = projects.filter((p) => p.status !== 'archived' && p.spent > p.budget);
    if (overBudget.length === 0) return;

    const seenKey = 'maptech-overbudget-seen';
    let seenIds = new Set<string>();
    try {
      const parsed = JSON.parse(sessionStorage.getItem(seenKey) || '[]');
      if (Array.isArray(parsed)) {
        seenIds = new Set(parsed.map(String));
      }
    } catch {
      seenIds = new Set<string>();
    }

    const unseen = overBudget.filter((p) => !seenIds.has(String(p.id)));
    if (unseen.length > 0) {
      setBudgetWarningProjects(unseen);
      setShowBudgetWarning(true);
    }
  }, [projects]);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchApproval =
      approvalFilter === 'all' ||
      (p.approvalStatus || 'draft') === approvalFilter;
    return matchSearch && matchStatus && matchApproval;
  });
  const openCreate = () => {
    setCurrentPage('admin-create-project');
  };
  const openEdit = (p: Project) => {
    const teamIds = (p.teamIds || []).map(String);
    const derivedLeaderId = p.leaderId || (teamIds.length >= 2 ? teamIds[0] : '');
    setSelectedProject(p);
    setForm({
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      startDate: p.startDate,
      endDate: p.endDate,
      budget: String(p.budget),
      teamIds,
      leaderId: derivedLeaderId
    });
    setSaveError('');
    setModalMode('edit');
  };
  const openView = (p: Project) => {
    setSelectedProject(p);
    setShowTaskForm(false);
    setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', startDate: '', endDate: '', estimatedHours: '' });
    refreshTasks();
    refreshProjects();
    setModalMode('view');
  };
  const handleSave = async () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    setSaveError('');

    if (form.teamIds.length >= 2 && !form.leaderId) {
      setSaveError('Please select a project leader when assigning 2 or more team members.');
      return;
    }

    setSavingProject(true);
    if (modalMode === 'create') {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            status: form.status,
            priority: form.priority,
            start_date: form.startDate,
            end_date: form.endDate,
            budget: Number(form.budget) || 0,
            manager_id: currentUser?.id || null,
            team_ids: form.teamIds,
            leader_id: form.leaderId || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data?.errors?.leader_id?.[0] || data?.message || 'Failed to create project.';
          setSaveError(message);
          setSavingProject(false);
          return;
        }

        const saved = await res.json();
        setProjects((prev) => [saved, ...prev]);
        setModalMode(null);
      } catch {
        setSaveError('Failed to create project. Please try again.');
      }
    } else if (modalMode === 'edit' && selectedProject) {
      try {
        const res = await fetch(`/api/projects/${selectedProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            status: form.status,
            priority: form.priority,
            start_date: form.startDate,
            end_date: form.endDate,
            budget: Number(form.budget) || 0,
            team_ids: form.teamIds,
            leader_id: form.leaderId || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message = data?.errors?.leader_id?.[0] || data?.message || 'Failed to update project.';
          setSaveError(message);
          setSavingProject(false);
          return;
        }

        const updated = await res.json();
        setProjects((prev) => prev.map((p) => p.id === selectedProject.id ? updated : p));
        setModalMode(null);
      } catch {
        setSaveError('Failed to update project. Please try again.');
      }
    }
    setSavingProject(false);
  };
  const handleDelete = async (id: string) => {
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken } });
    } catch { /* continue with local removal */ }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setDeleteConfirm(null);
  };
  const resetTaskForm = () => {
    setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', startDate: '', endDate: '', estimatedHours: '' });
    setShowTaskForm(false);
    setEditingTaskId(null);
  };
  const openEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setShowTaskForm(false);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignedTo: task.assignedTo || '',
      startDate: task.startDate || '',
      endDate: task.endDate || '',
      estimatedHours: task.estimatedHours ? String(task.estimatedHours) : '',
    });
  };
  const handleEditTask = async () => {
    if (!editingTaskId || !taskForm.title) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      const res = await fetch(`/api/tasks/${editingTaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assigned_to: taskForm.assignedTo || null,
          start_date: taskForm.startDate || null,
          end_date: taskForm.endDate || null,
          estimated_hours: Number(taskForm.estimatedHours) || 0,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTasks((prev) => prev.map((t) => t.id === editingTaskId ? saved : t));
        resetTaskForm();
      }
    } catch { /* silently fail */ }
  };
  const handleAddTask = async () => {
    if (!selectedProject || !taskForm.title) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          project_id: selectedProject.id,
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assigned_to: taskForm.assignedTo || null,
          start_date: taskForm.startDate || null,
          end_date: taskForm.endDate || null,
          estimated_hours: Number(taskForm.estimatedHours) || 0,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTasks((prev) => [saved, ...prev]);
        resetTaskForm();
      }
    } catch { /* silently fail */ }
  };
  const handleDeleteTask = async (taskId: string) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken } });
    } catch { /* continue */ }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };
  const handleApprovalConfirm = async (notes: string) => {
    if (!approvalProject || !approvalAction) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const res = await fetch(`/api/projects/${approvalProject.id}/approval`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ action: approvalAction, notes }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error('Your session expired. Please log in again.');
      }
      throw new Error(data.message || 'Approval action failed.');
    }
    await refreshProjects();
    setApprovalProject(null);
    setApprovalAction('');
  };
  const handleArchive = async (id: string) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => p.id === id ? updated : p));
        return;
      }
    } catch {
      // Fallback to local status update below.
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'archived',
            }
          : p
      )
    );
  };
  const dismissBudgetWarning = () => {
    const seenKey = 'maptech-overbudget-seen';
    let seenIds = new Set<string>();
    try {
      const parsed = JSON.parse(sessionStorage.getItem(seenKey) || '[]');
      if (Array.isArray(parsed)) {
        seenIds = new Set(parsed.map(String));
      }
    } catch {
      seenIds = new Set<string>();
    }

    budgetWarningProjects.forEach((p) => seenIds.add(String(p.id)));
    sessionStorage.setItem(seenKey, JSON.stringify(Array.from(seenIds)));
    setShowBudgetWarning(false);
    setBudgetWarningProjects([]);
  };
  const openBudgetReportFromWarning = () => {
    dismissBudgetWarning();
    setCurrentPage('admin-budget-report');
  };
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);
  const budgetWarningTotalExceeded = budgetWarningProjects.reduce(
    (sum, project) => sum + Math.max(project.spent - project.budget, 0),
    0,
  );
  const projectTasks = (projectId: string) =>
  tasks.filter((t) => t.projectId === projectId);
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<SearchIcon size={14} />} />

          </div>
          <Select
            options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'archived', label: 'Archived' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36" />

          <Select
            options={[
            { value: 'all', label: 'All Approval' },
            { value: 'accounting_review', label: 'Supervisor Review' },
            { value: 'approved', label: 'Approved' },
            ]}
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="w-40" />
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            icon={<PlusIcon size={14} />}
            onClick={openCreate}>

            New Project
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => {
          const ptasks = projectTasks(project.id);
          const completed = ptasks.filter(
            (t) => t.status === 'completed'
          ).length;
          const team = users.filter((u) => project.teamIds.includes(u.id));
          return (
            <div
              key={project.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5 shadow-card flex flex-col gap-4">

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {project.serial && (
                    <span className="text-[10px] font-mono dark:text-green-primary text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded mb-1 inline-block">
                      {project.serial}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
                    {project.name}
                  </h3>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1 line-clamp-2">
                    {project.description}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openView(project)}
                    className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 transition-colors"
                    title="View">

                    <EyeIcon size={13} />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(project)}
                        className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors"
                        title="Edit">

                        <EditIcon size={13} />
                      </button>
                      {project.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(project.id)}
                          className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-amber-500/10 dark:hover:text-amber-400 text-light-muted hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Archive"
                        >
                          <ArchiveIcon size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(project.id)}
                        className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Delete">

                        <TrashIcon size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
                {project.approvalStatus && project.approvalStatus !== 'draft' && (
                  <StatusBadge status={project.approvalStatus} />
                )}
                {(!project.approvalStatus || project.approvalStatus === 'draft') && (
                  <StatusBadge status="draft" />
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs dark:text-dark-muted text-light-muted">
                    Progress
                  </span>
                  <span className="text-xs font-medium dark:text-dark-text text-light-text">
                    {project.progress}%
                  </span>
                </div>
                <ProgressBar value={project.progress} size="md" animated />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold dark:text-dark-text text-light-text">
                    {ptasks.length}
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Tasks
                  </div>
                </div>
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold dark:text-dark-text text-light-text">
                    {team.length}
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Members
                  </div>
                </div>
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-2.5 text-center">
                  <div className="text-sm font-bold text-green-primary">
                    {Math.round(project.spent / project.budget * 100)}%
                  </div>
                  <div className="text-xs dark:text-dark-subtle text-light-subtle">
                    Budget
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 dark:border-dark-border border-t border-light-border">
                <div className="flex -space-x-1.5">
                  {team.slice(0, 3).map((u) =>
                  <UserAvatar
                    key={u.id}
                    name={u.name}
                    avatarText={u.avatar}
                    profilePhoto={u.profilePhoto}
                    className="w-6 h-6 border-2 dark:border-dark-card border-white"
                    textClassName="text-xs font-bold text-black"
                    fallbackStyle={{ backgroundColor: '#63D44A' }}
                    title={u.name}
                  />
                  )}
                  {team.length > 3 &&
                  <div className="w-6 h-6 rounded-full dark:bg-dark-border bg-light-card2 flex items-center justify-center text-xs dark:text-dark-muted text-light-muted border-2 dark:border-dark-card border-white">
                      +{team.length - 3}
                    </div>
                  }
                </div>
                <span className="text-xs dark:text-dark-subtle text-light-subtle">
                  {formatCurrency(project.spent)} /{' '}
                  {formatCurrency(project.budget)}
                </span>
              </div>

              {/* Approval actions */}
              {(() => {
                const as = project.approvalStatus || 'draft';
                const isSupervisorCreator =
                  isSupervisor(currentUser?.role) &&
                  String(project.managerId) === String(currentUser?.id);
                const actions: { action: string; label: string; variant: string }[] = [];
                if (isSupervisorCreator && as === 'accounting_review') {
                  actions.push({ action: 'approve_final', label: 'Final Approve', variant: 'primary' });
                  actions.push({ action: 'request_revision', label: 'Request Revision', variant: 'secondary' });
                  actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
                }

                if (actions.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 pt-1 dark:border-dark-border border-t border-light-border">
                    {actions.map(a => (
                      <button
                        key={a.action}
                        onClick={() => { setApprovalProject(project); setApprovalAction(a.action); }}
                        className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                          a.variant === 'primary' ? 'bg-green-primary text-black hover:bg-green-progress' :
                          a.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                          'dark:bg-dark-card2 dark:text-dark-muted dark:border dark:border-dark-border bg-gray-100 text-light-muted border border-light-border hover:text-light-text'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>);

        })}

        {filtered.length === 0 &&
        <div className="col-span-full flex flex-col items-center justify-center py-16 dark:text-dark-subtle text-light-subtle">
            <FolderKanbanIcon size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No projects found</p>
          </div>
        }
      </div>

      {/* Budget warning modal */}
      <Modal
        isOpen={showBudgetWarning}
        onClose={dismissBudgetWarning}
        title="Budget Warning"
        size="md"
        footer={
        <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openBudgetReportFromWarning}>
              Open Budget Report
            </Button>
            <Button variant="primary" onClick={dismissBudgetWarning}>
              Got it
            </Button>
          </div>
        }>

        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400/35 animate-ping" />
                <AlertTriangleIcon size={14} className="relative z-10 text-amber-300 animate-pulse" />
              </span>
              <p className="text-sm font-medium text-amber-200">
                One or more projects have exceeded their budget
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg dark:bg-dark-card2/70 bg-white/40 px-3 py-2">
                <p className="text-[11px] dark:text-dark-subtle text-light-subtle">Affected Projects</p>
                <p className="text-sm font-semibold dark:text-dark-text text-light-text">{budgetWarningProjects.length}</p>
              </div>
              <div className="rounded-lg dark:bg-dark-card2/70 bg-white/40 px-3 py-2">
                <p className="text-[11px] dark:text-dark-subtle text-light-subtle">Total Overrun</p>
                <p className="text-sm font-semibold text-red-400">{formatCurrency(budgetWarningTotalExceeded)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {budgetWarningProjects.map((p) => {
              const exceededBy = Math.max(p.spent - p.budget, 0);
              const utilization = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              return (
                <div key={p.id} className="rounded-xl dark:bg-dark-card2 bg-light-card2 border dark:border-dark-border border-light-border px-3 py-2.5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.12)]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">{p.name}</p>
                    <span className="text-[11px] font-semibold text-red-400 animate-pulse">+{formatCurrency(exceededBy)}</span>
                  </div>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                    {formatCurrency(p.spent)} of {formatCurrency(p.budget)} used
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full dark:bg-dark-border bg-light-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-700 animate-pulse"
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-red-400 mt-1">{utilization}% utilized</p>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === 'edit'}
        onClose={() => { if (!savingProject) { setModalMode(null); setSaveError(''); } }}
        title="Edit Project"
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => { if (!savingProject) { setModalMode(null); setSaveError(''); } }} disabled={savingProject}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={savingProject}>
              Save Changes
            </Button>
          </>
        }>

        <div className="space-y-4">
          {saveError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {saveError}
            </div>
          )}
          <Input
            label="Project Name"
            placeholder="e.g. GIS Platform Upgrade"
            value={form.name}
            onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value
            })
            } />

          <Textarea
            label="Description"
            placeholder="Describe the project objectives..."
            value={form.description}
            onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value
            })
            } />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value
              })
              }
              options={[
              {
                value: 'active',
                label: 'Active'
              },
              {
                value: 'on-hold',
                label: 'On Hold'
              },
              {
                value: 'completed',
                label: 'Completed'
              }]
              } />

            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) =>
              setForm({
                ...form,
                priority: e.target.value
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) =>
              setForm({
                ...form,
                startDate: e.target.value
              })
              } />

            <Input
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) =>
              setForm({
                ...form,
                endDate: e.target.value
              })
              } />

          </div>
          <Input
            label="Budget (PHP)"
            type="number"
            placeholder="e.g. 250000"
            value={form.budget}
            onChange={(e) =>
            setForm({
              ...form,
              budget: e.target.value
            })
            }
            icon={<DollarSignIcon size={14} />} />

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium dark:text-dark-text text-light-text mb-1.5">
              Team Members
            </label>
            <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg border dark:border-dark-border border-light-border max-h-40 overflow-y-auto">
              {users.filter((u) => u.role === 'employee' && u.status === 'active').map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-green-primary/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.teamIds.includes(u.id)}
                    onChange={(e) => {
                      setForm((prev) => {
                        const nextTeamIds = e.target.checked
                          ? [...prev.teamIds, u.id]
                          : prev.teamIds.filter((id) => id !== u.id);

                        return {
                          ...prev,
                          teamIds: nextTeamIds,
                          leaderId: nextTeamIds.includes(prev.leaderId) ? prev.leaderId : '',
                        };
                      });
                    }}
                    className="rounded border-gray-400 text-green-primary focus:ring-green-primary"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UserAvatar
                      name={u.name}
                      avatarText={u.avatar}
                      profilePhoto={u.profilePhoto}
                      className="w-6 h-6"
                      textClassName="text-xs font-bold text-black"
                      fallbackStyle={{ backgroundColor: '#63D44A' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm dark:text-dark-text text-light-text truncate">{u.name}</p>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">{u.position}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {form.teamIds.length > 0 && (
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                {form.teamIds.length} member{form.teamIds.length !== 1 ? 's' : ''} selected
              </p>
            )}

            {form.teamIds.length >= 2 && (
              <div className="mt-3">
                <Select
                  label="Project Leader *"
                  value={form.leaderId}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaderId: e.target.value }))}
                  options={[
                    { value: '', label: 'Select leader from assigned team' },
                    ...users
                      .filter((u) => form.teamIds.includes(u.id))
                      .map((u) => ({ value: u.id, label: u.name })),
                  ]}
                />
                <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                  For multi-member projects, only the selected leader can update project progress.
                </p>
              </div>
            )}
          </div>

        </div>
      </Modal>

      {/* View Modal */}
      {selectedProject &&
      <Modal
        isOpen={modalMode === 'view'}
        onClose={() => setModalMode(null)}
        title="Project Details"
        size="lg"
        footer={
        <>
              <Button variant="secondary" onClick={() => setModalMode(null)}>
                Close
              </Button>
              <Button
            variant="primary"
            onClick={() => openEdit(selectedProject)}>

                Edit Project
              </Button>
            </>
        }>

          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold dark:text-dark-text text-light-text">
                {selectedProject.name}
              </h3>
              <p className="text-sm dark:text-dark-muted text-light-muted mt-1">
                {selectedProject.description}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={selectedProject.status} />
              <PriorityBadge priority={selectedProject.priority} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <div className="text-xs dark:text-dark-subtle text-light-subtle mb-1">
                  Timeline
                </div>
                <div className="text-sm dark:text-dark-text text-light-text font-medium">
                  {selectedProject.startDate} → {selectedProject.endDate}
                </div>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <div className="text-xs dark:text-dark-subtle text-light-subtle mb-1">
                  Budget
                </div>
                <div className="text-sm dark:text-dark-text text-light-text font-medium">
                  ₱{selectedProject.spent.toLocaleString()} / ₱
                  {selectedProject.budget.toLocaleString()}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm dark:text-dark-muted text-light-muted">
                  Overall Progress
                </span>
                <span className="text-sm font-medium dark:text-dark-text text-light-text">
                  {selectedProject.progress}%
                </span>
              </div>
              <ProgressBar
              value={selectedProject.progress}
              size="lg"
              animated />

            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium dark:text-dark-text text-light-text">
                  Tasks
                </h4>
                <Button variant="primary" size="sm" icon={<PlusIcon size={12} />} onClick={() => {
                  const teamMembers = users.filter((u) => selectedProject?.teamIds?.includes(u.id));
                  setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: teamMembers.length === 1 ? teamMembers[0].id : '', startDate: '', endDate: '', estimatedHours: '' });
                  setShowTaskForm(true);
                }}>
                  Add Task
                </Button>
              </div>

              {/* Add Task Form */}
              {showTaskForm && (
                <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4 mb-3 space-y-3 border dark:border-dark-border border-light-border">
                  <Input
                    label="Task Title"
                    placeholder="e.g. Setup network cabling"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <Textarea
                    label="Description"
                    placeholder="Describe the task..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Priority"
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                    />
                    <Select
                      label="Assign To (Optional)"
                      value={taskForm.assignedTo}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                      options={[
                        { value: '', label: 'All Team Members' },
                        ...users.filter((u) => selectedProject?.teamIds?.includes(u.id)).map((u) => ({
                          value: u.id,
                          label: u.name,
                        })),
                      ]}
                    />
                  </div>
                  <p className="text-[10px] dark:text-dark-subtle text-light-subtle -mt-1">
                    Tasks are visible to all team members. Use "Assign To" to designate a specific person.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="Start Date"
                      type="date"
                      value={taskForm.startDate}
                      onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={taskForm.endDate}
                      onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                    />
                    <Input
                      label="Est. Hours"
                      type="number"
                      placeholder="0"
                      value={taskForm.estimatedHours}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="secondary" size="sm" onClick={resetTaskForm}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleAddTask}>Create Task</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {tasks.
              filter((t) => t.projectId === selectedProject.id).
              map((task) => {
                const assignee = users.find((u) => u.id === task.assignedTo);
                if (editingTaskId === task.id) {
                  return (
                    <div key={task.id} className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4 space-y-3 border dark:border-green-primary/30 border-green-primary/30">
                      <Input
                        label="Task Title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      />
                      <Textarea
                        label="Description"
                        placeholder="Describe the task..."
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          label="Priority"
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                          options={[
                            { value: 'low', label: 'Low' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'high', label: 'High' },
                            { value: 'critical', label: 'Critical' },
                          ]}
                        />
                        <Select
                          label="Assign To (Optional)"
                          value={taskForm.assignedTo}
                          onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                          options={[
                            { value: '', label: 'All Team Members' },
                            ...users.filter((u) => selectedProject?.teamIds?.includes(u.id)).map((u) => ({
                              value: u.id,
                              label: u.name,
                            })),
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          label="Start Date"
                          type="date"
                          value={taskForm.startDate}
                          onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                        />
                        <Input
                          label="End Date"
                          type="date"
                          value={taskForm.endDate}
                          onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                        />
                        <Input
                          label="Est. Hours"
                          type="number"
                          placeholder="0"
                          value={taskForm.estimatedHours}
                          onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={resetTaskForm}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleEditTask}>Save Changes</Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 dark:bg-dark-card2 bg-light-card2 rounded-lg px-3 py-2.5">

                        <div className="flex-1 min-w-0">
                          <p className="text-sm dark:text-dark-text text-light-text truncate">
                            {task.title}
                          </p>
                          <p className="text-xs dark:text-dark-subtle text-light-subtle">
                            {assignee?.name || 'All Team Members'}
                          </p>
                        </div>
                        <StatusBadge status={task.status} />
                        <span className="text-xs dark:text-dark-muted text-light-muted w-8 text-right">
                          {task.progress}%
                        </span>
                        <button
                          onClick={() => openEditTask(task)}
                          className="p-1 rounded dark:text-dark-muted dark:hover:bg-dark-card dark:hover:text-green-primary text-light-muted hover:bg-light-card hover:text-green-primary transition-colors"
                          title="Edit task"
                        >
                          <EditIcon size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete task"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>);

              })}
              {tasks.filter((t) => t.projectId === selectedProject.id).length === 0 && !showTaskForm && (
                <p className="text-sm dark:text-dark-subtle text-light-subtle text-center py-4">No tasks yet — click "Add Task" to create one</p>
              )}
              </div>
            </div>
          </div>
        </Modal>
      }

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Project"
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
          Are you sure you want to delete this project? This action cannot be
          undone and will remove all associated tasks.
        </p>
      </Modal>

      {/* Approval Action Modal */}
      {approvalProject && approvalAction && (
        <ApprovalActionModal
          isOpen={!!approvalProject}
          onClose={() => { setApprovalProject(null); setApprovalAction(''); refreshProjects(); }}
          project={approvalProject}
          action={approvalAction}
          onConfirm={handleApprovalConfirm}
        />
      )}
    </div>);

}