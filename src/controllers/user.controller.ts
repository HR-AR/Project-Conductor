/**
 * User Controller - Request handlers for user management API
 */

import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import {
  CreateUserRequest,
  UpdateUserRequest,
  LoginRequest,
  ChangePasswordRequest,
  UserFilters,
  UserPaginationParams,
  RefreshTokenRequest,
} from '../models/user.model';
import { asyncHandler, NotFoundError, BadRequestError, UnauthorizedError } from '../middleware/error-handler';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getTokenExpiration } from '../utils/jwt';
import logger from '../utils/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
    logger.info('User Controller initialized');
  }

  /**
   * Register a new user (public endpoint)
   * POST /api/v1/auth/register
   */
  register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreateUserRequest = req.body;

      // Validate required fields
      if (!data.email || !data.password || !data.username) {
        throw new BadRequestError('Email, username, and password are required');
      }

      // Create user
      const user = await this.userService.createUser(data);

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

      res.status(201).json({
        success: true,
        data: {
          user,
          accessToken,
          refreshToken,
          expiresIn: getTokenExpiration(),
        },
        message: 'User registered successfully',
      });
    }
  );

  /**
   * Login with email and password (public endpoint)
   * POST /api/v1/auth/login
   */
  login = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email, password }: LoginRequest = req.body;

      // Validate required fields
      if (!email || !password) {
        throw new BadRequestError('Email and password are required');
      }

      // Get user by email (with password)
      const user = await this.userService.getUserByEmail(email);

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login timestamp
      await this.userService.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;

      logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
          expiresIn: getTokenExpiration(),
        },
        message: 'Login successful',
      });
    }
  );

  /**
   * Refresh access token (public endpoint)
   * POST /api/v1/auth/refresh
   */
  refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      // Verify refresh token
      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Get user
      const user = await this.userService.getUserById(payload.userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.debug({ userId: user.id }, 'Access token refreshed');

      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: getTokenExpiration(),
        },
        message: 'Token refreshed successfully',
      });
    }
  );

  /**
   * Logout (public endpoint - client-side token removal)
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // In a JWT-based system, logout is typically handled client-side by removing tokens
      // This endpoint is here for consistency and future token blacklisting implementation

      logger.debug('User logout requested');

      res.json({
        success: true,
        message: 'Logout successful. Please remove tokens from client.',
      });
    }
  );

  /**
   * Get all users (admin only)
   * GET /api/v1/users
   */
  getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse pagination parameters
      const pagination: UserPaginationParams = {
        page: parseInt(req.query['page'] as string) || 1,
        limit: parseInt(req.query['limit'] as string) || 20,
        sortBy: req.query['sortBy'] as any,
        sortOrder: (req.query['sortOrder'] as 'ASC' | 'DESC') || 'DESC',
      };

      // Parse filter parameters
      const filters: UserFilters = {
        role: req.query['role'] ? this.parseArrayParam(req.query['role']) as any : undefined,
        isActive: req.query['isActive'] ? req.query['isActive'] === 'true' : undefined,
        search: req.query['search'] as string | undefined,
        createdAfter: req.query['createdAfter'] as string | undefined,
        createdBefore: req.query['createdBefore'] as string | undefined,
      };

      const result = await this.userService.getAllUsers(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Users retrieved successfully',
      });
    }
  );

  /**
   * Get user by ID
   * GET /api/v1/users/:id
   */
  getUserById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: user,
        message: 'User retrieved successfully',
      });
    }
  );

  /**
   * Get current user profile
   * GET /api/v1/users/me
   */
  getCurrentUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const user = await this.userService.getUserById(req.user.userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: user,
        message: 'Current user retrieved successfully',
      });
    }
  );

  /**
   * Update user profile
   * PUT /api/v1/users/:id
   */
  updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const data: UpdateUserRequest = req.body;

      // Check if user exists
      const existingUser = await this.userService.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Update user
      const updatedUser = await this.userService.updateUser(id, data);

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      logger.info({ userId: id }, 'User updated successfully');

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
      });
    }
  );

  /**
   * Delete user (soft delete)
   * DELETE /api/v1/users/:id
   */
  deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const success = await this.userService.deleteUser(id);

      if (!success) {
        throw new NotFoundError('User not found');
      }

      logger.info({ userId: id }, 'User deleted successfully');

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    }
  );

  /**
   * Change password
   * PUT /api/v1/users/me/password
   */
  changePassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        throw new UnauthorizedError('Not authenticated');
      }

      const { oldPassword, newPassword }: ChangePasswordRequest = req.body;

      if (!oldPassword || !newPassword) {
        throw new BadRequestError('Old password and new password are required');
      }

      await this.userService.changePassword(req.user.userId, oldPassword, newPassword);

      logger.info({ userId: req.user.userId }, 'Password changed successfully');

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    }
  );

  /**
   * Get user statistics (admin only)
   * GET /api/v1/users/stats
   */
  getUserStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const stats = await this.userService.getUserStats();

      res.json({
        success: true,
        data: stats,
        message: 'User statistics retrieved successfully',
      });
    }
  );

  /**
   * Helper method to parse array parameters from query string
   */
  private parseArrayParam(param: string | string[] | any): string[] {
    if (Array.isArray(param)) {
      return param;
    }
    if (typeof param === 'string') {
      return param.split(',').map(item => item.trim());
    }
    return [];
  }
}
