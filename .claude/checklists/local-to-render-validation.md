# Local-to-Render Deployment Validation Checklist

**Purpose**: Prevent common deployment issues when moving from local development to Render (or similar cloud platforms).

**Context**: Applications often work perfectly locally but fail in production due to path differences, environment variables, and platform-specific configurations.

---

## Pre-Deployment Checklist

### 1. File Path Configuration ✓

- [ ] **No hardcoded local paths** (e.g., `/Users/username/...`, `C:\Users\...`)
- [ ] **Dynamic path resolution** using `__dirname`, `process.cwd()`, or `path.resolve()`
- [ ] **Static file paths use proper base directories**:
  - `publicDir = path.join(projectRoot, 'public')` ✓
  - `projectRoot = path.resolve(__dirname, '..')` ✓
- [ ] **All file serving uses computed paths**, not strings
- [ ] **Test both compiled (`dist/`) and source (`src/`) contexts**

**Common Issue**: Render runs from `/app` while local development runs from project root.

```typescript
// ❌ BAD - Hardcoded path
const publicDir = '/Users/myname/project/public';

// ✅ GOOD - Dynamic path resolution
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
```

---

### 2. Static File Serving Configuration ✓

- [ ] **Public directory exists and is included in Docker build**
- [ ] **express.static() middleware configured correctly**:
  - [ ] Order matters - most specific routes first
  - [ ] `index: false` if not serving index.html automatically
  - [ ] Proper MIME types set in headers
- [ ] **No route conflicts** between static files and API routes
- [ ] **Cache headers configured** for performance
- [ ] **Compression enabled** (gzip/brotli)

**File Serving Priority** (from src/index.ts):
1. Root-level static files from `publicDir` (line 199)
2. Root-level files from `projectRoot` (line 213)
3. `/public/*` prefix from `publicDir` (line 227)
4. `/demo/*` prefix from `projectRoot` (line 247)
5. API routes
6. Error handlers (404, 500)

```typescript
// ✅ GOOD - Proper order and configuration
app.use(express.static(publicDir, { index: false }));
app.use('/public', express.static(publicDir));
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
```

---

### 3. Docker Configuration ✓

- [ ] **Dockerfile includes all necessary files**:
  - [ ] `COPY public ./public` ✓
  - [ ] `COPY *.html ./` for root HTML files ✓
  - [ ] `COPY src ./src` ✓
  - [ ] `COPY package*.json ./` ✓
- [ ] **Build step compiles TypeScript** (`npm run build`)
- [ ] **Working directory is `/app`** in Docker
- [ ] **Port is exposed** (default 3000)
- [ ] **Healthcheck configured**
- [ ] **Non-root user for security**

**Verification**:
```bash
# Build Docker image locally
docker build -t project-conductor-test .

# Run and test
docker run -p 3000:3000 project-conductor-test

# Check files exist in container
docker run project-conductor-test ls -la /app/public
```

---

### 4. Environment Variables ✓

- [ ] **All environment variables have defaults**:
  - [ ] `PORT || 3000`
  - [ ] `NODE_ENV || 'development'`
  - [ ] Database URLs, API keys with fallbacks
- [ ] **Render environment variables configured**:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT` (auto-set by Render)
  - [ ] Database connection strings
  - [ ] Any third-party API keys
- [ ] **No `.env` files in production** (use Render dashboard)
- [ ] **Secrets are not committed** to git

```typescript
// ✅ GOOD - Always provide defaults
const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const ALLOWED_ORIGINS = process.env['ALLOWED_ORIGINS']?.split(',') || ['*'];
```

---

### 5. Route Configuration ✓

- [ ] **Root route defined** (`app.get('/')`)
- [ ] **Health check endpoint** (`/health`)
- [ ] **Static routes don't conflict with API routes**
- [ ] **Explicit routes for HTML files** if not using static middleware
- [ ] **404 handler for missing routes**
- [ ] **Error handler middleware** (must be last)

**Common Conflicts**:
```typescript
// ❌ BAD - Static middleware overrides root route
app.use(express.static(publicDir)); // Serves index.html
app.get('/', (req, res) => res.send('Never reached!')); // Never executed

// ✅ GOOD - Explicit route first
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.use(express.static(publicDir, { index: false }));
```

---

### 6. Database & External Services ✓

- [ ] **Database connection handles errors gracefully**
- [ ] **Connection pooling configured**
- [ ] **Retry logic for failed connections**
- [ ] **Mock/test mode for demo purposes**
- [ ] **Migration scripts run on deployment**

```typescript
// ✅ GOOD - Graceful database handling
try {
  await db.initialize();
  logger.info('Database connected');
} catch (error) {
  logger.error('Database connection failed, using mock service');
  // Fallback to mock service or exit
}
```

---

### 7. Logging & Monitoring ✓

- [ ] **Structured logging** (JSON format for production)
- [ ] **Log levels configured** (`info` for production, `debug` for development)
- [ ] **No console.log in production code** (use logger)
- [ ] **Error tracking** (Sentry, LogRocket, etc.)
- [ ] **Health check returns service status**

```typescript
// ✅ GOOD - Structured logging
logger.info({ port: PORT, environment: NODE_ENV }, 'Server started');

// ❌ BAD - Console.log in production
console.log('Server started on port', PORT);
```

---

### 8. Security & Performance ✓

- [ ] **Helmet configured** for security headers
- [ ] **CORS configured** with allowed origins
- [ ] **Rate limiting enabled**
- [ ] **Compression middleware** (gzip/brotli)
- [ ] **Trust proxy setting** for accurate IPs (`app.set('trust proxy', 1)`)
- [ ] **SSL/HTTPS enforced** in production
- [ ] **No sensitive data in logs**

---

### 9. Build & Start Commands ✓

- [ ] **`npm run build` compiles TypeScript successfully**
- [ ] **`npm start` runs production build** (not dev server)
- [ ] **Build artifacts in `dist/` directory**
- [ ] **Production dependencies only** (dev dependencies removed after build)

**package.json scripts**:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev src/index.ts"
  }
}
```

---

### 10. Testing Static File Access ✓

**Manual verification** (run locally, then test on Render):

- [ ] **Root URL** (`/`) loads correctly
- [ ] **HTML files accessible**:
  - [ ] `/index.html`
  - [ ] `/conductor-unified-dashboard.html`
  - [ ] `/public/demo-scenario-picker.html`
  - [ ] `/demo/offline.html`
- [ ] **API endpoints work**:
  - [ ] `GET /health`
  - [ ] `GET /api/v1`
  - [ ] `GET /api/v1/requirements`
- [ ] **Static assets load** (CSS, JS, images)
- [ ] **WebSocket connections** work (if applicable)

---

## Automated Testing

Run before deployment:

```bash
# Full validation suite
npm run test:render-ready

# Individual checks
npm run build                 # Verify build works
npm run typecheck             # TypeScript validation
npm run lint                  # Code quality
docker build -t test .        # Docker build test
```

---

## Render-Specific Configuration

### render.yaml (optional)
```yaml
services:
  - type: web
    name: project-conductor
    env: node
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        fromGroup: web
    healthCheckPath: /health
```

### Environment Variables in Render Dashboard
```
NODE_ENV=production
PORT=<auto>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## Common Pitfalls Summary

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Hardcoded paths** | 404 errors on Render | Use `path.resolve(__dirname, '..')` |
| **Missing files in Docker** | "File not found" errors | Add `COPY` statements to Dockerfile |
| **Route conflicts** | Static files override API routes | Order middleware correctly |
| **Missing env vars** | Crashes on startup | Add defaults: `PORT \|\| 3000` |
| **Build not running** | TypeScript errors in production | Ensure `npm run build` in start command |
| **Static files not served** | Blank pages, 404s | Check `express.static()` configuration |
| **Wrong port binding** | "Address in use" errors | Use `process.env['PORT']` not hardcoded |
| **Database not connected** | 500 errors on API calls | Add connection retry logic |

---

## Emergency Debugging on Render

If deployed app doesn't work:

1. **Check Render logs** - Click "Logs" tab in Render dashboard
2. **Test health check** - Visit `https://yourapp.onrender.com/health`
3. **Verify build** - Check "Events" tab for build failures
4. **Test locally with Docker**:
   ```bash
   docker build -t test .
   docker run -p 3000:3000 test
   curl http://localhost:3000/health
   ```
5. **Check file paths in container**:
   ```bash
   # SSH into Render container (if available)
   ls -la /app/public
   cat /app/dist/index.js | grep "publicDir"
   ```

---

## Sign-Off

Before deployment, confirm:

- [ ] All checklist items above are verified ✓
- [ ] `npm run test:render-ready` passes locally
- [ ] Docker build succeeds and runs locally
- [ ] Environment variables configured in Render
- [ ] Health check endpoint returns 200 OK
- [ ] Static files accessible via browser (local Docker test)

**Signed off by**: _______________
**Date**: _______________
**Deployment URL**: _______________

---

## Post-Deployment Verification

After deploying to Render:

- [ ] Visit root URL - loads correctly
- [ ] Visit `/health` - returns 200 OK
- [ ] Visit `/api/v1` - returns API documentation
- [ ] Check Render logs - no errors
- [ ] Test key user flows
- [ ] Monitor error rates (first 1 hour)

---

**Last Updated**: 2025-10-19
**Version**: 1.0.0
**Applies To**: Node.js + Express + TypeScript + Render deployments
