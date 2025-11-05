/**
 * Authentication Service
 *
 * Handles user authentication, registration, and token management.
 * Implements secure password hashing with bcrypt and JWT token generation.
 */

import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import logger from '../utils/logger';
import { generateTokenPair, blacklistToken, refreshAccessToken, extractUserId } from '../utils/jwt.util';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  LogoutResponse,
  User,
  SafeUser,
  JWTPayload,
} from '../models/auth.model';

// Bcrypt configuration
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

/**
 * Authentication Service Class
 */
export class AuthService {
  /**
   * Register a new user
   *
   * @param data - Registration data
   * @returns Registration response with user information
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(data.email);
      if (existingUser) {
        logger.warn({ email: data.email }, 'Registration attempt with existing email');
        throw new Error('User with this email already exists');
      }

      // Validate password strength (basic validation)
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Set default role if not provided
      const role = data.role || 'user';

      // Insert user into database
      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING id, email, first_name, last_name, role, created_at, updated_at, is_active
      `;

      const result = await db.query(query, [
        data.email.toLowerCase(),
        passwordHash,
        data.firstName,
        data.lastName,
        role,
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = result.rows[0] as any;

      logger.info({
        userId: user?.id,
        email: user?.email,
        role: user?.role,
      }, 'User registered successfully');

      return {
        success: true,
        user: {
          id: user?.id,
          email: user?.email,
          firstName: user?.first_name,
          lastName: user?.last_name,
          role: user?.role,
        },
        message: 'Registration successful',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage, email: data.email }, 'Registration failed');
      throw error;
    }
  }

  /**
   * Authenticate user and return JWT tokens
   *
   * @param data - Login credentials
   * @returns Login response with tokens and user information
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(data.email);
      if (!user) {
        logger.warn({ email: data.email }, 'Login attempt with non-existent email');
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.is_active) {
        logger.warn({ userId: user.id, email: user.email }, 'Login attempt for inactive user');
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(data.password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn({ userId: user.id, email: user.email }, 'Login attempt with incorrect password');
        throw new Error('Invalid email or password');
      }

      // Update last login timestamp
      await this.updateLastLogin(user.id);

      // Generate JWT tokens
      const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
        userId: user.id,
        email: user.email,
        roles: [user.role],
        permissions: await this.getUserPermissions(user.role),
      };

      const tokens = generateTokenPair(payload);

      logger.info({
        userId: user.id,
        email: user.email,
        role: user.role,
      }, 'User logged in successfully');

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        expiresIn: 900, // 15 minutes in seconds
        message: 'Login successful',
      };
    } catch (error: any) {
      logger.error({ error: error.message, email: data.email }, 'Login failed');
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * @param data - Refresh token request
   * @returns New access token
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const newAccessToken = refreshAccessToken(data.refreshToken);

      if (!newAccessToken) {
        logger.warn('Invalid or expired refresh token');
        throw new Error('Invalid or expired refresh token');
      }

      const userId = extractUserId(data.refreshToken);
      logger.info({ userId }, 'Access token refreshed');

      return {
        success: true,
        accessToken: newAccessToken,
        expiresIn: 900, // 15 minutes in seconds
        message: 'Token refreshed successfully',
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Token refresh failed');
      throw error;
    }
  }

  /**
   * Logout user and blacklist tokens
   *
   * @param userId - User ID
   * @param data - Logout request with optional refresh token
   * @returns Logout response
   */
  async logout(userId: string, data: LogoutRequest): Promise<LogoutResponse> {
    try {
      // Blacklist refresh token if provided
      if (data.refreshToken) {
        blacklistToken(data.refreshToken);
      }

      logger.info({ userId }, 'User logged out');

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Logout failed');
      throw error;
    }
  }

  /**
   * Hash a password using bcrypt
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Password hashing failed');
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against its hash
   *
   * @param plainPassword - Plain text password
   * @param passwordHash - Hashed password from database
   * @returns True if password matches
   */
  async verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, passwordHash);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Password verification failed');
      return false;
    }
  }

  /**
   * Find a user by email
   *
   * @param email - User email
   * @returns User object or null
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, role,
               created_at, updated_at, last_login, is_active
        FROM users
        WHERE email = $1
      `;

      const result = await db.query(query, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error: any) {
      logger.error({ error: error.message, email }, 'Failed to find user by email');
      throw error;
    }
  }

  /**
   * Find a user by ID
   *
   * @param userId - User ID
   * @returns User object or null
   */
  async findUserById(userId: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, role,
               created_at, updated_at, last_login, is_active
        FROM users
        WHERE id = $1
      `;

      const result = await db.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to find user by ID');
      throw error;
    }
  }

  /**
   * Get safe user information (without sensitive data)
   *
   * @param userId - User ID
   * @returns Safe user object or null
   */
  async getSafeUser(userId: string): Promise<SafeUser | null> {
    try {
      const user = await this.findUserById(userId);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login,
        isActive: user.is_active,
      };
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to get safe user');
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   *
   * @param userId - User ID
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

      await db.query(query, [userId]);
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to update last login');
      // Don't throw error - this is not critical
    }
  }

  /**
   * Get user permissions based on role
   * TODO: Implement proper RBAC with permissions table
   *
   * @param role - User role
   * @returns Array of permission strings
   */
  private async getUserPermissions(role: string): Promise<string[]> {
    // Default permissions based on role
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'], // All permissions
      manager: [
        'requirements:read',
        'requirements:write',
        'requirements:delete',
        'projects:read',
        'projects:write',
        'users:read',
      ],
      user: ['requirements:read', 'requirements:write', 'projects:read'],
      viewer: ['requirements:read', 'projects:read'],
    };

    return rolePermissions[role] || ['requirements:read'];
  }

  /**
   * Change user password
   *
   * @param userId - User ID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password
   * @returns Success status
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        logger.warn({ userId }, 'Password change attempt with incorrect current password');
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password in database
      const query = `
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `;

      await db.query(query, [newPasswordHash, userId]);

      logger.info({ userId }, 'Password changed successfully');

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Password change failed');
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;
