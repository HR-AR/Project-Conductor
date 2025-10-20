# Render Deployment Pitfalls - Common Issues & Solutions

**Purpose**: Quick reference guide for debugging common local-to-Render deployment issues.

**When to use**: When your app works locally but fails on Render.

---

## Table of Contents
1. [File Path Issues](#1-file-path-issues)
2. [Static File Serving](#2-static-file-serving)
3. [Docker Build Problems](#3-docker-build-problems)
4. [Environment Variables](#4-environment-variables)
5. [Route Conflicts](#5-route-conflicts)
6. [Database & External Services](#6-database--external-services)
7. [Build & Deployment](#7-build--deployment)
8. [Performance & Timeouts](#8-performance--timeouts)

---

## 1. File Path Issues

### Pitfall 1A: Hardcoded Local Paths

**Symptom**:
- `ENOENT: no such file or directory` errors on Render
- Works fine on local machine
- Logs show paths like `/Users/yourname/...` or `C:\Users\...`

**Cause**:
Hardcoded absolute paths that work locally don't exist on Render's `/app` directory.

**Examples of BAD code**:
```typescript
// ❌ BAD - Hardcoded local path
const publicDir = '/Users/myname/Desktop/project/public';

// ❌ BAD - Relative path from wrong context
const publicDir = '../public';  // Breaks when running from dist/

// ❌ BAD - String concatenation
const publicDir = process.cwd() + '/public';  // Windows/Unix incompatibility
```

**Solution**:
```typescript
// ✅ GOOD - Dynamic path resolution
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

// ✅ GOOD - Handles both src/ and dist/ contexts
// When running from dist/index.js: __dirname = /app/dist → projectRoot = /app
// When running from src/index.ts: __dirname = /app/src → projectRoot = /app
```

**How to verify**:
```bash
# Test locally with production build
npm run build
node dist/index.js

# Check paths in logs
grep "publicDir\|projectRoot" logs/server.log
```

---

### Pitfall 1B: Wrong Path Resolution in Compiled Code

**Symptom**:
- Paths work in dev (`npm run dev`) but fail in production (`npm start`)
- Error: `Cannot find module` or `File not found`

**Cause**:
TypeScript compiles `src/index.ts` → `dist/index.js`. The `__dirname` changes:
- Dev: `__dirname` = `/app/src`
- Prod: `__dirname` = `/app/dist`

**Solution**:
Always use `path.resolve(__dirname, '..')` to go up one level:

```typescript
// ✅ GOOD - Works in both dev and prod
const projectRoot = path.resolve(__dirname, '..'); // Always points to /app
const publicDir = path.join(projectRoot, 'public'); // Always /app/public
```

**How to verify**:
```bash
# Build and test production build locally
npm run build
node dist/index.js

# Should start successfully without path errors
```

---

## 2. Static File Serving

### Pitfall 2A: Files Exist but Return 404

**Symptom**:
- File exists in `public/` directory
- Browser gets 404 when accessing `/somefile.html`
- Render logs show file exists: `ls /app/public` shows the file

**Cause**:
1. Static middleware not configured
2. Wrong middleware order (API routes override static files)
3. Missing file extension in URL

**Solution**:
```typescript
// ✅ GOOD - Proper order and configuration

// 1. Root-level static files FIRST (highest priority)
app.use(express.static(publicDir, { index: false }));

// 2. Explicit routes for specific files
app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// 3. Prefixed static routes
app.use('/public', express.static(publicDir));

// 4. API routes AFTER static files
app.use('/api/v1/requirements', requirementsRoutes);

// 5. 404 handler LAST
app.use(notFoundHandler);
```

**How to verify**:
```bash
# Test locally
curl http://localhost:3000/index.html         # Should return HTML
curl http://localhost:3000/public/index.html   # Should return HTML
curl http://localhost:3000/api/v1              # Should return JSON

# On Render
curl https://yourapp.onrender.com/health       # Should return 200 OK
```

---

### Pitfall 2B: Duplicate Root Routes

**Symptom**:
- Some routes work, others don't
- Root URL (`/`) loads but `/index.html` doesn't
- Or vice versa

**Cause**:
Multiple conflicting definitions for the same route.

**Example of BAD code**:
```typescript
// ❌ BAD - Duplicate root route definitions
app.get('/', (req, res) => res.send('Dashboard'));  // Line 276
// ... more middleware ...
app.get('/', (req, res) => res.send('Different page'));  // Line 428 - CONFLICT!
```

**Solution** (from src/index.ts):
```typescript
// ✅ GOOD - Single root route definition
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Remove duplicate definitions at lines 428-443
```

**How to verify**:
```bash
# Check for duplicate routes in code
grep -n "app.get('/'," src/index.ts

# Should only see ONE definition (not 4-5 like we had)
```

---

### Pitfall 2C: MIME Type Issues

**Symptom**:
- HTML file loads but CSS/JS don't apply
- Browser console: "Refused to execute script... MIME type mismatch"
- CSS appears as HTML in Network tab

**Cause**:
Server sends wrong `Content-Type` header (e.g., `text/html` for `.js` files).

**Solution**:
```typescript
// ✅ GOOD - Explicit MIME types in static middleware
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  },
}));
```

---

## 3. Docker Build Problems

### Pitfall 3A: Files Missing in Docker Image

**Symptom**:
- `docker build` succeeds locally
- Render deploy fails with "File not found"
- File exists in repo but not in container

**Cause**:
Missing `COPY` command in Dockerfile.

**Example**:
```dockerfile
# ❌ BAD - Missing public directory
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY src ./src
# ⚠️ FORGOT: COPY public ./public
RUN npm run build
CMD ["npm", "start"]
```

**Solution**:
```dockerfile
# ✅ GOOD - Copy ALL necessary files
FROM node:20-alpine
WORKDIR /app

# Package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Copy public directory (CRITICAL!)
COPY public ./public

# Copy root HTML files
COPY *.html ./

# Install dev dependencies for build
RUN npm ci

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

CMD ["npm", "start"]
```

**How to verify**:
```bash
# Build Docker image locally
docker build -t test-app .

# Verify files exist in image
docker run --rm test-app ls -la /app/public

# Should show all your HTML files
```

---

### Pitfall 3B: Build Step Not Running

**Symptom**:
- Docker build succeeds
- App crashes on startup: "Cannot find module"
- `dist/` directory missing in container

**Cause**:
TypeScript build step missing or failing silently.

**Solution**:
```dockerfile
# ✅ GOOD - Explicit build step with error checking
RUN npm ci  # Install ALL dependencies (including dev)
RUN npm run build  # Build TypeScript → JavaScript

# Verify build succeeded
RUN ls -la /app/dist || (echo "Build failed - dist/ missing" && exit 1)
```

**How to verify**:
```bash
# Check build output
docker build -t test-app . 2>&1 | grep "dist"

# Should see: RUN npm run build ... successful
```

---

## 4. Environment Variables

### Pitfall 4A: Missing Environment Variable Defaults

**Symptom**:
- App crashes on Render: "PORT is not defined"
- Works locally (you have `.env` file)
- Render logs: `Error: Cannot read property 'PORT' of undefined`

**Cause**:
No default values for environment variables. Render doesn't use `.env` files.

**Example of BAD code**:
```typescript
// ❌ BAD - No default value
const PORT = process.env['PORT'];  // undefined on Render!
server.listen(PORT);  // CRASH!
```

**Solution**:
```typescript
// ✅ GOOD - Always provide defaults
const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const DATABASE_URL = process.env['DATABASE_URL'] || 'postgresql://localhost:5432/dev';
const ALLOWED_ORIGINS = process.env['ALLOWED_ORIGINS']?.split(',') || ['*'];
```

**How to set env vars on Render**:
1. Go to Render Dashboard → Your Service → Environment
2. Add variables:
   - `NODE_ENV=production`
   - `DATABASE_URL=postgresql://...`
   - `REDIS_URL=redis://...`
3. Click "Save Changes"
4. Render auto-redeploys

---

### Pitfall 4B: Secrets Committed to Git

**Symptom**:
- Security warning from GitHub
- API keys exposed in public repo
- Database credentials visible

**Cause**:
`.env` file committed to git (should be ignored).

**Solution**:
```bash
# 1. Remove from git history
git rm --cached .env
git commit -m "Remove .env from git"

# 2. Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
git add .gitignore
git commit -m "Add .env to .gitignore"

# 3. Set secrets in Render Dashboard
# Do NOT commit secrets to git ever again!
```

---

## 5. Route Conflicts

### Pitfall 5A: Static Files Override API Routes

**Symptom**:
- `/api/v1/requirements` returns HTML instead of JSON
- API worked locally, broken on Render
- Browser shows "Unexpected token < in JSON"

**Cause**:
Static middleware configured AFTER API routes, or too broad.

**Example of BAD code**:
```typescript
// ❌ BAD - Static middleware catches everything
app.use(express.static(projectRoot));  // Catches /api, /health, everything!

app.use('/api/v1', apiRoutes);  // Never reached!
```

**Solution**:
```typescript
// ✅ GOOD - Specific routes first, static files last
app.get('/health', healthCheckHandler);  // Most specific
app.use('/api/v1', apiRoutes);           // API routes
app.use(express.static(publicDir, { index: false }));  // Static files (no auto-index)
app.use(notFoundHandler);                // 404 handler LAST
```

---

### Pitfall 5B: Root Route Conflicts

**Symptom**:
- Only first root route works
- Multiple `app.get('/')` definitions in code
- Some pages never load

**Cause**:
Express only honors the first route definition. Subsequent ones are ignored.

**Solution**:
Remove duplicate routes. Keep only ONE definition:

```typescript
// ✅ GOOD - Single root route
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ❌ REMOVE these duplicate definitions:
// app.get('/', ...) // Line 428
// app.get('/', ...) // Line 434
// app.get('/', ...) // Line 438
```

---

## 6. Database & External Services

### Pitfall 6A: Database Connection Fails Silently

**Symptom**:
- App starts successfully
- API calls return 500 errors
- Logs: "Database query failed"

**Cause**:
Database connection never established, but app continues anyway.

**Solution**:
```typescript
// ✅ GOOD - Fail fast or fallback gracefully
try {
  await db.initialize();
  logger.info('Database connected');
} catch (error) {
  logger.error('Database connection failed:', error);

  // Option 1: Exit (Render will retry)
  process.exit(1);

  // Option 2: Use mock service (for demo)
  logger.warn('Using mock service - database unavailable');
  useMockService = true;
}
```

---

### Pitfall 6B: Wrong Database URL Format

**Symptom**:
- Connection error: "invalid connection string"
- Works locally, fails on Render

**Cause**:
Render uses `postgresql://` URLs, local dev might use different format.

**Solution**:
```typescript
// ✅ GOOD - Handle both formats
const DATABASE_URL = process.env['DATABASE_URL'] ||
  process.env['DATABASE_URI'] ||
  'postgresql://localhost:5432/mydb';

// Parse and validate URL
try {
  new URL(DATABASE_URL);  // Throws if invalid
} catch (error) {
  logger.error('Invalid DATABASE_URL format');
  process.exit(1);
}
```

---

## 7. Build & Deployment

### Pitfall 7A: Build Succeeds Locally, Fails on Render

**Symptom**:
- `npm run build` works on your machine
- Render build fails: "TypeScript error"
- Different Node.js versions

**Cause**:
Local: Node 18, Render: Node 20 (or vice versa).

**Solution**:
```json
// package.json - Lock Node version
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

```dockerfile
# Dockerfile - Match package.json
FROM node:20-alpine
```

**How to verify**:
```bash
# Check your Node version
node --version  # Should match Dockerfile

# Test build with same Node version
nvm use 20
npm run build
```

---

### Pitfall 7B: Production Runs Dev Code

**Symptom**:
- TypeScript errors in production
- "Cannot find module 'typescript'"
- Slow startup (running ts-node in production)

**Cause**:
Wrong start command - running dev server instead of compiled code.

**Example of BAD config**:
```json
// ❌ BAD - Runs dev server in production
{
  "scripts": {
    "start": "ts-node-dev src/index.ts"  // Wrong!
  }
}
```

**Solution**:
```json
// ✅ GOOD - Runs compiled code
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts"
  }
}
```

**Render configuration**:
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`

---

## 8. Performance & Timeouts

### Pitfall 8A: Health Check Timeout

**Symptom**:
- Render marks service as unhealthy
- Logs: "Health check timeout"
- App keeps restarting

**Cause**:
Health check endpoint is slow or missing.

**Solution**:
```typescript
// ✅ GOOD - Fast, simple health check
app.get('/health', async (_req, res) => {
  // Don't wait for database, just return status
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ❌ BAD - Slow health check
app.get('/health', async (_req, res) => {
  await db.query('SELECT NOW()');  // Too slow!
  await redis.ping();               // Too slow!
  res.json({ status: 'ok' });
});
```

---

### Pitfall 8B: Render Auto-Sleep (Free Tier)

**Symptom**:
- First request after inactivity takes 30+ seconds
- Subsequent requests are fast
- "Your app is sleeping" message

**Cause**:
Render free tier spins down after 15 minutes of inactivity.

**Solution**:
1. **Upgrade to paid tier** ($7/month for always-on)
2. **Or**: Add uptime monitor (pings every 10 minutes)
   - Use: UptimeRobot, Better Uptime, or Cronitor
   - Ping URL: `https://yourapp.onrender.com/health`

---

## Quick Diagnostic Checklist

When deployment fails, check in this order:

1. [ ] **Render Logs** - Click "Logs" tab, look for errors
2. [ ] **Health Check** - Visit `/health`, should return 200 OK
3. [ ] **Environment Variables** - Check Render dashboard has all vars
4. [ ] **Build Output** - Check "Events" tab for build failures
5. [ ] **Docker Build** - Test locally: `docker build . && docker run -p 3000:3000 <image>`
6. [ ] **File Paths** - Check for hardcoded `/Users/` or `C:\` paths
7. [ ] **TypeScript Errors** - Run `npm run typecheck` locally
8. [ ] **Static Files** - Verify `public/` directory copied in Dockerfile

---

## Emergency Fixes

### Quick Fix #1: App Won't Start
```bash
# Check Render logs for error
# Common fixes:
# 1. Missing env var → Add in Render dashboard
# 2. Port binding → Use process.env.PORT
# 3. Database connection → Add fallback or mock service
```

### Quick Fix #2: Static Files 404
```typescript
// Add diagnostic logging to src/index.ts
logger.info({
  __dirname,
  projectRoot: path.resolve(__dirname, '..'),
  publicDir: path.join(path.resolve(__dirname, '..'), 'public'),
}, 'Static file paths');

// Check Render logs for actual paths
```

### Quick Fix #3: Build Failing
```bash
# Locally test exact Render build process
rm -rf node_modules dist
npm ci
npm run build
npm start

# If fails, fix TypeScript errors first
```

---

## Additional Resources

- **Render Docs**: https://render.com/docs
- **Express Static Middleware**: https://expressjs.com/en/starter/static-files.html
- **Node.js Path Module**: https://nodejs.org/api/path.html
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

**Last Updated**: 2025-10-19
**Maintained By**: Project Conductor Team
**Feedback**: Report issues or improvements to this guide
