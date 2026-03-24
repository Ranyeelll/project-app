import React, { useMemo, useState } from 'react';
import { ArrowLeftIcon, CalendarIcon, DollarSignIcon, ListChecksIcon, UsersIcon } from 'lucide-react';
import { useData, useAuth, useNavigation } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/Input';
import { UserAvatar } from '../../components/ui/UserAvatar';

interface FormData {
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  budget: string;
  teamIds: string[];
  leaderId: string;
}

export function CreateProjectPage() {
  const { setCurrentPage } = useNavigation();
  const { users, refreshProjects } = useData();
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
    teamIds: [],
    leaderId: ''
  });

  const selectedCount = form.teamIds.length;
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const selectedTeamMembers = useMemo(
    () => users.filter((u) => form.teamIds.includes(u.id)),
    [users, form.teamIds]
  );

  const leaderName = useMemo(
    () => selectedTeamMembers.find((u) => u.id === form.leaderId)?.name || 'Not selected',
    [selectedTeamMembers, form.leaderId]
  );

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'Project name is required.';
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      return 'End date cannot be earlier than start date.';
    }

    if (form.budget) {
      const budget = Number(form.budget);
      if (Number.isNaN(budget) || budget < 0) {
        return 'Budget must be a valid non-negative number.';
      }
    }

    if (form.teamIds.length >= 2 && !form.leaderId) {
      return 'Please select a project leader when assigning 2 or more team members.';
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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
          start_date: form.startDate || null,
          end_date: form.endDate || null,
          budget: form.budget ? Number(form.budget) : null,
          manager_id: currentUser?.id || null,
          team_ids: form.teamIds,
          leader_id: form.leaderId || null,
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
    <div className="w-full pb-8">
      {/* Header */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
              <p className="text-sm dark:text-dark-subtle text-light-subtle mt-0.5">Use this form to add a project that aligns with your current project workflow.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        {error && (
          <div className="xl:col-span-2 p-4 rounded-lg dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 bg-red-50 border border-red-200 text-red-600">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Project Details Section */}
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold dark:text-dark-text text-light-text mb-1">Project Information</h2>
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
                label="Description *"
                placeholder="Describe the project objectives, scope, and expected outcomes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

              <Input
                label="Project Manager"
                value={currentUser?.name || 'Current user'}
                disabled
                hint="Automatically set to the user creating this project."
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
                hint="Optional. Leave blank if budget is not yet finalized."
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
                  { value: 'completed', label: 'Completed' },
                  { value: 'archived', label: 'Archived' },
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
                      className="rounded border-gray-400 text-green-primary focus:ring-green-primary cursor-pointer"
                    />
                    <UserAvatar
                      name={u.name}
                      avatarText={u.avatar}
                      profilePhoto={u.profilePhoto}
                      className="w-7 h-7"
                      textClassName="text-xs font-bold text-black"
                      fallbackStyle={{ backgroundColor: '#63D44A' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-dark-text text-light-text truncate font-medium">{u.name}</p>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">{u.position}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {form.teamIds.length >= 2 && (
              <div className="mt-4">
                <Select
                  label="Project Leader *"
                  value={form.leaderId}
                  onChange={(e) => setForm((prev) => ({ ...prev, leaderId: e.target.value }))}
                  options={[
                    { value: '', label: 'Select leader from assigned team' },
                    ...selectedTeamMembers.map((member) => ({ value: member.id, label: member.name })),
                  ]}
                />
                <p className="text-xs dark:text-dark-muted text-light-muted mt-1">
                  Only the selected leader can update project progress when this project has multiple members.
                </p>
              </div>
            )}
          </div>

          <div className="xl:hidden flex items-center justify-end gap-3 pb-2">
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={loading}>Create Project</Button>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg p-5 sticky top-20">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-4">Form Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <ListChecksIcon size={14} className="mt-0.5 dark:text-dark-muted text-light-muted" />
                <div>
                  <p className="dark:text-dark-subtle text-light-subtle">Project Name</p>
                  <p className="font-medium dark:text-dark-text text-light-text">{form.name.trim() || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CalendarIcon size={14} className="mt-0.5 dark:text-dark-muted text-light-muted" />
                <div>
                  <p className="dark:text-dark-subtle text-light-subtle">Timeline</p>
                  <p className="font-medium dark:text-dark-text text-light-text">
                    {form.startDate || 'Start not set'} - {form.endDate || 'End not set'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSignIcon size={14} className="mt-0.5 dark:text-dark-muted text-light-muted" />
                <div>
                  <p className="dark:text-dark-subtle text-light-subtle">Budget</p>
                  <p className="font-medium dark:text-dark-text text-light-text">{form.budget ? `PHP ${Number(form.budget).toLocaleString()}` : 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <UsersIcon size={14} className="mt-0.5 dark:text-dark-muted text-light-muted" />
                <div>
                  <p className="dark:text-dark-subtle text-light-subtle">Team</p>
                  <p className="font-medium dark:text-dark-text text-light-text">{selectedCount} member{selectedCount === 1 ? '' : 's'}</p>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">Leader: {leaderName}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t dark:border-dark-border border-light-border space-y-2">
              <Button variant="primary" onClick={handleSave} loading={loading} className="w-full">Create Project</Button>
              <Button variant="secondary" onClick={handleCancel} className="w-full">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
