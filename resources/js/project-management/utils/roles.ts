export function isSuperadmin(role?: string | null): boolean {
  return (role || '').toLowerCase() === 'superadmin' || (role || '').toLowerCase() === 'admin';
}

export function isSupervisor(role?: string | null): boolean {
  return (role || '').toLowerCase() === 'supervisor';
}

export function isElevatedRole(role?: string | null): boolean {
  return isSuperadmin(role) || isSupervisor(role);
}

export function isEmployeeRole(role?: string | null): boolean {
  return (role || '').toLowerCase() === 'employee';
}
