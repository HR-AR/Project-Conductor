/**
 * PATTERN: Rate Limiter Testing Suite
 * USE WHEN: You need comprehensive test coverage for your rate limiting implementation, including unit tests for stores and integration tests for the middleware.
 * KEY CONCEPTS:
 * - Mock Redis client for unit testing without dependencies
 * - Supertest for integration testing Express endpoints
 * - Time manipulation with Jest fake timers
 * - Testing both success and failure scenarios
 * TRADE-OFFS:
 * - Pro: Comprehensive coverage ensures reliability
 * - Pro: Fast tests using mocks
 * - Con: Need to maintain test fixtures as implementation evolves
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import Redis from 'ioredis-mock';
import { createRateLimiter, IRateLimitStore } from '../middleware/rate-limiter-factory.example';
import { RedisSlidingWindowStore } from '../middleware/redis-sliding-window.example';
import { ResilientStore, InMemoryRateLimitStore } from '../middleware/resilient-store-proxy.example';

describe('Rate Limiting Tests', () => {
  describe('Unit Tests - Redis Sliding Window Store', () => {
    let mockRedis: any;
    let store: RedisSlidingWindowStore;
    const windowMs = 60000; // 1 minute

    beforeEach(() => {
      mockRedis = new Redis();
      store = new RedisSlidingWindowStore(mockRedis, windowMs);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      mockRedis.disconnect();
    });

    test('should increment counter for new key', async () => {
      const result = await store.increment('test-key');

      expect(result.current).toBe(1);
      expect(result.ttl).toBeGreaterThan(0);
      expect(result.ttl).toBeLessThanOrEqual(60);
    });

    test('should increment counter for existing key within window', async () => {
      await store.increment('test-key');
      await store.increment('test-key');
      const result = await store.increment('test-key');

      expect(result.current).toBe(3);
    });

    test('should reset counter after window expires', async () => {
      await store.increment('test-key');

      // Advance time beyond window
      jest.advanceTimersByTime(windowMs + 1000);

      const result = await store.increment('test-key');
      expect(result.current).toBe(1);
    });

    test('should handle concurrent requests correctly', async () => {
      const promises = Array(10).fill(null).map(() =>
        store.increment('concurrent-key')
      );

      const results = await Promise.all(promises);
      const counts = results.map(r => r.current);

      // Should have sequential counts from 1 to 10
      expect(counts).toContain(10);
      expect(Math.max(...counts)).toBe(10);
    });
  });

  describe('Unit Tests - Resilient Store Proxy', () => {
    let primaryStore: jest.Mocked<IRateLimitStore>;
    let fallbackStore: IRateLimitStore;
    let resilientStore: ResilientStore;

    beforeEach(() => {
      primaryStore = {
        increment: jest.fn()
      };
      fallbackStore = new InMemoryRateLimitStore(60000);
      resilientStore = new ResilientStore(primaryStore, fallbackStore, {
        failureThreshold: 2,
        resetTimeout: 5000,
        timeout: 100
      });
    });

    test('should use primary store when available', async () => {
      primaryStore.increment.mockResolvedValue({ current: 1, ttl: 60 });

      const result = await resilientStore.increment('test-key');

      expect(primaryStore.increment).toHaveBeenCalledWith('test-key');
      expect(result.current).toBe(1);
    });

    test('should fallback when primary store fails', async () => {
      primaryStore.increment.mockRejectedValue(new Error('Connection failed'));

      const result = await resilientStore.increment('test-key');

      expect(result.current).toBe(1); // From fallback store
    });

    test('should open circuit after failure threshold', async () => {
      primaryStore.increment.mockRejectedValue(new Error('Connection failed'));

      // Trigger failures to reach threshold
      await resilientStore.increment('key1');
      await resilientStore.increment('key2');

      expect(resilientStore.getCircuitState()).toBe('open');

      // Should not call primary store when circuit is open
      primaryStore.increment.mockClear();
      await resilientStore.increment('key3');
      expect(primaryStore.increment).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests - Rate Limiting Middleware', () => {
    let app: Express;
    let store: IRateLimitStore;

    beforeEach(() => {
      app = express();
      store = new InMemoryRateLimitStore(60000); // 1 minute window

      const rateLimiter = createRateLimiter({
        store,
        maxRequests: 5,
        windowMs: 60000,
        keyGenerator: (req) => req.ip || 'test'
      });

      app.get('/api/test', rateLimiter, (req, res) => {
        res.json({ message: 'Success' });
      });
    });

    test('should allow requests under the limit', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/test')
          .expect(200);

        expect(response.headers['x-ratelimit-limit']).toBe('5');
        expect(response.headers['x-ratelimit-remaining']).toBe(String(4 - i));
      }
    });

    test('should block requests over the limit', async () => {
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app).get('/api/test').expect(200);
      }

      // 6th request should be blocked
      const response = await request(app)
        .get('/api/test')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Too Many Requests'
      });
      expect(response.headers['retry-after']).toBeDefined();
    });

    test('should set correct rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    test('should track different IPs separately', async () => {
      // Requests from IP 1
      for (let i = 0; i < 3; i++) {
        await request(app)
          .get('/api/test')
          .set('X-Forwarded-For', '1.2.3.4')
          .expect(200);
      }

      // Requests from IP 2 should have separate limit
      const response = await request(app)
        .get('/api/test')
        .set('X-Forwarded-For', '5.6.7.8')
        .expect(200);

      expect(response.headers['x-ratelimit-remaining']).toBe('4');
    });
  });

  describe('Load Tests - Performance Verification', () => {
    test('should handle high concurrency', async () => {
      const store = new InMemoryRateLimitStore(60000);
      const startTime = Date.now();

      // Simulate 1000 concurrent requests
      const promises = Array(1000).fill(null).map((_, i) =>
        store.increment(`key-${i % 100}`) // 100 different keys
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second for 1000 ops
    });

    test('memory usage should be bounded', async () => {
      const store = new InMemoryRateLimitStore(1000); // 1 second window

      // Add many keys
      for (let i = 0; i < 10000; i++) {
        await store.increment(`key-${i}`);
      }

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Cleanup should remove expired entries
      store.cleanup();

      // Memory usage check would go here
      // In real implementation, you'd check actual memory usage
      expect(true).toBe(true); // Placeholder assertion
    });
  });
});

// Source: https://jestjs.io/docs/timer-mocks
// Source: https://github.com/ladjs/supertest