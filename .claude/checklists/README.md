# Local-to-Render Deployment Validation System

This directory contains tools to prevent common deployment issues when moving from local development to Render (or similar cloud platforms).

## Overview

Many apps work perfectly locally but fail in production due to:
- File path differences (`/Users/you/project` → `/app`)
- Static file serving configuration issues
- Missing environment variables
- Docker build problems
- Route conflicts

This validation system catches these issues **before** deployment.

## Files in This Directory

### 1. `local-to-render-validation.md`
**Purpose**: Comprehensive human-readable checklist

**Use when**:
- About to deploy to Render for the first time
- After making infrastructure changes (paths, static files, routes)
- When onboarding new team members
- As a reference during code review

**What it covers**:
- File path configuration (10 checks)
- Static file serving (5 checks)
- Docker configuration (6 checks)
- Environment variables (4 checks)
- Route configuration (5 checks)
- Database & external services (2 checks)
- Logging & monitoring (4 checks)
- Security & performance (5 checks)
- Build & start commands (3 checks)
- Testing static file access (8 checks)

**Total**: 52+ validation points

---

### 2. `render-deployment-pitfalls.md`
**Purpose**: Quick reference guide for debugging common issues

**Use when**:
- Deployment failed and you need to debug
- App works locally but not on Render
- Emergency troubleshooting
- Learning from past mistakes

**What it covers**:
- 8 major categories of issues
- Real-world symptoms and causes
- Code examples (BAD vs GOOD)
- Emergency fixes
- Quick diagnostic checklist

**Key sections**:
1. File Path Issues (2 pitfalls)
2. Static File Serving (3 pitfalls)
3. Docker Build Problems (2 pitfalls)
4. Environment Variables (2 pitfalls)
5. Route Conflicts (2 pitfalls)
6. Database & External Services (2 pitfalls)
7. Build & Deployment (2 pitfalls)
8. Performance & Timeouts (2 pitfalls)

---

### 3. Automated Validation Script
**Location**: `/scripts/pre-render-validation.sh`

**Use when**:
- Before every deployment
- In CI/CD pipeline
- After making changes to paths, routes, or static files
- As part of pre-commit hooks

**What it checks**:
1. **File Structure** (7 checks)
   - Critical directories exist (src/, public/)
   - Critical files exist (package.json, Dockerfile, etc.)
   - HTML files present in public/

2. **Code Patterns** (5 checks)
   - No hardcoded paths (/Users/, C:\, etc.)
   - Uses dynamic path resolution (__dirname, path.resolve)
   - Proper projectRoot and publicDir configuration

3. **TypeScript Build** (3 checks)
   - Type checking passes
   - tsconfig.json configured correctly
   - Output directory is dist/

4. **Package.json** (4 checks)
   - Required scripts exist (build, start)
   - Start script runs compiled code
   - Node.js version requirement specified

5. **Dockerfile** (6 checks)
   - Copies public/ directory
   - Copies src/ directory
   - Copies package files
   - Includes build step
   - Exposes port 3000
   - Has health check

6. **Environment Variables** (3 checks)
   - PORT has default value
   - NODE_ENV has default value
   - .env files in .gitignore

7. **Static File Serving** (3 checks)
   - express.static() configured
   - Root route defined
   - Health check endpoint exists

8. **Docker Build** (optional, 2 checks)
   - Docker build succeeds
   - public/ directory exists in image

9. **Dependencies** (3 checks)
   - package-lock.json exists
   - Critical dependencies present

10. **Security & Best Practices** (4 checks)
    - Helmet configured
    - Compression enabled
    - CORS configured
    - Trust proxy set

**Total**: 40+ automated checks

---

## How to Use

### Method 1: Automated Script (Recommended)

```bash
# Run full validation suite
npm run test:render-ready

# Or directly
bash scripts/pre-render-validation.sh
```

**Output**:
- Green ✓ for passed checks
- Red ✗ for failed checks
- Yellow ⚠ for warnings
- Summary at the end

**Exit codes**:
- `0` = All checks passed, ready for deployment
- `1` = One or more checks failed, fix before deploying

---

### Method 2: Manual Checklist

1. Open `local-to-render-validation.md`
2. Go through each section
3. Check off items as you verify them
4. Sign off at the bottom before deployment
5. Keep a copy with deployment date for audit trail

---

### Method 3: Debugging Guide

When deployment fails:

1. Open `render-deployment-pitfalls.md`
2. Find the symptom you're experiencing
3. Read the cause and solution
4. Apply the fix
5. Re-run validation script
6. Deploy again

---

## Integration with CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
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
      - run: npm ci
      - run: npm run test:render-ready

  deploy:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      # Deployment steps...
```

---

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash
npm run test:render-ready

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Fix issues before committing."
  exit 1
fi
```

---

## Real-World Example: Our Recent Issue

**Problem**: App worked locally but returned 404 on Render for all HTML files.

**Root causes found**:
1. ✗ Duplicate root route definitions (lines 276, 428, 434, 438, 443 in src/index.ts)
2. ✗ Conflicting route priorities
3. ✗ Path resolution worked in dev but broke in production

**How validation system caught it**:
```bash
$ npm run test:render-ready

✗ Multiple root routes defined
  Found at lines: 276, 428, 434, 438, 443
  Only first route is honored - remove duplicates

✗ projectRoot vs publicDir confusion
  Some routes use projectRoot, others use publicDir
  Recommend: Use publicDir for all HTML files in /public
```

**Fix applied**:
1. Removed duplicate root routes (kept only line 276)
2. Changed all HTML serving to use `publicDir`
3. Re-ran validation: ✓ All checks passed
4. Deployed to Render: ✓ Success

**Time saved**: 2+ hours of debugging

---

## Customization for Your Project

### Add Project-Specific Checks

Edit `scripts/pre-render-validation.sh`:

```bash
# Add custom section at line 300
section "11. Project-Specific Checks"

# Example: Check for required API keys
if grep -q "STRIPE_KEY" "$PROJECT_ROOT/.env.example"; then
  pass "STRIPE_KEY documented in .env.example"
else
  warn "Add STRIPE_KEY to .env.example for team reference"
fi
```

---

### Update Checklist for Your Workflow

Edit `local-to-render-validation.md`:

1. Add your specific deployment steps
2. Document your environment variables
3. Add team-specific requirements
4. Update sign-off section with your team members

---

## Maintenance

### When to Update These Files

1. **After deployment failures**: Add new pitfalls to `render-deployment-pitfalls.md`
2. **New infrastructure**: Update checklist and validation script
3. **Team feedback**: Add commonly forgotten steps
4. **Quarterly review**: Verify all checks are still relevant

### Version History

- **v1.0.0** (2025-10-19): Initial release
  - 52-point manual checklist
  - 40+ automated checks
  - 16 documented pitfalls
  - Full integration with package.json

---

## Support

### Common Questions

**Q: How long does validation take?**
A: 30-60 seconds without Docker build, 5-10 minutes with full Docker test.

**Q: Can I skip checks?**
A: Not recommended, but you can comment out sections in the script.

**Q: What if a check fails but I know it's okay?**
A: Review the warning, document why it's safe to ignore, and update the script.

**Q: Does this work for platforms other than Render?**
A: Yes! Most checks apply to Heroku, Railway, Fly.io, AWS, etc.

---

## Contributing

Found a new pitfall? Improve a check? Submit updates:

1. Document the issue in `render-deployment-pitfalls.md`
2. Add automated check to `pre-render-validation.sh` (if possible)
3. Update this README with lessons learned
4. Share with the team

---

## Quick Links

- [Full Checklist](./local-to-render-validation.md)
- [Pitfalls Guide](./render-deployment-pitfalls.md)
- [Validation Script](../../scripts/pre-render-validation.sh)
- [Render Documentation](https://render.com/docs)

---

**Last Updated**: 2025-10-19
**Maintained By**: Project Conductor Team
**Version**: 1.0.0
