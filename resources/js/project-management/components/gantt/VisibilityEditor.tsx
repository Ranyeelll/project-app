import React from 'react';
import { User } from '../../data/mockData';

interface VisibilityEditorProps {
  visibleToRoles: string[];
  visibleToUsers: string[];
  teamUsers: User[];
  onChange: (roles: string[], users: string[]) => void;
}

const DEPT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Technical', label: 'Technical' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Employee', label: 'Employee' },
];

export function VisibilityEditor({
  visibleToRoles,
  visibleToUsers,
  teamUsers,
  onChange,
}: VisibilityEditorProps) {
  const toggleRole = (role: string) => {
    const next = visibleToRoles.includes(role)
      ? visibleToRoles.filter((r) => r !== role)
      : [...visibleToRoles, role];
    onChange(next, visibleToUsers);
  };

  const toggleUser = (userId: string) => {
    const next = visibleToUsers.includes(userId)
      ? visibleToUsers.filter((u) => u !== userId)
      : [...visibleToUsers, userId];
    onChange(visibleToRoles, next);
  };

  const isEmpty = visibleToRoles.length === 0 && visibleToUsers.length === 0;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
          Visible to departments
        </p>
        <div className="flex flex-wrap gap-2">
          {DEPT_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleToRoles.includes(value)}
                onChange={() => toggleRole(value)}
                className="w-3.5 h-3.5 rounded accent-green-500"
              />
              <span className="text-xs dark:text-dark-muted text-light-muted">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {teamUsers.length > 0 && (
        <div>
          <p className="text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
            Visible to specific users
          </p>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {teamUsers.map((u) => (
              <label key={u.id} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToUsers.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="w-3.5 h-3.5 rounded accent-green-500"
                />
                <span className="text-xs dark:text-dark-muted text-light-muted">{u.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <p className={`text-[10px] italic ${isEmpty ? 'text-green-primary' : 'dark:text-dark-subtle text-light-subtle'}`}>
        {isEmpty
          ? 'No restrictions — visible to everyone.'
          : 'Only the selected departments/users can see this item.'}
      </p>
    </div>
  );
}
