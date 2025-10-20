#!/bin/bash
# Deployment Validation Script
# Run this BEFORE every deployment to Render/production

set -e  # Exit on first error

echo "=== Project Conductor Deployment Validator ==="
echo ""
echo "This script validates your app is ready for production deployment."
echo "It catches common 'works locally, fails on Render' issues."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Step 1: Git Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Checking git status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

UNTRACKED=$(git status --porcelain | grep "^??" || true)
if [ -n "$UNTRACKED" ]; then
  echo -e "${RED}❌ FAIL: Untracked files found:${NC}"
  echo "$UNTRACKED"
  echo ""
  echo "Files must be tracked in git for Render to access them."
  echo "Fix: git add <file> && git commit -m 'Add files'"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: No untracked files${NC}"
fi

UNCOMMITTED=$(git status --porcelain | grep "^ M" || true)
if [ -n "$UNCOMMITTED" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Uncommitted changes found:${NC}"
  echo "$UNCOMMITTED"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
  WARNINGS=$((WARNINGS + 1))
fi

# Step 2: Check for duplicate routes
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Checking for duplicate routes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count explicit HTML routes (should be minimal if using static middleware)
EXPLICIT_ROUTES=$(grep -n "app.get.*\.html" src/index.ts 2>/dev/null | wc -l | tr -d ' ')

if [ "$EXPLICIT_ROUTES" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Found $EXPLICIT_ROUTES explicit HTML routes${NC}"
  echo "This could conflict with static middleware."
  echo ""
  echo "Explicit routes found:"
  grep -n "app.get.*\.html" src/index.ts
  echo ""
  echo "Review: Do these files exist in /public?"
  echo "If yes, remove explicit route and let static middleware handle it."
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ PASS: Minimal explicit routes ($EXPLICIT_ROUTES)${NC}"
fi

# Step 3: Check for hardcoded paths
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Checking for hardcoded paths..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HARDCODED=$(grep -r "\/Users\/" src/ 2>/dev/null | grep -v node_modules | grep -v ".js.map" || true)
if [ -n "$HARDCODED" ]; then
  echo -e "${RED}❌ FAIL: Hardcoded paths found:${NC}"
  echo "$HARDCODED"
  echo ""
  echo "Fix: Use path.join(__dirname, ...) instead of absolute paths"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: No hardcoded paths${NC}"
fi

# Step 4: Validate static file configuration
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Validating static file configuration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if /public directory exists
if [ ! -d "public" ]; then
  echo -e "${YELLOW}⚠️  WARNING: /public directory not found${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  PUBLIC_FILES=$(ls -1 public/*.html 2>/dev/null | wc -l | tr -d ' ')
  echo "   Found $PUBLIC_FILES HTML files in /public"
fi

# Check if publicDir is used in static middleware
PUBLICDIR_USAGE=$(grep -c "express.static(publicDir)" src/index.ts 2>/dev/null || echo "0")
if [ "$PUBLICDIR_USAGE" -lt 1 ]; then
  echo -e "${YELLOW}⚠️  WARNING: publicDir static middleware not found in index.ts${NC}"
  echo "Files in /public may not be served correctly."
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ PASS: publicDir static middleware configured${NC}"
fi

# Step 5: Check for path mismatches
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Checking for path mismatches..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check sendFile calls using projectRoot when file might be in publicDir
SENDFILE_LINES=$(grep -n "sendFile.*projectRoot" src/index.ts 2>/dev/null || true)
if [ -n "$SENDFILE_LINES" ]; then
  echo -e "${YELLOW}⚠️  WARNING: sendFile() calls using projectRoot:${NC}"
  echo "$SENDFILE_LINES"
  echo ""
  echo "Verify these files exist at projectRoot, not publicDir."
  echo "If file is in /public, use publicDir instead of projectRoot."
  WARNINGS=$((WARNINGS + 1))
fi

# Step 6: Build test
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Running build test..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm run build > /tmp/build.log 2>&1; then
  echo -e "${GREEN}✅ PASS: Build successful${NC}"

  # Check if dist directory was created
  if [ -d "dist" ]; then
    FILES=$(find dist -name "*.js" | wc -l | tr -d ' ')
    echo "   Generated $FILES JavaScript files in dist/"
  fi
else
  echo -e "${RED}❌ FAIL: Build failed${NC}"
  echo "Build output:"
  cat /tmp/build.log
  ERRORS=$((ERRORS + 1))
fi

# Step 7: Check required files
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Checking required files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_FILES=(
  "src/index.ts"
  "package.json"
  "tsconfig.json"
  "package-lock.json"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo -e "${RED}❌ FAIL: Missing required files:${NC}"
  for file in "${MISSING_FILES[@]}"; do
    echo "  - $file"
  done
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: All required files present${NC}"
fi

# Step 8: Environment variable check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. Checking environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Extract env vars from code
ENV_VARS=$(grep -rh "process.env\[" src/ 2>/dev/null | grep -v node_modules | grep -o "process.env\['[^']*'\]" | sort -u | sed "s/process.env\['\(.*\)'\]/\1/" || true)

if [ -n "$ENV_VARS" ]; then
  echo "Environment variables used in code:"
  echo "$ENV_VARS" | sed 's/^/  - /'
  echo ""
  echo "⚠️  Ensure these are set in Render dashboard"
else
  echo -e "${GREEN}✅ No process.env usage found${NC}"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "=== Deployment Validation Summary ==="
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ FAILED: $ERRORS error(s) found${NC}"
  echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS warning(s)${NC}"
  echo ""
  echo "Fix errors before deploying to production."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS: $WARNINGS warning(s)${NC}"
  echo ""
  echo "Review warnings before deploying."
  echo ""
  read -p "Deploy anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
  echo ""
  echo "Ready to deploy to Render!"
fi

echo ""
echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'Ready for deployment'"
echo "  3. git push origin main"
echo "  4. Monitor Render deployment logs at https://dashboard.render.com"
echo ""
