#!/bin/bash
# security-audit.sh
# Security validation for Project Conductor

set -e

echo "🔒 Project Conductor Security Audit"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Check for known vulnerabilities
echo "1️⃣  Checking npm dependencies for vulnerabilities..."
if npm audit --audit-level=moderate > /dev/null 2>&1; then
  echo -e "${GREEN}✅ No moderate or higher vulnerabilities found${NC}"
else
  echo -e "${YELLOW}⚠️  Vulnerabilities found in dependencies${NC}"
  npm audit --audit-level=moderate
  WARNINGS=$((WARNINGS + 1))
fi

# 2. Check for exposed secrets in code
echo ""
echo "2️⃣  Scanning for exposed secrets..."
SECRET_PATTERNS=(
  "password\s*=\s*['\"][^'\"]+['\"]"
  "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
  "secret\s*=\s*['\"][^'\"]+['\"]"
  "token\s*=\s*['\"][^'\"]+['\"]"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -rE "$pattern" src/ --include="*.ts" 2>/dev/null | grep -v "process.env" | grep -q .; then
    SECRETS_FOUND=$((SECRETS_FOUND + 1))
  fi
done

if [ $SECRETS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
else
  echo -e "${RED}❌ Found potential hardcoded secrets in code${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Check for gitleaks (if installed)
echo ""
echo "3️⃣  Running gitleaks (if available)..."
if command -v gitleaks &> /dev/null; then
  if gitleaks detect --source . --verbose --no-git > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gitleaks scan passed${NC}"
  else
    echo -e "${RED}❌ Gitleaks found potential secrets${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}⚠️  gitleaks not installed (recommended: brew install gitleaks)${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 4. Check environment variables
echo ""
echo "4️⃣  Environment Variable Check..."
REQUIRED_ENVS=("NODE_ENV" "PORT")
OPTIONAL_ENVS=("DATABASE_URL" "REDIS_URL" "JWT_SECRET")

ENV_MISSING=0
for env in "${REQUIRED_ENVS[@]}"; do
  if [ -z "${!env}" ]; then
    echo -e "${YELLOW}⚠️  Missing environment variable: $env${NC}"
    ENV_MISSING=$((ENV_MISSING + 1))
  else
    echo -e "${GREEN}✅ $env is set${NC}"
  fi
done

for env in "${OPTIONAL_ENVS[@]}"; do
  if [ -z "${!env}" ]; then
    echo -e "${YELLOW}ℹ️  Optional environment variable not set: $env${NC}"
  else
    echo -e "${GREEN}✅ $env is set${NC}"
  fi
done

if [ $ENV_MISSING -gt 0 ]; then
  WARNINGS=$((WARNINGS + 1))
fi

# 5. Check .env file is gitignored
echo ""
echo "5️⃣  Checking .env file security..."
if [ -f .env ]; then
  if git check-ignore .env > /dev/null 2>&1; then
    echo -e "${GREEN}✅ .env file is gitignored${NC}"
  else
    echo -e "${RED}❌ .env file is NOT gitignored - potential secret exposure!${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}ℹ️  No .env file found${NC}"
fi

# 6. Check for SQL injection vulnerabilities
echo ""
echo "6️⃣  Checking for potential SQL injection vulnerabilities..."
SQL_INJECTIONS=$(grep -rE "query\s*\(\s*['\"].*\$\{" src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SQL_INJECTIONS" -eq 0 ]; then
  echo -e "${GREEN}✅ No obvious SQL injection vulnerabilities${NC}"
else
  echo -e "${RED}❌ Found $SQL_INJECTIONS potential SQL injection vulnerabilities${NC}"
  echo -e "${YELLOW}   Use parameterized queries: query('SELECT * FROM table WHERE id = \$1', [id])${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 7. Check for XSS vulnerabilities
echo ""
echo "7️⃣  Checking for potential XSS vulnerabilities..."
XSS_PATTERNS=$(grep -rE "innerHTML\s*=|dangerouslySetInnerHTML" src/ public/ --include="*.ts" --include="*.html" 2>/dev/null | wc -l | tr -d ' ')
if [ "$XSS_PATTERNS" -eq 0 ]; then
  echo -e "${GREEN}✅ No obvious XSS vulnerabilities${NC}"
else
  echo -e "${YELLOW}⚠️  Found $XSS_PATTERNS potential XSS vulnerabilities${NC}"
  echo -e "${YELLOW}   Ensure all user input is sanitized before rendering${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 8. Check for eval usage
echo ""
echo "8️⃣  Checking for dangerous eval() usage..."
EVAL_COUNT=$(grep -rE "\beval\s*\(" src/ --include="*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$EVAL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ No eval() usage found${NC}"
else
  echo -e "${RED}❌ Found $EVAL_COUNT eval() usage - potential code injection risk${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 9. Check HTTPS enforcement (production)
echo ""
echo "9️⃣  Checking HTTPS enforcement..."
if [ "$NODE_ENV" = "production" ]; then
  if grep -r "app.use.*helmet" src/ --include="*.ts" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Helmet.js detected for security headers${NC}"
  else
    echo -e "${YELLOW}⚠️  Consider using helmet.js for security headers${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo -e "${YELLOW}ℹ️  Not in production mode, skipping HTTPS checks${NC}"
fi

# 10. Check for rate limiting
echo ""
echo "🔟 Checking rate limiting implementation..."
if grep -r "express-rate-limit\|rateLimit" src/ --include="*.ts" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Rate limiting detected${NC}"
else
  echo -e "${YELLOW}⚠️  No rate limiting found - consider adding express-rate-limit${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "===================================="
echo "🔒 Security Audit Summary"
echo "===================================="
echo -e "Critical Issues: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Security audit passed!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Security audit passed with warnings${NC}"
  exit 0
else
  echo -e "${RED}❌ Security audit failed with $ERRORS critical issue(s)${NC}"
  exit 1
fi
