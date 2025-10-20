# Deployment Validator - Quick Reference

## One-Command Validation

```bash
npm run validate:deploy
```

This runs the full deployment validation checklist automatically.

## Common Issues & Quick Fixes

### Issue: File works locally, 404 in production

**Quick Check**:
```bash
# Where is the file?
git ls-files | grep filename.html

# What route serves it?
grep -n "filename.html" src/index.ts
```

**Common Causes**:
1. File in `/public`, route uses `projectRoot` → Remove explicit route
2. File not tracked in git → `git add public/filename.html`
3. Explicit route overrides static middleware → Delete explicit route

**Quick Fix**:
```typescript
// DELETE this if file is in /public:
app.get('/filename.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'filename.html'));
});

// Static middleware already handles it (line 199):
app.use(express.static(publicDir));
```

---

### Issue: Changed file, still getting 404

**Quick Check**:
```bash
git status  # Is file tracked?
git diff src/index.ts  # Did route change take effect?
```

**Quick Fix**:
```bash
git add .
git commit -m "Fix static file routing"
git push origin main
# Wait for Render rebuild (2-3 minutes)
```

---

### Issue: Multiple routes for same path

**Quick Check**:
```bash
grep -n "^app.get('/')" src/index.ts
# Should only return 1-2 results
```

**Quick Fix**:
Delete duplicate routes, keep only one:
```typescript
// Keep ONE of these:
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Delete duplicates
```

---

## Pre-Deployment Checklist (30 seconds)

```bash
# 1. Check git status
git status
# Should show no untracked files in /public

# 2. Build test
npm run build
# Should complete without errors

# 3. Run validator
npm run validate:deploy
# Should pass all checks
```

---

## File Location Guide

### Files in `/public/` directory
- Served at: `http://app.com/filename.html`
- Static middleware: `app.use(express.static(publicDir))`
- **DO NOT** add explicit routes
- **DO** track in git

**Example**:
```
File: /public/demo-scenario-picker.html
URL: https://app.render.com/demo-scenario-picker.html
Route: None needed (static middleware handles it)
```

### Files in project root
- Served at: `http://app.com/filename.html` (via projectRoot static middleware)
- Static middleware: `app.use(express.static(projectRoot))`
- **DO NOT** add explicit routes unless needed
- **DO** track in git

---

## Route Order Reference

```typescript
// CORRECT ORDER (from index.ts):

// 1. Static middleware FIRST (line 199)
app.use(express.static(publicDir));

// 2. More static middleware (line 214)
app.use(express.static(projectRoot));

// 3. Explicit routes LATER (line 276+)
app.get('/', ...);
app.get('/demo', ...);
```

**Rule**: Static middleware before explicit routes, or explicit route wins!

---

## Automated Scripts

### Validate before deploy
```bash
npm run validate:deploy
```

### Deploy with validation
```bash
npm run deploy
# Runs validate:deploy automatically, then pushes
```

### Manual checks
```bash
# Check file locations
ls -la public/*.html

# Check routes
grep -n "app.get.*\.html" src/index.ts

# Check git tracking
git status --porcelain

# Check build
npm run build
```

---

## Debugging Production Issues

### 1. Check Render logs
```bash
# In Render dashboard:
# Services → project-conductor-app → Logs

# Look for:
# - ENOENT errors (file not found)
# - 404 GET /filename.html
# - Static file configuration logs
```

### 2. Verify file in repo
```bash
git ls-files | grep filename.html
# Should return: public/filename.html
```

### 3. Test locally in production mode
```bash
NODE_ENV=production npm start
curl http://localhost:3000/filename.html
# Should return 200, not 404
```

### 4. Check Render environment
```
# In Render dashboard:
# Services → project-conductor-app → Environment

# Verify:
# - NODE_ENV=production
# - PORT=(auto-assigned)
```

---

## Common Patterns

### Pattern 1: Serve static file from /public
```typescript
// File: /public/page.html

// GOOD - No explicit route needed
app.use(express.static(publicDir));
// URL: /page.html automatically works

// BAD - Unnecessary explicit route
app.get('/page.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'page.html'));
});
```

### Pattern 2: Redirect to file in /public
```typescript
// File: /public/dashboard.html

// GOOD - Redirect only
app.get('/admin', (req, res) => {
  res.redirect('/dashboard.html');  // Static middleware serves it
});

// BAD - Explicit serve
app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});
```

### Pattern 3: Dynamic route, fallback to static
```typescript
// Try API first, fallback to static file
app.get('/data', apiHandler);  // Returns JSON
app.use(express.static(publicDir));  // Serves /data.html if no API match
```

---

## Emergency Rollback

If deployment breaks production:

```bash
# 1. Find last working commit
git log --oneline -5

# 2. Revert to working version
git revert HEAD
git push origin main

# 3. Render auto-deploys the rollback (2-3 min)
```

---

## Success Metrics

After using this skill, you should see:

- Zero "works locally, fails on Render" incidents
- 100% first-try deployment success
- 2-minute validation vs 2-hour debugging
- Confident deployments by all team members

---

## Related Documentation

- Full skill: `.claude/skills/deployment-validator/SKILL.md`
- Lessons learned: `.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md`
- Validation script: `scripts/validate-deployment.sh`

---

**Last Updated**: 2025-10-19
**Quick Ref Version**: 1.0.0