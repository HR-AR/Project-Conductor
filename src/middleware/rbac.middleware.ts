/**
 * RBAC Middleware - Role-Based Access Control
 *
 * Provides middleware functions for protecting routes with:
 * - Role-based access control
 * - Permission-based access control
 * - Resource ownership verification
 * - Admin privilege checks
 */

import { Response, NextFunction } from 'express';
import {
  AuthRequest,
  User,
  UserRole,
  Permission,
  ROLE_PERMISSIONS
} from '../models/permissions.model';
import logger from '../utils/logger';

// ============================================
// CORE MIDDLEWARE FUNCTIONS
// ============================================

/**
 * requireRole - Simple role-based access control
 *
 * Ensures the authenticated user has one of the allowed roles.
 * Use this for coarse-grained access control.
 *
 * @param allowedRoles - Array of roles that can access the route
 * @returns Middleware function
 *
 * @example
 * router.delete('/users/:id', requireRole(UserRole.ADMIN), deleteUser);
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn({
          path: req.path,
          method: req.method
        }, 'RBAC: Unauthenticated request to protected route');
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn({
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        }, 'RBAC: Insufficient role');
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
          requiredRoles: allowedRoles,
          currentRole: req.user.role
        });
        return;
      }

      // User has required role, proceed
      logger.debug({
        userId: req.user.userId,
        userRole: req.user.role,
        path: req.path
      }, 'RBAC: Role check passed');
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'RBAC: Error in requireRole middleware');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * requirePermission - Fine-grained permission-based access control
 *
 * Ensures the authenticated user has at least one of the required permissions.
 * Use this for fine-grained access control.
 *
 * @param permissions - Array of permissions, user needs at least one
 * @returns Middleware function
 *
 * @example
 * router.post('/brd/:id/approve', requirePermission(Permission.BRD_APPROVE), approveBRD);
 */
export const requirePermission = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn({
          path: req.path,
          method: req.method
        }, 'RBAC: Unauthenticated request to protected route');
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      // Get user's permissions based on their role
      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

      // Check if user has at least one of the required permissions
      const hasPermission = permissions.some(p => userPermissions.includes(p));

      if (!hasPermission) {
        logger.warn({
          userId: req.user.userId,
          userRole: req.user.role,
          requiredPermissions: permissions,
          userPermissions: userPermissions.length,
          path: req.path,
          method: req.method
        }, 'RBAC: Insufficient permissions');
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'You do not have the required permissions to perform this action',
          requiredPermissions: permissions,
          currentRole: req.user.role
        });
        return;
      }

      // User has required permission, proceed
      logger.debug({
        userId: req.user.userId,
        userRole: req.user.role,
        path: req.path
      }, 'RBAC: Permission check passed');
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'RBAC: Error in requirePermission middleware');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * requireOwnershipOrAdmin - Check resource ownership or admin privilege
 *
 * Ensures the user either:
 * 1. Is an admin (can access any resource)
 * 2. Owns the resource (their user ID matches the resource owner ID)
 *
 * @param resourceIdParam - The request parameter containing the resource owner ID (default: 'id')
 * @param resourceIdLocation - Where to find the resource ID ('params' | 'body' | 'query')
 * @returns Middleware function
 *
 * @example
 * // Check if user owns the resource or is admin
 * router.put('/users/:id', requireOwnershipOrAdmin('id'), updateUser);
 *
 * // Check body.userId instead of params.id
 * router.post('/projects', requireOwnershipOrAdmin('userId', 'body'), createProject);
 */
export const requireOwnershipOrAdmin = (
  resourceIdParam: string = 'id',
  resourceIdLocation: 'params' | 'body' | 'query' = 'params'
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn({
          path: req.path,
          method: req.method
        }, 'RBAC: Unauthenticated request to protected route');
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      // If user is admin, grant access immediately
      if (req.user.role === 'admin') {
        logger.debug({
          userId: req.user.userId,
          path: req.path
        }, 'RBAC: Admin access granted');
        next();
        return;
      }

      // Get resource owner ID from request
      let resourceOwnerId: string | undefined;
      if (resourceIdLocation === 'params') {
        resourceOwnerId = req.params[resourceIdParam];
      } else if (resourceIdLocation === 'body') {
        resourceOwnerId = req.body[resourceIdParam];
      } else if (resourceIdLocation === 'query') {
        resourceOwnerId = req.query[resourceIdParam] as string;
      }

      // Check if resource owner ID exists
      if (!resourceOwnerId) {
        logger.warn({
          userId: req.user.userId,
          resourceIdParam,
          resourceIdLocation,
          path: req.path
        }, 'RBAC: Resource owner ID not found');
        res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'Resource owner ID not provided'
        });
        return;
      }

      // Check ownership
      if (req.user.userId !== resourceOwnerId) {
        logger.warn({
          userId: req.user.userId,
          resourceOwnerId,
          path: req.path,
          method: req.method
        }, 'RBAC: Ownership check failed');
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access your own resources'
        });
        return;
      }

      // User owns the resource, proceed
      logger.debug({
        userId: req.user.userId,
        path: req.path
      }, 'RBAC: Ownership check passed');
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'RBAC: Error in requireOwnershipOrAdmin middleware');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * requireAllPermissions - Require ALL specified permissions (AND logic)
 *
 * Unlike requirePermission which requires at least one permission (OR logic),
 * this middleware requires the user to have ALL specified permissions.
 *
 * @param permissions - Array of permissions, user needs all of them
 * @returns Middleware function
 *
 * @example
 * router.post('/admin/reset', requireAllPermissions(
 *   Permission.SYSTEM_ADMIN,
 *   Permission.SYSTEM_SETTINGS
 * ), resetSystem);
 */
export const requireAllPermissions = (...permissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn({
          path: req.path,
          method: req.method
        }, 'RBAC: Unauthenticated request to protected route');
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      // Get user's permissions based on their role
      const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

      // Check if user has ALL required permissions
      const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

      if (!hasAllPermissions) {
        logger.warn({
          userId: req.user.userId,
          userRole: req.user.role,
          requiredPermissions: permissions,
          path: req.path,
          method: req.method
        }, 'RBAC: Missing required permissions');
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'You do not have all the required permissions to perform this action',
          requiredPermissions: permissions,
          currentRole: req.user.role
        });
        return;
      }

      // User has all required permissions, proceed
      logger.debug({
        userId: req.user.userId,
        userRole: req.user.role,
        path: req.path
      }, 'RBAC: All permissions check passed');
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'RBAC: Error in requireAllPermissions middleware');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * requireAdmin - Shorthand for requiring admin role
 *
 * @returns Middleware function
 *
 * @example
 * router.get('/admin/users', requireAdmin(), getAllUsers);
 */
export const requireAdmin = () => requireRole(UserRole.ADMIN);

/**
 * requireAuthentication - Basic authentication check (no role/permission requirements)
 *
 * Use this when you only need to verify the user is logged in,
 * without checking specific roles or permissions.
 *
 * @returns Middleware function
 *
 * @example
 * router.get('/profile', requireAuthentication(), getProfile);
 */
export const requireAuthentication = () => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        logger.warn({
          path: req.path,
          method: req.method
        }, 'RBAC: Unauthenticated request to protected route');
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      logger.debug({
        userId: req.user.userId,
        path: req.path
      }, 'RBAC: Authentication check passed');
      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 'RBAC: Error in requireAuthentication middleware');
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking authentication'
      });
    }
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a user has a specific permission
 *
 * @param user - User object
 * @param permission - Permission to check
 * @returns True if user has the permission
 */
export const userHasPermission = (user: User, permission: Permission): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

/**
 * Check if a user has any of the specified permissions
 *
 * @param user - User object
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one permission
 */
export const userHasAnyPermission = (user: User, permissions: Permission[]): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.some(p => userPermissions.includes(p));
};

/**
 * Check if a user has all of the specified permissions
 *
 * @param user - User object
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export const userHasAllPermissions = (user: User, permissions: Permission[]): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.every(p => userPermissions.includes(p));
};

/**
 * Check if a user is an admin
 *
 * @param user - User object
 * @returns True if user is an admin
 */
export const isAdmin = (user: User): boolean => {
  return user.role === UserRole.ADMIN;
};

/**
 * Check if a user owns a resource or is an admin
 *
 * @param user - User object
 * @param resourceOwnerId - ID of the resource owner
 * @returns True if user owns the resource or is an admin
 */
export const canAccessResource = (user: User, resourceOwnerId: string): boolean => {
  return isAdmin(user) || user.id === resourceOwnerId;
};
