# Deployment Quick Start Guide

> Get your app deployed to Render without "works locally, fails on Render" issues

## TL;DR - Deploy in 3 Steps

```bash
# 1. Validate (catches issues BEFORE deploying)
npm run validate:render

# 2. Commit if validation passed
git add .
git commit -m "Ready for deployment"

# 3. Deploy (auto-validates first)
npm run deploy:render
```

## What the Validation Checks

The validation script checks for **common deployment killers**:

- ✅ HTML files in `/public` directory (not project root)
- ✅ No hardcoded `localhost:3000` URLs
- ✅ Correct path resolution (`path.join()`, not hardcoded paths)
- ✅ Health check endpoint exists (`/health`)
- ✅ Environment variables have defaults
- ✅ All files committed to git
- ✅ Static file middleware configured correctly
- ✅ TypeScript builds without errors
- ✅ Security headers (helmet, compression)

## If Validation Fails

### Common Issue 1: Untracked Files

**Error**:
```
❌ FAIL: Untracked files found:
?? public/new-page.html
```

**Fix**:
```bash
git add public/new-page.html
git commit -m "Add new page"
```

### Common Issue 2: Hardcoded localhost URLs

**Error**:
```
❌ FAIL: Hardcoded localhost URLs found:
  public/js/api.js:10: const API_URL = 'http://localhost:3000'
```

**Fix** in `public/js/api.js`:
```javascript
// BEFORE
const API_URL = 'http://localhost:3000/api/v1';

// AFTER
const API_URL = '/api/v1'; // Relative URL
```

### Common Issue 3: HTML Files in Wrong Location

**Error**:
```
⚠️ WARNING: 3 HTML files in project root (should be in /public)
  ./dashboard.html
  ./login.html
```

**Fix**:
```bash
mv dashboard.html public/
mv login.html public/
git add public/
git commit -m "Move HTML files to public directory"
```

### Common Issue 4: Missing Health Check

**Error**:
```
❌ FAIL: Health check endpoint (/health) missing
```

**Fix** in `src/index.ts`:
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});
```

## After Deployment

### Verify It Worked

1. **Health Check** (should return `{"status": "ok"}`):
   ```
   https://yourapp.onrender.com/health
   ```

2. **Home Page** (should load):
   ```
   https://yourapp.onrender.com/
   ```

3. **API** (should return docs):
   ```
   https://yourapp.onrender.com/api/v1
   ```

### If Something Fails

1. **Check Render Logs**:
   - Go to Render Dashboard
   - Click your service
   - Open "Logs" tab
   - Look for errors

2. **Common Render Errors**:

   **Error**: `Cannot find module './public/index.html'`
   - **Cause**: File not committed to git
   - **Fix**: `git add public/index.html && git commit && git push`

   **Error**: `ENOENT: no such file or directory`
   - **Cause**: Hardcoded absolute path
   - **Fix**: Use `path.join(publicDir, 'file.html')`

   **Error**: `Port already in use`
   - **Cause**: Not using `process.env['PORT']`
   - **Fix**: `const PORT = process.env['PORT'] || 3000;`

3. **Rollback**:
   ```bash
   git revert HEAD
   git push origin main
   ```

## Advanced Options

### Full Validation (with TypeScript)

```bash
# Runs comprehensive checks (slower)
bash scripts/pre-render-validation.sh
```

### Deploy Without Validation (NOT RECOMMENDED)

```bash
git push origin main
```

### Test Locally Before Deploying

```bash
# Build TypeScript
npm run build

# Run in production mode
NODE_ENV=production npm start

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/
```

## Helpful Resources

- **Full Checklist**: [.claude/checklists/render-deployment.md](./.claude/checklists/render-deployment.md)
- **Lessons Learned**: [.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md](./.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md)
- **Validation Script**: [scripts/validate-deployment.sh](./scripts/validate-deployment.sh)
- **Comprehensive Script**: [scripts/pre-render-validation.sh](./scripts/pre-render-validation.sh)

## Commands Reference

```bash
# Validation
npm run validate:render           # Quick validation
bash scripts/pre-render-validation.sh  # Full validation

# Deployment
npm run deploy:render             # Validate + deploy
git push origin main              # Deploy only (manual)

# Testing
npm run test:deploy               # Deployment tests
npm run build                     # TypeScript build
npm run typecheck                 # Type checking only

# Monitoring
# (Check Render Dashboard > Logs)
```

## Questions?

If validation passes but deployment still fails:

1. Check this guide first
2. Review Render logs
3. Consult full checklist: `.claude/checklists/render-deployment.md`
4. Check lessons learned: `.claude/learning/DEPLOYMENT_LESSONS_LEARNED.md`

---

**Remember**: Always run `npm run validate:render` before deploying!

**Created**: 2025-10-19
**Version**: 1.0.0
