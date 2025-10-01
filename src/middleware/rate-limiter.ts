/**
 * Rate Limiting Middleware for Project Conductor
 * Implements sliding window algorithm with Redis and fallback to in-memory
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RedisClientType } from 'redis';
import logger from '../utils/logger';

// Rate limit store interface
export interface IRateLimitStore {
  increment(key: string): Promise<{ current: number; ttl: number }>;
  reset?(key: string): Promise<void>;
}

// Rate limiter configuration
export interface RateLimiterOptions {
  store: IRateLimitStore;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * Redis sliding window store implementation
 */
export class RedisSlidingWindowStore implements IRateLimitStore {
  private readonly client: RedisClientType;
  private readonly windowMs: number;
  private readonly keyPrefix: string;

  constructor(client: RedisClientType, windowMs: number, keyPrefix = 'rate-limit:') {
    this.client = client;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const uniqueRequestId = `${now}-${Math.random()}`;

    try {
      // Use multi for transaction
      const multi = this.client.multi();
      multi.zRemRangeByScore(fullKey, '-inf', windowStart.toString());
      multi.zAdd(fullKey, { score: now, value: uniqueRequestId });
      multi.zCard(fullKey);
      multi.expire(fullKey, Math.ceil(this.windowMs / 1000) + 1);

      const results = await multi.exec();
      if (!results) {
        throw new Error('Redis multi execution failed');
      }

      // zCard result is at index 2
      const count = results[2] as number;
      const ttlSeconds = Math.ceil((windowStart + this.windowMs - now) / 1000);

      return {
        current: count,
        ttl: Math.max(1, ttlSeconds)
      };
    } catch (error) {
      throw new Error(`Redis sliding window increment failed: ${error}`);
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.client.del(fullKey);
  }
}

/**
 * In-memory fallback store
 */
export class InMemoryRateLimitStore implements IRateLimitStore {
  private storage = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    // Periodic cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    const existing = this.storage.get(key);

    if (!existing || existing.resetTime < now) {
      this.storage.set(key, { count: 1, resetTime });
      return { current: 1, ttl: Math.ceil(this.windowMs / 1000) };
    }

    existing.count++;
    const ttlMs = existing.resetTime - now;
    return {
      current: existing.count,
      ttl: Math.ceil(ttlMs / 1000)
    };
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.storage.entries()) {
      if (value.resetTime < now) {
        this.storage.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

/**
 * Resilient store with fallback
 */
export class ResilientStore implements IRateLimitStore {
  private primaryStore: IRateLimitStore;
  private fallbackStore: IRateLimitStore;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(
    primary: IRateLimitStore,
    fallback: IRateLimitStore,
    failureThreshold = 3,
    resetTimeout = 60000
  ) {
    this.primaryStore = primary;
    this.fallbackStore = fallback;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    // Check if circuit should be reset
    if (this.circuitState === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.resetTimeout) {
        this.circuitState = 'half-open';
        this.failureCount = 0;
      }
    }

    // Use fallback if circuit is open
    if (this.circuitState === 'open') {
      return this.fallbackStore.increment(key);
    }

    try {
      const result = await this.primaryStore.increment(key);

      if (this.circuitState === 'half-open') {
        this.circuitState = 'closed';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.circuitState = 'open';
        logger.warn('Rate limiter circuit opened, using fallback store');
      }

      return this.fallbackStore.increment(key);
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.primaryStore.reset?.(key);
    } catch {
      // Ignore errors
    }
    await this.fallbackStore.reset?.(key);
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const {
    store,
    maxRequests,
    message = 'Too many requests, please try again later.'
  } = options;

  const keyGenerator = options.keyGenerator || ((req: Request) => {
    // Trust proxy to get real IP
    return req.ip || 'unknown';
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);

    try {
      const { current, ttl } = await store.increment(key);
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Math.ceil(Date.now() / 1000) + ttl;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (current > maxRequests) {
        res.setHeader('Retry-After', ttl.toString());

        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            message,
            retryAfter: ttl
          });
        }
        return;
      }

      next();
    } catch (error) {
      // Log error and fail open to maintain availability
      logger.error({ error }, 'Rate limiter error');
      next();
    }
  };
}

// Export factory function for creating configured rate limiters
export function createDefaultRateLimiter(
  redisClient?: RedisClientType,
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxRequests = 100
): RequestHandler {
  let store: IRateLimitStore;

  if (redisClient) {
    const redisStore = new RedisSlidingWindowStore(redisClient, windowMs);
    const fallbackStore = new InMemoryRateLimitStore(windowMs);
    store = new ResilientStore(redisStore, fallbackStore);
  } else {
    store = new InMemoryRateLimitStore(windowMs);
  }

  return createRateLimiter({
    store,
    maxRequests,
    windowMs
  });
}

// Export specific rate limiters for different use cases
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: (redisClient?: RedisClientType) => createDefaultRateLimiter(redisClient, 15 * 60 * 1000, 5),

  // Standard API limit
  api: (redisClient?: RedisClientType) => createDefaultRateLimiter(redisClient, 15 * 60 * 1000, 100),

  // Relaxed limit for read operations
  read: (redisClient?: RedisClientType) => createDefaultRateLimiter(redisClient, 15 * 60 * 1000, 1000),

  // Very strict for write operations
  write: (redisClient?: RedisClientType) => createDefaultRateLimiter(redisClient, 15 * 60 * 1000, 20)
};