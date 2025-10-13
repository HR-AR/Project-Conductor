# 🚨 Emergency Troubleshooting Checklist

## Quick Start

**Main Dashboard Broken?** Use this instead:
```
http://localhost:3000/simple-demo.html
```

**In Production (Render)?** Use:
```
https://your-app.onrender.com/simple-demo.html
```

---

## 5-Minute Diagnosis

### Step 1: Check Server (30 seconds)
```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{
  "status": "ok",
  "service": "project-conductor",
  "database": "connected"
}
```

**If Fails:**
- Server not running → Start with `npm run dev`
- Wrong port → Check `.env` file for PORT
- Database down → Check PostgreSQL running

### Step 2: Check API (30 seconds)
```bash
curl http://localhost:3000/api/v1/requirements?limit=1
```

**Expected:**
```json
{
  "success": true,
  "data": [...]
}
```

**If Fails:**
- Check route configuration in `src/index.ts`
- Verify database initialized
- Review middleware blocking requests

### Step 3: Open Simple Demo (1 minute)

Open browser to: `http://localhost:3000/simple-demo.html`

**Look for:**
- 4 green status indicators
- No red error messages
- API Response section shows data

### Step 4: Test All Endpoints (2 minutes)

Click "Test All Endpoints" button

**Expected:**
```
Test Complete: 12 passed, 0 failed
```

**If Some Fail:**
- Check console log for specific errors
- Review failed endpoint URLs
- Verify database has sample data

### Step 5: Test WebSocket (1 minute)

Click "Test WebSocket" button

**Expected:**
```
✓ WebSocket connected successfully!
```

**If Fails:**
- Check Socket.io initialized in `src/index.ts`
- Verify no proxy blocking WebSocket
- Review CORS configuration

---

## Common Issues & Quick Fixes

### 🔴 Issue: "All Tests Fail"

**Quick Fix:**
```bash
# Check if server running
ps aux | grep node

# Restart server
npm run dev

# Check port not in use
lsof -i :3000
```

### 🔴 Issue: "Database Disconnected"

**Quick Fix:**
```bash
# Check PostgreSQL running
pg_isready

# Check connection string
echo $DATABASE_URL

# Restart PostgreSQL
brew services restart postgresql  # macOS
sudo systemctl restart postgresql  # Linux
```

### 🔴 Issue: "WebSocket Connection Failed"

**Quick Fix:**

Check `src/index.ts` lines 95-100:
```typescript
const io = new Server(server, {
  cors: {
    origin: ['*'],  // Allow all origins for testing
    methods: ['GET', 'POST'],
  },
});
```

### 🔴 Issue: "CSP Blocking Scripts"

**Quick Fix:**

Check `src/index.ts` lines 118-143:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Must allow inline
      styleSrc: ["'self'", "'unsafe-inline'"],   // Must allow inline
      frameSrc: ["'self'"],                      // Must allow iframes
    },
  },
  frameguard: false,  // MUST be false for iframes
}));
```

### 🔴 Issue: "Module Files 404"

**Quick Fix:**

Check files exist:
```bash
ls -la *.html
```

Check Express static serving in `src/index.ts` lines 200-226:
```typescript
app.use('/demo', express.static(projectRoot, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  },
}));
```

### 🔴 Issue: "Unified Dashboard Blank/Broken"

**Bypass Solution:**

Use direct module links instead of unified dashboard:
- Module 0: `/demo/module-0-onboarding.html`
- Module 1: `/demo/module-1-present.html`
- Module 2: `/demo/module-2-brd.html`
- Module 3: `/demo/module-3-prd.html`
- Module 4: `/demo/module-4-engineering-design.html`
- Module 5: `/demo/module-5-alignment.html`
- Module 6: `/demo/module-6-implementation.html`

---

## Production (Render) Specific

### Check Render Logs
```bash
# View recent logs
render logs tail

# Search for errors
render logs | grep ERROR
```

### Common Render Issues

**Issue: Environment Variables Not Set**
```bash
# Check Render dashboard → Environment
# Verify these exist:
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
```

**Issue: Build Failed**
```bash
# Check Render build logs
# Common causes:
# - TypeScript errors
# - Missing dependencies
# - Build script failed

# Fix and redeploy:
git push origin main
```

**Issue: Health Check Failing**
```bash
# Render expects /health to return 200
# Verify in code (src/index.ts line 229)

# Test locally:
curl https://your-app.onrender.com/health
```

---

## Advanced Diagnostics

### Check Database Connection

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check tables exist
psql $DATABASE_URL -c "\dt"

# Count requirements
psql $DATABASE_URL -c "SELECT COUNT(*) FROM requirements;"
```

### Check Redis Cache

```bash
# Test Redis connection
redis-cli PING

# Check cached keys
redis-cli KEYS "api:*"

# Clear cache if needed
redis-cli FLUSHDB
```

### Check WebSocket in Browser

Open browser console and run:
```javascript
const socket = io();
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
```

### Monitor API Performance

```bash
# Watch API requests in real-time
tail -f logs/app.log | grep "GET /api"

# Check response times
curl -w "@curl-format.txt" http://localhost:3000/api/v1/requirements
```

Create `curl-format.txt`:
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_total:  %{time_total}\n
```

---

## Nuclear Options (Last Resort)

### 1. Fresh Install
```bash
# Backup data first!
cp -r data/ data.backup/

# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 2. Reset Database
```bash
# WARNING: Deletes all data!
npm run db:reset

# Or manually:
psql $DATABASE_URL -c "DROP DATABASE IF EXISTS conductor;"
psql $DATABASE_URL -c "CREATE DATABASE conductor;"
npm run db:migrate
```

### 3. Clear All Caches
```bash
# Redis
redis-cli FLUSHALL

# Node modules
rm -rf node_modules/.cache

# TypeScript build
rm -rf dist/
npm run build
```

### 4. Restart Everything
```bash
# Local development
pkill node
brew services restart postgresql
brew services restart redis
npm run dev

# Production (Render)
# Manual restart from Render dashboard
```

---

## Preventive Measures

### Before Deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Linting clean: `npm run lint`
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Simple demo loads: Open `/simple-demo.html`
- [ ] All endpoints tested: Click "Test All Endpoints"
- [ ] Environment variables set (check `.env`)
- [ ] Database migrations run
- [ ] Redis running and accessible

### Regular Maintenance

**Daily:**
- Check health endpoint
- Review error logs
- Monitor response times

**Weekly:**
- Clear Redis cache
- Review database size
- Check for stale connections

**Monthly:**
- Update dependencies
- Review security advisories
- Optimize database queries

---

## Getting More Help

### 1. Check Documentation
- `SIMPLE_DEMO_GUIDE.md` - Full diagnostic guide
- `API_DOCUMENTATION.md` - API reference
- `DEPLOYMENT.md` - Deployment instructions
- `DEVELOPER_GUIDE.md` - Architecture details

### 2. Review Logs

**Local:**
```bash
# Server logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

**Render:**
```bash
# View in dashboard
# Or use CLI
render logs tail
```

### 3. Browser DevTools

**Network Tab:**
- Check for failed requests (red)
- Look at status codes
- Verify request/response headers

**Console Tab:**
- Look for JavaScript errors (red)
- Check for CSP violations
- Review WebSocket events

**Application Tab:**
- Check Local Storage
- Verify cookies
- Inspect Service Workers

### 4. Test Specific Features

**Requirements API:**
```bash
curl http://localhost:3000/api/v1/requirements?limit=1
```

**Dashboard API:**
```bash
curl http://localhost:3000/api/v1/dashboard/stats
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

---

## Success Criteria

Your system is healthy when:

✅ Health check returns `"status": "ok"`
✅ Database status shows `"connected"`
✅ Requirements API returns data
✅ Dashboard API returns statistics
✅ WebSocket connects successfully
✅ All module links open correctly
✅ Simple demo shows all green indicators

**If all above pass, your deployment is working!** 🎉

---

## Contact & Support

**Files to Check:**
- Server: `/Users/h0r03cw/Desktop/Coding/Project Conductor/src/index.ts`
- Routes: `/Users/h0r03cw/Desktop/Coding/Project Conductor/src/routes/`
- Controllers: `/Users/h0r03cw/Desktop/Coding/Project Conductor/src/controllers/`
- Services: `/Users/h0r03cw/Desktop/Coding/Project Conductor/src/services/`

**Logs Location:**
- Local: `logs/` directory
- Render: Render dashboard logs section

**Common Log Patterns to Search:**
```bash
grep "ERROR" logs/app.log
grep "Failed to" logs/app.log
grep "Connection refused" logs/app.log
grep "timeout" logs/app.log
```

---

**Remember:** The simple demo at `/simple-demo.html` should ALWAYS work if the server is running. If it doesn't, the problem is with the server itself, not the frontend. 🔧
