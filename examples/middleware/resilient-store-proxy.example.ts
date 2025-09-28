/**
 * PATTERN: Graceful Degradation Store Proxy
 * USE WHEN: You need to ensure high availability for your rate-limiting feature. It prevents a Redis outage from taking down your entire API.
 * KEY CONCEPTS:
 * - Proxy Pattern: A wrapper object that controls access to another object (the primary store), adding behavior like fallback logic.
 * - Circuit Breaker (Simplified): The proxy can track the health of the primary store and avoid retrying it for a period after a failure, preventing repeated timeouts.
 * - State Management: The proxy needs to manage the state of the primary store (e.g., 'available' or 'unavailable').
 * TRADE-OFFS:
 * - Pro: Massively increases the resilience and availability of your application.
 * - Con: When fallen back to an in-memory store, the rate limit is no longer distributed and is per-instance, which is less accurate but better than failing completely.
 * - Con: Adds complexity to the overall architecture.
 */
import { IRateLimitStore } from './rate-limiter-factory.example';

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Number of failures before opening circuit
  resetTimeout?: number;           // Time in ms before attempting to close circuit
  timeout?: number;                // Request timeout in ms
}

export class ResilientStore implements IRateLimitStore {
  private primaryStore: IRateLimitStore;
  private fallbackStore: IRateLimitStore;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    primary: IRateLimitStore,
    fallback: IRateLimitStore,
    options: CircuitBreakerOptions = {}
  ) {
    this.primaryStore = primary;
    this.fallbackStore = fallback;
    this.options = {
      failureThreshold: options.failureThreshold ?? 3,
      resetTimeout: options.resetTimeout ?? 60000, // 1 minute
      timeout: options.timeout ?? 1000, // 1 second
    };
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    // Check if circuit should be reset
    if (this.circuitState === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.options.resetTimeout) {
        this.circuitState = 'half-open';
        this.failureCount = 0;
      }
    }

    // If circuit is open, use fallback immediately
    if (this.circuitState === 'open') {
      console.warn('Circuit breaker open - using fallback store');
      return this.fallbackStore.increment(key);
    }

    try {
      // Attempt to use primary store with timeout
      const result = await this.withTimeout(
        this.primaryStore.increment(key),
        this.options.timeout
      );

      // Success - reset failure count if in half-open state
      if (this.circuitState === 'half-open') {
        this.circuitState = 'closed';
        this.failureCount = 0;
        console.info('Circuit breaker closed - primary store recovered');
      }

      return result;
    } catch (error) {
      return this.handlePrimaryFailure(key, error);
    }
  }

  private async handlePrimaryFailure(
    key: string,
    error: unknown
  ): Promise<{ current: number; ttl: number }> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.error(`Primary store failure (${this.failureCount}/${this.options.failureThreshold}):`, error);

    // Open circuit if threshold reached
    if (this.failureCount >= this.options.failureThreshold) {
      this.circuitState = 'open';
      console.error('Circuit breaker opened - switching to fallback store');
      // TODO: Send alert to monitoring system
    }

    // Use fallback store
    return this.fallbackStore.increment(key);
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Get current circuit state for monitoring
   */
  getCircuitState(): string {
    return this.circuitState;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

// In-memory fallback store implementation
export class InMemoryRateLimitStore implements IRateLimitStore {
  private storage = new Map<string, { count: number; resetTime: number }>();
  private readonly windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<{ current: number; ttl: number }> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    const existing = this.storage.get(key);

    if (!existing || existing.resetTime < now) {
      // New window
      this.storage.set(key, { count: 1, resetTime });
      return { current: 1, ttl: Math.ceil(this.windowMs / 1000) };
    }

    // Increment in current window
    existing.count++;
    const ttlMs = existing.resetTime - now;
    return {
      current: existing.count,
      ttl: Math.ceil(ttlMs / 1000)
    };
  }

  // Periodic cleanup to prevent memory leak
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.storage.entries()) {
      if (value.resetTime < now) {
        this.storage.delete(key);
      }
    }
  }
}

// Usage example:
/*
const primaryStore = new RedisSlidingWindowStore(redis, windowMs);
const fallbackStore = new InMemoryRateLimitStore(windowMs);
const resilientStore = new ResilientStore(primaryStore, fallbackStore, {
  failureThreshold: 3,
  resetTimeout: 60000,
  timeout: 1000
});

// Use in rate limiter
const rateLimiter = createRateLimiter({
  store: resilientStore,
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
});
*/

// Source: https://martinfowler.com/bliki/CircuitBreaker.html