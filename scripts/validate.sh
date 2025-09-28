#!/bin/bash

# Project Conductor Validation Script
# Runs all validation checks required by PRPs

echo "🔍 Project Conductor Validation Suite"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to run a command and report status
run_check() {
    local NAME=$1
    local CMD=$2

    echo -n "Running $NAME... "

    if eval $CMD > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        OVERALL_STATUS=1
        return 1
    fi
}

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# 1. Build Check
echo "1. Build Check"
echo "--------------"
run_check "TypeScript Compilation" "npm run build"
echo ""

# 2. Linting Check
echo "2. Code Quality"
echo "---------------"
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    run_check "ESLint" "npm run lint"
else
    echo -e "${YELLOW}⚠ No lint script found${NC}"
fi
echo ""

# 3. Test Suite
echo "3. Test Suite"
echo "-------------"
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    run_check "Unit & Integration Tests" "npm test"
else
    echo -e "${YELLOW}⚠ No test script found${NC}"
fi
echo ""

# 4. Type Checking
echo "4. Type Safety"
echo "--------------"
run_check "TypeScript Strict Mode" "npx tsc --noEmit"
echo ""

# 5. Check for common issues
echo "5. Code Hygiene"
echo "---------------"

# Check for console.log statements
CONSOLE_COUNT=$(grep -r "console\.\(log\|error\|warn\)" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $CONSOLE_COUNT console statements in src/${NC}"
else
    echo -e "${GREEN}✓ No console statements${NC}"
fi

# Check for 'any' types
ANY_COUNT=$(grep -r ": any" src/ --include="*.ts" --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ $ANY_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $ANY_COUNT uses of 'any' type${NC}"
else
    echo -e "${GREEN}✓ No 'any' types found${NC}"
fi

# Check for TODO comments
TODO_COUNT=$(grep -r "TODO\|FIXME\|XXX" src/ --exclude-dir=node_modules 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo -e "${YELLOW}ℹ Found $TODO_COUNT TODO/FIXME comments${NC}"
fi
echo ""

# 6. Dependencies Check
echo "6. Dependencies"
echo "---------------"
echo -n "Checking for vulnerabilities... "
if npm audit --audit-level=high > /dev/null 2>&1; then
    echo -e "${GREEN}✓ No high/critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠ Vulnerabilities found (run 'npm audit' for details)${NC}"
fi
echo ""

# Final Summary
echo "======================================"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ All validation checks PASSED${NC}"
    echo ""
    echo "Your code is ready for commit!"
else
    echo -e "${RED}❌ Some validation checks FAILED${NC}"
    echo ""
    echo "Please fix the issues above before committing."
    exit 1
fi

# Additional info
echo ""
echo "For detailed output, run individual commands:"
echo "  npm run build    - Full build output"
echo "  npm run lint     - Detailed linting results"
echo "  npm test         - Complete test results"
echo "  npm audit        - Security vulnerability details"