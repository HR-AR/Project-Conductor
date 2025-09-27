/**
 * Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitConfig } from '../models/auth.model';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Generate key for this client
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : getDefaultKey(req);

    const now = Date.now();

    // Get or create rate limit entry
    let rateLimit = rateLimitStore[key];
    if (!rateLimit || rateLimit.resetTime < now) {
      rateLimit = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore[key] = rateLimit;
    }

    // Check if limit exceeded
    if (rateLimit.count >= config.max) {
      // Set rate limit headers
      if (config.standardHeaders !== false) {
        res.setHeader('RateLimit-Limit', config.max.toString());
        res.setHeader('RateLimit-Remaining', '0');
        res.setHeader('RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
      }

      if (config.legacyHeaders !== false) {
        res.setHeader('X-RateLimit-Limit', config.max.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());
      }

      res.setHeader('Retry-After', Math.ceil((rateLimit.resetTime - now) / 1000).toString());

      res.status(429).json({
        success: false,
        error: {
          message: config.message || 'Too many requests, please try again later.',
          statusCode: 429,
          retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000),
        },
      });
      return;
    }

    // Increment counter
    rateLimit.count++;

    // Set rate limit headers
    const remaining = config.max - rateLimit.count;

    if (config.standardHeaders !== false) {
      res.setHeader('RateLimit-Limit', config.max.toString());
      res.setHeader('RateLimit-Remaining', remaining.toString());
      res.setHeader('RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    }

    if (config.legacyHeaders !== false) {
      res.setHeader('X-RateLimit-Limit', config.max.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());
    }

    // Continue to next middleware
    next();
    return;
  };
}

/**
 * Get default key for rate limiting
 */
function getDefaultKey(req: Request): string {
  // Use API key if present
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api:${apiKey}`;
  }

  // Use user ID if authenticated
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const key in rateLimitStore) {
    const entry = rateLimitStore[key];
    if (entry && entry.resetTime < now) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => delete rateLimitStore[key]);
}

// Clean up every minute
setInterval(cleanupRateLimitStore, 60000);

/**
 * Default rate limiters
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: 'Too many write operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * API key based rate limiter
 */
export function apiKeyRateLimiter(limits: Record<string, number>) {
  return createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Default to 60 requests per minute
    keyGenerator: (req: Request) => {
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey && limits[apiKey]) {
        return `apikey:${apiKey}:${limits[apiKey]}`;
      }
      return `apikey:default`;
    },
    message: 'API rate limit exceeded.',
    standardHeaders: true,
  });
}

/**
 * Dynamic rate limiter based on user tier
 */
export function tierBasedRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userTier = (req as any).user?.tier || 'free';

  const limits: Record<string, RateLimitConfig> = {
    ['free']: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100,
    },
    ['basic']: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 500,
    },
    ['pro']: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 2000,
    },
    ['enterprise']: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10000,
    },
  };

  let config = limits[userTier];
  if (!config) {
    const fallback = limits['free'];
    config = fallback;
  }

  if (!config) {
    throw new Error('Rate limit configuration is missing for tierBasedRateLimiter');
  }

  const limiterConfig: RateLimitConfig = {
    windowMs: config.windowMs,
    max: config.max,
    message: `Rate limit exceeded for ${userTier} tier.`,
    standardHeaders: true,
  };

  const limiter = createRateLimiter(limiterConfig);
  limiter(req, res, next);
}

export default {
  createRateLimiter,
  cleanupRateLimitStore,
  defaultRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  apiKeyRateLimiter,
  tierBasedRateLimiter,
};
