# Deployment Guide - Render

This comprehensive guide explains how to deploy Project Conductor to Render with optimized production and staging environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Deploy](#quick-deploy-using-renderyaml)
4. [Environment Configuration](#environment-configuration)
5. [Database Migrations](#database-migrations)
6. [Health Checks & Monitoring](#health-checks--monitoring)
7. [Scaling & Performance](#scaling--performance)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)
10. [Post-Deployment Verification](#post-deployment-verification)

## Prerequisites

1. **GitHub account** with your code pushed to a repository
2. **Render account** (sign up at https://render.com)
3. **Git CLI** installed locally
4. **Node.js 16+** for local development and testing

## Architecture Overview

The optimized render.yaml configuration deploys:

### Production Environment
- **Web Service**: `project-conductor-prod`
- **PostgreSQL**: `conductor-postgres-prod`
- **Redis**: `conductor-redis-prod`
- **Auto-deploy**: Enabled (deploys on git push to main)

### Staging Environment
- **Web Service**: `project-conductor-staging`
- **PostgreSQL**: `conductor-postgres-staging`
- **Redis**: `conductor-redis-staging`
- **Auto-deploy**: Disabled (manual deployment for testing)

### Key Optimizations
- **Build optimization**: Uses `npm ci --prefer-offline --no-audit` for faster, deterministic builds
- **Connection pooling**: Configured for optimal database performance (10 connections prod, 5 staging)
- **SSL enabled**: All database connections use SSL
- **Health checks**: Automated health monitoring at `/health` endpoint
- **Compression**: Response compression enabled for better performance
- **Logging**: JSON format for production, pretty format for staging
- **Cold start minimization**: Optimized startup sequence with connection pooling

## Quick Deploy (Using render.yaml)

Project Conductor includes an optimized `render.yaml` file for automated deployment of both production and staging environments.

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/project-conductor.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"**

### Step 3: Monitor Deployment

Render will automatically:
1. Create 6 services (2 web, 2 PostgreSQL, 2 Redis)
2. Auto-generate all required secrets
3. Link services together
4. Run health checks

**Important**: The initial deployment may take 5-10 minutes as all services spin up.

### Step 4: Access Your Applications

**Production**:
```
https://project-conductor-prod.onrender.com
```

**Staging**:
```
https://project-conductor-staging.onrender.com
```

## Environment Configuration

### Auto-Generated Environment Variables

Render automatically generates these secrets (no action required):
- `JWT_SECRET` - JSON Web Token signing key (64-char random string)
- `SESSION_SECRET` - Session encryption key (64-char random string)
- `WEBHOOK_SECRET` - Webhook signing secret
- `API_KEY` - API authentication key

### Auto-Configured Service Variables

These are automatically linked from database services:
- `DATABASE_URL` - PostgreSQL connection string with SSL
- `REDIS_URL` - Redis connection string

### Production Environment Variables

The following are pre-configured in render.yaml for production:

```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Connection Pool (optimized for Render Starter plan)
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
DB_SSL=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
CORS_ORIGIN=*  # Update to your domain for production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
USE_MOCK_DB=false
MOCK_EXTERNAL_SERVICES=false
```

### Staging Environment Variables

Staging uses slightly different settings for debugging:

```bash
NODE_ENV=staging
LOG_LEVEL=debug
LOG_FORMAT=pretty
DB_POOL_MAX=5
RATE_LIMIT_MAX_REQUESTS=200
MOCK_EXTERNAL_SERVICES=true
```

### Customizing Environment Variables

To update environment variables after deployment:

1. Go to Render Dashboard
2. Select your service (e.g., `project-conductor-prod`)
3. Click **"Environment"** tab
4. Update variables
5. Click **"Save Changes"**
6. Service will automatically redeploy

**Important**: Never hardcode secrets. Always use environment variables.

## Database Migrations

### Initial Setup (Production)

After first deployment, run migrations on production:

```bash
# Using Render Dashboard Shell
# 1. Go to project-conductor-prod service
# 2. Click "Shell" tab
# 3. Run the migration command

# Note: Add migration script to package.json first
npm run migrate

# If no migration script exists, create tables manually
psql $DATABASE_URL < migrations/001_initial_schema.sql
```

### Initial Setup (Staging)

Repeat the same process for staging:

```bash
# In staging shell
npm run migrate
```

### Automated Migration Hook (Recommended)

Add a migration hook to your build process in `render.yaml`:

```yaml
# Add to your web service configuration
buildCommand: npm ci --prefer-offline --no-audit && npm run build && npm run migrate
```

**Warning**: Only use this approach if your migrations are idempotent and safe to run on every deploy.

### Manual Migration Workflow

For safer production deployments:

1. **Test in staging first**:
```bash
render shell project-conductor-staging
npm run migrate
# Test thoroughly
```

2. **Deploy to production**:
```bash
render shell project-conductor-prod
npm run migrate
# Verify health check passes
```

3. **Rollback if needed**:
```bash
# Create rollback migration
npm run migrate:rollback
```

## Health Checks & Monitoring

### Health Check Endpoint

Both environments expose a health check at `/health`:

**Production**: `https://project-conductor-prod.onrender.com/health`

**Expected Response**:
```json
{
  "status": "ok",
  "service": "project-conductor",
  "version": "1.0.0",
  "timestamp": "2025-09-30T12:00:00.000Z",
  "database": "connected",
  "environment": "production",
  "presence": {
    "totalUsers": 0,
    "activeUsers": 0,
    "idleUsers": 0,
    "editingUsers": 0
  }
}
```

### Health Check Monitoring

Render automatically monitors health checks:
- **Interval**: Every 30 seconds
- **Timeout**: 10 seconds
- **Failure threshold**: 3 consecutive failures
- **Action**: Service restart on failure

### Custom Health Checks

The health endpoint verifies:
1. ✅ Database connectivity
2. ✅ Presence service functionality
3. ✅ Server uptime
4. ✅ Environment configuration

### Monitoring Best Practices

1. **Set up alerts**:
   - Go to service settings
   - Enable "Health Check Failures" notification
   - Add email/Slack webhook

2. **Monitor logs**:
```bash
# Real-time logs (production)
render logs project-conductor-prod --tail

# Real-time logs (staging)
render logs project-conductor-staging --tail

# Search logs
render logs project-conductor-prod --num 1000 | grep ERROR
```

3. **Track metrics** in Render Dashboard:
   - CPU usage (should stay < 70%)
   - Memory usage (should stay < 80% of 512MB)
   - Request rate
   - Response time (target < 200ms)

## Scaling & Performance

### Vertical Scaling

Upgrade your plan for more resources:

**Starter** (Current): 512 MB RAM, 0.5 CPU - $7/month
```bash
# Good for: 10-50 concurrent users
# Database pool: 10 connections
```

**Standard**: 2 GB RAM, 1 CPU - $25/month
```bash
# Good for: 100-500 concurrent users
# Increase DB_POOL_MAX to 20
```

**Pro**: 4 GB RAM, 2 CPU - $85/month
```bash
# Good for: 500-2000 concurrent users
# Increase DB_POOL_MAX to 50
```

### Horizontal Scaling

Scale out with multiple instances:

```bash
# Scale production to 2 instances
render services update project-conductor-prod --num-instances 2

# Scale to 3 instances
render services update project-conductor-prod --num-instances 3
```

**Important**: When running multiple instances:
- WebSocket connections require sticky sessions
- Use Redis for session storage
- Enable load balancing in Render settings

### Performance Optimizations Applied

1. **Connection Pooling**:
   - Production: 10 connections
   - Staging: 5 connections
   - Prevents connection exhaustion

2. **Response Compression**:
   - Gzip enabled for all responses
   - Level 6 compression (balanced)
   - Reduces bandwidth by ~70%

3. **Static Asset Caching**:
   - HTML: 1 day cache
   - CSS/JS: 7 days cache
   - Images: 30 days cache

4. **Database Query Optimization**:
   - Indexed queries on frequently accessed columns
   - Connection reuse via pooling
   - Prepared statements for security and speed

5. **Redis Caching**:
   - allkeys-lru eviction policy
   - Rate limiting uses Redis
   - Session storage in Redis

### Cold Start Optimization

Render free tier services spin down after inactivity. To minimize cold starts:

1. **Keep services warm** (Paid plans only):
   - Services stay running 24/7
   - No cold start delays

2. **Optimize build time**:
   - `npm ci --prefer-offline` caches dependencies
   - `--no-audit` skips audit checks
   - Build time: ~2-3 minutes

3. **Health check warmup**:
   - First health check after cold start
   - Initializes database pool
   - Connects to Redis
   - Total warmup: ~5-10 seconds

## Manual Deploy (Alternative Method)

If you prefer manual setup:

### 1. Create PostgreSQL Database

- Go to Render Dashboard
- New → PostgreSQL
- Name: `conductor-postgres`
- Database: `conductor`
- User: `conductor_user`
- Plan: Starter ($7/month)
- Create Database

### 2. Create Redis Instance

- Go to Render Dashboard
- New → Redis
- Name: `conductor-redis`
- Plan: Starter ($10/month)
- Create Redis

### 3. Create Web Service

- Go to Render Dashboard
- New → Web Service
- Connect your repository
- Configure:
  - **Name:** `project-conductor`
  - **Environment:** Node
  - **Region:** Oregon (or your preference)
  - **Branch:** main
  - **Build Command:** `npm install && npm run build`
  - **Start Command:** `npm start`
  - **Plan:** Starter ($7/month)

### 4. Add Environment Variables

In your web service settings, add:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[copy from PostgreSQL service]
REDIS_URL=[copy from Redis service]
JWT_SECRET=[generate random 64-char string]
SESSION_SECRET=[generate random 64-char string]
LOG_LEVEL=info
CORS_ORIGIN=*
USE_MOCK_DB=false
```

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

Click **"Create Web Service"** and Render will:
1. Clone your repository
2. Run `npm install && npm run build`
3. Start the server with `npm start`
4. Provide a public URL

## Health Check

Render will automatically monitor:
```
https://project-conductor.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

## Database Migrations

### Initial Setup

After first deployment:

```bash
# SSH into your Render service
render ssh project-conductor

# Run migrations
npm run migrate
```

### Subsequent Migrations

```bash
# Create new migration
render exec project-conductor "npx knex migrate:make migration_name"

# Run migrations
render exec project-conductor "npm run migrate"
```

## Static Files (Demo UI)

The demo HTML files are served statically:

- **Unified Dashboard:** `https://project-conductor.onrender.com/conductor-unified-dashboard.html`
- **Module 0:** `https://project-conductor.onrender.com/module-0-onboarding.html`
- **Module 2:** `https://project-conductor.onrender.com/module-2-business-input.html`
- **Module 3:** `https://project-conductor.onrender.com/module-3-prd-alignment.html`
- **Module 4:** `https://project-conductor.onrender.com/module-4-implementation.html`
- **Module 5:** `https://project-conductor.onrender.com/module-5-change-impact.html`

Ensure your Express app serves static files:

```javascript
// In src/index.ts
app.use(express.static(path.join(__dirname, '../')));
```

## Custom Domain (Optional)

To use your own domain:

1. Go to your web service settings
2. Click **"Custom Domains"**
3. Add your domain (e.g., `conductor.yourdomain.com`)
4. Update your DNS with the CNAME provided by Render

```
CNAME conductor.yourdomain.com → project-conductor.onrender.com
```

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
render logs project-conductor --tail

# Historical logs
render logs project-conductor --num 1000
```

Or view in dashboard:
- Go to your service
- Click **"Logs"** tab

### Metrics

Render provides automatic metrics:
- CPU usage
- Memory usage
- Request count
- Response time

Access at: Dashboard → Your Service → Metrics

## Scaling

### Vertical Scaling (Upgrade Plan)

- Starter: 512 MB RAM, 0.5 CPU
- Standard: 2 GB RAM, 1 CPU
- Pro: 4 GB RAM, 2 CPU

### Horizontal Scaling (Multiple Instances)

```bash
# Scale to 3 instances
render scale project-conductor --num-instances 3
```

## Cost Breakdown

**Starter Setup (~$24/month):**
- Web Service: $7/month
- PostgreSQL: $7/month
- Redis: $10/month

**Free Tier Alternative:**
- Use Render's free tier (spins down after inactivity)
- Use free PostgreSQL (limited to 90 days)
- Skip Redis (use in-memory cache only)

## Troubleshooting

### Build Fails

**Issue**: Build fails during deployment

```bash
# Check build logs
render logs project-conductor-prod --build --tail

# Common causes and fixes:
```

| Error | Cause | Solution |
|-------|-------|----------|
| `npm ci` fails | package-lock.json out of sync | Run `npm install` locally and commit package-lock.json |
| TypeScript errors | Type errors in code | Run `npm run typecheck` locally and fix errors |
| Missing dependencies | Dependency not in package.json | Add missing dependency: `npm install <package>` |
| Node version mismatch | Wrong Node version | Check package.json engines field (requires Node 16+) |
| Out of memory | Build exceeds memory limit | Upgrade to Standard plan or optimize build |

### Database Connection Fails

**Issue**: Service starts but cannot connect to database

**Symptoms**:
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "Connection timeout"
}
```

**Solutions**:

1. **Verify DATABASE_URL is set**:
```bash
render shell project-conductor-prod
echo $DATABASE_URL
# Should output: postgresql://conductor_user:****@*****.oregon-postgres.render.com/conductor
```

2. **Test database connection**:
```bash
# In Render shell
psql $DATABASE_URL -c "SELECT NOW();"
# Should return current timestamp
```

3. **Check SSL settings**:
```bash
# Ensure DB_SSL=true in environment variables
# Render PostgreSQL requires SSL connections
```

4. **Verify database is running**:
   - Go to Render Dashboard
   - Check `conductor-postgres-prod` status
   - Should show "Available"

5. **Connection pool exhaustion**:
```bash
# Increase DB_POOL_MAX if seeing "too many connections"
# Recommended: 10 for Starter, 20 for Standard, 50 for Pro
```

### Redis Connection Fails

**Issue**: Rate limiting or caching not working

**Symptoms**:
```
Redis client error: Connection timeout
Rate limiting will use in-memory fallback
```

**Solutions**:

1. **Verify REDIS_URL**:
```bash
render shell project-conductor-prod
echo $REDIS_URL
# Should output: redis://default:****@*****.oregon-redis.render.com:6379
```

2. **Test Redis connection**:
```bash
# In Render shell
redis-cli -u $REDIS_URL PING
# Should return: PONG
```

3. **Check Redis service**:
   - Go to Render Dashboard
   - Check `conductor-redis-prod` status
   - Should show "Available"

4. **Fallback behavior**:
   - If Redis is unavailable, app uses in-memory rate limiting
   - This is acceptable for single-instance deployments
   - For multiple instances, Redis is required

### Health Check Failures

**Issue**: Service keeps restarting due to failed health checks

**Diagnosis**:
```bash
# Check health endpoint directly
curl https://project-conductor-prod.onrender.com/health

# Check logs for errors
render logs project-conductor-prod --tail
```

**Common causes**:

1. **Database initialization slow**:
   - Increase `startCommand` timeout in render.yaml
   - Check database logs for slow queries

2. **Missing environment variables**:
   - Verify all required env vars are set
   - Check for typos in variable names

3. **Port binding issue**:
   - Ensure `PORT=3000` is set
   - Verify app binds to `0.0.0.0`, not `localhost`

### WebSocket Connection Issues

**Issue**: Real-time features not working

**Symptoms**:
- Presence tracking not updating
- Comments not appearing in real-time
- "Connection refused" errors in browser console

**Solutions**:

1. **Check CORS configuration**:
```bash
# Update CORS_ORIGIN to match your frontend domain
CORS_ORIGIN=https://yourdomain.com

# Or allow all (development only)
CORS_ORIGIN=*
```

2. **Verify WebSocket endpoint**:
```javascript
// In browser console
const socket = io('https://project-conductor-prod.onrender.com');
socket.on('connect', () => console.log('Connected'));
socket.on('error', (err) => console.error('Error:', err));
```

3. **Check ALLOWED_ORIGINS**:
```bash
# Ensure ALLOWED_ORIGINS includes your frontend
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Performance Issues

**Issue**: Slow response times or high memory usage

**Diagnosis**:
```bash
# Monitor metrics in Render Dashboard
# Check for:
# - CPU > 70%
# - Memory > 400MB (out of 512MB)
# - Response time > 1 second
```

**Solutions**:

1. **Optimize database queries**:
```bash
# Enable query logging
LOG_LEVEL=debug

# Check logs for slow queries
render logs project-conductor-prod | grep "duration"
```

2. **Increase connection pool**:
```bash
# If seeing connection timeouts
DB_POOL_MAX=20  # Increase from 10
```

3. **Enable caching**:
   - Redis caching is already configured
   - Verify REDIS_URL is set correctly
   - Check cache hit rate in logs

4. **Upgrade plan**:
   - Consider Standard plan for more resources
   - Horizontal scaling for high traffic

### Deployment Rollback

**Issue**: New deployment breaks production

**Quick rollback**:
```bash
# List recent deployments
render deployments project-conductor-prod

# Rollback to previous deployment
render rollback project-conductor-prod [DEPLOYMENT_ID]

# Example:
render rollback project-conductor-prod dep-abc123xyz
```

**Manual rollback**:
1. Go to Render Dashboard
2. Select `project-conductor-prod`
3. Click "Deployments" tab
4. Find working deployment
5. Click "Redeploy"

### Logs Not Showing

**Issue**: Cannot see logs in dashboard or CLI

**Solutions**:

1. **Ensure logging is enabled**:
```bash
LOG_LEVEL=info  # Not 'silent' or 'off'
LOG_FORMAT=json  # For production
```

2. **Check log retention**:
   - Render retains logs for 7 days (Starter plan)
   - Upgrade for longer retention

3. **Use log aggregation**:
   - Set up external logging (Datadog, Loggly, etc.)
   - Forward logs via webhook

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Cannot connect to database/Redis | Check service URLs and status |
| `ETIMEDOUT` | Connection timeout | Check network, increase timeout values |
| `EADDRINUSE` | Port already in use | Ensure only one process binds to PORT |
| `MODULE_NOT_FOUND` | Missing dependency | Run `npm install` and commit package-lock.json |
| `ERR_INVALID_ARG_TYPE` | Type error in Node.js | Check Node version compatibility |

## Security Best Practices

1. **Never commit secrets to Git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Rotate secrets regularly**
   - Update `JWT_SECRET` and `SESSION_SECRET` every 90 days

3. **Enable HTTPS only**
   - Render provides free SSL certificates automatically

4. **Restrict CORS**
   ```
   CORS_ORIGIN=https://yourdomain.com
   ```

5. **Use Render IP whitelist for database**
   - Go to PostgreSQL settings
   - Add your office/home IP to allowlist

## CI/CD

Render automatically deploys when you push to your main branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Render will automatically:
# 1. Build new image
# 2. Run tests (if configured)
# 3. Deploy to production
# 4. Health check
```

### Disable Auto-Deploy

Dashboard → Service Settings → Auto-Deploy → Off

### Manual Deploy

```bash
render deploy project-conductor
```

## Backup & Recovery

### Database Backups

Render automatically backs up PostgreSQL daily (retained 7 days on Starter plan).

**Manual Backup:**
```bash
# Download backup
render pg:backups:download conductor-postgres

# Restore backup
render pg:backups:restore conductor-postgres [BACKUP_ID]
```

### Export Application Data

```bash
# Export all data
render exec project-conductor "npm run export:data"
```

## Post-Deployment Verification

After deploying to Render, follow this comprehensive checklist to verify everything is working correctly.

### Production Environment Verification

#### 1. Health Check (Critical)

```bash
# Test health endpoint
curl https://project-conductor-prod.onrender.com/health

# Expected response (status 200):
{
  "status": "ok",
  "service": "project-conductor",
  "version": "1.0.0",
  "timestamp": "2025-09-30T...",
  "database": "connected",
  "environment": "production",
  "presence": { ... }
}
```

✅ **Pass**: status is "ok" and database is "connected"
❌ **Fail**: See [Troubleshooting](#troubleshooting) section

#### 2. API Endpoints

Test core API functionality:

```bash
# Get API documentation
curl https://project-conductor-prod.onrender.com/api/v1

# Create a test requirement
curl -X POST https://project-conductor-prod.onrender.com/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Requirement",
    "description": "Deployment verification test",
    "priority": "medium",
    "status": "draft"
  }'

# Get requirements list
curl https://project-conductor-prod.onrender.com/api/v1/requirements

# Get presence statistics
curl https://project-conductor-prod.onrender.com/api/v1/presence/stats
```

✅ **Pass**: All endpoints return 200 status with valid JSON
❌ **Fail**: Check logs for errors

#### 3. WebSocket Connection

Test real-time features:

```javascript
// Open browser console at https://project-conductor-prod.onrender.com
const socket = io();

// Initialize user
socket.emit('user:initialize', {
  userId: 'test-user-123',
  username: 'Test User'
});

// Listen for confirmation
socket.on('presence:initialized', (data) => {
  console.log('✅ WebSocket connected:', data);
});

// Check for errors
socket.on('connect_error', (err) => {
  console.error('❌ WebSocket error:', err);
});
```

✅ **Pass**: Connection successful, presence initialized
❌ **Fail**: Check CORS and WebSocket configuration

#### 4. Database Connection

```bash
# Access Render shell
render shell project-conductor-prod

# Test database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM requirements;"

# Check connection pool status
# Should show active connections
```

✅ **Pass**: Query executes successfully
❌ **Fail**: Check DATABASE_URL and database status

#### 5. Redis Connection

```bash
# In Render shell
redis-cli -u $REDIS_URL PING

# Test rate limiting
# Make 101 requests to trigger rate limit
for i in {1..101}; do
  curl -s https://project-conductor-prod.onrender.com/api/v1/requirements > /dev/null
  echo "Request $i"
done

# 101st request should return 429 (Too Many Requests)
```

✅ **Pass**: Redis responds with PONG, rate limiting works
❌ **Fail**: Check REDIS_URL and Redis status

#### 6. Performance Metrics

Check that response times are acceptable:

```bash
# Test response time
curl -w "@-" -o /dev/null -s https://project-conductor-prod.onrender.com/health <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF
```

✅ **Pass**: time_total < 500ms after warmup
❌ **Fail**: Check performance optimizations

#### 7. Logging Verification

```bash
# View recent logs
render logs project-conductor-prod --tail --num 100

# Check for errors
render logs project-conductor-prod | grep -i error

# Check for warnings
render logs project-conductor-prod | grep -i warn
```

✅ **Pass**: No critical errors, normal startup logs
❌ **Fail**: Investigate error messages

#### 8. Environment Variables

Verify all required environment variables are set:

```bash
# In Render shell
env | grep -E "NODE_ENV|DATABASE_URL|REDIS_URL|JWT_SECRET|PORT"

# Should show:
# NODE_ENV=production
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://...
# JWT_SECRET=... (long random string)
# PORT=3000
```

✅ **Pass**: All variables set correctly
❌ **Fail**: Add missing variables in Render dashboard

### Staging Environment Verification

Repeat the same tests for staging:

```bash
# Replace prod URLs with staging
curl https://project-conductor-staging.onrender.com/health
```

Key differences to verify:
- `NODE_ENV=staging`
- `LOG_LEVEL=debug`
- `LOG_FORMAT=pretty`
- Separate database and Redis instances

### Load Testing (Optional)

Test how the service handles concurrent requests:

```bash
# Install Apache Bench
brew install httpd  # macOS
sudo apt-get install apache2-utils  # Linux

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 https://project-conductor-prod.onrender.com/health

# Check results:
# - Requests per second should be > 50
# - Failed requests should be 0
# - Mean time per request should be < 200ms
```

### Security Verification

1. **HTTPS Enabled**:
```bash
# Verify SSL certificate
curl -vI https://project-conductor-prod.onrender.com 2>&1 | grep "SSL"

# Should show valid SSL connection
```

2. **Security Headers**:
```bash
# Check for security headers
curl -I https://project-conductor-prod.onrender.com

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN (from helmet)
# Strict-Transport-Security: max-age=...
```

3. **Rate Limiting**:
```bash
# Verify rate limiting is active
# Make rapid requests and check for 429 status
```

### Monitoring Setup

1. **Enable Render Notifications**:
   - Go to service settings
   - Enable "Deploy Failed" notifications
   - Enable "Health Check Failed" notifications
   - Add email or Slack webhook

2. **Set Up Custom Alerts** (Optional):
   - CPU usage > 70%
   - Memory usage > 400MB
   - Error rate > 1%
   - Response time > 500ms

3. **External Monitoring** (Recommended):
```bash
# Set up Uptime monitoring with:
# - UptimeRobot (free)
# - Pingdom
# - New Relic
# - Datadog

# Monitor endpoint:
# https://project-conductor-prod.onrender.com/health
```

## Environment Variable Checklist

Use this checklist to verify all environment variables are configured:

### Production Environment

- [x] `NODE_ENV=production`
- [x] `PORT=3000`
- [x] `HOST=0.0.0.0`
- [x] `DATABASE_URL` (auto-linked)
- [x] `DB_POOL_MAX=10`
- [x] `DB_IDLE_TIMEOUT=30000`
- [x] `DB_CONNECTION_TIMEOUT=5000`
- [x] `DB_SSL=true`
- [x] `REDIS_URL` (auto-linked)
- [x] `JWT_SECRET` (auto-generated)
- [x] `SESSION_SECRET` (auto-generated)
- [x] `WEBHOOK_SECRET` (auto-generated)
- [x] `API_KEY` (auto-generated)
- [x] `LOG_LEVEL=info`
- [x] `LOG_FORMAT=json`
- [ ] `CORS_ORIGIN=*` (⚠️ Update to your domain!)
- [x] `RATE_LIMIT_WINDOW_MS=900000`
- [x] `RATE_LIMIT_MAX_REQUESTS=100`
- [x] `ENABLE_METRICS=true`
- [x] `ENABLE_HEALTH_CHECKS=true`
- [x] `USE_MOCK_DB=false`
- [x] `MOCK_EXTERNAL_SERVICES=false`
- [x] `ALLOWED_ORIGINS=*` (⚠️ Update to your domain!)

### Staging Environment

- [x] `NODE_ENV=staging`
- [x] `LOG_LEVEL=debug`
- [x] `LOG_FORMAT=pretty`
- [x] `DB_POOL_MAX=5`
- [x] All other variables same as production

## Support & Resources

- **Render Documentation**: https://render.com/docs
- **Render Status Page**: https://status.render.com
- **Community Forum**: https://community.render.com
- **Support Email**: support@render.com

## Next Steps

### Immediate (First Week)

1. **Update CORS Configuration**:
```bash
# In Render Dashboard for both environments:
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

2. **Set Up Custom Domain** (Optional):
   - Go to service settings
   - Add custom domain
   - Update DNS with CNAME record

3. **Configure Backup Schedule**:
   - Render auto-backups daily for PostgreSQL
   - Verify backup retention (7 days on Starter)
   - Test backup restoration process

### Short-term (First Month)

1. **Monitoring & Alerting**:
   - Set up Sentry for error tracking
   - Configure log aggregation (Datadog/Loggly)
   - Create custom dashboards

2. **Performance Optimization**:
   - Monitor response times
   - Optimize slow database queries
   - Adjust connection pool if needed

3. **Security Hardening**:
   - Rotate JWT_SECRET and SESSION_SECRET
   - Implement API key authentication
   - Add IP whitelisting for admin endpoints

### Long-term (Ongoing)

1. **Scaling Strategy**:
   - Monitor usage patterns
   - Plan for vertical/horizontal scaling
   - Implement caching strategies

2. **CI/CD Enhancement**:
   - Add automated tests to deployment
   - Implement blue-green deployments
   - Set up staging → production promotion workflow

3. **Disaster Recovery**:
   - Document recovery procedures
   - Test database restoration
   - Create runbook for common issues

---

## Complete Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub (main branch)
- [ ] Tests passing locally (`npm test`)
- [ ] Build successful locally (`npm run build`)
- [ ] TypeScript compilation clean (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)

### Initial Deployment
- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Blueprint deployed via render.yaml
- [ ] All 6 services created (2 web, 2 PostgreSQL, 2 Redis)
- [ ] Environment variables auto-generated
- [ ] Services linked correctly

### Post-Deployment
- [ ] Health check passing (both environments)
- [ ] Database migrations run (if needed)
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] API endpoints responding
- [ ] WebSocket connections working
- [ ] Static files serving correctly
- [ ] SSL certificate active
- [ ] Logs showing no errors
- [ ] Performance metrics acceptable

### Security & Monitoring
- [ ] CORS configured for production domain
- [ ] Rate limiting working
- [ ] Security headers present
- [ ] Notifications configured
- [ ] External monitoring set up (optional)
- [ ] Backup schedule verified

### Documentation
- [ ] Deployment URLs documented
- [ ] Environment variables documented
- [ ] Recovery procedures documented
- [ ] Team access granted to Render dashboard

---

## Production URLs

After deployment, your services will be available at:

**Production**:
- Main App: `https://project-conductor-prod.onrender.com`
- Health Check: `https://project-conductor-prod.onrender.com/health`
- API Docs: `https://project-conductor-prod.onrender.com/api/v1`
- Demo Dashboard: `https://project-conductor-prod.onrender.com/demo`

**Staging**:
- Main App: `https://project-conductor-staging.onrender.com`
- Health Check: `https://project-conductor-staging.onrender.com/health`
- API Docs: `https://project-conductor-staging.onrender.com/api/v1`
- Demo Dashboard: `https://project-conductor-staging.onrender.com/demo`

---

**Your Project Conductor is now production-ready!** 🚀

For issues or questions, refer to the [Troubleshooting](#troubleshooting) section or contact Render support.
