# Rate Limiting Production Testing Guide

## Quick Start - Production Testing

### 1. Start Services with Docker Compose
```bash
# Start all services (PostgreSQL, Redis, App)
docker-compose up -d

# Verify all services are running
docker-compose ps

# Check Redis is connected
docker-compose logs redis | grep "Ready to accept connections"

# Check app logs for Redis connection
docker-compose logs app | grep "Redis client connected"
```

### 2. Alternative: Development Mode with Mock Data
```bash
# If you want to test without Docker, use mock mode
export USE_MOCK_DB=true
export REDIS_URL=redis://localhost:6379  # Optional: only if Redis is running locally

# Start the development server
npm run dev

# Server will start on http://localhost:3000
```

### 3. Alternative: Redis-only Testing (No PostgreSQL)
```bash
# Start only Redis
docker-compose up -d redis

# Set environment variables
export USE_MOCK_DB=true
export REDIS_URL=redis://localhost:6379

# Start the app
npm run dev
```

## Testing Rate Limits

### Test 1: Basic Rate Limit Test
```bash
# This will make 105 requests (limit is 100 per 15 minutes)
for i in {1..105}; do
  echo "Request $i:"
  curl -i -s http://localhost:3000/api/v1/requirements 2>/dev/null | grep -E "X-RateLimit|HTTP|429" | head -3
  echo "---"
done
```

Expected output:
- Requests 1-100: HTTP/1.1 200 OK with decreasing X-RateLimit-Remaining
- Requests 101-105: HTTP/1.1 429 Too Many Requests

### Test 2: Check Rate Limit Headers
```bash
# Single request to see all headers
curl -i http://localhost:3000/api/v1/requirements 2>/dev/null | grep "X-RateLimit"
```

Expected headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: [timestamp]
```

### Test 3: Verify Health Check Bypass
```bash
# Health check should never be rate limited
for i in {1..200}; do
  curl -s http://localhost:3000/health | jq -r .status
done | sort | uniq -c
```

Expected: All 200 requests return "ok" (no rate limiting)

### Test 4: Test Rate Limit Reset
```bash
# Hit the rate limit
for i in {1..101}; do
  curl -s http://localhost:3000/api/v1/requirements > /dev/null
done

# Check we're rate limited
curl -i -s http://localhost:3000/api/v1/requirements | grep "429"

# Wait for window to reset (or manually clear in Redis)
docker exec conductor_redis redis-cli FLUSHALL  # Force reset

# Should work again
curl -i http://localhost:3000/api/v1/requirements | grep "HTTP"
```

### Test 5: Load Test with Apache Bench
```bash
# Install ab if needed: apt-get install apache2-utils or brew install apache-bench

# Test with 200 requests, 10 concurrent
ab -n 200 -c 10 http://localhost:3000/api/v1/requirements

# Look for:
# - Non-2xx responses: 100 (these are 429 responses)
# - Complete requests: 200
```

### Test 6: Test Different Rate Limits
```bash
# The implementation has different limits for different operations:
# - Auth endpoints: 5 requests per 15 minutes
# - Standard API: 100 requests per 15 minutes
# - Read operations: 1000 requests per 15 minutes
# - Write operations: 20 requests per 15 minutes

# Test a write operation (POST)
for i in {1..25}; do
  echo "POST Request $i:"
  curl -X POST -H "Content-Type: application/json" \
    -d '{"title":"Test","description":"Test"}' \
    -i -s http://localhost:3000/api/v1/requirements 2>/dev/null | grep -E "X-RateLimit-Remaining|429"
done
```

## Monitoring Rate Limits in Redis

### View Rate Limit Keys
```bash
# Connect to Redis
docker exec -it conductor_redis redis-cli

# In Redis CLI:
KEYS rate-limit:*
```

### Check a Specific IP's Rate Limit
```bash
# Check current window for an IP
docker exec conductor_redis redis-cli ZRANGE "rate-limit:api:::1" 0 -1 WITHSCORES
```

### Clear All Rate Limits (Testing Only)
```bash
docker exec conductor_redis redis-cli --scan --pattern "rate-limit:*" | xargs -L 1 docker exec conductor_redis redis-cli DEL
```

## Testing Resilience

### Test 1: Redis Failure Fallback
```bash
# Stop Redis while app is running
docker-compose stop redis

# Make requests - should still work with in-memory fallback
curl -i http://localhost:3000/api/v1/requirements

# Check logs for fallback message
docker-compose logs app | grep "fallback"
```

### Test 2: Redis Recovery
```bash
# Start Redis again
docker-compose start redis

# App should automatically reconnect
docker-compose logs -f app | grep "Redis client connected"
```

## Production Checklist

### Before Going Live
- [ ] Redis is running and accessible
- [ ] REDIS_URL environment variable is set
- [ ] Trust proxy is enabled (for accurate IPs behind load balancer)
- [ ] Rate limit values are appropriate for your traffic
- [ ] Monitoring is set up for 429 responses
- [ ] Clear communication to API consumers about limits

### Environment Variables
```bash
# Production settings
NODE_ENV=production
REDIS_URL=redis://redis:6379  # Or your Redis URL
PORT=3000

# Optional: Use mock database for testing without PostgreSQL
USE_MOCK_DB=true  # Remove this for real database
```

### Quick Status Check
```bash
# Check everything is working
curl http://localhost:3000/health | jq

# Expected output includes:
# - status: "ok"
# - database: "connected" or "disconnected"
# - environment: "production"
```

## Troubleshooting

### Issue: Rate limits not working
1. Check Redis connection:
   ```bash
   docker-compose logs app | grep -E "Redis|redis"
   ```
2. Verify REDIS_URL is set:
   ```bash
   docker-compose exec app printenv | grep REDIS
   ```

### Issue: Getting rate limited too quickly
1. Check your IP is correctly detected:
   ```bash
   curl http://localhost:3000/api/v1/requirements -i | grep "X-Forwarded-For"
   ```
2. Ensure `trust proxy` is set if behind a proxy/load balancer

### Issue: Different IPs sharing rate limit
- This usually means the proxy IP is being used instead of client IP
- Check the `trust proxy` setting in src/index.ts
- Verify X-Forwarded-For headers are being sent by your proxy

## Performance Metrics

### Expected Performance
- Rate limit check: < 5ms per request
- Redis lookup: < 2ms average
- Memory usage: < 100MB for 10,000 tracked IPs
- No noticeable latency for legitimate requests

### Monitor Performance
```bash
# Check response times
time curl http://localhost:3000/api/v1/requirements

# Monitor Redis memory
docker exec conductor_redis redis-cli INFO memory | grep used_memory_human

# Check app memory
docker stats conductor_app
```

## Demo Scenarios

### Scenario 1: Normal User Experience
```bash
# Simulate normal usage (well under limit)
for i in {1..10}; do
  curl -s http://localhost:3000/api/v1/requirements | jq '.success'
  sleep 1
done
```

### Scenario 2: Aggressive Client
```bash
# Simulate aggressive client hitting limits
echo "Simulating aggressive client..."
for i in {1..150}; do
  response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/requirements)
  code=$(echo "$response" | tail -1)
  if [ "$code" = "429" ]; then
    echo "Rate limited at request $i"
    break
  fi
done
```

### Scenario 3: Multiple Clients
```bash
# Simulate multiple clients with different IPs
for ip in "1.1.1.1" "2.2.2.2" "3.3.3.3"; do
  echo "Testing from IP: $ip"
  curl -H "X-Forwarded-For: $ip" http://localhost:3000/api/v1/requirements -i | grep "X-RateLimit-Remaining"
done
```

## Success Criteria

✅ Rate limiting is working when:
1. Requests beyond limit receive 429 status
2. X-RateLimit-* headers are present
3. Health check is never rate limited
4. Rate limits reset after time window
5. App continues working if Redis fails (fallback to memory)
6. Different endpoints have different limits
7. Rate limits are per-IP, not global

## Clean Up After Testing

```bash
# Stop all services
docker-compose down

# Remove volumes (careful - this deletes data!)
docker-compose down -v

# Clean Redis rate limit keys only
docker exec conductor_redis redis-cli --scan --pattern "rate-limit:*" | xargs -L 1 docker exec conductor_redis redis-cli DEL
```