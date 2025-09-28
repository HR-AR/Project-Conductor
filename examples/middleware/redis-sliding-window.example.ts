/**
 * PATTERN: Sliding Window with Redis Sorted Sets
 * USE WHEN: You need a highly accurate, distributed rate limiter that performs well under load. This is ideal for production environments with multiple server instances.
 * KEY CONCEPTS:
 * - Redis Sorted Sets (ZSET): A Redis data structure that stores unique members with associated scores (timestamps, in this case).
 * - Atomic Transactions: Using Redis's MULTI/EXEC commands to ensure that the sequence of operations (remove old entries, add new one, count) happens atomically, preventing race conditions.
 * - Time-based Scoring: The score for each request is its timestamp, making it easy to remove expired entries.
 * TRADE-OFFS:
 * - Pro: More accurate than a fixed-window counter; prevents bursts at the edge of a window.
 * - Pro: Memory efficient, as Redis handles data expiration automatically.
 * - Con: Slightly more complex to implement than simpler algorithms.
 */
import { Redis } from 'ioredis';
import { IRateLimitStore } from './rate-limiter-factory.example';

export class RedisSlidingWindowStore implements IRateLimitStore {
  private readonly client: Redis;
  private readonly windowMs: number;
  private readonly keyPrefix: string;

  constructor(client: Redis, windowMs: number, keyPrefix: string = 'rate-limit:') {
    this.client = client;
    this.windowMs = windowMs;
    this.keyPrefix = keyPrefix;
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const uniqueRequestId = `${now}-${Math.random()}`;

    // Use a pipeline for better performance
    const pipeline = this.client.pipeline();

    // 1. Remove requests older than the window
    pipeline.zremrangebyscore(fullKey, '-inf', windowStart);

    // 2. Add the new request with current timestamp as score
    pipeline.zadd(fullKey, now, uniqueRequestId);

    // 3. Count the number of requests in the window
    pipeline.zcard(fullKey);

    // 4. Set expiry to auto-clean Redis memory (window + buffer)
    pipeline.expire(fullKey, Math.ceil(this.windowMs / 1000) + 1);

    try {
      const results = await pipeline.exec();

      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      // Extract count from results
      const countResult = results[2];
      if (!countResult || countResult[0]) {
        throw new Error('Failed to get count from Redis');
      }

      const count = countResult[1] as number;
      const ttlSeconds = Math.ceil((windowStart + this.windowMs - now) / 1000);

      return {
        current: count,
        ttl: Math.max(1, ttlSeconds) // Ensure at least 1 second TTL
      };
    } catch (error) {
      // Re-throw with context
      throw new Error(`Redis sliding window increment failed: ${error}`);
    }
  }

  /**
   * Optional: Get current count without incrementing
   */
  async getCount(key: string): Promise<number> {
    const fullKey = `${this.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove old entries and get count atomically
    const pipeline = this.client.pipeline();
    pipeline.zremrangebyscore(fullKey, '-inf', windowStart);
    pipeline.zcard(fullKey);

    const results = await pipeline.exec();
    return (results?.[1]?.[1] as number) ?? 0;
  }

  /**
   * Optional: Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    await this.client.del(fullKey);
  }
}

// Usage example:
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

const slidingWindowStore = new RedisSlidingWindowStore(
  redis,
  15 * 60 * 1000, // 15 minute window
  'api-rate-limit:'
);
*/

// Source: https://redis.io/commands/zremrangebyscore/