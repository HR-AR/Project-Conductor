#!/bin/bash

###############################################################################
# Pre-Render Deployment Validation Script
#
# Purpose: Automated checks to catch common issues before deploying to Render
# Usage: npm run test:render-ready
#        bash scripts/pre-render-validation.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed
###############################################################################

set -e  # Exit on first error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Pre-Render Deployment Validation                        ║${NC}"
echo -e "${BLUE}║   Project Conductor                                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Project Root:${NC} $PROJECT_ROOT"
echo ""

###############################################################################
# Helper Functions
###############################################################################

pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAILED++))
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

###############################################################################
# 1. File Structure Validation
###############################################################################

section "1. File Structure Validation"

# Check critical directories exist
if [ -d "$PROJECT_ROOT/src" ]; then
  pass "src/ directory exists"
else
  fail "src/ directory missing"
fi

if [ -d "$PROJECT_ROOT/public" ]; then
  pass "public/ directory exists"
else
  fail "public/ directory missing"
fi

# Check critical files exist
critical_files=(
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "Dockerfile"
  "src/index.ts"
)

for file in "${critical_files[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    pass "$file exists"
  else
    fail "$file missing"
  fi
done

# Check public directory has HTML files
html_count=$(find "$PROJECT_ROOT/public" -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
if [ "$html_count" -gt 0 ]; then
  pass "Found $html_count HTML file(s) in public/"
else
  warn "No HTML files found in public/ directory"
fi

###############################################################################
# 2. Code Pattern Validation (Path Usage)
###############################################################################

section "2. Code Pattern Validation"

# Check for hardcoded paths (common mistake)
echo -e "${BLUE}Checking for hardcoded paths...${NC}"

hardcoded_patterns=(
  "/Users/"
  "/home/"
  "C:\\\\"
  "D:\\\\"
)

found_hardcoded=0
for pattern in "${hardcoded_patterns[@]}"; do
  if grep -r "$pattern" "$PROJECT_ROOT/src" 2>/dev/null | grep -v "node_modules" | grep -v ".git" | grep -v "coverage" >/dev/null; then
    warn "Found potential hardcoded path: $pattern"
    grep -r "$pattern" "$PROJECT_ROOT/src" 2>/dev/null | grep -v "node_modules" | grep -v ".git" | head -3
    found_hardcoded=1
  fi
done

if [ $found_hardcoded -eq 0 ]; then
  pass "No hardcoded paths detected"
fi

# Check for dynamic path resolution (should use __dirname or path.resolve)
if grep -r "__dirname\|path.resolve\|process.cwd()" "$PROJECT_ROOT/src/index.ts" >/dev/null 2>&1; then
  pass "Using dynamic path resolution in src/index.ts"
else
  fail "src/index.ts should use __dirname or path.resolve() for paths"
fi

# Check for projectRoot and publicDir variables
if grep -q "projectRoot.*=.*path.resolve" "$PROJECT_ROOT/src/index.ts" 2>/dev/null; then
  pass "projectRoot uses path.resolve()"
else
  fail "projectRoot should use path.resolve() in src/index.ts"
fi

if grep -q "publicDir.*=.*path.join" "$PROJECT_ROOT/src/index.ts" 2>/dev/null; then
  pass "publicDir uses path.join()"
else
  fail "publicDir should use path.join() in src/index.ts"
fi

###############################################################################
# 3. TypeScript Build Validation
###############################################################################

section "3. TypeScript Build Validation"

echo -e "${BLUE}Running TypeScript compiler check...${NC}"

# Check if tsc is available
if ! command -v npx &> /dev/null; then
  fail "npx not found - cannot run TypeScript compiler"
else
  # Run type checking (don't emit files) - capture output
  if npx tsc --noEmit > /tmp/tsc-output.txt 2>&1; then
    pass "TypeScript type checking passed"
  else
    # Count errors
    error_count=$(grep -c "error TS" /tmp/tsc-output.txt 2>/dev/null || echo "0")
    if [ "$error_count" -gt 0 ]; then
      fail "TypeScript type checking failed ($error_count errors)"
      echo -e "${YELLOW}First 10 errors:${NC}"
      grep "error TS" /tmp/tsc-output.txt | head -10
      echo -e "${YELLOW}Run 'npm run typecheck' for full output${NC}"
    else
      warn "TypeScript check completed with warnings"
    fi
  fi
fi

# Verify tsconfig.json has correct settings
if [ -f "$PROJECT_ROOT/tsconfig.json" ]; then
  if grep -q '"outDir".*"dist"' "$PROJECT_ROOT/tsconfig.json"; then
    pass "tsconfig.json outputs to dist/"
  else
    warn "tsconfig.json should output to dist/ directory"
  fi
fi

###############################################################################
# 4. Package.json Validation
###############################################################################

section "4. Package.json Validation"

# Check for required scripts
required_scripts=("build" "start")

for script in "${required_scripts[@]}"; do
  if grep -q "\"$script\":" "$PROJECT_ROOT/package.json"; then
    pass "npm script '$script' exists"
  else
    fail "npm script '$script' missing in package.json"
  fi
done

# Check that start script uses dist/
if grep -q '"start".*"node dist/index.js"' "$PROJECT_ROOT/package.json"; then
  pass "npm start runs compiled code (dist/index.js)"
else
  warn "npm start should run 'node dist/index.js' for production"
fi

# Check Node.js version requirement
if grep -q '"node".*">=.*20' "$PROJECT_ROOT/package.json"; then
  pass "Node.js version requirement specified (>=20)"
else
  warn "Should specify Node.js version requirement in package.json engines"
fi

###############################################################################
# 5. Dockerfile Validation
###############################################################################

section "5. Dockerfile Validation"

if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
  # Check for critical COPY commands
  if grep -q "COPY public" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile copies public/ directory"
  else
    fail "Dockerfile must include: COPY public ./public"
  fi

  if grep -q "COPY src" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile copies src/ directory"
  else
    fail "Dockerfile must include: COPY src ./src"
  fi

  if grep -q "COPY package.*json" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile copies package files"
  else
    fail "Dockerfile must copy package.json and package-lock.json"
  fi

  # Check for build step
  if grep -q "npm run build\|RUN.*tsc" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile includes TypeScript build step"
  else
    fail "Dockerfile should run 'npm run build' to compile TypeScript"
  fi

  # Check for EXPOSE command
  if grep -q "EXPOSE 3000" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile exposes port 3000"
  else
    warn "Dockerfile should expose port 3000"
  fi

  # Check for health check
  if grep -q "HEALTHCHECK" "$PROJECT_ROOT/Dockerfile"; then
    pass "Dockerfile includes health check"
  else
    warn "Dockerfile should include HEALTHCHECK instruction"
  fi
else
  fail "Dockerfile not found"
fi

###############################################################################
# 6. Environment Variable Validation
###############################################################################

section "6. Environment Variable Validation"

echo -e "${BLUE}Checking for environment variable defaults...${NC}"

# Check that PORT has a default
if grep -q "PORT.*||.*3000\|PORT.*\?\?.*3000" "$PROJECT_ROOT/src/index.ts"; then
  pass "PORT environment variable has default value"
else
  warn "PORT should have default value: process.env['PORT'] || 3000"
fi

# Check that NODE_ENV has a default
if grep -q "NODE_ENV.*||.*'development'" "$PROJECT_ROOT/src/index.ts"; then
  pass "NODE_ENV has default value"
else
  warn "NODE_ENV should have default: process.env['NODE_ENV'] || 'development'"
fi

# Check .env is in .gitignore
if grep -q "^\.env" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
  pass ".env files are in .gitignore"
else
  fail ".env files should be in .gitignore"
fi

###############################################################################
# 7. Static File Serving Validation
###############################################################################

section "7. Static File Serving Validation"

# Check express.static usage in index.ts
static_count=$(grep -c "express.static" "$PROJECT_ROOT/src/index.ts" 2>/dev/null || echo "0")
if [ "$static_count" -gt 0 ]; then
  pass "express.static() configured ($static_count instances)"
else
  fail "No express.static() middleware found in src/index.ts"
fi

# Check for root route handler
if grep -q "app.get('/'," "$PROJECT_ROOT/src/index.ts"; then
  pass "Root route (/) is defined"
else
  warn "Root route (/) should be explicitly defined"
fi

# Check for health check endpoint
if grep -q "app.get('/health'" "$PROJECT_ROOT/src/index.ts"; then
  pass "Health check endpoint (/health) exists"
else
  fail "Health check endpoint (/health) is required for Render"
fi

###############################################################################
# 8. Docker Build Test (Optional - Slow)
###############################################################################

section "8. Docker Build Test (Optional)"

if command -v docker &> /dev/null; then
  echo -e "${BLUE}Docker is available. Run full build test? (y/N)${NC}"

  # Skip interactive prompt in CI/automated environments
  if [ -t 0 ]; then
    read -r -t 10 -n 1 response || response="n"
  else
    response="n"
    echo -e "${YELLOW}Skipping Docker build test (non-interactive mode)${NC}"
  fi

  echo ""

  if [[ "$response" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Building Docker image (this may take a few minutes)...${NC}"

    if docker build -t project-conductor-test . >/dev/null 2>&1; then
      pass "Docker build successful"

      # Check that public directory exists in image
      if docker run --rm project-conductor-test ls /app/public >/dev/null 2>&1; then
        pass "public/ directory exists in Docker image"
      else
        fail "public/ directory missing in Docker image"
      fi

      # Clean up test image
      docker rmi project-conductor-test >/dev/null 2>&1
    else
      fail "Docker build failed"
      echo -e "${YELLOW}Run 'docker build .' manually to see detailed errors${NC}"
    fi
  else
    warn "Skipping Docker build test (run manually: docker build .)"
  fi
else
  warn "Docker not available - skipping Docker build test"
fi

###############################################################################
# 9. Dependencies Check
###############################################################################

section "9. Dependencies Check"

# Check for package-lock.json (needed for reproducible builds)
if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
  pass "package-lock.json exists (for reproducible builds)"
else
  fail "package-lock.json missing - run 'npm install' to generate"
fi

# Check critical dependencies exist
critical_deps=("express" "typescript")

for dep in "${critical_deps[@]}"; do
  if grep -q "\"$dep\"" "$PROJECT_ROOT/package.json"; then
    pass "$dep dependency found"
  else
    fail "$dep dependency missing"
  fi
done

###############################################################################
# 10. Security & Best Practices
###############################################################################

section "10. Security & Best Practices"

# Check for helmet (security headers)
if grep -q "helmet" "$PROJECT_ROOT/src/index.ts"; then
  pass "Helmet middleware configured (security headers)"
else
  warn "Consider using Helmet for security headers"
fi

# Check for compression
if grep -q "compression" "$PROJECT_ROOT/src/index.ts"; then
  pass "Compression middleware enabled"
else
  warn "Consider enabling compression for better performance"
fi

# Check for CORS configuration
if grep -q "cors\|CORS" "$PROJECT_ROOT/src/index.ts"; then
  pass "CORS configuration found"
else
  warn "CORS should be configured for API access"
fi

# Check trust proxy setting (needed for Render)
if grep -q "trust proxy" "$PROJECT_ROOT/src/index.ts"; then
  pass "Trust proxy configured (needed for Render)"
else
  warn "Should set 'app.set(\"trust proxy\", 1)' for Render deployment"
fi

###############################################################################
# Results Summary
###############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Validation Results Summary                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✓ ALL CHECKS PASSED - READY FOR DEPLOYMENT              ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

  if [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Note: $WARNINGS warning(s) found. Review above for improvements.${NC}"
  fi

  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Review any warnings above"
  echo "  2. Commit your changes: git add . && git commit -m 'Ready for deployment'"
  echo "  3. Push to Render: git push origin main"
  echo "  4. Monitor Render logs during deployment"
  echo "  5. Test the deployed app: https://yourapp.onrender.com/health"
  echo ""

  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   ✗ VALIDATION FAILED - FIX ISSUES BEFORE DEPLOYMENT       ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${YELLOW}Please fix the $FAILED failed check(s) above before deploying.${NC}"
  echo ""
  echo -e "${BLUE}Common fixes:${NC}"
  echo "  - Missing files: Ensure all files are committed to git"
  echo "  - TypeScript errors: Run 'npm run build' to see details"
  echo "  - Path issues: Use path.resolve(__dirname, '..') instead of hardcoded paths"
  echo "  - Dockerfile: Add missing COPY commands"
  echo ""

  exit 1
fi
