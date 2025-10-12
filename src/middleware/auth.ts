/**
 * Authentication Middleware - JWT authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { UserJWTPayload, UserRole } from '../models/user.model';
import logger from '../utils/logger';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserJWTPayload;
    }
  }
}

/**
 * Authentication middleware - Verify JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    try {
      const payload = verifyAccessToken(token);

      // Attach user to request
      req.user = payload;

      logger.debug({ userId: payload.userId, email: payload.email }, 'User authenticated');

      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message,
      });
      return;
    }
  } catch (error) {
    logger.error({ error }, 'Authentication middleware error');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Authorization middleware - Check user role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          { userId: req.user.userId, role: req.user.role, requiredRoles: allowedRoles },
          'User lacks required role'
        );

        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Authorization middleware error');
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Authorization failed',
      });
    }
  };
}

/**
 * Optional authentication middleware - Attach user if token is present, but don't require it
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        logger.debug({ userId: payload.userId }, 'User optionally authenticated');
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.debug('Optional authentication failed, continuing without user');
      }
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Optional authentication middleware error');
    next(); // Continue anyway
  }
}

/**
 * Check if user owns the resource or is admin
 */
export function authorizeOwnerOrAdmin(userIdParam: string = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const resourceUserId = req.params[userIdParam];
      const isOwner = req.user.userId === resourceUserId;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        logger.warn(
          { userId: req.user.userId, resourceUserId, role: req.user.role },
          'User lacks ownership or admin role'
        );

        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only access your own resources',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Owner/admin authorization middleware error');
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Authorization failed',
      });
    }
  };
}
