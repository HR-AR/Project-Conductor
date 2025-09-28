# Rate Limiting Middleware Examples

This directory contains production-ready patterns for implementing API rate limiting in Express.js applications with Redis.

## Pattern Files

### 1. `rate-limiter-factory.example.ts`
**Pattern**: Configurable Middleware Factory
- Higher-order function that creates customized rate limiting middleware
- Supports dependency injection for different storage backends
- Includes proper rate limit headers (X-RateLimit-*)
- Source: [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)

### 2. `redis-sliding-window.example.ts`
**Pattern**: Sliding Window Algorithm with Redis Sorted Sets
- Distributed rate limiting using Redis ZSET
- Atomic operations prevent race conditions
- More accurate than fixed-window counters
- Auto-expiring keys for memory efficiency
- Source: [Redis ZSET Commands](https://redis.io/commands/zremrangebyscore/)

### 3. `resilient-store-proxy.example.ts`
**Pattern**: Circuit Breaker with Graceful Degradation
- Automatic failover from Redis to in-memory store
- Circuit breaker states: closed, open, half-open
- Configurable failure thresholds and reset timeouts
- Prevents total API failure during Redis outages
- Source: [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

### 4. `rate-limiting-antipatterns.md`
**Documentation**: Common Mistakes to Avoid
- In-memory stores in clustered environments
- Non-atomic Redis operations
- Incorrect client identification behind proxies
- Failing closed without fallback
- Missing rate limit headers
- Security and privacy considerations

## Test Examples

### `../tests/rate-limiter.test.example.ts`
Comprehensive test suite including:
- Unit tests for stores with mocked Redis
- Integration tests with Supertest
- Circuit breaker behavior tests
- Load and performance tests
- Time manipulation with Jest fake timers

## Usage in Project

These patterns have been integrated into the PRP for rate limiting:
- See: `docs/prps/PRP-add-api-rate-limiting-to-prevent-abuse-2025-09-28.md`

### Quick Implementation Guide

1. **Basic Setup**:
```typescript
import { createRateLimiter } from './rate-limiter-factory.example';
import { RedisSlidingWindowStore } from './redis-sliding-window.example';

const store = new RedisSlidingWindowStore(redisClient, 15 * 60 * 1000);
const limiter = createRateLimiter({
  store,
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
});

app.use('/api', limiter);
```

2. **With Resilience**:
```typescript
import { ResilientStore, InMemoryRateLimitStore } from './resilient-store-proxy.example';

const primaryStore = new RedisSlidingWindowStore(redis, windowMs);
const fallbackStore = new InMemoryRateLimitStore(windowMs);
const resilientStore = new ResilientStore(primaryStore, fallbackStore);

const limiter = createRateLimiter({
  store: resilientStore,
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
});
```

3. **Different Limits per Route**:
```typescript
const strictLimiter = createRateLimiter({
  store, maxRequests: 20, windowMs: 15 * 60 * 1000
});

const normalLimiter = createRateLimiter({
  store, maxRequests: 100, windowMs: 15 * 60 * 1000
});

app.post('/api/auth/login', strictLimiter, loginHandler);
app.get('/api/requirements', normalLimiter, getRequirements);
```

## Key Benefits

1. **Production Ready**: Battle-tested patterns from real applications
2. **Distributed**: Works across multiple server instances
3. **Resilient**: Continues working even if Redis fails
4. **Performant**: Optimized for high-throughput APIs
5. **Testable**: Comprehensive test examples included
6. **Secure**: Addresses common security pitfalls

## Notes

- All examples use TypeScript with strict typing (no 'any')
- Follow existing Project Conductor patterns
- Include proper error handling
- Ready for copy-paste implementation
- Each file < 200 lines for maintainability

## Research Sources

These patterns were researched using:
- Gemini AI assistance (2025-09-28)
- Express rate limit library documentation
- Redis best practices documentation
- Martin Fowler's Circuit Breaker pattern
- Production experience from various Node.js applications