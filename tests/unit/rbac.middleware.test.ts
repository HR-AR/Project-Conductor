/**
 * Unit Tests for RBAC Middleware
 *
 * Tests role-based and permission-based access control middleware.
 * Coverage Target: 80%+
 */

import { Request, Response, NextFunction } from 'express';
import {
  requireRole,
  requirePermission,
  requireOwnershipOrAdmin,
  requireAllPermissions,
  requireAdmin,
  requireAuthentication,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  isAdmin,
  canAccessResource,
} from '../../src/middleware/rbac.middleware';
import { UserRole, Permission } from '../../src/models/permissions.model';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RBAC Middleware - requireRole', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow admin to access admin-only route', () => {
    mockReq.user = {
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      username: 'admin',
    };

    const middleware = requireRole(UserRole.ADMIN);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should deny user from admin-only route', () => {
    mockReq.user = {
      userId: 'user-2',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requireRole(UserRole.ADMIN);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Insufficient permissions',
      })
    );
  });

  it('should allow multiple roles', () => {
    mockReq.user = {
      userId: 'user-3',
      email: 'manager@example.com',
      role: 'manager',
      username: 'manager',
    };

    const middleware = requireRole(UserRole.ADMIN, UserRole.MANAGER);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should deny unauthenticated user', () => {
    mockReq.user = undefined;

    const middleware = requireRole(UserRole.USER);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Authentication required',
      })
    );
  });

  it('should allow viewer role for viewer-only route', () => {
    mockReq.user = {
      userId: 'user-4',
      email: 'viewer@example.com',
      role: 'viewer',
      username: 'viewer',
    };

    const middleware = requireRole(UserRole.VIEWER);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('RBAC Middleware - requirePermission', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'POST',
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow user with required permission', () => {
    mockReq.user = {
      userId: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      username: 'admin',
    };

    const middleware = requirePermission(Permission.USER_DELETE);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny user without required permission', () => {
    mockReq.user = {
      userId: 'user-2',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requirePermission(Permission.USER_DELETE);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should allow user with any of multiple permissions', () => {
    mockReq.user = {
      userId: 'user-3',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requirePermission(
      Permission.REQUIREMENT_READ,
      Permission.REQUIREMENT_WRITE
    );
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny unauthenticated user', () => {
    mockReq.user = undefined;

    const middleware = requirePermission(Permission.REQUIREMENT_READ);
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

describe('RBAC Middleware - requireOwnershipOrAdmin', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/users/user-123',
      method: 'PUT',
      params: {},
      body: {},
      query: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow admin to access any resource', () => {
    mockReq.user = {
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      username: 'admin',
    };
    mockReq.params = { id: 'user-123' };

    const middleware = requireOwnershipOrAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow user to access their own resource', () => {
    mockReq.user = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.params = { id: 'user-123' };

    const middleware = requireOwnershipOrAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny user from accessing another user resource', () => {
    mockReq.user = {
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.params = { id: 'user-456' };

    const middleware = requireOwnershipOrAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should work with custom parameter name', () => {
    mockReq.user = {
      userId: 'user-789',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.params = { userId: 'user-789' };

    const middleware = requireOwnershipOrAdmin('userId');
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should work with body parameter', () => {
    mockReq.user = {
      userId: 'user-999',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.body = { userId: 'user-999' };

    const middleware = requireOwnershipOrAdmin('userId', 'body');
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should work with query parameter', () => {
    mockReq.user = {
      userId: 'user-111',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.query = { userId: 'user-111' };

    const middleware = requireOwnershipOrAdmin('userId', 'query');
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 400 if resource ID not found', () => {
    mockReq.user = {
      userId: 'user-222',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };
    mockReq.params = {};

    const middleware = requireOwnershipOrAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});

describe('RBAC Middleware - requireAllPermissions', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/admin/settings',
      method: 'POST',
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow admin with all permissions', () => {
    mockReq.user = {
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      username: 'admin',
    };

    const middleware = requireAllPermissions(
      Permission.SYSTEM_ADMIN,
      Permission.SYSTEM_SETTINGS
    );
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny user without all required permissions', () => {
    mockReq.user = {
      userId: 'user-2',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requireAllPermissions(
      Permission.REQUIREMENT_READ,
      Permission.USER_DELETE // user doesn't have this
    );
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - requireAdmin', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/admin',
      method: 'GET',
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow admin access', () => {
    mockReq.user = {
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      username: 'admin',
    };

    const middleware = requireAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny non-admin access', () => {
    mockReq.user = {
      userId: 'user-2',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requireAdmin();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });
});

describe('RBAC Middleware - requireAuthentication', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/profile',
      method: 'GET',
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should allow any authenticated user', () => {
    mockReq.user = {
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
      username: 'user',
    };

    const middleware = requireAuthentication();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should deny unauthenticated user', () => {
    mockReq.user = undefined;

    const middleware = requireAuthentication();
    middleware(mockReq as any, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

describe('RBAC Helper Functions', () => {
  describe('userHasPermission', () => {
    it('should return true if user has permission', () => {
      const user = {
        id: 'admin-1',
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        username: 'admin',
      };

      const result = userHasPermission(user, Permission.USER_DELETE);

      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', () => {
      const user = {
        id: 'viewer-1',
        userId: 'viewer-1',
        email: 'viewer@example.com',
        role: 'viewer' as UserRole,
        username: 'viewer',
      };

      const result = userHasPermission(user, Permission.USER_DELETE);

      expect(result).toBe(false);
    });
  });

  describe('userHasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      const user = {
        id: 'user-1',
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user' as UserRole,
        username: 'user',
      };

      const result = userHasAnyPermission(user, [
        Permission.USER_DELETE, // doesn't have
        Permission.REQUIREMENT_READ, // has
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const user = {
        id: 'viewer-1',
        userId: 'viewer-1',
        email: 'viewer@example.com',
        role: 'viewer' as UserRole,
        username: 'viewer',
      };

      const result = userHasAnyPermission(user, [
        Permission.USER_DELETE,
        Permission.REQUIREMENT_DELETE,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('userHasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const user = {
        id: 'admin-1',
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        username: 'admin',
      };

      const result = userHasAllPermissions(user, [
        Permission.USER_DELETE,
        Permission.REQUIREMENT_DELETE,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user lacks any permission', () => {
      const user = {
        id: 'user-1',
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user' as UserRole,
        username: 'user',
      };

      const result = userHasAllPermissions(user, [
        Permission.REQUIREMENT_READ, // has
        Permission.USER_DELETE, // doesn't have
      ]);

      expect(result).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      const user = {
        id: 'admin-1',
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        username: 'admin',
      };

      expect(isAdmin(user)).toBe(true);
    });

    it('should return false for non-admin user', () => {
      const user = {
        id: 'user-1',
        userId: 'user-1',
        email: 'user@example.com',
        role: 'user' as UserRole,
        username: 'user',
      };

      expect(isAdmin(user)).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should return true for admin', () => {
      const user = {
        id: 'admin-1',
        userId: 'admin-1',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        username: 'admin',
      };

      expect(canAccessResource(user, 'any-resource-id')).toBe(true);
    });

    it('should return true if user owns resource', () => {
      const user = {
        id: 'user-123',
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user' as UserRole,
        username: 'user',
      };

      expect(canAccessResource(user, 'user-123')).toBe(true);
    });

    it('should return false if user does not own resource and is not admin', () => {
      const user = {
        id: 'user-123',
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user' as UserRole,
        username: 'user',
      };

      expect(canAccessResource(user, 'user-456')).toBe(false);
    });
  });
});
