/**
 * JWT Utilities - Token generation and verification
 */

import * as jwt from 'jsonwebtoken';
import { UserJWTPayload } from '../models/user.model';
import logger from './logger';

// JWT configuration from environment variables
const JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '15m'; // 15 minutes for access token
const JWT_REFRESH_EXPIRES_IN = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d'; // 7 days for refresh token

// Warn if using default secrets in production
if (process.env['NODE_ENV'] === 'production') {
  if (JWT_SECRET === 'your-secret-key-change-in-production') {
    logger.warn('Using default JWT_SECRET in production! Please set JWT_SECRET environment variable.');
  }
  if (JWT_REFRESH_SECRET === 'your-refresh-secret-key-change-in-production') {
    logger.warn('Using default JWT_REFRESH_SECRET in production! Please set JWT_REFRESH_SECRET environment variable.');
  }
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(payload: UserJWTPayload): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'project-conductor',
      audience: 'project-conductor-api',
    } as jwt.SignOptions);
  } catch (error) {
    logger.error({ error }, 'Failed to generate access token');
    throw new Error('Token generation failed');
  }
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(payload: { userId: string; email: string }): string {
  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'project-conductor',
      audience: 'project-conductor-api',
    } as jwt.SignOptions);
  } catch (error) {
    logger.error({ error }, 'Failed to generate refresh token');
    throw new Error('Token generation failed');
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): UserJWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'project-conductor',
      audience: 'project-conductor-api',
    }) as UserJWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Access token expired');
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error }, 'Invalid access token');
      throw new Error('Invalid token');
    }
    logger.error({ error }, 'Token verification failed');
    throw new Error('Token verification failed');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; email: string } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'project-conductor',
      audience: 'project-conductor-api',
    }) as { userId: string; email: string };

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Refresh token expired');
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug({ error }, 'Invalid refresh token');
      throw new Error('Invalid refresh token');
    }
    logger.error({ error }, 'Refresh token verification failed');
    throw new Error('Token verification failed');
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error({ error }, 'Failed to decode token');
    return null;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(): number {
  // Parse expiration time string (e.g., "15m", "1h", "7d")
  const timeStr = JWT_EXPIRES_IN;
  const unit = timeStr.slice(-1);
  const value = parseInt(timeStr.slice(0, -1));

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return 900; // Default to 15 minutes
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
