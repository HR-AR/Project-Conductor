# Production Fix Action Plan
**Date**: 2025-11-05
**Status**: CRITICAL - Production broken
**Time to Fix**: 30 minutes

---

## 🔍 Diagnosis Complete

I've run a full diagnostic of your production deployment. Here's what's broken:

### ✅ What Works
- Root endpoint (200)
- Health endpoint responds
- 5 of 6 module HTML files load
- All static assets (CSS, JS) load
- Projects API works (200)

### ❌ What's Broken

1. **CRITICAL: Database Disconnected**
   - Health endpoint shows: `"database":"disconnected"`
   - Environment shows: `"environment":"development"` (should be "production")
   - Requirements API returns 500 error
   - **Impact**: All database-dependent features broken

2. **CRITICAL: Missing Module File**
   - `module-4-implementation.html` returns 404
   - File doesn't exist in git or filesystem
   - **Impact**: Module 4 cannot load

---

## 🚀 Fix Plan (30 Minutes)

### Fix 1: Connect Database (15 min) - CRITICAL

**Problem**: `DATABASE_URL` environment variable not set or incorrect

**Solution**:

1. **Log into Render Dashboard**
   - Go to: https://dashboard.render.com
   - Find your `project-conductor` service

2. **Add/Fix DATABASE_URL**

   **Option A - Create New Render PostgreSQL (Recommended)**:
   - Click "New" → "PostgreSQL"
   - Name: `project-conductor-db`
   - Plan: Free
   - Click "Create Database"
   - Copy the "Internal Database URL"

   **Option B - Use Existing Database**:
   - Use your existing PostgreSQL connection string

3. **Set Environment Variable**:
   - Go to your web service → Environment tab
   - Add or update:
     ```
     DATABASE_URL = [paste your PostgreSQL URL]
     ```
   - Format should be: `postgresql://username:password@host:port/database`

4. **Set NODE_ENV**:
   - While in Environment tab, add:
     ```
     NODE_ENV = production
     ```

5. **Save and Deploy**:
   - Click "Save Changes"
   - Render will automatically redeploy (wait 3-5 minutes)

6. **Verify**:
   ```bash
   # After deployment completes
   curl https://project-conductor.onrender.com/health | jq '.database'
   # Should return: "connected" (not "disconnected")
   ```

---

### Fix 2: Handle Missing Module File (10 min) - HIGH

**Problem**: `module-4-implementation.html` doesn't exist

**Option A - Create the File** (if needed):

The file is referenced but never created. Based on your architecture, Module 4 is "Engineering Design" not "Implementation".

**Quick fix** - Update references to use existing file:
```bash
# Check where module-4-implementation.html is referenced
grep -r "module-4-implementation" public/
```

If it's being loaded in the dashboard, change the reference to an existing module file or create a placeholder.

**Option B - Remove the Reference** (simpler):

If Module 4 isn't critical right now, just remove references to it in the dashboard code.

**Option C - Create Placeholder**:
```bash
# Create a simple placeholder
cp public/module-0-onboarding.html public/module-4-implementation.html
# Edit to show "Implementation Module - Coming Soon"
# Then: git add, commit, push
```

---

### Fix 3: Run Database Migrations (5 min) - HIGH

Once database is connected, you need to set up tables:

**Option A - Manual Migration**:
```sql
-- Connect to your Render PostgreSQL database
-- Run the schema from your migration files
-- (Check database/migrations/ directory)
```

**Option B - Automatic Migration**:
If you have migration scripts:
```bash
# SSH into Render or use their CLI
npm run migrate
# or
npx knex migrate:latest
```

**Option C - Seed with Demo Data**:
```bash
# Add some demo data so the app isn't empty
npm run seed
```

---

## ✅ Verification Steps

After applying fixes, verify everything works:

### 1. Run Diagnostic Again
```bash
bash scripts/diagnose-render.sh
```

Expected output:
```
✅ Root endpoint responds (200)
✅ Health endpoint responds
✅ DATABASE CONNECTED  # Changed from "disconnected"
✅ Requirements API (200)  # Changed from 500
✅ All module files (200 or explained)
✅ All static assets (200)
```

### 2. Manual Browser Test
Open: https://project-conductor.onrender.com/conductor-unified-dashboard.html

Check:
- [ ] No "Database: disconnected" message
- [ ] Dashboard loads without errors
- [ ] Can see modules (or empty state)
- [ ] Browser console has no errors
- [ ] Health shows: `"database":"connected"` and `"environment":"production"`

### 3. API Tests
```bash
# All should return success: true
curl https://project-conductor.onrender.com/api/v1/requirements | jq '.success'
curl https://project-conductor.onrender.com/api/v1/projects | jq '.success'
curl https://project-conductor.onrender.com/api/v1/health | jq '.database'
```

---

## 📋 Step-by-Step Checklist

### Phase 1: Database (15 min)
- [ ] Log into Render Dashboard
- [ ] Create PostgreSQL database (or get existing connection string)
- [ ] Add `DATABASE_URL` environment variable
- [ ] Add `NODE_ENV=production` environment variable
- [ ] Save and wait for redeploy (3-5 min)
- [ ] Verify: `curl .../health` shows "connected"

### Phase 2: Files (10 min)
- [ ] Check where `module-4-implementation.html` is referenced
- [ ] Either create the file or remove the reference
- [ ] Git add, commit, push
- [ ] Wait for Render redeploy (3-5 min)

### Phase 3: Data (5 min)
- [ ] Run database migrations
- [ ] (Optional) Seed with demo data
- [ ] Verify tables exist

### Phase 4: Verification (5 min)
- [ ] Run diagnostic script - all green
- [ ] Open dashboard in browser - works
- [ ] Test APIs - return data
- [ ] Check Render logs - no errors

---

## 🎯 Expected Results

**Before Fixes**:
- Database: disconnected ❌
- Requirements API: 500 ❌
- Environment: development ❌
- Module 4: 404 ❌
- Brutal Critic Grade: D- 😞

**After Fixes**:
- Database: connected ✅
- Requirements API: 200 ✅
- Environment: production ✅
- Module 4: resolved ✅
- Brutal Critic Grade: B+ or better 🎉

---

## 🚨 If Issues Persist

### Database Still Disconnected After Fix?

1. **Check Render Logs**:
   - Dashboard → Your Service → Logs
   - Look for: "Database connection error" or "ECONNREFUSED"

2. **Verify Connection String**:
   ```bash
   # Should start with postgresql://
   # Should have username, password, host, database
   # Example: postgresql://user:pass@host.render.com/dbname
   ```

3. **Check Database Status**:
   - Dashboard → PostgreSQL Database
   - Should show "Available" not "Creating" or "Failed"

4. **Test Connection Manually**:
   ```bash
   # From local machine
   psql "postgresql://user:pass@host.render.com/dbname"
   # Should connect successfully
   ```

### Module Still 404?

1. **Check File Exists**:
   ```bash
   git ls-files | grep module-4-implementation
   ```

2. **Check Deployment Logs**:
   - Render → Service → Deploy → Latest Deploy
   - Look for file copy errors

3. **Force Redeploy**:
   - Render → Service → Manual Deploy
   - Click "Deploy latest commit"

---

## ⏱️ Time Budget

| Task | Time | Status |
|------|------|--------|
| Add DATABASE_URL to Render | 5 min | Critical |
| Set NODE_ENV=production | 1 min | Critical |
| Wait for redeploy | 5 min | Automatic |
| Handle missing module file | 10 min | High |
| Run database migrations | 5 min | High |
| Verify fixes work | 5 min | Critical |
| **Total** | **~30 min** | - |

---

## 📞 Quick Reference

**Render Dashboard**: https://dashboard.render.com

**Production URL**: https://project-conductor.onrender.com

**Diagnostic Command**:
```bash
bash scripts/diagnose-render.sh
```

**Health Check**:
```bash
curl https://project-conductor.onrender.com/health | jq
```

**Requirements API**:
```bash
curl https://project-conductor.onrender.com/api/v1/requirements | jq
```

---

## ✅ Success Criteria

Production is fixed when:

1. ✅ Health endpoint shows `"database":"connected"`
2. ✅ Health endpoint shows `"environment":"production"`
3. ✅ Requirements API returns 200 (not 500)
4. ✅ Diagnostic script shows all green
5. ✅ Dashboard loads in browser without errors
6. ✅ No critical console errors
7. ✅ Brutal critic would give grade B+ or better

**You'll know it's fixed when the diagnostic shows all ✅ green checkmarks.**

---

## 🎉 Next Steps After Fix

Once production works:

1. **Re-run brutal-critic** to get updated grade
2. **Add uptime monitoring** (UptimeRobot, Pingdom)
3. **Set up error tracking** (Sentry, LogRocket)
4. **Add seed data** so demo isn't empty
5. **Continue with Week 2 improvements** (test coverage, type safety)

---

**Start with Fix 1 (Database) - that's 80% of the problem!**

Let me know when you've added `DATABASE_URL` to Render and I'll help verify the fix.
