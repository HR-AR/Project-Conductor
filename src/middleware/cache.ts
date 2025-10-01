/**
 * Redis Caching Middleware for API Responses
 */

import { Request, Response, NextFunction } from 'express';
import { RedisClientType } from 'redis';
import logger from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  keyPrefix?: string; // Prefix for cache keys
  excludeQuery?: string[]; // Query parameters to exclude from cache key
}

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, options: CacheOptions): string => {
  const prefix = options.keyPrefix || 'api';
  const path = req.path;

  // Filter out excluded query parameters
  const query = { ...req.query };
  if (options.excludeQuery) {
    options.excludeQuery.forEach(param => delete query[param]);
  }

  const queryString = Object.keys(query).length > 0
    ? JSON.stringify(query)
    : '';

  return `${prefix}:${path}:${queryString}`;
};

/**
 * Redis cache middleware factory
 * Caches GET requests only
 */
export const cacheMiddleware = (
  redisClient: RedisClientType | undefined,
  options: CacheOptions = {}
) => {
  const defaultOptions: CacheOptions = {
    ttl: 300, // 5 minutes default
    keyPrefix: 'api',
    excludeQuery: [],
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Skip if Redis is not available
    if (!redisClient || !redisClient.isOpen) {
      next();
      return;
    }

    const cacheKey = generateCacheKey(req, defaultOptions);

    try {
      // Try to get cached response
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.debug({ cacheKey }, 'Cache hit');

        // Parse and send cached response
        const cached = JSON.parse(cachedData);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.status(200).json(cached);
        return;
      }

      // Cache miss - continue to route handler
      logger.debug({ cacheKey }, 'Cache miss');
      res.set('X-Cache', 'MISS');

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = function (body: any): Response {
        // Only cache successful responses
        if (res.statusCode === 200) {
          redisClient.setEx(cacheKey, defaultOptions.ttl || 300, JSON.stringify(body))
            .catch(err => logger.error({ err, cacheKey }, 'Failed to cache response'));
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ error, cacheKey }, 'Cache middleware error');
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache on write operations (POST, PUT, DELETE, PATCH)
 */
export const cacheInvalidationMiddleware = (
  redisClient: RedisClientType | undefined,
  options: CacheOptions = {}
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Only invalidate on write operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      next();
      return;
    }

    // Skip if Redis is not available
    if (!redisClient || !redisClient.isOpen) {
      next();
      return;
    }

    const prefix = options.keyPrefix || 'api';

    try {
      // Get the base path for invalidation
      const pathParts = req.path.split('/').filter(Boolean);
      const basePath = pathParts.slice(0, 3).join('/'); // e.g., /api/v1/requirements

      // Pattern to match all cache keys for this resource
      const pattern = `${prefix}:/${basePath}*`;

      // Find all matching keys
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug({ pattern, count: keys.length }, 'Cache invalidated');
      }
    } catch (error) {
      logger.error({ error }, 'Cache invalidation error');
    }

    next();
  };
};

/**
 * ETag support middleware
 * Generates ETags for responses and handles If-None-Match requests
 */
export const etagMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Only handle GET and HEAD requests
  if (!['GET', 'HEAD'].includes(req.method)) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // Generate simple ETag from response body
    const etag = `"${Buffer.from(JSON.stringify(body)).toString('base64').substring(0, 27)}"`;

    // Set ETag header
    res.set('ETag', etag);

    // Check If-None-Match header
    const clientEtag = req.get('If-None-Match');
    if (clientEtag === etag) {
      res.status(304).end();
      return res;
    }

    return originalJson(body);
  };

  next();
};

/**
 * Cache control headers middleware
 * Sets appropriate Cache-Control headers based on route
 */
export const cacheControlMiddleware = (options: {
  public?: boolean;
  maxAge?: number; // in seconds
  staleWhileRevalidate?: number; // in seconds
  staleIfError?: number; // in seconds
} = {}) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const parts: string[] = [];

    if (options.public) {
      parts.push('public');
    } else {
      parts.push('private');
    }

    if (options.maxAge !== undefined) {
      parts.push(`max-age=${options.maxAge}`);
    }

    if (options.staleWhileRevalidate) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    if (options.staleIfError) {
      parts.push(`stale-if-error=${options.staleIfError}`);
    }

    res.set('Cache-Control', parts.join(', '));
    next();
  };
};
