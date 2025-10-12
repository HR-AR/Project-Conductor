/**
 * User Model - Data types and interfaces for user management
 */

import { Request } from 'express';

// User role types (matches database enum)
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// Base user interface (without sensitive data)
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User with password hash (for internal service use only)
export interface UserWithPassword extends User {
  passwordHash: string;
}

// Create user request (registration)
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

// Update user request
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  message: string;
}

// Change password request
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// User filters for querying
export interface UserFilters {
  role?: UserRole[];
  isActive?: boolean;
  search?: string; // Search in username, email, first name, last name
  createdAfter?: string;
  createdBefore?: string;
}

// User pagination params
export interface UserPaginationParams {
  page: number;
  limit: number;
  sortBy?: 'username' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder: 'ASC' | 'DESC';
}

// Paginated user result
export interface PaginatedUserResult {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User statistics
export interface UserStats {
  total: number;
  byRole: {
    admin: number;
    manager: number;
    user: number;
    viewer: number;
  };
  active: number;
  inactive: number;
}

// Refresh token request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Token response
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// JWT payload (defined in auth.model.ts, re-exported for convenience)
export interface UserJWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Express Request extension with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: UserJWTPayload;
}
