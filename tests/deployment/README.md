# Deployment Validation Tests

## Overview

This test suite validates the application is ready for Render deployment **BEFORE** pushing to GitHub. It catches common issues that work locally but fail on Render.

## Problem Statement

We kept finding issues after deploying to Render that worked fine locally:
- HTML files returning 404 because they're in the wrong directory
- Static middleware misconfigured
- Hardcoded local paths that don't work on Render
- Missing environment variables

These tests catch all of those issues **before deployment**.

## Test Categories

### 1. File Existence Tests (`file-existence.test.ts`)

**What it checks:**
- Critical HTML files exist in `/public` directory
- Module HTML files exist in project root
- Directory structure is correct
- Files are readable and not empty
- No duplicate files causing conflicts

**Example failure:**
```
DEPLOYMENT BLOCKER: conductor-unified-dashboard.html is missing from /public directory!
Expected path: /Users/you/project/public/conductor-unified-dashboard.html
This file is referenced in src/index.ts and MUST exist for Render deployment.
```

**How to fix:**
- Move file to correct directory
- Create missing file
- Check file permissions

### 2. Route Validation Tests (`route-validation.test.ts`)

**What it checks:**
- All HTML routes return 200 OK (not 404)
- Static middleware serves files correctly
- No duplicate routes overriding static middleware
- Correct Content-Type headers
- Health endpoint works

**Example failure:**
```
DEPLOYMENT BLOCKER: /conductor-unified-dashboard.html returns 404!
Description: Main dashboard
File exists: true

Possible fixes:
1. Move file to project root (currently served via static middleware)
2. Check static middleware serves project root
3. Verify no route override in src/index.ts
```

**How to fix:**
- Remove duplicate `app.get()` routes
- Fix static middleware configuration
- Move files to correct directory

### 3. Path References Tests (`path-references.test.ts`)

**What it checks:**
- No hardcoded `/Users/` or `/home/` paths
- All `sendFile()` uses `path.join()` or `path.resolve()`
- No relative paths (`./../file`)
- No string concatenation for paths
- Static middleware order is correct

**Example failure:**
```
DEPLOYMENT BLOCKER: Hardcoded local paths detected!
src/index.ts
  Line 278: res.sendFile('/Users/name/project/public/index.html')

These paths will not work on Render.
Use path.resolve(__dirname, ...) or environment variables.
```

**How to fix:**
```typescript
// BAD
res.sendFile('/Users/name/project/public/index.html');

// GOOD
const publicDir = path.join(__dirname, '../public');
res.sendFile(path.join(publicDir, 'index.html'));
```

### 4. Environment Tests (`environment.test.ts`)

**What it checks:**
- `package.json` has `start` and `build` scripts
- Node.js version specified in `engines`
- All required dependencies present
- `tsconfig.json` configured correctly
- Works with Render environment variables
- No hardcoded secrets

**Example failure:**
```
DEPLOYMENT BLOCKER: Missing "start" script in package.json!
Render requires: "start": "node dist/index.js"
Add this to package.json scripts section.
```

**How to fix:**
- Add missing scripts to `package.json`
- Configure `tsconfig.json` outDir
- Set environment variables

## Usage

### Run All Deployment Tests

```bash
npm run test:deploy
```

This runs all 4 test suites with verbose output.

### Run Individual Test Suites

```bash
npm run test:deploy:files    # File existence only
npm run test:deploy:routes   # Route validation only
npm run test:deploy:paths    # Path references only
npm run test:deploy:env      # Environment config only
```

### Full Pre-Deployment Validation

```bash
npm run validate-deploy
```

This runs:
1. All deployment tests
2. TypeScript build
3. Shows success message if ready

**Output on success:**
```
PASS  tests/deployment/file-existence.test.ts
PASS  tests/deployment/route-validation.test.ts
PASS  tests/deployment/path-references.test.ts
PASS  tests/deployment/environment.test.ts

✅ Deployment validation passed! Ready for Render.
```

**Output on failure:**
```
FAIL  tests/deployment/route-validation.test.ts
  ● Route Validation Tests › GET /conductor-unified-dashboard.html returns 404

  DEPLOYMENT BLOCKER: /conductor-unified-dashboard.html returns 404!
  [Clear error message with fix instructions]
```

## Integration with Workflow

### Before Pushing to GitHub

```bash
# 1. Make changes
# 2. Test locally
npm run dev

# 3. Validate deployment readiness
npm run validate-deploy

# 4. If tests pass, commit and push
git add .
git commit -m "Feature: Add new module"
git push origin main

# 5. Render auto-deploys
```

### CI/CD Integration

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render
on:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run validate-deploy
```

## Common Issues and Fixes

### Issue: File returns 404

**Symptoms:**
- Route returns 404 on Render
- Works fine locally

**Diagnosis:**
```bash
npm run test:deploy:routes
```

**Common causes:**
1. File in wrong directory
2. Static middleware not configured
3. Duplicate route override

**Fix:**
```typescript
// Check src/index.ts
app.use(express.static(publicDir));  // Must come BEFORE routes
app.get('/', (req, res) => {...});   // Route definitions AFTER
```

### Issue: Hardcoded path breaks on Render

**Symptoms:**
- sendFile() fails with ENOENT
- Path works locally but not on Render

**Diagnosis:**
```bash
npm run test:deploy:paths
```

**Common causes:**
1. Absolute local path (`/Users/...`)
2. String concatenation (`dir + '/file'`)
3. Relative path (`'./public/file'`)

**Fix:**
```typescript
// BAD
res.sendFile('/Users/name/project/file.html');
res.sendFile(projectRoot + '/file.html');
res.sendFile('./public/file.html');

// GOOD
const filePath = path.join(__dirname, '../public/file.html');
res.sendFile(filePath);
```

### Issue: Missing files

**Symptoms:**
- Build succeeds but runtime crashes
- Files missing from deployment

**Diagnosis:**
```bash
npm run test:deploy:files
```

**Common causes:**
1. File not committed to git
2. File in `.gitignore`
3. File only in local directory

**Fix:**
```bash
# Check git status
git status

# Ensure file is tracked
git add public/missing-file.html
git commit -m "Add missing file"
```

### Issue: Build fails on Render

**Symptoms:**
- TypeScript compilation fails
- Missing dependencies

**Diagnosis:**
```bash
npm run test:deploy:env
npm run build
```

**Common causes:**
1. Missing `build` script
2. Invalid `tsconfig.json`
3. Missing dependencies

**Fix:**
```json
// package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Test Configuration

Tests use the existing Jest configuration from `jest.config.js`.

**Coverage target:** These tests focus on deployment readiness, not code coverage.

**Timeout:** Tests have 30-second timeout for route validation (server startup).

**Dependencies:** Uses only existing packages (Jest, Supertest, fs, path).

## When to Run

**Always run before:**
- Pushing to GitHub
- Creating pull requests
- Deploying to Render

**Run during development:**
- After changing `src/index.ts`
- After moving HTML files
- After updating routes
- After changing static middleware

**CI/CD pipeline:**
- Run on every commit
- Block deployment if fails

## Success Criteria

All tests must pass before deploying to Render:

- ✅ All critical HTML files exist
- ✅ All routes return 200 OK
- ✅ No hardcoded local paths
- ✅ Static middleware configured correctly
- ✅ `package.json` has required scripts
- ✅ `tsconfig.json` is valid
- ✅ Build succeeds (`npm run build`)

## Troubleshooting

### Tests fail with "Cannot find module"

**Cause:** Missing dependency or import issue

**Fix:**
```bash
npm install
npm run build
```

### Tests timeout

**Cause:** Server not starting or port conflict

**Fix:**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Restart tests
npm run test:deploy
```

### Tests pass locally but fail in CI

**Cause:** Environment differences

**Fix:**
- Check Node.js version matches
- Verify all dependencies in `package.json`
- Ensure files committed to git

## Contributing

When adding new HTML pages or routes:

1. Add file to correct directory (`/public` or project root)
2. Update routes in `src/index.ts`
3. Run `npm run validate-deploy`
4. Update tests if needed

## Related Documentation

- [DEPLOYMENT.md](/DEPLOYMENT.md) - Render deployment guide
- [TESTING.md](/TESTING.md) - Comprehensive testing guide
- [API_DOCUMENTATION.md](/API_DOCUMENTATION.md) - API reference

## Contact

If tests fail and you can't resolve:
1. Check error message for fix instructions
2. Review this README
3. Check existing code for examples
4. Create GitHub issue with test output
