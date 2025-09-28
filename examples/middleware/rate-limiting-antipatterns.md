# Rate Limiting Anti-Patterns to Avoid

## 1. ❌ Using In-Memory Store in Clustered Environment

### The Problem
```typescript
// BAD: Each instance has its own counter
const requestCounts = new Map();

app.use((req, res, next) => {
  const count = requestCounts.get(req.ip) || 0;
  if (count > 100) {
    return res.status(429).send('Too many requests');
  }
  requestCounts.set(req.ip, count + 1);
  next();
});
```

### Why It's Bad
- Each Node.js instance maintains its own counter
- With 4 instances, a 100 req/min limit becomes 400 req/min
- Rate limiting becomes ineffective

### The Solution
Always use a centralized store (Redis) for distributed deployments:
```typescript
// GOOD: Centralized Redis store
const store = new RedisSlidingWindowStore(redisClient, windowMs);
```

---

## 2. ❌ Non-Atomic Redis Operations

### The Problem
```typescript
// BAD: Race condition between GET and SET
async function incrementCounter(key: string) {
  const current = await redis.get(key) || 0;
  if (current > limit) {
    return false;
  }
  await redis.set(key, current + 1); // Race condition here!
  return true;
}
```

### Why It's Bad
- Two simultaneous requests can both read the same count
- Both pass the check before either increments
- Allows bypass of rate limits

### The Solution
Use atomic operations with transactions or Lua scripts:
```typescript
// GOOD: Atomic pipeline
const pipeline = redis.pipeline();
pipeline.incr(key);
pipeline.expire(key, ttl);
const results = await pipeline.exec();
```

---

## 3. ❌ Incorrect Client Identification

### The Problem
```typescript
// BAD: Using req.ip behind a proxy
app.use((req, res, next) => {
  const clientIp = req.ip; // This is the proxy's IP!
  rateLimiter.check(clientIp);
});
```

### Why It's Bad
- `req.ip` returns the immediate connection IP
- Behind a proxy/load balancer, this is the proxy's IP
- All users share the same rate limit
- Creates self-inflicted DoS

### The Solution
Configure Express to trust the proxy:
```typescript
// GOOD: Trust proxy and use correct IP
app.set('trust proxy', 1); // Trust first proxy

// Or use X-Forwarded-For header explicitly
const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
```

---

## 4. ❌ Failing Closed Without Fallback

### The Problem
```typescript
// BAD: No error handling
app.use(async (req, res, next) => {
  const count = await redis.incr(key); // Throws if Redis is down
  if (count > limit) {
    return res.status(429).send('Too many requests');
  }
  next();
});
```

### Why It's Bad
- If Redis fails, entire API becomes unavailable
- Single point of failure
- Poor user experience during outages

### The Solution
Implement graceful degradation:
```typescript
// GOOD: Fallback to in-memory or fail open
try {
  const count = await redis.incr(key);
  // ... rate limit logic
} catch (error) {
  console.error('Rate limiter failed, failing open:', error);
  // Either use fallback store or allow request through
  next();
}
```

---

## 5. ❌ No Rate Limit Headers

### The Problem
```typescript
// BAD: No feedback to clients
if (count > limit) {
  return res.status(429).json({ error: 'Too many requests' });
}
```

### Why It's Bad
- Clients don't know when they can retry
- No visibility into current usage
- Poor developer experience

### The Solution
Always include standard rate limit headers:
```typescript
// GOOD: Include rate limit headers
res.setHeader('X-RateLimit-Limit', maxRequests);
res.setHeader('X-RateLimit-Remaining', remaining);
res.setHeader('X-RateLimit-Reset', resetTime);
res.setHeader('Retry-After', retryAfter); // When rate limited
```

---

## 6. ❌ Fixed Window Instead of Sliding Window

### The Problem
```typescript
// BAD: Fixed window allows bursts
const windows = new Map();

function getRateLimitKey(ip: string) {
  const minute = Math.floor(Date.now() / 60000);
  return `${ip}:${minute}`;
}
```

### Why It's Bad
- Allows double the rate limit at window boundaries
- User can make 100 requests at 11:59:59 and 100 more at 12:00:00
- Creates unfair burst behavior

### The Solution
Use sliding window algorithm:
```typescript
// GOOD: Sliding window prevents bursts
const windowStart = Date.now() - windowMs;
await redis.zremrangebyscore(key, '-inf', windowStart);
```

---

## 7. ❌ Not Considering IPv6

### The Problem
```typescript
// BAD: IPv4-only assumption
const key = `rate-limit:${req.ip.replace(/\./g, '-')}`;
```

### Why It's Bad
- IPv6 addresses contain colons, not dots
- Key generation fails for IPv6 clients
- Rate limiting breaks for IPv6 users

### The Solution
Handle both IPv4 and IPv6:
```typescript
// GOOD: Works with both IPv4 and IPv6
const key = `rate-limit:${Buffer.from(req.ip).toString('base64')}`;
// Or use a hash
const key = `rate-limit:${crypto.createHash('sha256').update(req.ip).digest('hex')}`;
```

---

## 8. ❌ No Bypass for Health Checks

### The Problem
```typescript
// BAD: Rate limiting everything including health checks
app.use(rateLimiter); // Applied to ALL routes
app.get('/health', (req, res) => res.send('OK'));
```

### Why It's Bad
- Monitoring systems get rate limited
- Health checks fail during high traffic
- Can trigger false alarms

### The Solution
Exclude health checks from rate limiting:
```typescript
// GOOD: Skip rate limiting for health checks
app.get('/health', (req, res) => res.send('OK')); // Before rate limiter
app.use('/api', rateLimiter); // Only on API routes
```

---

## Security Considerations

### IP Spoofing Prevention
- Only trust `X-Forwarded-For` from known proxies
- Validate proxy chain configuration
- Consider using API keys for better identification

### DDoS Protection
- Rate limiting alone isn't enough for DDoS
- Combine with CDN/WAF protection
- Implement progressive blocking for repeat offenders

### Privacy Compliance
- IP addresses are PII under GDPR
- Document retention policies
- Implement data minimization (don't log IPs longer than needed)