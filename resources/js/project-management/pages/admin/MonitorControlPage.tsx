import React, { useState } from 'react';
import {
  AlertTriangleIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { Issue } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
export function MonitorControlPage() {
  const { projects, tasks, issues, setIssues, users } = useData();
  const [activeTab, setActiveTab] = useState<'overview' | 'raid'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Issue | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    assignedTo: ''
  });
  const openEdit = (issue: Issue) => {
    setEditModal(issue);
    setEditForm({
      status: issue.status,
      assignedTo: issue.assignedTo || ''
    });
  };
  const handleEditSave = () => {
    if (!editModal) return;
    setIssues((prev) =>
    prev.map((i) =>
    i.id === editModal.id ?
    {
      ...i,
      status: editForm.status as Issue['status'],
      assignedTo: editForm.assignedTo || undefined,
      updatedAt: new Date().toISOString().split('T')[0]
    } :
    i
    )
    );
    setEditModal(null);
  };
  const handleDelete = (id: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };
  const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(n);
  const TYPE_COLORS: Record<string, string> = {
    risk: 'danger',
    assumption: 'warning',
    issue: 'danger',
    dependency: 'info'
  };
  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 dark:bg-dark-card2 bg-light-card2 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'overview' ? 'dark:bg-dark-card bg-white dark:text-dark-text text-light-text shadow-sm' : 'dark:text-dark-muted text-light-muted'}`}>

          Project Overview
        </button>
        <button
          onClick={() => setActiveTab('raid')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'raid' ? 'dark:bg-dark-card bg-white dark:text-dark-text text-light-text shadow-sm' : 'dark:text-dark-muted text-light-muted'}`}>

          RAID Log
        </button>
      </div>

      {activeTab === 'overview' &&
      <div className="space-y-5">
          {/* EVM Analytics */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">
            <h2 className="text-sm font-semibold dark:text-dark-text text-light-text mb-4">
              Earned Value Analysis
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {projects.
            filter((p) => p.status === 'active').
            map((project) => {
              const EV = project.budget * (project.progress / 100);
              const PV = project.budget * 0.5;
              const AC = project.spent;
              const SV = EV - PV;
              const CV = EV - AC;
              return (
                <div
                  key={project.id}
                  className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">

                      <p className="text-xs font-medium dark:text-dark-text text-light-text mb-3 truncate">
                        {project.name}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            EV
                          </span>
                          <span
                        className="text-xs font-medium"
                        style={{
                          color: '#0E8F79'
                        }}>

                            {formatCurrency(EV)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            PV
                          </span>
                          <span className="text-xs font-medium dark:text-dark-muted text-light-muted">
                            {formatCurrency(PV)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs dark:text-dark-subtle text-light-subtle">
                            AC
                          </span>
                          <span className="text-xs font-medium dark:text-dark-muted text-light-muted">
                            {formatCurrency(AC)}
                          </span>
                        </div>
                        <div className="pt-2 dark:border-dark-border border-t border-light-border space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs dark:text-dark-subtle text-light-subtle">
                              SV
                            </span>
                            <span
                          className={`text-xs font-medium ${SV >= 0 ? 'text-green-primary' : 'text-red-400'}`}>

                              {SV >= 0 ? '+' : ''}
                              {formatCurrency(SV)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs dark:text-dark-subtle text-light-subtle">
                              CV
                            </span>
                            <span
                          className={`text-xs font-medium ${CV >= 0 ? 'text-green-primary' : 'text-red-400'}`}>

                              {CV >= 0 ? '+' : ''}
                              {formatCurrency(CV)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>);

            })}
            </div>
          </div>

          {/* Project health */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
            <div className="px-5 py-4 dark:border-dark-border border-b border-light-border">
              <h2 className="text-sm font-semibold dark:text-dark-text text-light-text">
                Project Health Overview
              </h2>
            </div>
            <div className="divide-y dark:divide-dark-border divide-light-border">
              {projects.
            filter((p) => p.status !== 'archived').
            map((project) => {
              const ptasks = tasks.filter((t) => t.projectId === project.id);
              const completed = ptasks.filter(
                (t) => t.status === 'completed'
              ).length;
              const budgetPct = Math.round(
                project.spent / project.budget * 100
              );
              const health =
              project.progress >= budgetPct - 10 ?
              'on-track' :
              project.progress >= budgetPct - 25 ?
              'at-risk' :
              'critical';
              return (
                <div
                  key={project.id}
                  className="px-5 py-4 flex items-center gap-4">

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                            {project.name}
                          </p>
                          <Badge
                        variant={
                        health === 'on-track' ?
                        'success' :
                        health === 'at-risk' ?
                        'warning' :
                        'danger'
                        }
                        dot>

                            {health === 'on-track' ?
                        'On Track' :
                        health === 'at-risk' ?
                        'At Risk' :
                        'Critical'}
                          </Badge>
                        </div>
                        <ProgressBar
                      value={project.progress}
                      size="sm"
                      showLabel
                      animated />

                      </div>
                      <div className="hidden md:grid grid-cols-3 gap-6 flex-shrink-0">
                        <div className="text-center">
                          <div className="text-sm font-bold dark:text-dark-text text-light-text">
                            {ptasks.length}
                          </div>
                          <div className="text-xs dark:text-dark-subtle text-light-subtle">
                            Tasks
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-primary">
                            {completed}
                          </div>
                          <div className="text-xs dark:text-dark-subtle text-light-subtle">
                            Done
                          </div>
                        </div>
                        <div className="text-center">
                          <div
                        className={`text-sm font-bold ${budgetPct > 90 ? 'text-red-400' : 'dark:text-dark-text text-light-text'}`}>

                            {budgetPct}%
                          </div>
                          <div className="text-xs dark:text-dark-subtle text-light-subtle">
                            Budget
                          </div>
                        </div>
                      </div>
                    </div>);

            })}
            </div>
          </div>
        </div>
      }

      {activeTab === 'raid' &&
      <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm dark:text-dark-muted text-light-muted">
              {issues.length} total entries
            </p>
          </div>

          {issues.map((issue) => {
          const project = projects.find((p) => p.id === issue.projectId);
          const reporter = users.find((u) => u.id === issue.reportedBy);
          const assignee = users.find((u) => u.id === issue.assignedTo);
          return (
            <div
              key={issue.id}
              className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-5">

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={TYPE_COLORS[issue.type] as any}>
                        {issue.type.toUpperCase()}
                      </Badge>
                      <PriorityBadge priority={issue.severity} />
                      <StatusBadge status={issue.status} />
                    </div>
                    <h3 className="text-sm font-medium dark:text-dark-text text-light-text mt-2">
                      {issue.title}
                    </h3>
                    <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                      {issue.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs dark:text-dark-subtle text-light-subtle">
                      <span>{project?.name}</span>
                      <span>·</span>
                      <span>Reported by {reporter?.name}</span>
                      {assignee &&
                    <>
                          <span>·</span>
                          <span>Assigned to {assignee.name}</span>
                        </>
                    }
                      <span>·</span>
                      <span>{issue.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                    onClick={() => openEdit(issue)}
                    className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors"
                    title="Edit">

                      <EditIcon size={13} />
                    </button>
                    <button
                    onClick={() => setDeleteConfirm(issue.id)}
                    className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete">

                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              </div>);

        })}
        </div>
      }

      {/* Edit Issue Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Update Issue"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSave}>
              Save
            </Button>
          </>
        }>

        <div className="space-y-4">
          <Select
            label="Status"
            value={editForm.status}
            onChange={(e) =>
            setEditForm({
              ...editForm,
              status: e.target.value
            })
            }
            options={[
            {
              value: 'open',
              label: 'Open'
            },
            {
              value: 'in-progress',
              label: 'In Progress'
            },
            {
              value: 'resolved',
              label: 'Resolved'
            },
            {
              value: 'closed',
              label: 'Closed'
            }]
            } />

          <Select
            label="Assign To"
            value={editForm.assignedTo}
            onChange={(e) =>
            setEditForm({
              ...editForm,
              assignedTo: e.target.value
            })
            }
            options={[
            {
              value: '',
              label: 'Unassigned'
            },
            ...users.map((u) => ({
              value: u.id,
              label: u.name
            }))]
            } />

        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Issue"
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
          Are you sure you want to delete this RAID log entry?
        </p>
      </Modal>
    </div>);

}