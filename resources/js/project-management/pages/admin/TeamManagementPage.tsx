import React, { useState } from 'react';
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  UserCheckIcon,
  UserXIcon,
  KeyIcon,
  ClipboardCopyIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ShieldIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { User } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { isSuperadmin } from '../../utils/roles';
export function TeamManagementPage() {
  const { users, setUsers } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<{ code: string; name: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Employee',
    position: '',
    status: 'active'
  });

  // Department options for the dropdown
  const DEPARTMENTS: { value: string; label: string }[] = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Accounting', label: 'Accounting' },
    { value: 'Technical', label: 'Technical' },
    { value: 'Employee', label: 'Employee' },
  ];
  const filtered = users.filter((u) => {
    const matchSearch =
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  const openCreate = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: 'Employee',
      position: '',
      status: 'active'
    });
    setModalMode('create');
  };
  const openEdit = (u: User) => {
    setSelectedUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      department: u.department,
      position: u.position,
      status: u.status
    });
    setModalMode('edit');
  };
  const handleSave = async () => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    if (modalMode === 'create') {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            department: form.department,
            position: form.position,
            status: form.status,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newUser: User = data;
          setUsers((prev) => [...prev, newUser]);
          // Show recovery code to admin
          if (data.recovery_code) {
            setRecoveryInfo({ code: data.recovery_code, name: data.name || form.name, id: data.id || '' });
          }
        }
      } catch { /* network error — silent fail */ }
    } else if (modalMode === 'edit' && selectedUser) {
      try {
        const res = await fetch(`/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            ...(form.password ? { password: form.password } : {}),
            role: form.role,
            department: form.department,
            position: form.position,
            status: form.status,
          }),
        });
        if (res.ok) {
          const updated: User = await res.json();
          setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? updated : u));
        }
      } catch { /* network error — silent fail */ }
    }
    setModalMode(null);
  };
  const handleDelete = async (id: string) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      });
    } catch { /* silent */ }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteConfirm(null);
  };
  const toggleStatus = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* silent */ }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: newStatus } : u
      )
    );
  };
  const handleRegenerate = async (id: string, name: string) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    try {
      const res = await fetch(`/api/users/${id}/regenerate-recovery`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': csrfToken },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recovery_code) {
          setRecoveryInfo({ code: data.recovery_code, name: data.user_name || name, id: data.user_id || id });
        }
      }
    } catch { /* silent */ }
  };
  const DEPT_COLORS: Record<string, string> = {
    Admin: '#154734',
    Accounting: '#f59e0b',
    Technical: '#3b82f6',
    Employee: '#63D44A',
    // Legacy fallbacks
    Engineering: '#63D44A',
    Development: '#1FAF8E',
    Design: '#8b5cf6',
    QA: '#f59e0b',
    Backend: '#3b82f6'
  };
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<SearchIcon size={14} />} />

          </div>
          <Select
            options={[
            {
              value: 'all',
              label: 'All Roles'
            },
            {
              value: 'superadmin',
              label: 'Superadmin'
            },
            {
              value: 'supervisor',
              label: 'Supervisor'
            },
            {
              value: 'employee',
              label: 'Employee'
            }]
            }
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-36" />

        </div>
        <Button
          variant="primary"
          icon={<PlusIcon size={14} />}
          onClick={openCreate}>

          Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold dark:text-dark-text text-light-text">
            {users.length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Total Members
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold text-green-primary">
            {users.filter((u) => u.status === 'active').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Active
          </div>
        </div>
        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card p-4">
          <div className="text-2xl font-bold dark:text-dark-muted text-light-muted">
            {users.filter((u) => u.status === 'inactive').length}
          </div>
          <div className="text-xs dark:text-dark-muted text-light-muted mt-0.5">
            Inactive
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="dark:border-dark-border border-b border-light-border">
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  ID
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Employee
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Department
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Joined
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium dark:text-dark-muted text-light-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-dark-border divide-light-border">
              {filtered.map((user) =>
              <tr key={user.id} className="table-row-hover">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-mono dark:text-dark-muted text-light-muted">
                      {user.id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={user.name}
                        avatarText={user.avatar}
                        profilePhoto={user.profilePhoto}
                        className="w-8 h-8"
                        textClassName="text-xs font-bold text-black"
                        fallbackStyle={{ backgroundColor: DEPT_COLORS[user.department] || '#63D44A' }}
                      />
                      <div>
                        <p className="text-sm font-medium dark:text-dark-text text-light-text">
                          {user.name}
                        </p>
                        <p className="text-xs dark:text-dark-subtle text-light-subtle">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm dark:text-dark-text text-light-text">
                        {user.department}
                      </p>
                      <p className="text-xs dark:text-dark-subtle text-light-subtle">
                        {user.position}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                    variant={isSuperadmin(user.role) ? 'success' : user.role === 'supervisor' ? 'purple' : 'info'}
                    size="sm">

                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm dark:text-dark-muted text-light-muted">
                      {user.joinDate}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                      onClick={() => toggleStatus(user.id)}
                      className={`p-1.5 rounded transition-colors ${user.status === 'active' ? 'dark:text-dark-muted dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400 text-light-muted hover:bg-yellow-50 hover:text-yellow-500' : 'dark:text-dark-muted dark:hover:bg-green-primary/10 dark:hover:text-green-primary text-light-muted hover:bg-green-50 hover:text-green-600'}`}
                      title={
                      user.status === 'active' ? 'Deactivate' : 'Activate'
                      }>

                        {user.status === 'active' ?
                      <UserXIcon size={13} /> :

                      <UserCheckIcon size={13} />
                      }
                      </button>
                      <button
                      onClick={() => openEdit(user)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-green-primary text-light-muted hover:bg-light-card2 transition-colors"
                      title="Edit">

                        <EditIcon size={13} />
                      </button>
                      <button
                      onClick={() => handleRegenerate(user.id, user.name)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-blue-500/10 dark:hover:text-blue-400 text-light-muted hover:bg-blue-50 hover:text-blue-500 transition-colors"
                      title="Regenerate Recovery Code">

                      <KeyIcon size={13} />
                      </button>
                      {(() => {
                        // Find the primary superadmin (lowest ID among superadmins)
                        const primaryAdminId = users
                          .filter((u) => isSuperadmin(u.role))
                          .reduce((min, u) => {
                            const uid = parseInt(u.id, 10);
                            const mid = parseInt(min, 10);
                            return uid < mid ? u.id : min;
                          }, '999999999');
                        return user.id === primaryAdminId ? (
                          <span
                            className="p-1.5 rounded dark:text-green-400 text-green-600 cursor-default"
                            title="Primary Superadmin — cannot be deleted">
                            <ShieldIcon size={13} />
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete">
                            <TrashIcon size={13} />
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Add Employee' : 'Edit Employee'}
        size="md"
        footer={
        <>
            <Button variant="secondary" onClick={() => setModalMode(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {modalMode === 'create' ? 'Add Employee' : 'Save Changes'}
            </Button>
          </>
        }>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value
              })
              } />

            <Input
              label="Email"
              type="email"
              placeholder="john@maptech.com"
              value={form.email}
              onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value
              })
              } />

          </div>
          <Input
            label={modalMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
            type="password"
            placeholder={modalMode === 'create' ? 'Enter password' : 'Leave blank to keep current'}
            value={form.password}
            onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value
            })
            }
            required={modalMode === 'create'} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              value={form.department}
              onChange={(e) =>
              setForm({
                ...form,
                department: e.target.value
              })
              }
              options={DEPARTMENTS} />

            <Input
              label="Position"
              placeholder="Senior Developer"
              value={form.position}
              onChange={(e) =>
              setForm({
                ...form,
                position: e.target.value
              })
              } />

          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              value={form.role}
              onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value
              })
              }
              options={[
              {
                value: 'employee',
                label: 'Employee'
              },
              {
                value: 'supervisor',
                label: 'Supervisor'
              },
              {
                value: 'superadmin',
                label: 'Superadmin'
              }]
              } />

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
                value: 'inactive',
                label: 'Inactive'
              }]
              } />

          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Employee"
        size="sm"
        footer={
        <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
            variant="danger"
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>

              Remove
            </Button>
          </>
        }>

        <p className="text-sm dark:text-dark-muted text-light-muted">
          Are you sure you want to remove this employee? This action cannot be
          undone.
        </p>
      </Modal>

      {/* Recovery Code Display Modal */}
      <Modal
        isOpen={!!recoveryInfo}
        onClose={() => { setRecoveryInfo(null); setCopied(false); }}
        title="Recovery Code"
        size="sm">
        {recoveryInfo && (
          <div>
            <div className="flex flex-col items-center mb-4">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
                <ShieldCheckIcon size={28} className="text-green-400" />
              </div>
              <p className="text-sm dark:text-dark-text text-light-text text-center font-medium">
                Recovery Code for {recoveryInfo.name}
              </p>
              <p className="text-xs dark:text-dark-muted text-light-muted mt-1 text-center">
                Employee ID: <span className="font-mono font-semibold">{recoveryInfo.id}</span>
              </p>
              <p className="text-xs text-red-400 font-semibold mt-2 text-center">
                Save this now — it will not be shown again.
              </p>
            </div>
            <div className="mb-4 p-3 rounded-lg dark:bg-dark-card2 bg-gray-50 border dark:border-dark-border border-light-border">
              <p className="text-xs dark:text-dark-muted text-light-muted mb-1 uppercase tracking-wide font-semibold">
                Recovery Code
              </p>
              <p className="text-sm font-mono dark:text-green-400 text-green-600 break-all select-all leading-relaxed">
                {recoveryInfo.code}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(recoveryInfo.code).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-btn text-sm font-medium dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/50 bg-gray-100 border border-light-border text-light-text hover:bg-gray-200 transition-colors">
              {copied ? (
                <><CheckCircleIcon size={15} className="text-green-400" /> Copied!</>
              ) : (
                <><ClipboardCopyIcon size={15} /> Copy Code</>
              )}
            </button>
            <Button variant="primary" fullWidth onClick={() => { setRecoveryInfo(null); setCopied(false); }}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>);

}