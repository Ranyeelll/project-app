function normalizeRole(role?: string | null): string {
  return (role || '').trim().toLowerCase();
}

export function isSuperadmin(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'superadmin' || normalized === 'admin';
}

export function isSupervisor(role?: string | null): boolean {
  return normalizeRole(role) === 'supervisor';
}

export function isElevatedRole(role?: string | null): boolean {
  return isSuperadmin(role) || isSupervisor(role);
}

export function isEmployeeRole(role?: string | null): boolean {
  return normalizeRole(role) === 'employee';
}
