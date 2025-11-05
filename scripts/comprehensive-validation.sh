#!/bin/bash
# comprehensive-validation.sh
# Complete validation suite for Project Conductor

set -e

echo "📊 Project Conductor Comprehensive Validation"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. TypeScript Compilation
echo "1️⃣  TypeScript Compilation..."
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ TypeScript compilation passed${NC}"
else
  echo -e "${RED}❌ TypeScript compilation failed${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 2. Type Checking (strict mode)
echo ""
echo "2️⃣  TypeScript Strict Checks..."
if npx tsc --noEmit --strict > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Type checking passed${NC}"
else
  echo -e "${RED}❌ Type checking failed${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Linting
echo ""
echo "3️⃣  ESLint..."
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Linting passed${NC}"
else
  echo -e "${YELLOW}⚠️  Linting issues found${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 4. Find 'any' types (anti-pattern)
echo ""
echo "4️⃣  Checking for 'any' types..."
ANY_COUNT=$(grep -r ": any" src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No 'any' types found${NC}"
elif [ "$ANY_COUNT" -lt 10 ]; then
  echo -e "${YELLOW}⚠️  Found $ANY_COUNT instances of 'any' type (target: 0)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${RED}❌ Found $ANY_COUNT instances of 'any' type (max: 10)${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 5. Find console.log (should use logger)
echo ""
echo "5️⃣  Checking for console.log..."
CONSOLE_COUNT=$(grep -r "console\." src/ --include="*.ts" 2>/dev/null | grep -v "// " | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No console statements found${NC}"
elif [ "$CONSOLE_COUNT" -lt 5 ]; then
  echo -e "${YELLOW}⚠️  Found $CONSOLE_COUNT console statements (should use logger)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${RED}❌ Found $CONSOLE_COUNT console statements (max: 5)${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 6. Check for hardcoded secrets
echo ""
echo "6️⃣  Checking for hardcoded secrets..."
if grep -r "password\s*=\s*['\"]" src/ --include="*.ts" 2>/dev/null | grep -v "process.env" > /dev/null; then
  echo -e "${RED}❌ Hardcoded passwords found!${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No hardcoded secrets detected${NC}"
fi

# 7. Test Suite
echo ""
echo "7️⃣  Running Test Suite..."
if npm test > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 8. Test Coverage Check
echo ""
echo "8️⃣  Checking Test Coverage..."
COVERAGE_OUTPUT=$(npm test -- --coverage --silent 2>&1 || true)
# Try to extract coverage percentage (this is approximate)
if echo "$COVERAGE_OUTPUT" | grep -q "All files"; then
  COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | awk '{print $4}' | sed 's/%//' || echo "0")
  if [ -z "$COVERAGE" ]; then
    COVERAGE="0"
  fi

  if (( $(echo "$COVERAGE >= 75" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "${GREEN}✅ Test coverage is $COVERAGE% (target: 75%)${NC}"
  else
    echo -e "${YELLOW}⚠️  Test coverage is $COVERAGE% (target: 75%)${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  Could not determine test coverage${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 9. Check for TODO/FIXME comments
echo ""
echo "9️⃣  Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME" src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No TODO/FIXME comments${NC}"
elif [ "$TODO_COUNT" -lt 10 ]; then
  echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments (consider addressing)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "=============================================="
echo "📊 Validation Summary"
echo "=============================================="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All validations passed!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Validation passed with warnings${NC}"
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
  exit 1
fi
