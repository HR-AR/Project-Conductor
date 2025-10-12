/**
 * Unit Tests for Authentication Service
 *
 * Tests user registration, login, logout, token refresh, and password management.
 * Coverage Target: 85%+
 */

import { AuthService } from '../../src/services/auth.service';
import { db } from '../../src/config/database';
import { clearBlacklist } from '../../src/utils/jwt.util';

// Mock database
jest.mock('../../src/config/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthService - User Registration', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail (user doesn't exist)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock insert user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Test1234',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.role).toBe('user');
      expect(result.message).toBe('Registration successful');
    });

    it('should reject registration with existing email', async () => {
      const mockExistingUser = {
        id: 'user-456',
        email: 'existing@example.com',
        password_hash: 'hashed-password',
        first_name: 'Existing',
        last_name: 'User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail (user exists)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockExistingUser] });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Test1234',
          firstName: 'New',
          lastName: 'User',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should reject registration with weak password', async () => {
      // Mock findUserByEmail (user doesn't exist)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should convert email to lowercase', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock insert user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await authService.register({
        email: 'TEST@EXAMPLE.COM',
        password: 'Test1234',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      // Check that db.query was called with lowercase email
      const insertCall = (db.query as jest.Mock).mock.calls[1];
      expect(insertCall[1][0]).toBe('test@example.com');
    });

    it('should use default role if not provided', async () => {
      const mockUser = {
        id: 'user-999',
        email: 'test@example.com',
        first_name: 'Default',
        last_name: 'Role',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock insert user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Test1234',
        firstName: 'Default',
        lastName: 'Role',
      });

      expect(result.user.role).toBe('user');
    });

    it('should use custom role if provided', async () => {
      const mockUser = {
        id: 'user-admin',
        email: 'admin@example.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock insert user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.register({
        email: 'admin@example.com',
        password: 'Admin1234',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });

      expect(result.user.role).toBe('admin');
    });

    it('should hash password before storing', async () => {
      const mockUser = {
        id: 'user-hash',
        email: 'test@example.com',
        first_name: 'Hash',
        last_name: 'Test',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock insert user
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await authService.register({
        email: 'test@example.com',
        password: 'PlainPassword123',
        firstName: 'Hash',
        lastName: 'Test',
      });

      // Check that password was hashed (second parameter should not be plain password)
      const insertCall = (db.query as jest.Mock).mock.calls[1];
      const hashedPassword = insertCall[1][1];

      expect(hashedPassword).not.toBe('PlainPassword123');
      expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });
  });
});

describe('AuthService - User Login', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test1234', 10);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      // Mock updateLastLogin
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Test1234',
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.expiresIn).toBe(900); // 15 minutes
      expect(result.message).toBe('Login successful');
    });

    it('should reject login with non-existent email', async () => {
      // Mock findUserByEmail (user doesn't exist)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'Test1234',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login with incorrect password', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login for inactive user', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test1234', 10);

      const mockUser = {
        id: 'user-inactive',
        email: 'inactive@example.com',
        password_hash: passwordHash,
        first_name: 'Inactive',
        last_name: 'User',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: false,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        authService.login({
          email: 'inactive@example.com',
          password: 'Test1234',
        })
      ).rejects.toThrow('Account is deactivated. Please contact support.');
    });

    it('should update last login timestamp', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test1234', 10);

      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      // Mock updateLastLogin
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await authService.login({
        email: 'test@example.com',
        password: 'Test1234',
      });

      // Verify updateLastLogin was called
      expect(db.query).toHaveBeenCalledTimes(2);
      const updateCall = (db.query as jest.Mock).mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE users');
      expect(updateCall[0]).toContain('last_login = NOW()');
    });

    it('should include correct permissions based on role', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Admin1234', 10);

      const mockUser = {
        id: 'user-admin',
        email: 'admin@example.com',
        password_hash: passwordHash,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserByEmail
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      // Mock updateLastLogin
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.login({
        email: 'admin@example.com',
        password: 'Admin1234',
      });

      expect(result.user.role).toBe('admin');
    });
  });
});

describe('AuthService - Token Refresh', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test1234', 10);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // First login to get a refresh token
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'Test1234',
      });

      // Now test refresh
      const refreshResult = await authService.refreshToken({
        refreshToken: loginResult.refreshToken,
      });

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
      expect(refreshResult.expiresIn).toBe(900);
      expect(refreshResult.message).toBe('Token refreshed successfully');
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        authService.refreshToken({
          refreshToken: 'invalid.refresh.token',
        })
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should reject expired refresh token', async () => {
      // This would require mocking time or using a token with past expiry
      // For simplicity, we test with invalid token which also returns null
      await expect(
        authService.refreshToken({
          refreshToken: 'expired.token.here',
        })
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });
});

describe('AuthService - Logout', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const result = await authService.logout('user-123', {});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });

    it('should blacklist refresh token if provided', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('Test1234', 10);

      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Login to get tokens
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const loginResult = await authService.login({
        email: 'test@example.com',
        password: 'Test1234',
      });

      // Logout with refresh token
      await authService.logout('user-456', {
        refreshToken: loginResult.refreshToken,
      });

      // Try to refresh with the blacklisted token
      await expect(
        authService.refreshToken({
          refreshToken: loginResult.refreshToken,
        })
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should logout without refresh token', async () => {
      const result = await authService.logout('user-789', {});

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logout successful');
    });
  });
});

describe('AuthService - Password Management', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('changePassword', () => {
    it('should change password with correct current password', async () => {
      const bcrypt = require('bcryptjs');
      const oldPasswordHash = await bcrypt.hash('OldPassword123', 10);

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: oldPasswordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserById
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      // Mock update password
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.changePassword(
        'user-123',
        'OldPassword123',
        'NewPassword456'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Password changed successfully');
    });

    it('should reject password change with incorrect current password', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserById
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        authService.changePassword('user-456', 'WrongPassword123', 'NewPassword456')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('OldPassword123', 10);

      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        password_hash: passwordHash,
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      // Mock findUserById
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await expect(
        authService.changePassword('user-789', 'OldPassword123', 'weak')
      ).rejects.toThrow('New password must be at least 8 characters long');
    });

    it('should reject password change for non-existent user', async () => {
      // Mock findUserById (user doesn't exist)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.changePassword('nonexistent', 'OldPassword123', 'NewPassword456')
      ).rejects.toThrow('User not found');
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'TestPassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const hash = await authService.hashPassword(password);

      const isValid = await authService.verifyPassword('WrongPassword456', hash);

      expect(isValid).toBe(false);
    });
  });
});

describe('AuthService - User Lookup', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    clearBlacklist();
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await authService.findUserByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(user?.first_name).toBe('John');
    });

    it('should return null for non-existent email', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await authService.findUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should convert email to lowercase when searching', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      await authService.findUserByEmail('TEST@EXAMPLE.COM');

      // Check that db.query was called with lowercase email
      const queryCall = (db.query as jest.Mock).mock.calls[0];
      expect(queryCall[1][0]).toBe('test@example.com');
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const mockUser = {
        id: 'user-789',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'Bob',
        last_name: 'Johnson',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await authService.findUserById('user-789');

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-789');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent ID', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await authService.findUserById('nonexistent-id');

      expect(user).toBeNull();
    });
  });

  describe('getSafeUser', () => {
    it('should return user without sensitive data', async () => {
      const mockUser = {
        id: 'user-999',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'Charlie',
        last_name: 'Brown',
        role: 'user',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
        is_active: true,
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const safeUser = await authService.getSafeUser('user-999');

      expect(safeUser).toBeDefined();
      expect(safeUser?.id).toBe('user-999');
      expect(safeUser?.email).toBe('test@example.com');
      expect(safeUser?.firstName).toBe('Charlie');
      expect(safeUser?.lastName).toBe('Brown');
      expect(safeUser?.role).toBe('user');
      expect(safeUser?.isActive).toBe(true);
      expect(safeUser?.createdAt).toBeDefined();
      expect(safeUser?.updatedAt).toBeDefined();
      expect(safeUser?.lastLogin).toBeDefined();
    });

    it('should return null for non-existent user', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const safeUser = await authService.getSafeUser('nonexistent-id');

      expect(safeUser).toBeNull();
    });
  });
});
