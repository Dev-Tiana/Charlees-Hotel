import { RoleSlug } from '@/lib/types';

export type PermissionCode =
  | 'dashboard:view'
  | 'reservations:view'
  | 'reservations:manage'
  | 'reservations:cancel_override'
  | 'cancellations:view'
  | 'cancellations:review'
  | 'rooms:view'
  | 'rooms:manage'
  | 'availability:view'
  | 'rates:manage'
  | 'housekeeping:view'
  | 'housekeeping:manage'
  | 'maintenance:view'
  | 'maintenance:manage'
  | 'payments:view'
  | 'payments:verify'
  | 'refunds:view'
  | 'refunds:approve'
  | 'refunds:process'
  | 'chat:view'
  | 'chat:reply'
  | 'media:manage'
  | 'staff:manage'
  | 'audit:view'
  | 'reports:view'
  | 'settings:manage';

const ROLE_PERMISSIONS: Record<RoleSlug, PermissionCode[]> = {
  owner: [
    'dashboard:view',
    'reservations:view',
    'reservations:manage',
    'reservations:cancel_override',
    'cancellations:view',
    'cancellations:review',
    'rooms:view',
    'rooms:manage',
    'availability:view',
    'rates:manage',
    'housekeeping:view',
    'housekeeping:manage',
    'maintenance:view',
    'maintenance:manage',
    'payments:view',
    'payments:verify',
    'refunds:view',
    'refunds:approve',
    'refunds:process',
    'chat:view',
    'chat:reply',
    'media:manage',
    'staff:manage',
    'audit:view',
    'reports:view',
    'settings:manage',
  ],
  administrator: [
    'dashboard:view',
    'reservations:view',
    'reservations:manage',
    'reservations:cancel_override',
    'cancellations:view',
    'cancellations:review',
    'rooms:view',
    'rooms:manage',
    'availability:view',
    'rates:manage',
    'housekeeping:view',
    'housekeeping:manage',
    'maintenance:view',
    'maintenance:manage',
    'payments:view',
    'payments:verify',
    'refunds:view',
    'refunds:approve',
    'refunds:process',
    'chat:view',
    'chat:reply',
    'media:manage',
    'staff:manage',
    'audit:view',
    'reports:view',
    'settings:manage',
  ],
  manager: [
    'dashboard:view',
    'reservations:view',
    'reservations:manage',
    'reservations:cancel_override',
    'cancellations:view',
    'cancellations:review',
    'rooms:view',
    'rooms:manage',
    'availability:view',
    'rates:manage',
    'housekeeping:view',
    'housekeeping:manage',
    'maintenance:view',
    'maintenance:manage',
    'payments:view',
    'payments:verify',
    'refunds:view',
    'refunds:approve',
    'refunds:process',
    'chat:view',
    'chat:reply',
    'media:manage',
    'audit:view',
    'reports:view',
  ],
  receptionist: [
    'dashboard:view',
    'reservations:view',
    'reservations:manage',
    'cancellations:view',
    'rooms:view',
    'availability:view',
    'housekeeping:view',
    'maintenance:view',
    'maintenance:manage',
    'payments:view',
    'refunds:view',
    'chat:view',
    'chat:reply',
  ],
  accountant: [
    'dashboard:view',
    'reservations:view',
    'cancellations:view',
    'availability:view',
    'payments:view',
    'payments:verify',
    'refunds:view',
    'refunds:approve',
    'refunds:process',
    'audit:view',
    'reports:view',
  ],
  housekeeping: [
    'dashboard:view',
    'rooms:view',
    'housekeeping:view',
    'housekeeping:manage',
    'maintenance:view',
    'maintenance:manage',
  ],
};

export function roleHasPermission(role: RoleSlug, permission: PermissionCode): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleLabel(role: RoleSlug): string {
  const labels: Record<RoleSlug, string> = {
    owner: 'Owner',
    administrator: 'Administrator',
    manager: 'Manager',
    receptionist: 'Receptionist',
    accountant: 'Accountant',
    housekeeping: 'Housekeeping',
  };
  return labels[role] || role;
}
