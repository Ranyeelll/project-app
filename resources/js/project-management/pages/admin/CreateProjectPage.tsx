import React, { useState } from 'react';
import { ArrowLeftIcon, DollarSignIcon, UsersIcon } from 'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';

interface FormData {
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  budget: string;
  teamIds: string[];
}

export function CreateProjectPage() {
  const { setCurrentPage } = useNavigation();
  const { users, setProjects, projects, refreshProjects } = useData();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    startDate: '',
    endDate: '',
    budget: '',
    teamIds: []
  });

  const selectedCount = form.teamIds.length;
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          status: form.status,
          priority: form.priority,
          start_date: form.startDate,
          end_date: form.endDate,
          budget: form.budget ? parseInt(form.budget) : null,
          team_ids: form.teamIds
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create project');
      }

      await refreshProjects();
      setCurrentPage('admin-projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPage('admin-projects');
  };

  const allTeamMembers = users.filter((u) => u.role === 'employee' && u.status === 'active');

  return (
    <div className="min-h-screen dark:bg-dark-bg bg-light-bg">
      {/* Header */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border-b border-light-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-lg hover:dark:bg-dark-card2 hover:bg-gray-100 transition-colors"
              title="Back to projects"
            >
              <ArrowLeftIcon size={20} className="dark:text-dark-muted text-light-muted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold dark:text-dark-text text-light-text">Create New Project</h1>
              <p className="text-sm dark:text-dark-subtle text-light-subtle mt-0.5">Set up a new project with details, settings and team members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 bg-red-50 border border-red-200 text-red-600">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Project Details Section */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold dark:text-dark-text text-light-text mb-1">Project Details</h2>
              <p className="text-sm dark:text-dark-subtle text-light-subtle">Basic information about the project</p>
            </div>

            <div className="space-y-4">
              <Input
                label="Project Name *"
                placeholder="e.g. GIS Platform Upgrade"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Textarea
                label="Description"
                placeholder="Describe the project objectives, scope, and expected outcomes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />

                <Input
                  label="End Date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>

              <Input
                label="Budget (PHP)"
                type="number"
                placeholder="e.g. 250000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                icon={<DollarSignIcon size={14} />}
              />
            </div>
          </div>

          {/* Project Settings Section */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold dark:text-dark-text text-light-text mb-1">Project Settings</h2>
              <p className="text-sm dark:text-dark-subtle text-light-subtle">Configure project status and priority</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'on-hold', label: 'On Hold' },
                  { value: 'completed', label: 'Completed' }
                ]}
              />

              <Select
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' }
                ]}
              />
            </div>
          </div>

          {/* Team Members Section */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">Team Members</h2>
                {selectedCount > 0 && (
                  <span className="text-sm font-medium dark:text-dark-muted text-light-muted">
                    {selectedCount} selected
                  </span>
                )}
              </div>
              <p className="text-sm dark:text-dark-subtle text-light-subtle">Select team members to be part of this project</p>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto dark:bg-dark-bg bg-gray-50 rounded-lg border dark:border-dark-border border-light-border p-3">
              {allTeamMembers.length === 0 ? (
                <div className="py-8 text-center dark:text-dark-subtle text-light-subtle">
                  <UsersIcon size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No team members available</p>
                </div>
              ) : (
                allTeamMembers.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:dark:bg-dark-card2/50 hover:bg-white cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.teamIds.includes(u.id)}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          teamIds: e.target.checked
                            ? [...prev.teamIds, u.id]
                            : prev.teamIds.filter((id) => id !== u.id),
                        }));
                      }}
                      className="rounded border-gray-400 text-green-primary focus:ring-green-primary cursor-pointer"
                    />
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: '#63D44A' }}
                    >
                      {u.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-dark-text text-light-text truncate font-medium">{u.name}</p>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">{u.position}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={loading}
            >
              Create Project
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
