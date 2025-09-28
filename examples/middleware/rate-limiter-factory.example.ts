/**
 * PATTERN: Configurable Middleware Factory
 * USE WHEN: You need to apply different rate limiting rules to various Express routes or groups of routes (e.g., stricter limits for login endpoints, looser for public read endpoints).
 * KEY CONCEPTS:
 * - Higher-Order Function: A function that returns another function (the Express middleware).
 * - Dependency Injection: The factory accepts a storage client (like Redis or in-memory) and options, decoupling the middleware from the storage implementation.
 * - Declarative Configuration: Allows you to define rate limits in a clear, configuration-driven way next to your route definitions.
 * TRADE-OFFS:
 * - Pro: Highly reusable, clean, and promotes separation of concerns.
 * - Pro: Centralizes the core rate-limiting logic.
 * - Con: Adds a small layer of abstraction compared to a single hardcoded middleware.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Define a common interface for any storage backend (Redis, in-memory, etc.)
export interface IRateLimitStore {
  increment(key: string): Promise<{ current: number; ttl: number }>;
}

export interface RateLimiterOptions {
  store: IRateLimitStore;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

// The factory function that creates the middleware
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const { store, maxRequests, windowMs } = options;
  const keyGenerator = options.keyGenerator ?? ((req) => req.ip || 'unknown');

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);

    try {
      const { current, ttl } = await store.increment(key);
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Math.ceil(Date.now() / 1000) + ttl;

      // Always set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      if (current > maxRequests) {
        res.setHeader('Retry-After', Math.ceil(ttl).toString());

        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        } else {
          res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
            retryAfter: ttl
          });
        }
        return;
      }

      next();
    } catch (error) {
      // Log the error and decide whether to fail open or closed
      console.error('Rate limiter error:', error);
      // TODO: Implement your error handling policy
      // Fail open (allow request) for now to maintain availability
      next();
    }
  };
}

// Usage example:
/*
const rateLimiter = createRateLimiter({
  store: redisStore,
  maxRequests: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyGenerator: (req) => req.user?.id || req.ip
});

app.use('/api', rateLimiter);
*/

// Source: https://github.com/express-rate-limit/express-rate-limit