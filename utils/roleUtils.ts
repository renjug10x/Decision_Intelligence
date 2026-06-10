import type { Role } from '@/lib/context';
import { UserRole } from '@/types/auth';

export function normalizeRole(role: string | UserRole | undefined | null): UserRole | null {
  if (role == null || role === '') return null;
  const upper = String(role).toUpperCase().replace(/[\s-]+/g, '_');
  if (Object.values(UserRole).includes(upper as UserRole)) {
    return upper as UserRole;
  }
  if (upper === 'CATEGORY' || upper === 'CM') return UserRole.CATEGORY_MANAGER;
  if (upper === 'STORE' || upper === 'SM') return UserRole.STORE_MANAGER;
  return UserRole.USER;
}

/**
 * Map API / normalized roles to the POC sidebar IAM `Role`.
 */
export function mapApiRoleToAppRole(role: string | UserRole | undefined | null): Role {
  const n = normalizeRole(role);
  switch (n) {
    case UserRole.CATEGORY_MANAGER:
      return 'category_manager';
    case UserRole.STORE_MANAGER:
      return 'store_manager';
    case UserRole.ADMIN:
    case UserRole.EXEC:
    case UserRole.USER:
    default:
      return 'exec';
  }
}
