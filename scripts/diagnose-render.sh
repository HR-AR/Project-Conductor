#!/bin/bash
# diagnose-render.sh
# Diagnose production deployment issues on Render

echo "🔍 Render Deployment Diagnostics"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROD_URL="https://project-conductor.onrender.com"

echo "Testing production deployment at: $PROD_URL"
echo ""

# 1. Test root endpoint
echo "1️⃣  Testing root endpoint..."
if curl -s -o /dev/null -w "%{http_code}" "$PROD_URL" | grep -q "200"; then
    echo -e "${GREEN}✅ Root endpoint responds (200)${NC}"
else
    echo -e "${RED}❌ Root endpoint failed${NC}"
fi
echo ""

# 2. Test health endpoint
echo "2️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$PROD_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health endpoint responds${NC}"
    echo "Response: $HEALTH_RESPONSE"

    # Check database status
    if echo "$HEALTH_RESPONSE" | grep -q "disconnected"; then
        echo -e "${RED}⚠️  DATABASE DISCONNECTED!${NC}"
        echo "   This is the main issue - database is not connected"
    fi
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
fi
echo ""

# 3. Test API endpoints
echo "3️⃣  Testing API endpoints..."

# Requirements API
echo "   Testing /api/v1/requirements..."
REQUIREMENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/v1/requirements")
if [ "$REQUIREMENTS_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Requirements API (200)${NC}"
elif [ "$REQUIREMENTS_STATUS" = "500" ]; then
    echo -e "   ${RED}❌ Requirements API (500 - Server Error)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Requirements API ($REQUIREMENTS_STATUS)${NC}"
fi

# Projects API
echo "   Testing /api/v1/projects..."
PROJECTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/v1/projects")
if [ "$PROJECTS_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Projects API (200)${NC}"
elif [ "$PROJECTS_STATUS" = "500" ]; then
    echo -e "   ${RED}❌ Projects API (500 - Server Error)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Projects API ($PROJECTS_STATUS)${NC}"
fi
echo ""

# 4. Test module HTML files
echo "4️⃣  Testing module HTML files..."
MODULES=(
    "module-0-onboarding.html"
    "module-4-engineering-design.html"
    "demo-scenario-picker.html"
    "conductor-unified-dashboard.html"
    "analytics-dashboard.html"
    "project-detail.html"
)

for module in "${MODULES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/$module")
    if [ "$STATUS" = "200" ]; then
        echo -e "   ${GREEN}✅ $module (200)${NC}"
    elif [ "$STATUS" = "404" ]; then
        echo -e "   ${RED}❌ $module (404 - NOT FOUND)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  $module ($STATUS)${NC}"
    fi
done
echo ""

# 5. Test static assets
echo "5️⃣  Testing static assets..."
ASSETS=(
    "css/activity-feed.css"
    "js/auth-client.js"
    "service-worker.js"
)

for asset in "${ASSETS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/$asset")
    if [ "$STATUS" = "200" ]; then
        echo -e "   ${GREEN}✅ $asset (200)${NC}"
    elif [ "$STATUS" = "404" ]; then
        echo -e "   ${RED}❌ $asset (404 - NOT FOUND)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  $asset ($STATUS)${NC}"
    fi
done
echo ""

# 6. Summary and recommendations
echo "================================="
echo "📊 Summary & Recommendations"
echo "================================="
echo ""

# Check if database is the issue
if echo "$HEALTH_RESPONSE" | grep -q "disconnected"; then
    echo -e "${RED}🔴 CRITICAL: Database Disconnected${NC}"
    echo ""
    echo "Recommended fixes:"
    echo "1. Log into Render dashboard"
    echo "2. Go to your service → Environment"
    echo "3. Verify DATABASE_URL is set correctly"
    echo "4. If using external DB: Check connection string"
    echo "5. If using Render PostgreSQL: Ensure it's provisioned"
    echo "6. Restart the service after fixing"
    echo ""
fi

# Check if files are missing
MISSING_FILES=0
for module in "${MODULES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/$module")
    if [ "$STATUS" = "404" ]; then
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}🔴 CRITICAL: $MISSING_FILES module files not found${NC}"
    echo ""
    echo "Recommended fixes:"
    echo "1. Verify files are tracked in git: git ls-files public/"
    echo "2. Check Render build logs for deployment errors"
    echo "3. Ensure public/ directory is included in deployment"
    echo "4. Redeploy: git push origin main"
    echo ""
fi

# Next steps
echo "================================="
echo "🚀 Next Steps"
echo "================================="
echo ""
echo "1. Fix database connection (see above)"
echo "2. Ensure all files are deployed"
echo "3. Re-run this diagnostic: bash scripts/diagnose-render.sh"
echo "4. Test manually: open $PROD_URL/conductor-unified-dashboard.html"
echo ""
echo "For detailed logs:"
echo "  - Render Dashboard → Your Service → Logs"
echo "  - Look for database connection errors"
echo "  - Look for file not found errors"
echo ""
