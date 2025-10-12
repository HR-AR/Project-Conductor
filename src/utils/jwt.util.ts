/**
 * JWT Utility Module
 *
 * Provides secure JWT token generation, verification, and management
 * for authentication and authorization.
 */

import jwt from 'jsonwebtoken';
import logger from './logger';
import { JWTPayload, TokenValidationResult } from '../models/auth.model';

// Token blacklist for logout support (in-memory for now, use Redis in production)
const tokenBlacklist = new Set<string>();

/**
 * JWT Configuration from environment variables
 */
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  issuer: 'project-conductor',
  audience: 'project-conductor-api',
};

// Warn if using default secret in production
if (process.env.NODE_ENV === 'production' && JWT_CONFIG.secret === 'default-secret-change-in-production') {
  logger.error('CRITICAL: Using default JWT_SECRET in production! Set a secure JWT_SECRET in environment variables.');
}

// Validate secret strength (minimum 32 characters recommended)
if (JWT_CONFIG.secret.length < 32) {
  logger.warn(`JWT_SECRET is only ${JWT_CONFIG.secret.length} characters. Recommended minimum: 32 characters for security.`);
}

/**
 * Generate an access token with short expiry (15 minutes)
 *
 * @param payload - User information to encode in the token
 * @returns Signed JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
  try {
    const token = jwt.sign(
      payload,
      JWT_CONFIG.secret,
      {
        expiresIn: JWT_CONFIG.accessExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        subject: payload.userId,
      } as jwt.SignOptions
    );

    logger.info({ userId: payload.userId, email: payload.email }, 'Access token generated');
    return token;
  } catch (error) {
    logger.error({ error, userId: payload.userId }, 'Failed to generate access token');
    throw new Error('Token generation failed');
  }
}

/**
 * Generate a refresh token with long expiry (7 days)
 *
 * @param payload - User information to encode in the token
 * @returns Signed JWT refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
  try {
    const token = jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_CONFIG.secret,
      {
        expiresIn: JWT_CONFIG.refreshExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        subject: payload.userId,
      } as jwt.SignOptions
    );

    logger.info({ userId: payload.userId, email: payload.email }, 'Refresh token generated');
    return token;
  } catch (error) {
    logger.error({ error, userId: payload.userId }, 'Failed to generate refresh token');
    throw new Error('Refresh token generation failed');
  }
}

/**
 * Generate both access and refresh tokens
 *
 * @param payload - User information to encode in the tokens
 * @returns Object containing both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token to verify
 * @returns Validation result with decoded payload or error information
 */
export function verifyToken(token: string): TokenValidationResult {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return {
        valid: false,
        error: 'Token has been revoked',
      };
    }

    const decoded = jwt.verify(token, JWT_CONFIG.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    }) as JWTPayload;

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug({ error }, 'Token expired');
      return {
        valid: false,
        expired: true,
        error: 'Token has expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn({ error: error.message }, 'Invalid token');
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    logger.error({ error }, 'Token verification failed');
    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Extract user ID from a JWT token without full verification
 * Useful for logging and debugging. Do not use for authentication!
 *
 * @param token - JWT token
 * @returns User ID or null if extraction fails
 */
export function extractUserId(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded?.userId || null;
  } catch (error) {
    logger.warn({ error }, 'Failed to extract user ID from token');
    return null;
  }
}

/**
 * Decode a JWT token without verification
 * WARNING: This does not verify the token signature. Only use for inspection!
 *
 * @param token - JWT token
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch (error) {
    logger.warn({ error }, 'Failed to decode token');
    return null;
  }
}

/**
 * Add a token to the blacklist (for logout)
 *
 * In production, this should be stored in Redis with TTL equal to token expiry.
 * Current implementation uses in-memory Set (not suitable for production scaling).
 *
 * @param token - JWT token to blacklist
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token);
  logger.info({ userId: extractUserId(token) }, 'Token blacklisted');

  // TODO: In production, store in Redis:
  // await redis.setex(`blacklist:${token}`, tokenTTL, '1');
}

/**
 * Check if a token is blacklisted
 *
 * @param token - JWT token to check
 * @returns True if token is blacklisted
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token);
}

/**
 * Refresh an access token using a valid refresh token
 *
 * @param refreshToken - Valid refresh token
 * @returns New access token or null if refresh token is invalid
 */
export function refreshAccessToken(refreshToken: string): string | null {
  const validation = verifyToken(refreshToken);

  if (!validation.valid || !validation.payload) {
    logger.warn({ error: validation.error }, 'Invalid refresh token');
    return null;
  }

  // Check if this is actually a refresh token
  if ((validation.payload as any).type !== 'refresh') {
    logger.warn('Attempted to refresh with non-refresh token');
    return null;
  }

  // Generate new access token
  const { userId, email, roles, permissions, provider, sessionId } = validation.payload;
  return generateAccessToken({ userId, email, roles, permissions, provider, sessionId });
}

/**
 * Get token expiry time in seconds
 *
 * @param token - JWT token
 * @returns Expiry timestamp or null if token is invalid
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded?.exp || null;
  } catch (error) {
    logger.warn({ error }, 'Failed to get token expiry');
    return null;
  }
}

/**
 * Check if a token is about to expire (within 5 minutes)
 *
 * @param token - JWT token
 * @returns True if token expires within 5 minutes
 */
export function isTokenExpiringSoon(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;

  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;

  return (expiry - now) <= fiveMinutes;
}

/**
 * Clear the token blacklist (for testing purposes only)
 * WARNING: Do not use in production!
 */
export function clearBlacklist(): void {
  if (process.env.NODE_ENV !== 'test') {
    logger.warn('Attempted to clear blacklist outside of test environment');
    return;
  }
  tokenBlacklist.clear();
  logger.debug('Token blacklist cleared');
}

// Export configuration for testing
export const JWT_TEST_CONFIG = process.env.NODE_ENV === 'test' ? JWT_CONFIG : undefined;

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  extractUserId,
  decodeToken,
  blacklistToken,
  isTokenBlacklisted,
  refreshAccessToken,
  getTokenExpiry,
  isTokenExpiringSoon,
  clearBlacklist,
};
