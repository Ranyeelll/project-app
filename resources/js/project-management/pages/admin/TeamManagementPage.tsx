import React, { useState } from 'react';
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  UserCheckIcon,
  UserXIcon } from
'lucide-react';
import { useData } from '../../context/AppContext';
import { User } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge } from '../../components/ui/Badge';
export function TeamManagementPage() {
  const { users, setUsers } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    position: '',
    status: 'active'
  });
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
      department: '',
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
          const newUser: User = await res.json();
          setUsers((prev) => [...prev, newUser]);
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
  const DEPT_COLORS: Record<string, string> = {
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
              value: 'admin',
              label: 'Admin'
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
      <div className="grid grid-cols-3 gap-4">
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
                    <div className="flex items-center gap-3">
                      <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                      style={{
                        backgroundColor:
                        DEPT_COLORS[user.department] || '#63D44A'
                      }}>

                        {user.avatar}
                      </div>
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
                    variant={user.role === 'admin' ? 'success' : 'info'}
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
                      onClick={() => setDeleteConfirm(user.id)}
                      className="p-1.5 rounded dark:text-dark-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 text-light-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="Delete">

                        <TrashIcon size={13} />
                      </button>
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
            <Input
              label="Department"
              placeholder="Engineering"
              value={form.department}
              onChange={(e) =>
              setForm({
                ...form,
                department: e.target.value
              })
              } />

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
                value: 'admin',
                label: 'Admin'
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
    </div>);

}