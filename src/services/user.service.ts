/**
 * User Service - Business logic for user management
 */

import { db } from '../config/database';
import {
  User,
  UserWithPassword,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilters,
  UserPaginationParams,
  PaginatedUserResult,
  UserStats,
  ChangePasswordRequest,
  UserRole,
} from '../models/user.model';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import logger from '../utils/logger';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Set default role if not provided
      const role = data.role || 'user';

      // Insert user into database
      const query = `
        INSERT INTO users (username, email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at
      `;

      const values = [
        data.username,
        data.email.toLowerCase(),
        passwordHash,
        data.firstName || null,
        data.lastName || null,
        role,
      ];

      const result = await db.query(query, values);

      logger.info({ userId: result.rows[0].id, email: data.email }, 'User created successfully');

      return this.mapDatabaseUserToUser(result.rows[0]);
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to create user');

      // Check for unique constraint violations
      if (error instanceof Error && error.message.includes('duplicate key')) {
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        }
      }

      throw error;
    }
  }

  /**
   * Get user by ID (without password)
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, username, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at
        FROM users
        WHERE id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseUserToUser(result.rows[0]);
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to get user by ID');
      throw error;
    }
  }

  /**
   * Get user by email (with password for authentication)
   */
  async getUserByEmail(email: string): Promise<UserWithPassword | null> {
    try {
      const query = `
        SELECT id, username, email, password_hash, first_name, last_name, role, is_active, last_login_at, created_at, updated_at
        FROM users
        WHERE email = $1
      `;

      const result = await db.query(query, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...this.mapDatabaseUserToUser(row),
        passwordHash: row.password_hash,
      };
    } catch (error) {
      logger.error({ error, email }, 'Failed to get user by email');
      throw error;
    }
  }

  /**
   * Get all users with pagination and filtering
   */
  async getAllUsers(
    filters: UserFilters,
    pagination: UserPaginationParams
  ): Promise<PaginatedUserResult> {
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (filters.role && filters.role.length > 0) {
        paramCount++;
        conditions.push(`role = ANY($${paramCount})`);
        values.push(filters.role);
      }

      if (filters.isActive !== undefined) {
        paramCount++;
        conditions.push(`is_active = $${paramCount}`);
        values.push(filters.isActive);
      }

      if (filters.search) {
        paramCount++;
        conditions.push(`(
          username ILIKE $${paramCount} OR
          email ILIKE $${paramCount} OR
          first_name ILIKE $${paramCount} OR
          last_name ILIKE $${paramCount}
        )`);
        values.push(`%${filters.search}%`);
      }

      if (filters.createdAfter) {
        paramCount++;
        conditions.push(`created_at >= $${paramCount}`);
        values.push(filters.createdAfter);
      }

      if (filters.createdBefore) {
        paramCount++;
        conditions.push(`created_at <= $${paramCount}`);
        values.push(filters.createdBefore);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total matching records
      const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
      const countResult = await db.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Calculate pagination
      const totalPages = Math.ceil(total / pagination.limit);
      const offset = (pagination.page - 1) * pagination.limit;

      // Build ORDER BY clause
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'DESC';

      // Map sortBy to database column name
      const sortColumn = this.mapSortByToColumn(sortBy);

      // Get paginated results
      const dataQuery = `
        SELECT id, username, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const dataResult = await db.query(dataQuery, [...values, pagination.limit, offset]);

      const users = dataResult.rows.map(row => this.mapDatabaseUserToUser(row));

      return {
        data: users,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error({ error, filters, pagination }, 'Failed to get all users');
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<User | null> {
    try {
      // Build SET clause dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      if (data.username !== undefined) {
        paramCount++;
        updates.push(`username = $${paramCount}`);
        values.push(data.username);
      }

      if (data.email !== undefined) {
        paramCount++;
        updates.push(`email = $${paramCount}`);
        values.push(data.email.toLowerCase());
      }

      if (data.firstName !== undefined) {
        paramCount++;
        updates.push(`first_name = $${paramCount}`);
        values.push(data.firstName);
      }

      if (data.lastName !== undefined) {
        paramCount++;
        updates.push(`last_name = $${paramCount}`);
        values.push(data.lastName);
      }

      if (data.role !== undefined) {
        paramCount++;
        updates.push(`role = $${paramCount}`);
        values.push(data.role);
      }

      if (data.isActive !== undefined) {
        paramCount++;
        updates.push(`is_active = $${paramCount}`);
        values.push(data.isActive);
      }

      if (updates.length === 0) {
        // No updates to perform
        return this.getUserById(id);
      }

      // Add user ID to values
      paramCount++;
      values.push(id);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING id, username, email, first_name, last_name, role, is_active, last_login_at, created_at, updated_at
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      logger.info({ userId: id }, 'User updated successfully');

      return this.mapDatabaseUserToUser(result.rows[0]);
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to update user');

      // Check for unique constraint violations
      if (error instanceof Error && error.message.includes('duplicate key')) {
        if (error.message.includes('email')) {
          throw new Error('Email already exists');
        }
        if (error.message.includes('username')) {
          throw new Error('Username already exists');
        }
      }

      throw error;
    }
  }

  /**
   * Delete user (soft delete by setting is_active to false)
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const query = `
        UPDATE users
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return false;
      }

      logger.info({ userId: id }, 'User deleted (soft delete)');

      return true;
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to delete user');
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Get user with password
      const query = `
        SELECT password_hash FROM users WHERE id = $1
      `;

      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentPasswordHash = result.rows[0].password_hash;

      // Verify old password
      const isMatch = await comparePassword(oldPassword, currentPasswordHash);

      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      const updateQuery = `
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;

      await db.query(updateQuery, [newPasswordHash, id]);

      logger.info({ userId: id }, 'Password changed successfully');

      return true;
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to change password');
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      const query = `
        UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await db.query(query, [id]);

      logger.debug({ userId: id }, 'Last login timestamp updated');
    } catch (error) {
      logger.error({ error, userId: id }, 'Failed to update last login');
      // Don't throw - this is not critical
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
          COUNT(*) FILTER (WHERE role = 'manager') as manager_count,
          COUNT(*) FILTER (WHERE role = 'user') as user_count,
          COUNT(*) FILTER (WHERE role = 'viewer') as viewer_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count
        FROM users
      `;

      const result = await db.query(query);
      const row = result.rows[0];

      return {
        total: parseInt(row.total),
        byRole: {
          admin: parseInt(row.admin_count),
          manager: parseInt(row.manager_count),
          user: parseInt(row.user_count),
          viewer: parseInt(row.viewer_count),
        },
        active: parseInt(row.active_count),
        inactive: parseInt(row.inactive_count),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get user statistics');
      throw error;
    }
  }

  /**
   * Map database row to User model
   */
  private mapDatabaseUserToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map sortBy parameter to database column name
   */
  private mapSortByToColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      username: 'username',
      email: 'email',
      createdAt: 'created_at',
      lastLoginAt: 'last_login_at',
    };

    return columnMap[sortBy] || 'created_at';
  }
}
