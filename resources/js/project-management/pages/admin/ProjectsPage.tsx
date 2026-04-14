import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UsersIcon,
  ActivityIcon,
  DownloadIcon } from
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
import { apiFetch } from '../../utils/apiFetch';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { TaskActivityTimeline } from '../../components/projects/TaskActivityTimeline';
import { downloadCsv } from '../../utils/exportCsv';
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
  const [pageError, setPageError] = useState('');
  const [taskActionError, setTaskActionError] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [budgetWarningProjects, setBudgetWarningProjects] = useState<Project[]>([]);
  const [taskActivityTarget, setTaskActivityTarget] = useState<{ id: string; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);
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
    category: 'development',
    riskLevel: 'low',
    beneficiaryType: 'internal',
    beneficiaryName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    location: '',
    objectives: '',
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
      apiFetch('/api/projects')
        .then((res) => { if (res.ok) return res.json(); throw new Error('refresh failed'); })
        .then((data: Project[]) => { if (Array.isArray(data)) setProjects(data); })
        .catch(() => { /* background refresh — no user action needed */ });
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
    const s = search.toLowerCase();
    const matchSearch = !s ||
      p.name.toLowerCase().includes(s) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      (p.category && p.category.toLowerCase().includes(s)) ||
      (p.serial && p.serial.toLowerCase().includes(s)) ||
      p.status.toLowerCase().includes(s) ||
      p.priority.toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchApproval =
      approvalFilter === 'all' ||
      (p.approvalStatus || 'draft') === approvalFilter;
    return matchSearch && matchStatus && matchApproval;
  });

  const approvalFilterOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'All Approval' }];

    if (isAdmin) {
      return [
        ...base,
        { value: 'draft', label: 'Draft' },
        { value: 'technical_review', label: 'Technical Review' },
        { value: 'accounting_review', label: 'Accounting Review' },
        { value: 'supervisor_review', label: 'Supervisor Review' },
        { value: 'superadmin_review', label: 'Superadmin Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'revision_requested', label: 'Revision Requested' },
        { value: 'rejected', label: 'Rejected' },
      ];
    }

    if (isSupervisor(currentUser?.role)) {
      return [
        ...base,
        { value: 'supervisor_review', label: 'Needs My Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'revision_requested', label: 'Revision Requested' },
        { value: 'rejected', label: 'Rejected' },
      ];
    }

    if (currentUser?.department === 'Accounting') {
      return [
        ...base,
        { value: 'accounting_review', label: 'Needs My Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'revision_requested', label: 'Revision Requested' },
        { value: 'rejected', label: 'Rejected' },
      ];
    }

    return [
      ...base,
      { value: 'draft', label: 'Draft' },
      { value: 'approved', label: 'Approved' },
      { value: 'revision_requested', label: 'Revision Requested' },
      { value: 'rejected', label: 'Rejected' },
    ];
  }, [currentUser?.department, currentUser?.role, isAdmin]);

  useEffect(() => {
    if (!approvalFilterOptions.some((opt) => opt.value === approvalFilter)) {
      setApprovalFilter('all');
    }
  }, [approvalFilterOptions, approvalFilter]);

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
      category: p.category || 'development',
      riskLevel: p.riskLevel || 'low',
      beneficiaryType: p.beneficiaryType || 'internal',
      beneficiaryName: p.beneficiaryName || '',
      contactPerson: p.contactPerson || '',
      contactEmail: p.contactEmail || '',
      contactPhone: p.contactPhone || '',
      location: p.location || '',
      objectives: p.objectives || '',
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
    setTaskActionError('');
    setTaskForm({ title: '', description: '', priority: 'medium', assignedTo: '', startDate: '', endDate: '', estimatedHours: '' });
    refreshTasks();
    refreshProjects();
    setModalMode('view');
  };
  const handleSave = async () => {
    setSaveError('');

    if (form.teamIds.length >= 2 && !form.leaderId) {
      setSaveError('Please select a project leader when assigning 2 or more team members.');
      return;
    }

    setSavingProject(true);
    if (modalMode === 'create') {
      try {
        const res = await apiFetch('/api/projects', {
          method: 'POST',
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
        const res = await apiFetch(`/api/projects/${selectedProject.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            status: form.status,
            priority: form.priority,
            category: form.category,
            risk_level: form.riskLevel,
            beneficiary_type: form.beneficiaryType,
            beneficiary_name: form.beneficiaryName,
            contact_person: form.contactPerson || null,
            contact_email: form.contactEmail || null,
            contact_phone: form.contactPhone || null,
            location: form.location || null,
            objectives: form.objectives,
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
    setPageError('');
    try {
      const res = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete project.');
      }
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to delete project.');
    }
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
    setTaskActionError('');
    try {
      const res = await apiFetch(`/api/tasks/${editingTaskId}`, {
        method: 'PUT',
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update task.');
      }
      const saved = await res.json();
      setTasks((prev) => prev.map((t) => t.id === editingTaskId ? saved : t));
      resetTaskForm();
    } catch (err) {
      setTaskActionError(err instanceof Error ? err.message : 'Failed to update task.');
    }
  };
  const handleAddTask = async () => {
    if (!selectedProject || !taskForm.title) return;
    setTaskActionError('');
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to create task.');
      }
      const saved = await res.json();
      setTasks((prev) => [saved, ...prev]);
      resetTaskForm();
    } catch (err) {
      setTaskActionError(err instanceof Error ? err.message : 'Failed to create task.');
    }
  };
  const handleDeleteTask = async (taskId: string) => {
    setTaskActionError('');
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to delete task.');
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setTaskActionError(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  };
  const handleApprovalConfirm = async (notes: string) => {
    if (!approvalProject || !approvalAction) return;
    const res = await apiFetch(`/api/projects/${approvalProject.id}/approval`, {
      method: 'POST',
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
    try {
      const res = await apiFetch(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => p.id === id ? updated : p));
      } else {
        alert('Failed to archive project. Please try again.');
      }
    } catch {
      alert('Network error. Could not archive project.');
    }
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

  const formatTimelineRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { range: 'N/A', meta: '' };
    }

    const range = `${formatDateShort(start)} - ${formatDateShort(end)}`;
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    const meta = `${days} day${days === 1 ? '' : 's'}`;
    return { range, meta };
  };
  const budgetWarningTotalExceeded = budgetWarningProjects.reduce(
    (sum, project) => sum + Math.max(project.spent - project.budget, 0),
    0,
  );
  const projectTasks = (projectId: string) =>
  tasks.filter((t) => t.projectId === projectId);
  if (isLoading) return <LoadingSpinner message="Loading data..." />;
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
            options={approvalFilterOptions}
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<DownloadIcon size={14} />}
            onClick={() => {
              const headers = ['Name', 'Status', 'Priority', 'Category', 'Approval', 'Budget', 'Spent', 'Progress', 'Start Date', 'End Date'];
              const rows = filtered.map((p) => [
                p.name, p.status, p.priority, p.category || '', p.approvalStatus || '', String(p.budget), String(p.spent),
                String(Math.round((tasks.filter((t) => t.projectId === p.id && t.status === 'completed').length / Math.max(tasks.filter((t) => t.projectId === p.id).length, 1)) * 100)),
                p.startDate, p.endDate,
              ]);
              downloadCsv('projects', headers, rows);
            }}
          >
            Export CSV
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              icon={<PlusIcon size={14} />}
              onClick={openCreate}>
              New Project
            </Button>
          )}
        </div>
      </div>

      {pageError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {pageError}
        </div>
      )}

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

              {/* Timestamps */}
              <div className="flex items-center gap-3 text-xs dark:text-dark-subtle text-light-subtle">
                <span className="flex items-center gap-1" title="Created">
                  <CalendarIcon size={11} />
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {project.updatedAt && project.updatedAt !== project.createdAt && (
                  <span className="flex items-center gap-1" title="Last updated">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                )}
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
                const actions: { action: string; label: string; variant: string }[] = [];

                // Accounting step: accounting users (or admins) can approve/reject/request revision
                if (as === 'accounting_review' && (currentUser?.department === 'Accounting' || isAdmin)) {
                  actions.push({ action: 'approve_accounting', label: 'Approve (Accounting)', variant: 'primary' });
                  actions.push({ action: 'request_revision', label: 'Request Revision', variant: 'secondary' });
                  actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
                }

                // Supervisor step: supervisors (or admins) can approve/reject/request revision
                if (as === 'supervisor_review' && (isSupervisor(currentUser?.role) || isAdmin)) {
                  actions.push({ action: 'approve_supervisor', label: 'Approve (Supervisor)', variant: 'primary' });
                  actions.push({ action: 'request_revision', label: 'Request Revision', variant: 'secondary' });
                  actions.push({ action: 'reject', label: 'Reject', variant: 'danger' });
                }

                // Superadmin step: admins can give final approval
                if (as === 'superadmin_review' && isAdmin) {
                  actions.push({ action: 'approve_superadmin', label: 'Approve (Superadmin)', variant: 'primary' });
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
        size="lg"
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
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                { value: 'development', label: 'Development' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'research', label: 'Research' },
                { value: 'infrastructure', label: 'Infrastructure' },
                { value: 'consultation', label: 'Consultation' },
              ]}
            />
            <Select
              label="Risk Level"
              value={form.riskLevel}
              onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>

          {/* Stakeholder Info */}
          <div className="pt-2 border-t dark:border-dark-border border-light-border">
            <p className="text-xs font-semibold dark:text-dark-muted text-light-muted uppercase tracking-wider mb-3">Stakeholder Info</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Beneficiary Type"
                  value={form.beneficiaryType}
                  onChange={(e) => setForm({ ...form, beneficiaryType: e.target.value })}
                  options={[
                    { value: 'internal', label: 'Internal' },
                    { value: 'external', label: 'External' },
                  ]}
                />
                <Input
                  label="Beneficiary Name"
                  placeholder="e.g. IT Department"
                  value={form.beneficiaryName}
                  onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Contact Person"
                  placeholder="Full name"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
                <Input
                  label="Contact Email"
                  type="email"
                  placeholder="email@example.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  placeholder="+63..."
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                />
              </div>
              <Input
                label="Location / Address"
                placeholder="Project location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Textarea
                label="Objectives"
                placeholder="Project goals and objectives..."
                value={form.objectives}
                onChange={(e) => setForm({ ...form, objectives: e.target.value })}
              />
            </div>
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
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={selectedProject.status} />
              <PriorityBadge priority={selectedProject.priority} />
              {selectedProject.category && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-400 capitalize">
                  {selectedProject.category}
                </span>
              )}
              {selectedProject.riskLevel && selectedProject.riskLevel !== 'low' && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${selectedProject.riskLevel === 'high' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                  Risk: {selectedProject.riskLevel.charAt(0).toUpperCase() + selectedProject.riskLevel.slice(1)}
                </span>
              )}
            </div>

            {/* Stakeholder & Project Details */}
            {(selectedProject.beneficiaryName || selectedProject.objectives || selectedProject.location) && (
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3 space-y-2">
                {selectedProject.beneficiaryName && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs dark:text-dark-subtle text-light-subtle min-w-[80px]">Beneficiary</span>
                    <span className="text-sm dark:text-dark-text text-light-text">
                      {selectedProject.beneficiaryName}
                      {selectedProject.beneficiaryType && (
                        <span className="text-xs dark:text-dark-subtle text-light-subtle ml-1">({selectedProject.beneficiaryType})</span>
                      )}
                    </span>
                  </div>
                )}
                {(selectedProject.contactPerson || selectedProject.contactEmail || selectedProject.contactPhone) && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs dark:text-dark-subtle text-light-subtle min-w-[80px]">Contact</span>
                    <span className="text-sm dark:text-dark-text text-light-text">
                      {[selectedProject.contactPerson, selectedProject.contactEmail, selectedProject.contactPhone].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}
                {selectedProject.location && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs dark:text-dark-subtle text-light-subtle min-w-[80px]">Location</span>
                    <span className="text-sm dark:text-dark-text text-light-text">{selectedProject.location}</span>
                  </div>
                )}
                {selectedProject.objectives && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs dark:text-dark-subtle text-light-subtle min-w-[80px]">Objectives</span>
                    <span className="text-sm dark:text-dark-text text-light-text whitespace-pre-line">{selectedProject.objectives}</span>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <div className="text-xs dark:text-dark-subtle text-light-subtle mb-1">
                  Timeline
                </div>
                {(() => {
                  const timeline = formatTimelineRange(selectedProject.startDate, selectedProject.endDate);
                  return (
                    <>
                      <div className="text-sm dark:text-dark-text text-light-text font-medium">
                        {timeline.range}
                      </div>
                      {timeline.meta && (
                        <div className="text-xs dark:text-dark-subtle text-light-subtle mt-1">
                          Duration: {timeline.meta}
                        </div>
                      )}
                    </>
                  );
                })()}
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
                  {taskActionError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                      {taskActionError}
                    </div>
                  )}
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
                      {taskActionError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                          {taskActionError}
                        </div>
                      )}
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
                          onClick={() => setTaskActivityTarget({ id: task.id, title: task.title })}
                          className="p-1 rounded dark:text-dark-muted dark:hover:bg-dark-card dark:hover:text-green-primary text-light-muted hover:bg-light-card hover:text-green-primary transition-colors"
                          title="View activity"
                        >
                          <ActivityIcon size={12} />
                        </button>
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

      {/* Task Activity Timeline Modal */}
      <Modal
        isOpen={!!taskActivityTarget}
        onClose={() => setTaskActivityTarget(null)}
        title={taskActivityTarget ? `Activity — ${taskActivityTarget.title}` : 'Task Activity'}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setTaskActivityTarget(null)}>
            Close
          </Button>
        }>
        {taskActivityTarget && (
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <TaskActivityTimeline taskId={taskActivityTarget.id} />
          </div>
        )}
      </Modal>
    </div>);

}