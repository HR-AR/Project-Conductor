/**
 * Permission Utilities - Helper functions for RBAC
 *
 * Provides utility functions for checking permissions and roles
 * outside of middleware context (e.g., in services or controllers).
 */

import {
  User,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  PermissionCheck,
  OwnershipCheck
} from '../models/permissions.model';
import logger from './logger';

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Check if a user has a specific permission
 *
 * @param userRole - User's role
 * @param permission - Permission to check
 * @returns True if user has the permission
 *
 * @example
 * if (hasPermission(user.role, Permission.BRD_APPROVE)) {
 *   // User can approve BRDs
 * }
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 *
 * @param userRole - User's role
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 *
 * @example
 * if (hasAnyPermission(user.role, [Permission.BRD_APPROVE, Permission.PRD_APPROVE])) {
 *   // User can approve BRDs or PRDs
 * }
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some(p => rolePermissions.includes(p));
}

/**
 * Check if a user has all of the specified permissions
 *
 * @param userRole - User's role
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 *
 * @example
 * if (hasAllPermissions(user.role, [Permission.SYSTEM_ADMIN, Permission.USER_DELETE])) {
 *   // User can delete users
 * }
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.every(p => rolePermissions.includes(p));
}

/**
 * Get all permissions for a role
 *
 * @param userRole - User's role
 * @returns Array of permissions for the role
 *
 * @example
 * const permissions = getRolePermissions(UserRole.USER);
 * console.log(`User has ${permissions.length} permissions`);
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || [];
}

/**
 * Check permission with detailed result
 *
 * @param userRole - User's role
 * @param permission - Permission to check
 * @returns Detailed permission check result
 *
 * @example
 * const check = checkPermission(user.role, Permission.BRD_APPROVE);
 * if (check.hasPermission) {
 *   console.log('User can approve BRDs');
 * } else {
 *   console.log(check.reason);
 * }
 */
export function checkPermission(userRole: UserRole, permission: Permission): PermissionCheck {
  const rolePermissions = getRolePermissions(userRole);
  const hasPermission = rolePermissions.includes(permission);

  return {
    hasPermission,
    role: userRole,
    permissions: rolePermissions,
    reason: hasPermission
      ? undefined
      : `Role '${userRole}' does not have permission '${permission}'`
  };
}

// ============================================
// RESOURCE OWNERSHIP
// ============================================

/**
 * Check if a user can access a resource (ownership or admin)
 *
 * @param user - User object
 * @param resourceOwnerId - ID of the resource owner
 * @returns True if user owns the resource or is an admin
 *
 * @example
 * if (canAccessResource(user, project.ownerId)) {
 *   // User can access this project
 * }
 */
export function canAccessResource(user: User, resourceOwnerId: string): boolean {
  return user.role === 'admin' || user.id === resourceOwnerId;
}

/**
 * Check ownership with detailed result
 *
 * @param user - User object
 * @param resourceOwnerId - ID of the resource owner
 * @returns Detailed ownership check result
 *
 * @example
 * const check = checkOwnership(user, project.ownerId);
 * if (check.canAccess) {
 *   // User can access the resource
 * }
 */
export function checkOwnership(user: User, resourceOwnerId: string): OwnershipCheck {
  const isAdmin = user.role === 'admin';
  const isOwner = user.id === resourceOwnerId;
  const canAccess = isAdmin || isOwner;

  return {
    isOwner,
    isAdmin,
    canAccess
  };
}

// ============================================
// ROLE CHECKING
// ============================================

/**
 * Check if a user is an admin
 *
 * @param user - User object
 * @returns True if user is an admin
 *
 * @example
 * if (isAdmin(user)) {
 *   // Show admin features
 * }
 */
export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

/**
 * Check if a user has one of the specified roles
 *
 * @param user - User object
 * @param roles - Array of roles to check
 * @returns True if user has one of the roles
 *
 * @example
 * if (hasRole(user, [UserRole.ADMIN, UserRole.USER])) {
 *   // User is admin or regular user (not viewer)
 * }
 */
export function hasRole(user: User, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if a user is a viewer (read-only)
 *
 * @param user - User object
 * @returns True if user is a viewer
 *
 * @example
 * if (isViewer(user)) {
 *   // Hide edit buttons
 * }
 */
export function isViewer(user: User): boolean {
  return user.role === 'viewer';
}

// ============================================
// PERMISSION FILTERING
// ============================================

/**
 * Filter permissions by resource type
 *
 * @param permissions - Array of permissions
 * @param resourceType - Resource type to filter by (e.g., 'brd', 'prd')
 * @returns Filtered permissions
 *
 * @example
 * const brdPermissions = filterPermissionsByResource(userPermissions, 'brd');
 * // Returns: [Permission.BRD_CREATE, Permission.BRD_READ, ...]
 */
export function filterPermissionsByResource(
  permissions: Permission[],
  resourceType: string
): Permission[] {
  const prefix = `${resourceType}:`;
  return permissions.filter(p => p.startsWith(prefix));
}

/**
 * Filter permissions by action type
 *
 * @param permissions - Array of permissions
 * @param action - Action to filter by (e.g., 'read', 'create', 'approve')
 * @returns Filtered permissions
 *
 * @example
 * const readPermissions = filterPermissionsByAction(userPermissions, 'read');
 * // Returns: [Permission.BRD_READ, Permission.PRD_READ, ...]
 */
export function filterPermissionsByAction(
  permissions: Permission[],
  action: string
): Permission[] {
  const suffix = `:${action}`;
  return permissions.filter(p => p.endsWith(suffix));
}

/**
 * Check if user can perform action on resource type
 *
 * @param userRole - User's role
 * @param resourceType - Resource type (e.g., 'brd', 'prd')
 * @param action - Action (e.g., 'read', 'create', 'approve')
 * @returns True if user can perform the action
 *
 * @example
 * if (canPerformAction(user.role, 'brd', 'approve')) {
 *   // User can approve BRDs
 * }
 */
export function canPerformAction(
  userRole: UserRole,
  resourceType: string,
  action: string
): boolean {
  const permission = `${resourceType}:${action}` as Permission;
  return hasPermission(userRole, permission);
}

// ============================================
// PERMISSION COMPARISON
// ============================================

/**
 * Get permissions difference between two roles
 *
 * @param fromRole - Starting role
 * @param toRole - Target role
 * @returns Object with added and removed permissions
 *
 * @example
 * const diff = getPermissionDiff(UserRole.VIEWER, UserRole.USER);
 * console.log(`Upgrading to USER adds ${diff.added.length} permissions`);
 */
export function getPermissionDiff(fromRole: UserRole, toRole: UserRole): {
  added: Permission[];
  removed: Permission[];
  unchanged: Permission[];
} {
  const fromPermissions = getRolePermissions(fromRole);
  const toPermissions = getRolePermissions(toRole);

  const added = toPermissions.filter(p => !fromPermissions.includes(p));
  const removed = fromPermissions.filter(p => !toPermissions.includes(p));
  const unchanged = fromPermissions.filter(p => toPermissions.includes(p));

  return { added, removed, unchanged };
}

/**
 * Check if one role has more permissions than another
 *
 * @param role1 - First role
 * @param role2 - Second role
 * @returns True if role1 has more permissions than role2
 *
 * @example
 * if (hasMorePermissions(UserRole.ADMIN, UserRole.USER)) {
 *   // Admin has more permissions than user
 * }
 */
export function hasMorePermissions(role1: UserRole, role2: UserRole): boolean {
  const role1Permissions = getRolePermissions(role1);
  const role2Permissions = getRolePermissions(role2);
  return role1Permissions.length > role2Permissions.length;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate if a string is a valid UserRole
 *
 * @param role - Role string to validate
 * @returns True if valid role
 *
 * @example
 * if (isValidRole(req.body.role)) {
 *   // Role is valid
 * }
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Validate if a string is a valid Permission
 *
 * @param permission - Permission string to validate
 * @returns True if valid permission
 *
 * @example
 * if (isValidPermission(req.body.permission)) {
 *   // Permission is valid
 * }
 */
export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}

/**
 * Parse role from string with default fallback
 *
 * @param role - Role string
 * @param defaultRole - Default role if invalid (default: UserRole.VIEWER)
 * @returns Valid UserRole
 *
 * @example
 * const userRole = parseRole(req.body.role, UserRole.USER);
 */
export function parseRole(role: string, defaultRole: UserRole = UserRole.VIEWER): UserRole {
  if (isValidRole(role)) {
    return role as UserRole;
  }
  logger.warn({ role, defaultRole }, 'Invalid role, using default');
  return defaultRole;
}

// ============================================
// LOGGING HELPERS
// ============================================

/**
 * Log permission check result
 *
 * @param user - User object
 * @param permission - Permission checked
 * @param granted - Whether permission was granted
 * @param context - Additional context
 */
export function logPermissionCheck(
  user: User,
  permission: Permission,
  granted: boolean,
  context?: Record<string, any>
): void {
  logger.info({
    userId: user.id,
    userRole: user.role,
    permission,
    granted,
    ...context
  }, 'Permission check');
}

/**
 * Log ownership check result
 *
 * @param user - User object
 * @param resourceOwnerId - Resource owner ID
 * @param granted - Whether access was granted
 * @param context - Additional context
 */
export function logOwnershipCheck(
  user: User,
  resourceOwnerId: string,
  granted: boolean,
  context?: Record<string, any>
): void {
  logger.info({
    userId: user.id,
    userRole: user.role,
    resourceOwnerId,
    isOwner: user.id === resourceOwnerId,
    isAdmin: user.role === UserRole.ADMIN,
    granted,
    ...context
  }, 'Ownership check');
}
