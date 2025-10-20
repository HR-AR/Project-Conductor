# Deployment Checklist for Render

**Purpose**: Step-by-step checklist to ensure successful deployment to Render
**Last Updated**: 2025-10-19
**Status**: Production-validated

---

## Pre-Deployment (Required)

### Step 1: Automated Validation ✅

Run the automated validation script:

```bash
npm run test:render-ready
```

**Expected Output**: All checks pass with green checkmarks

**If validation fails**:
- Fix reported issues
- Re-run validation
- Do NOT proceed until all checks pass

---

### Step 2: Manual Verification 🔍

Even after automated validation, manually verify:

#### 2.1 Git Status
```bash
git status
```

**Expected**: `nothing to commit, working tree clean`

**If you see untracked files** (`??`):
- Review each file
- If needed for production: `git add <file>`
- If not needed: Add to `.gitignore`

#### 2.2 Build Test
```bash
npm run build
```

**Expected**: Build completes without errors, `dist/` directory created

**If build fails**:
- Fix TypeScript errors
- Check tsconfig.json
- Verify all imports resolve

#### 2.3 Local Production Test
```bash
NODE_ENV=production npm start
```

**Test these URLs** (in another terminal):
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok",...}

curl http://localhost:3000/
# Expected: HTML content (index.html)

curl http://localhost:3000/demo-scenario-picker.html
# Expected: HTML content

curl http://localhost:3000/api/v1/requirements
# Expected: JSON response
```

**If any return 404**:
- Check file location in git: `git ls-files | grep <filename>`
- Verify static middleware configuration
- Review deployment lessons learned

---

## Environment Configuration

### Step 3: Verify Render Dashboard Settings

**Login to Render**: https://dashboard.render.com

**Navigate to**: Your Project Conductor service

**Check Environment Variables**:

| Variable | Local Value | Render Value | Required? |
|----------|-------------|--------------|-----------|
| `NODE_ENV` | development | production | ✅ Yes |
| `PORT` | 3000 | (Render assigns) | ✅ Yes (auto-set) |
| `DATABASE_URL` | localhost | (Render provides) | ⚠️ If using DB |
| `REDIS_URL` | localhost | (Render provides) | ⚠️ If using Redis |
| `ALLOWED_ORIGINS` | * | your-domain.com | ⚠️ If using CORS |

**Action**:
- [ ] Add any missing environment variables
- [ ] Verify values are correct
- [ ] Save changes

---

## Deployment

### Step 4: Push to Git

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Deployment: [describe changes]"

# Push to main (triggers Render deploy)
git push origin main
```

**Note**: If pre-push hook is enabled, validation runs automatically before push.

---

### Step 5: Monitor Render Deployment

**Render Dashboard** → **Deploys** → **Latest Deploy**

**Watch the logs for**:
1. ✅ Build started
2. ✅ Dependencies installed (`npm install`)
3. ✅ Build completed (`npm run build`)
4. ✅ Server started (`npm start`)
5. ✅ Health check passed

**Common issues during deployment**:

| Log Message | Problem | Solution |
|-------------|---------|----------|
| `ENOENT: no such file` | File not in git | `git add` and re-push |
| `Module not found` | Missing dependency | Check package.json |
| `TypeScript error` | Build failure | Fix TypeScript errors |
| `Port 3000 already in use` | Wrong PORT var | Use `process.env.PORT` |
| `Cannot find module './public'` | Wrong path | Use `path.join()` |

---

## Post-Deployment Verification

### Step 6: Test Production Endpoints

**Base URL**: Your Render URL (e.g., `https://project-conductor.onrender.com`)

```bash
# Health check
curl https://your-app.onrender.com/health
# Expected: {"status":"ok",...}

# Landing page
curl -I https://your-app.onrender.com/
# Expected: 200 OK

# Demo page
curl -I https://your-app.onrender.com/demo-scenario-picker.html
# Expected: 200 OK

# API endpoint
curl https://your-app.onrender.com/api/v1/requirements
# Expected: JSON response
```

**If any return 404**:
1. Check Render logs for errors
2. Review deployment lessons learned
3. Fix issues and re-deploy

---

### Step 7: Smoke Test Critical User Flows

**Manual Testing**:

1. **Landing Page**
   - [ ] Visit homepage
   - [ ] Verify branding and navigation load
   - [ ] Click navigation links

2. **Demo Dashboard**
   - [ ] Navigate to `/demo`
   - [ ] Verify dashboard loads
   - [ ] Check module navigation

3. **API Functionality**
   - [ ] Test requirements creation (if applicable)
   - [ ] Verify data persistence
   - [ ] Check WebSocket connections

4. **Performance**
   - [ ] Page loads in < 3 seconds
   - [ ] No console errors in browser
   - [ ] API responses in < 1 second

---

## Rollback Plan (If Issues Found)

### Immediate Rollback

**Render Dashboard** → **Deploys** → **Previous Deploy** → **Redeploy**

**This reverts to the last working version**

### Fix and Re-Deploy

1. **Identify Issue**:
   - Check Render logs
   - Review error messages
   - Compare with local environment

2. **Fix Locally**:
   - Make necessary changes
   - Run validation: `npm run test:render-ready`
   - Test locally: `NODE_ENV=production npm start`

3. **Re-Deploy**:
   - Commit fix
   - Push to main
   - Monitor Render logs

---

## Success Criteria

Deployment is successful when ALL of the following are true:

- [ ] Automated validation passed (npm run test:render-ready)
- [ ] Build completed without errors
- [ ] Render deployment succeeded
- [ ] Health check returns 200 OK
- [ ] Landing page loads correctly
- [ ] Demo pages accessible
- [ ] API endpoints respond correctly
- [ ] No errors in Render logs
- [ ] No 404s for static files
- [ ] WebSocket connections work (if applicable)

---

## Troubleshooting

### Issue: 404 for HTML File

**Diagnosis**:
```bash
# Check file in git
git ls-files | grep <filename>

# Check route in index.ts
grep -n "<filename>" src/index.ts

# Check static middleware
grep "express.static" src/index.ts
```

**Common Causes**:
- File not tracked in git → `git add <file>`
- File in /public but route uses projectRoot → Remove explicit route
- Explicit route overriding static middleware → Check route order

**Fix**: See `.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md` for detailed solutions

---

### Issue: Environment Variable Not Found

**Diagnosis**:
```bash
# Render logs show: "process.env.VAR_NAME is undefined"
```

**Fix**:
1. Render Dashboard → Environment → Add variable
2. Trigger manual deploy
3. Verify in logs: `logger.info({ VAR_NAME: process.env.VAR_NAME })`

---

### Issue: Build Fails on Render

**Diagnosis**:
```bash
# Render logs show TypeScript errors or dependency issues
```

**Fix**:
1. Run locally: `npm run build`
2. Fix all TypeScript errors
3. Ensure package-lock.json is committed
4. Re-push to trigger new deploy

---

## Resources

| Resource | Location | Purpose |
|----------|----------|---------|
| Deployment Lessons | `.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md` | Failure analysis & solutions |
| Validator Skill | `.claude/skills/deployment-validator/SKILL.md` | Auto-validation logic |
| Validation Script | `scripts/pre-render-validation.sh` | Automated checks |
| Deployment Tests | `tests/deployment/` | Test suite |
| CLAUDE.md | `CLAUDE.md` → "Deployment Best Practices" | Quick reference |

---

## Quick Commands Reference

```bash
# Run full validation
npm run test:render-ready

# Run deployment tests only
npm run test:deploy

# Build for production
npm run build

# Start in production mode
NODE_ENV=production npm start

# Check git status
git status --porcelain

# Find untracked files
git status --porcelain | grep "^??"

# List env vars used in code
grep -rh "process.env" src/ | grep -o "process.env\['[^']*'\]" | sort -u

# Test health endpoint
curl http://localhost:3000/health
```

---

## Notes

- This checklist was created from **real deployment failures**
- Every item represents a **lesson learned the hard way**
- Following this checklist prevents **6-10 hours of debugging per deployment**
- Pre-push hook enforces validation automatically (can skip with `--no-verify`)

---

**Last Deployment**: _______________
**Deployed By**: _______________
**All Checks Passed**: ☐ Yes  ☐ No
**Issues Found**: _______________
**Resolution Time**: _______________
