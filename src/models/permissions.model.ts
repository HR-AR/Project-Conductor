/**
 * RBAC Permissions Model - Role-Based Access Control System
 *
 * Defines the permission system for fine-grained access control:
 * - UserRole: Three-tier role system (admin, user, viewer)
 * - Permission: Granular permission strings for all resources
 * - ROLE_PERMISSIONS: Maps roles to their allowed permissions
 */

import { Request } from 'express';
import { User as BaseUser, UserRole as BaseUserRole, UserJWTPayload, AuthenticatedRequest as BaseAuthRequest } from './user.model';

// ============================================
// USER ROLES (Re-exported from user.model.ts)
// ============================================

/**
 * User roles in the system (matches database enum)
 * - admin: Full system access, can manage users and all resources
 * - manager: Management-level access
 * - user: Standard user with create/update permissions on owned resources
 * - viewer: Read-only access to resources
 */
export type UserRole = BaseUserRole;

// UserRole constants for easier usage
export const UserRole = {
  ADMIN: 'admin' as UserRole,
  MANAGER: 'manager' as UserRole,
  USER: 'user' as UserRole,
  VIEWER: 'viewer' as UserRole
};

// ============================================
// PERMISSIONS
// ============================================

/**
 * Granular permissions for all system resources
 * Format: resource:action
 */
export enum Permission {
  // ===== User Management =====
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',

  // ===== Project Management =====
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_LIST = 'project:list',

  // ===== Requirements =====
  REQUIREMENT_CREATE = 'requirement:create',
  REQUIREMENT_READ = 'requirement:read',
  REQUIREMENT_UPDATE = 'requirement:update',
  REQUIREMENT_DELETE = 'requirement:delete',
  REQUIREMENT_LIST = 'requirement:list',

  // ===== BRD (Business Requirements Document) =====
  BRD_CREATE = 'brd:create',
  BRD_READ = 'brd:read',
  BRD_UPDATE = 'brd:update',
  BRD_DELETE = 'brd:delete',
  BRD_APPROVE = 'brd:approve',
  BRD_REJECT = 'brd:reject',
  BRD_LIST = 'brd:list',

  // ===== PRD (Product Requirements Document) =====
  PRD_CREATE = 'prd:create',
  PRD_READ = 'prd:read',
  PRD_UPDATE = 'prd:update',
  PRD_DELETE = 'prd:delete',
  PRD_APPROVE = 'prd:approve',
  PRD_REJECT = 'prd:reject',
  PRD_LIST = 'prd:list',

  // ===== Engineering Design =====
  DESIGN_CREATE = 'design:create',
  DESIGN_READ = 'design:read',
  DESIGN_UPDATE = 'design:update',
  DESIGN_DELETE = 'design:delete',
  DESIGN_APPROVE = 'design:approve',
  DESIGN_LIST = 'design:list',

  // ===== Conflicts =====
  CONFLICT_CREATE = 'conflict:create',
  CONFLICT_READ = 'conflict:read',
  CONFLICT_UPDATE = 'conflict:update',
  CONFLICT_RESOLVE = 'conflict:resolve',
  CONFLICT_VOTE = 'conflict:vote',
  CONFLICT_LIST = 'conflict:list',

  // ===== Comments =====
  COMMENT_CREATE = 'comment:create',
  COMMENT_READ = 'comment:read',
  COMMENT_UPDATE = 'comment:update',
  COMMENT_DELETE = 'comment:delete',

  // ===== Links & Traceability =====
  LINK_CREATE = 'link:create',
  LINK_READ = 'link:read',
  LINK_UPDATE = 'link:update',
  LINK_DELETE = 'link:delete',
  TRACEABILITY_READ = 'traceability:read',

  // ===== Reviews =====
  REVIEW_CREATE = 'review:create',
  REVIEW_READ = 'review:read',
  REVIEW_UPDATE = 'review:update',
  REVIEW_DELETE = 'review:delete',
  REVIEW_SUBMIT = 'review:submit',

  // ===== Quality & Metrics =====
  QUALITY_READ = 'quality:read',
  QUALITY_RUN = 'quality:run',
  METRICS_READ = 'metrics:read',

  // ===== Change Log & History =====
  CHANGELOG_READ = 'changelog:read',
  CHANGELOG_CREATE = 'changelog:create',
  HISTORY_READ = 'history:read',

  // ===== Narratives =====
  NARRATIVE_CREATE = 'narrative:create',
  NARRATIVE_READ = 'narrative:read',
  NARRATIVE_UPDATE = 'narrative:update',
  NARRATIVE_DELETE = 'narrative:delete',

  // ===== Approvals =====
  APPROVAL_CREATE = 'approval:create',
  APPROVAL_READ = 'approval:read',
  APPROVAL_SUBMIT = 'approval:submit',
  APPROVAL_WITHDRAW = 'approval:withdraw',

  // ===== Dashboard & Analytics =====
  DASHBOARD_READ = 'dashboard:read',
  ANALYTICS_READ = 'analytics:read',

  // ===== System Administration =====
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_SETTINGS = 'system:settings',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_CACHE = 'system:cache'
}

// ============================================
// ROLE-PERMISSION MAPPINGS
// ============================================

/**
 * Maps each role to its allowed permissions
 * Admin has all permissions, Manager has most permissions, User has standard permissions, Viewer is read-only
 */
export const ROLE_PERMISSIONS: { [K in UserRole]: Permission[] } = {
  admin: [
    // Admin has ALL permissions
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_SETTINGS,
    Permission.SYSTEM_LOGS,
    Permission.SYSTEM_CACHE,

    // User management
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_LIST,

    // Project management
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_LIST,

    // Requirements
    Permission.REQUIREMENT_CREATE,
    Permission.REQUIREMENT_READ,
    Permission.REQUIREMENT_UPDATE,
    Permission.REQUIREMENT_DELETE,
    Permission.REQUIREMENT_LIST,

    // BRD
    Permission.BRD_CREATE,
    Permission.BRD_READ,
    Permission.BRD_UPDATE,
    Permission.BRD_DELETE,
    Permission.BRD_APPROVE,
    Permission.BRD_REJECT,
    Permission.BRD_LIST,

    // PRD
    Permission.PRD_CREATE,
    Permission.PRD_READ,
    Permission.PRD_UPDATE,
    Permission.PRD_DELETE,
    Permission.PRD_APPROVE,
    Permission.PRD_REJECT,
    Permission.PRD_LIST,

    // Design
    Permission.DESIGN_CREATE,
    Permission.DESIGN_READ,
    Permission.DESIGN_UPDATE,
    Permission.DESIGN_DELETE,
    Permission.DESIGN_APPROVE,
    Permission.DESIGN_LIST,

    // Conflicts
    Permission.CONFLICT_CREATE,
    Permission.CONFLICT_READ,
    Permission.CONFLICT_UPDATE,
    Permission.CONFLICT_RESOLVE,
    Permission.CONFLICT_VOTE,
    Permission.CONFLICT_LIST,

    // Comments
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,

    // Links & Traceability
    Permission.LINK_CREATE,
    Permission.LINK_READ,
    Permission.LINK_UPDATE,
    Permission.LINK_DELETE,
    Permission.TRACEABILITY_READ,

    // Reviews
    Permission.REVIEW_CREATE,
    Permission.REVIEW_READ,
    Permission.REVIEW_UPDATE,
    Permission.REVIEW_DELETE,
    Permission.REVIEW_SUBMIT,

    // Quality & Metrics
    Permission.QUALITY_READ,
    Permission.QUALITY_RUN,
    Permission.METRICS_READ,

    // Change Log & History
    Permission.CHANGELOG_READ,
    Permission.CHANGELOG_CREATE,
    Permission.HISTORY_READ,

    // Narratives
    Permission.NARRATIVE_CREATE,
    Permission.NARRATIVE_READ,
    Permission.NARRATIVE_UPDATE,
    Permission.NARRATIVE_DELETE,

    // Approvals
    Permission.APPROVAL_CREATE,
    Permission.APPROVAL_READ,
    Permission.APPROVAL_SUBMIT,
    Permission.APPROVAL_WITHDRAW,

    // Dashboard
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_READ
  ],

  manager: [
    // Managers have most permissions (everything except system admin and user deletion)
    // User management (can create and update, but not delete)
    Permission.USER_READ,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_LIST,

    // Project management
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_LIST,

    // Requirements
    Permission.REQUIREMENT_CREATE,
    Permission.REQUIREMENT_READ,
    Permission.REQUIREMENT_UPDATE,
    Permission.REQUIREMENT_DELETE,
    Permission.REQUIREMENT_LIST,

    // BRD
    Permission.BRD_CREATE,
    Permission.BRD_READ,
    Permission.BRD_UPDATE,
    Permission.BRD_DELETE,
    Permission.BRD_APPROVE,
    Permission.BRD_REJECT,
    Permission.BRD_LIST,

    // PRD
    Permission.PRD_CREATE,
    Permission.PRD_READ,
    Permission.PRD_UPDATE,
    Permission.PRD_DELETE,
    Permission.PRD_APPROVE,
    Permission.PRD_REJECT,
    Permission.PRD_LIST,

    // Design
    Permission.DESIGN_CREATE,
    Permission.DESIGN_READ,
    Permission.DESIGN_UPDATE,
    Permission.DESIGN_DELETE,
    Permission.DESIGN_APPROVE,
    Permission.DESIGN_LIST,

    // Conflicts
    Permission.CONFLICT_CREATE,
    Permission.CONFLICT_READ,
    Permission.CONFLICT_UPDATE,
    Permission.CONFLICT_RESOLVE,
    Permission.CONFLICT_VOTE,
    Permission.CONFLICT_LIST,

    // Comments
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,

    // Links & Traceability
    Permission.LINK_CREATE,
    Permission.LINK_READ,
    Permission.LINK_UPDATE,
    Permission.LINK_DELETE,
    Permission.TRACEABILITY_READ,

    // Reviews
    Permission.REVIEW_CREATE,
    Permission.REVIEW_READ,
    Permission.REVIEW_UPDATE,
    Permission.REVIEW_DELETE,
    Permission.REVIEW_SUBMIT,

    // Quality & Metrics
    Permission.QUALITY_READ,
    Permission.QUALITY_RUN,
    Permission.METRICS_READ,

    // Change Log & History
    Permission.CHANGELOG_READ,
    Permission.CHANGELOG_CREATE,
    Permission.HISTORY_READ,

    // Narratives
    Permission.NARRATIVE_CREATE,
    Permission.NARRATIVE_READ,
    Permission.NARRATIVE_UPDATE,
    Permission.NARRATIVE_DELETE,

    // Approvals
    Permission.APPROVAL_CREATE,
    Permission.APPROVAL_READ,
    Permission.APPROVAL_SUBMIT,
    Permission.APPROVAL_WITHDRAW,

    // Dashboard
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_READ
  ],

  user: [
    // Users can read their own profile
    Permission.USER_READ,

    // Project management (owned projects)
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_LIST,

    // Requirements
    Permission.REQUIREMENT_CREATE,
    Permission.REQUIREMENT_READ,
    Permission.REQUIREMENT_UPDATE,
    Permission.REQUIREMENT_DELETE,
    Permission.REQUIREMENT_LIST,

    // BRD (create, update own; approve if assigned)
    Permission.BRD_CREATE,
    Permission.BRD_READ,
    Permission.BRD_UPDATE,
    Permission.BRD_APPROVE,
    Permission.BRD_REJECT,
    Permission.BRD_LIST,

    // PRD
    Permission.PRD_CREATE,
    Permission.PRD_READ,
    Permission.PRD_UPDATE,
    Permission.PRD_APPROVE,
    Permission.PRD_REJECT,
    Permission.PRD_LIST,

    // Design
    Permission.DESIGN_CREATE,
    Permission.DESIGN_READ,
    Permission.DESIGN_UPDATE,
    Permission.DESIGN_APPROVE,
    Permission.DESIGN_LIST,

    // Conflicts
    Permission.CONFLICT_CREATE,
    Permission.CONFLICT_READ,
    Permission.CONFLICT_UPDATE,
    Permission.CONFLICT_VOTE,
    Permission.CONFLICT_LIST,

    // Comments
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,
    Permission.COMMENT_UPDATE,
    Permission.COMMENT_DELETE,

    // Links & Traceability
    Permission.LINK_CREATE,
    Permission.LINK_READ,
    Permission.LINK_UPDATE,
    Permission.LINK_DELETE,
    Permission.TRACEABILITY_READ,

    // Reviews
    Permission.REVIEW_CREATE,
    Permission.REVIEW_READ,
    Permission.REVIEW_UPDATE,
    Permission.REVIEW_SUBMIT,

    // Quality & Metrics
    Permission.QUALITY_READ,
    Permission.QUALITY_RUN,
    Permission.METRICS_READ,

    // Change Log & History
    Permission.CHANGELOG_READ,
    Permission.HISTORY_READ,

    // Narratives
    Permission.NARRATIVE_CREATE,
    Permission.NARRATIVE_READ,
    Permission.NARRATIVE_UPDATE,
    Permission.NARRATIVE_DELETE,

    // Approvals
    Permission.APPROVAL_CREATE,
    Permission.APPROVAL_READ,
    Permission.APPROVAL_SUBMIT,
    Permission.APPROVAL_WITHDRAW,

    // Dashboard
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_READ
  ],

  viewer: [
    // Viewers are READ-ONLY
    Permission.USER_READ,

    // Project management (read-only)
    Permission.PROJECT_READ,
    Permission.PROJECT_LIST,

    // Requirements (read-only)
    Permission.REQUIREMENT_READ,
    Permission.REQUIREMENT_LIST,

    // BRD (read-only)
    Permission.BRD_READ,
    Permission.BRD_LIST,

    // PRD (read-only)
    Permission.PRD_READ,
    Permission.PRD_LIST,

    // Design (read-only)
    Permission.DESIGN_READ,
    Permission.DESIGN_LIST,

    // Conflicts (read-only, can vote)
    Permission.CONFLICT_READ,
    Permission.CONFLICT_VOTE,
    Permission.CONFLICT_LIST,

    // Comments (read and create)
    Permission.COMMENT_CREATE,
    Permission.COMMENT_READ,

    // Links & Traceability (read-only)
    Permission.LINK_READ,
    Permission.TRACEABILITY_READ,

    // Reviews (read-only)
    Permission.REVIEW_READ,

    // Quality & Metrics (read-only)
    Permission.QUALITY_READ,
    Permission.METRICS_READ,

    // Change Log & History (read-only)
    Permission.CHANGELOG_READ,
    Permission.HISTORY_READ,

    // Narratives (read-only)
    Permission.NARRATIVE_READ,

    // Approvals (read-only)
    Permission.APPROVAL_READ,

    // Dashboard (read-only)
    Permission.DASHBOARD_READ,
    Permission.ANALYTICS_READ
  ]
};

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * User object attached to authenticated requests
 * Re-exported from user.model.ts for convenience
 */
export type User = BaseUser;

/**
 * Authenticated request with user object (re-exported from user.model.ts)
 * Note: user object in request is UserJWTPayload (has userId field)
 */
export type AuthRequest = BaseAuthRequest;

/**
 * Resource ownership check result
 */
export interface OwnershipCheck {
  isOwner: boolean;
  isAdmin: boolean;
  canAccess: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheck {
  hasPermission: boolean;
  role: UserRole;
  permissions: Permission[];
  reason?: string;
}

// ============================================
// HELPER CONSTANTS
// ============================================

/**
 * All permissions that grant approval rights
 */
export const APPROVAL_PERMISSIONS = [
  Permission.BRD_APPROVE,
  Permission.PRD_APPROVE,
  Permission.DESIGN_APPROVE
];

/**
 * All permissions that allow conflict resolution
 */
export const CONFLICT_RESOLUTION_PERMISSIONS = [
  Permission.CONFLICT_RESOLVE,
  Permission.SYSTEM_ADMIN
];

/**
 * All administrative permissions
 */
export const ADMIN_PERMISSIONS = [
  Permission.SYSTEM_ADMIN,
  Permission.SYSTEM_SETTINGS,
  Permission.SYSTEM_LOGS,
  Permission.SYSTEM_CACHE,
  Permission.USER_CREATE,
  Permission.USER_DELETE
];

/**
 * All write permissions (create, update, delete)
 */
export const WRITE_PERMISSIONS = [
  Permission.USER_CREATE,
  Permission.USER_UPDATE,
  Permission.USER_DELETE,
  Permission.PROJECT_CREATE,
  Permission.PROJECT_UPDATE,
  Permission.PROJECT_DELETE,
  Permission.REQUIREMENT_CREATE,
  Permission.REQUIREMENT_UPDATE,
  Permission.REQUIREMENT_DELETE,
  Permission.BRD_CREATE,
  Permission.BRD_UPDATE,
  Permission.BRD_DELETE,
  Permission.PRD_CREATE,
  Permission.PRD_UPDATE,
  Permission.PRD_DELETE,
  Permission.DESIGN_CREATE,
  Permission.DESIGN_UPDATE,
  Permission.DESIGN_DELETE,
  Permission.CONFLICT_CREATE,
  Permission.CONFLICT_UPDATE,
  Permission.CONFLICT_RESOLVE,
  Permission.COMMENT_CREATE,
  Permission.COMMENT_UPDATE,
  Permission.COMMENT_DELETE,
  Permission.LINK_CREATE,
  Permission.LINK_UPDATE,
  Permission.LINK_DELETE,
  Permission.REVIEW_CREATE,
  Permission.REVIEW_UPDATE,
  Permission.REVIEW_DELETE,
  Permission.NARRATIVE_CREATE,
  Permission.NARRATIVE_UPDATE,
  Permission.NARRATIVE_DELETE
];

/**
 * All read-only permissions
 */
export const READ_PERMISSIONS = [
  Permission.USER_READ,
  Permission.PROJECT_READ,
  Permission.REQUIREMENT_READ,
  Permission.BRD_READ,
  Permission.PRD_READ,
  Permission.DESIGN_READ,
  Permission.CONFLICT_READ,
  Permission.COMMENT_READ,
  Permission.LINK_READ,
  Permission.TRACEABILITY_READ,
  Permission.REVIEW_READ,
  Permission.QUALITY_READ,
  Permission.METRICS_READ,
  Permission.CHANGELOG_READ,
  Permission.HISTORY_READ,
  Permission.NARRATIVE_READ,
  Permission.APPROVAL_READ,
  Permission.DASHBOARD_READ,
  Permission.ANALYTICS_READ
];

/**
 * Permission groups for easy bulk checks
 */
export const PERMISSION_GROUPS = {
  admin: ADMIN_PERMISSIONS,
  approval: APPROVAL_PERMISSIONS,
  conflictResolution: CONFLICT_RESOLUTION_PERMISSIONS,
  write: WRITE_PERMISSIONS,
  read: READ_PERMISSIONS
};
