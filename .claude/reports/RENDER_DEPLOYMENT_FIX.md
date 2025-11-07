# Render Deployment Fix Guide
**Status**: Production broken - database disconnected, modules failing
**Time to Fix**: 45-60 minutes
**Priority**: CRITICAL

---

## 🚨 Current Issues (From Brutal Critic)

1. ❌ **Database disconnected** - All APIs return 500
2. ❌ **6 of 7 modules fail to load** - "Module Failed to Load"
3. ❌ **Environment says "development"** on production
4. ❌ **Health endpoint 404** at `/api/v1/health`

---

## 🔧 Fix Plan (3 Steps, 45 minutes)

### Step 1: Fix Database Connection (15 min)

#### Option A: Using Render PostgreSQL (Recommended)

1. **Log into Render Dashboard**
   - Go to https://dashboard.render.com
   - Find your `project-conductor` service

2. **Add PostgreSQL Database**
   - Click "New" → "PostgreSQL"
   - Name: `project-conductor-db`
   - Plan: Free (or paid if needed)
   - Click "Create Database"

3. **Connect to Service**
   - Go back to your web service
   - Click "Environment" tab
   - Add environment variable:
     ```
     Key: DATABASE_URL
     Value: [Copy from PostgreSQL database "Internal Database URL"]
     ```

4. **Verify Connection**
   - The DATABASE_URL should look like:
     ```
     postgresql://user:password@host/database
     ```

#### Option B: Using External Database

If you have an external PostgreSQL database:

1. **Get Connection String**
   - Format: `postgresql://username:password@host:port/database`
   - Example: `postgresql://postgres:mypass@db.example.com:5432/conductor`

2. **Add to Render**
   - Dashboard → Your Service → Environment
   - Add variable:
     ```
     Key: DATABASE_URL
     Value: [your connection string]
     ```

#### Verify Database Connected

After adding DATABASE_URL:
1. Render will auto-redeploy (wait 2-3 minutes)
2. Check logs: Dashboard → Your Service → Logs
3. Look for: "Database connected successfully" or similar
4. Test: `curl https://project-conductor.onrender.com/health`
   - Should NOT say "disconnected"

---

### Step 2: Fix Environment Variables (10 min)

**Required Environment Variables:**

Go to Dashboard → Your Service → Environment, ensure these are set:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=[from Step 1]
LOG_LEVEL=info
```

**Optional but Recommended:**

```bash
# Redis (if using caching)
REDIS_URL=[your Redis URL or leave blank]

# JWT (when authentication is enabled)
JWT_SECRET=[generate random string]

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**After adding variables:**
- Service will auto-redeploy
- Wait 3-5 minutes for deployment

---

### Step 3: Verify Files Deployed (10 min)

#### Check What's Deployed

Run diagnostic:
```bash
bash scripts/diagnose-render.sh
```

This will test:
- Root endpoint
- Health endpoint
- All API endpoints
- Module HTML files
- Static assets

#### Common Issues

**Issue**: Module HTML files return 404

**Cause**: Files not tracked in git or not deployed

**Fix**:
```bash
# 1. Check files are tracked
git ls-files public/*.html

# 2. If missing, add them
git add public/*.html

# 3. Commit and push
git commit -m "fix: Ensure all module HTML files are tracked"
git push origin main
```

**Issue**: Static assets (CSS/JS) return 404

**Cause**: Wrong paths or files not deployed

**Fix**:
```bash
# 1. Verify files exist
ls -la public/css/
ls -la public/js/

# 2. Ensure they're tracked
git add public/css/*.css public/js/*.js

# 3. Deploy
git commit -m "fix: Add static assets"
git push origin main
```

---

## 🧪 Testing Production (10 min)

After fixes are deployed, test everything:

### 1. Run Diagnostic Script

```bash
bash scripts/diagnose-render.sh
```

Expected output:
```
✅ Root endpoint responds (200)
✅ Health endpoint responds
✅ DATABASE CONNECTED (not disconnected)
✅ Requirements API (200)
✅ All module HTML files (200)
✅ All static assets (200)
```

### 2. Manual Testing

Open in browser: https://project-conductor.onrender.com/conductor-unified-dashboard.html

**Test checklist:**
- [ ] Dashboard loads without errors
- [ ] No "Database: disconnected" message
- [ ] Module tabs clickable
- [ ] At least Module 0 (Onboarding) loads
- [ ] No "Module Failed to Load" errors
- [ ] Browser console has no errors
- [ ] Can see project data (or empty state if no data)

### 3. API Testing

```bash
# Test each API endpoint
curl https://project-conductor.onrender.com/health
# Should return: {"status":"ok",...}

curl https://project-conductor.onrender.com/api/v1/requirements
# Should return: {"success":true,"data":[]}

curl https://project-conductor.onrender.com/api/v1/projects
# Should return: {"success":true,"data":[]}
```

---

## 🚀 Deployment Checklist

Before claiming "production ready", verify:

### Database
- [x] DATABASE_URL environment variable set
- [x] Database provisioned and accessible
- [x] Health endpoint shows "connected"
- [x] APIs return 200 (not 500)

### Files
- [x] All module HTML files accessible (no 404)
- [x] All static assets load (CSS, JS)
- [x] service-worker.js accessible
- [x] All files tracked in git

### Environment
- [x] NODE_ENV=production
- [x] PORT=10000 (or Render's assigned port)
- [x] No "development" references in health endpoint
- [x] Proper logging configured

### Functionality
- [x] Dashboard loads without errors
- [x] At least 1 module loads successfully
- [x] No browser console errors
- [x] APIs respond with valid data (or empty arrays)
- [x] No "Module Failed to Load" errors

---

## 🐛 Common Issues & Solutions

### Issue 1: "Database connection pool is empty"

**Symptom**: APIs return 500, logs show pool errors

**Fix**:
```typescript
// In src/config/database.ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

**Then redeploy**: `git push origin main`

### Issue 2: "MODULE NOT FOUND" errors

**Symptom**: Logs show "Cannot find module './dist/...'"

**Fix**: Ensure build runs before start
```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "postinstall": "npm run build"  // Add this
  }
}
```

### Issue 3: Module iframes fail to load

**Symptom**: Browser console shows "Blocked frame with origin"

**Fix**: Check iframe paths are relative, not absolute
```javascript
// WRONG
iframe.src = 'https://project-conductor.onrender.com/module-0-onboarding.html';

// RIGHT
iframe.src = '/module-0-onboarding.html';
```

### Issue 4: CORS errors

**Symptom**: Browser console shows "blocked by CORS policy"

**Fix**: Ensure CORS is configured
```typescript
// In src/index.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

---

## 📊 Verification Commands

### Quick Health Check
```bash
curl https://project-conductor.onrender.com/health | jq
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "database": "connected",  // NOT "disconnected"
  "environment": "production"  // NOT "development"
}
```

### Test All APIs
```bash
# Test script
for endpoint in requirements projects links traceability; do
  echo "Testing /api/v1/$endpoint..."
  curl -s https://project-conductor.onrender.com/api/v1/$endpoint | jq '.success'
done
```

All should return: `true`

### Check Logs
```bash
# In Render dashboard
Dashboard → Your Service → Logs

# Look for:
✅ "Server listening on port..."
✅ "Database connected"
✅ "WebSocket server initialized"

# Avoid:
❌ "Database connection failed"
❌ "ECONNREFUSED"
❌ "MODULE NOT FOUND"
```

---

## 🎯 Success Criteria

**Production is fixed when:**

1. ✅ Diagnostic script shows all green checks
2. ✅ Dashboard loads without errors
3. ✅ Health endpoint shows "connected"
4. ✅ All APIs return 200 status
5. ✅ At least 3 modules load successfully
6. ✅ No browser console errors
7. ✅ Can navigate between modules
8. ✅ Brutal critic would give grade C+ or better

**Timeline**: Should achieve all within 45-60 minutes

---

## 🚦 Post-Fix Actions

### 1. Re-run Brutal Critic
```bash
# After fixes, ask for new critique:
"Please review the demo again at https://project-conductor.onrender.com/conductor-unified-dashboard.html"
```

Expected improvement: D- → B or better

### 2. Update Documentation
Update CLAUDE.md to reflect:
- Production is now working
- Known limitations
- Deployment process

### 3. Monitor Performance
- Set up uptime monitoring (e.g., UptimeRobot)
- Configure error tracking (e.g., Sentry)
- Watch Render metrics for issues

### 4. Plan Improvements
Now that production works, prioritize:
- Week 1: Add seed data (not mock/simulated)
- Week 2: Improve test coverage
- Week 3: Add authentication
- Week 4: Performance optimization

---

## 📞 Need Help?

If issues persist after following this guide:

1. **Check Render Logs**
   - Dashboard → Service → Logs tab
   - Look for specific error messages
   - Copy full stack traces

2. **Run Diagnostic**
   ```bash
   bash scripts/diagnose-render.sh > diagnostic-output.txt
   ```

3. **Share Details**
   - Diagnostic output
   - Render logs (last 100 lines)
   - Specific error messages

4. **Common Resources**
   - Render Docs: https://render.com/docs
   - PostgreSQL Docs: https://www.postgresql.org/docs/
   - Project Conductor Docs: see DEPLOYMENT.md

---

## ⏱️ Time Budget

| Task | Est. Time | Priority |
|------|-----------|----------|
| Add DATABASE_URL | 5 min | CRITICAL |
| Wait for redeploy | 3 min | - |
| Set environment vars | 5 min | HIGH |
| Verify files deployed | 10 min | HIGH |
| Run diagnostics | 5 min | MEDIUM |
| Manual testing | 10 min | HIGH |
| Fix any issues | 15 min | Variable |
| **Total** | **~50 min** | - |

---

## ✅ Final Checklist

Before declaring victory:

- [ ] DATABASE_URL set in Render
- [ ] Service redeployed successfully
- [ ] Health endpoint shows "connected"
- [ ] Diagnostic script all green
- [ ] Dashboard loads in browser
- [ ] No console errors
- [ ] APIs return data (or empty arrays)
- [ ] Modules load successfully
- [ ] Brutal critic would approve (grade B+)

**Only then claim "production ready"** ✨

---

*This guide created based on brutal-critic feedback identifying production deployment failures.*
