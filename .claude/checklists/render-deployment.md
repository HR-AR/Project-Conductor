# Render Deployment Checklist

> This checklist prevents "works locally, fails on Render" issues

## Pre-Deployment (Run Locally)

### Code Validation

- [ ] **Run validation script**: `npm run test:render-ready`
- [ ] All validation checks passed (0 errors)
- [ ] Review and address any warnings
- [ ] TypeScript build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`

### File Structure

- [ ] All HTML files are in `/public` directory
- [ ] No HTML files in project root (except docs)
- [ ] `dist/` directory created after build
- [ ] `dist/index.js` exists after build

### Path References

- [ ] No hardcoded localhost URLs in `public/` or `src/`
- [ ] All paths use `path.resolve()` or `path.join()`
- [ ] `publicDir` correctly references `/public` folder
- [ ] Static middleware uses `publicDir` variable
- [ ] No absolute file system paths (e.g., `/Users/...`)

### Environment Configuration

- [ ] `render.yaml` exists and is valid
- [ ] `NODE_ENV` configured in render.yaml
- [ ] `PORT` configured in render.yaml
- [ ] `healthCheckPath: /health` configured
- [ ] `.env` file in `.gitignore`
- [ ] All secrets use `generateValue: true` or are set manually

### Dependencies

- [ ] `package-lock.json` committed to git
- [ ] `node_modules/` in `.gitignore`
- [ ] All dependencies listed in `package.json`
- [ ] No dev-only dependencies in production code

### Routes & Endpoints

- [ ] Root route `/` defined and serves `index.html`
- [ ] Health check `/health` endpoint returns 200 OK
- [ ] Demo route `/demo` serves dashboard
- [ ] API routes prefixed with `/api/v1`
- [ ] All static assets served from `express.static(publicDir)`

### Security & Performance

- [ ] `helmet` middleware configured
- [ ] `compression` middleware enabled
- [ ] CORS configured properly
- [ ] `trust proxy` set to `1` for Render
- [ ] Rate limiting configured

### Git Status

- [ ] All changes committed: `git status`
- [ ] On correct branch (usually `main`)
- [ ] No uncommitted sensitive files (.env, credentials, etc.)
- [ ] `.gitignore` up to date

## During Deployment

### Push to Render

- [ ] Push to main: `git push origin main`
- [ ] Render auto-deploy triggered (if enabled)
- [ ] Monitor Render build logs in dashboard

### Build Phase (Render Dashboard)

- [ ] Build command runs: `npm ci --prefer-offline --no-audit && npm run build`
- [ ] Dependencies installed successfully
- [ ] TypeScript compilation succeeds
- [ ] `dist/` directory created
- [ ] No build errors or warnings

### Start Phase (Render Dashboard)

- [ ] Start command runs: `npm start`
- [ ] Server starts on correct PORT
- [ ] Health check endpoint responds
- [ ] No startup errors in logs

## Post-Deployment (Test on Render)

### Basic Connectivity

- [ ] Visit health check: `https://yourapp.onrender.com/health`
- [ ] Health check returns `{"status": "ok"}`
- [ ] Database connection status: `"database": "connected"`

### Frontend Routes

- [ ] Root page loads: `https://yourapp.onrender.com/`
- [ ] Index.html displays correctly
- [ ] Demo dashboard loads: `https://yourapp.onrender.com/demo`
- [ ] Unified dashboard renders: `https://yourapp.onrender.com/conductor-unified-dashboard.html`
- [ ] Onboarding page: `https://yourapp.onrender.com/module-0-onboarding.html`

### Static Assets

- [ ] CSS files load (check browser DevTools Network tab)
- [ ] JavaScript files load and execute
- [ ] Images load (if any)
- [ ] No 404 errors in browser console
- [ ] Service worker registers (if applicable)

### API Endpoints

- [ ] API documentation: `https://yourapp.onrender.com/api/v1`
- [ ] Requirements API: `https://yourapp.onrender.com/api/v1/requirements`
- [ ] Test GET request returns 200 or valid response
- [ ] WebSocket connection establishes (if applicable)

### Browser Console (F12)

- [ ] No JavaScript errors
- [ ] No network errors (404, 500, etc.)
- [ ] CORS errors resolved
- [ ] CSP (Content Security Policy) violations resolved

### Performance

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Compression enabled (check response headers)
- [ ] Caching headers present

## Troubleshooting

### If Build Fails on Render

1. Check Render build logs for error messages
2. Run `npm run build` locally to reproduce
3. Verify `tsconfig.json` is correct
4. Ensure all files committed to git
5. Check Node.js version matches: `engines.node >= 20.0.0`

### If Health Check Fails

1. Verify `/health` endpoint exists in `src/index.ts`
2. Check server starts on correct PORT
3. Review Render service logs
4. Verify database connection string
5. Check Redis connection (if used)

### If Static Files 404

1. Verify files exist in `/public` directory
2. Check `express.static(publicDir)` is configured
3. Confirm `publicDir = path.join(projectRoot, 'public')`
4. Review Dockerfile `COPY public ./public`
5. Check file paths are relative, not absolute

### If API Errors

1. Check Render service logs for errors
2. Verify environment variables set correctly
3. Test database connection
4. Check CORS configuration
5. Verify API routes registered in `src/index.ts`

### If WebSocket Connection Fails

1. Verify WebSocket allowed in CORS
2. Check `ALLOWED_ORIGINS` environment variable
3. Confirm Socket.io client connects to correct URL
4. Review CSP headers allow `ws:` and `wss:`

## Common Mistakes (Learn from Past Issues)

### Mistake 1: HTML Files in Wrong Location
**Problem**: HTML files in project root instead of `/public`
**Fix**: Move all HTML to `/public` directory

### Mistake 2: Hardcoded localhost URLs
**Problem**: `http://localhost:3000` in JavaScript files
**Fix**: Use relative URLs or environment variables

### Mistake 3: Wrong Path Resolution
**Problem**: `sendFile('/Users/username/project/public/index.html')`
**Fix**: `sendFile(path.join(publicDir, 'index.html'))`

### Mistake 4: Missing publicDir Variable
**Problem**: `express.static('public')` instead of `express.static(publicDir)`
**Fix**: Define `publicDir = path.join(projectRoot, 'public')`

### Mistake 5: No Health Check
**Problem**: Render can't verify service is running
**Fix**: Add `app.get('/health', ...)` endpoint

### Mistake 6: Build Artifacts Not Created
**Problem**: `dist/` not created or not copied to Render
**Fix**: Verify `npm run build` runs in Render build command

### Mistake 7: Environment Variables Missing
**Problem**: Database connection fails due to missing `DATABASE_URL`
**Fix**: Set all required env vars in render.yaml or dashboard

### Mistake 8: .env Committed to Git
**Problem**: Secrets exposed in public repository
**Fix**: Add `.env` to `.gitignore`, use Render env vars

## Monitoring (After Deployment)

### Immediate (First 24 Hours)

- [ ] Monitor error rates in Render logs
- [ ] Check health check endpoint every hour
- [ ] Review user reports of issues
- [ ] Monitor database connection pool
- [ ] Check memory usage and scaling

### Ongoing

- [ ] Set up uptime monitoring (e.g., UptimeRobot)
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Review logs weekly
- [ ] Monitor API response times
- [ ] Track database performance

## Rollback Plan

If deployment fails critically:

1. **Immediate**: Revert to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Via Render Dashboard**: Redeploy previous version
   - Go to Render Dashboard
   - Select service
   - Go to "Deploys" tab
   - Click "Redeploy" on last working version

3. **Manual Rollback**: Deploy specific commit
   ```bash
   git checkout <previous-working-commit>
   git push -f origin main
   ```

## Post-Deployment Validation Script

Run this after deployment to verify everything works:

```bash
#!/bin/bash
# Post-deployment validation

BASE_URL="https://yourapp.onrender.com"

echo "Testing Render deployment..."

# 1. Health check
curl -f $BASE_URL/health || echo "FAIL: Health check"

# 2. Root page
curl -f $BASE_URL/ || echo "FAIL: Root page"

# 3. Demo dashboard
curl -f $BASE_URL/demo || echo "FAIL: Demo dashboard"

# 4. API documentation
curl -f $BASE_URL/api/v1 || echo "FAIL: API docs"

# 5. Requirements API
curl -f $BASE_URL/api/v1/requirements || echo "FAIL: Requirements API"

echo "Validation complete!"
```

## Success Criteria

Deployment is successful when:

- ✅ Health check returns 200 OK
- ✅ All frontend pages load without errors
- ✅ Static assets (CSS, JS, images) load
- ✅ API endpoints respond correctly
- ✅ WebSocket connections establish
- ✅ No errors in browser console
- ✅ No errors in Render service logs
- ✅ Performance meets benchmarks (< 3s page load)

## Additional Resources

- [Render Deployment Guide](/DEPLOYMENT.md)
- [Render Troubleshooting Guide](https://render.com/docs/troubleshooting-deploys)
- [Pre-Render Validation Script](/scripts/pre-render-validation.sh)
- [Deployment Tests](/tests/deployment/)

---

**Last Updated**: 2025-10-19

**Version**: 1.0.0

**Maintainer**: Project Conductor Team
