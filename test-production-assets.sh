#!/bin/bash

# Production Asset and API Validation Script
# Tests all critical files and endpoints on production

BASE_URL="https://project-conductor.onrender.com"

echo "======================================"
echo "PRODUCTION ASSET VALIDATION REPORT"
echo "======================================"
echo ""

# Test public JS files
echo "Testing Public JavaScript Files:"
echo "--------------------------------"
js_files=(
    "auth-client.js"
    "auth-guard.js"
    "widget-updater.js"
    "activity-feed.js"
    "activity-tracker.js"
    "session-manager.js"
    "conflict-handler.js"
    "integrations/jira-client.js"
    "integrations/sync-manager.js"
    "integrations/conflict-resolver-ui.js"
)

for file in "${js_files[@]}"; do
    url="$BASE_URL/public/js/$file"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "200" ]; then
        echo "✓ $file - 200 OK"
    else
        echo "✗ $file - $status"
    fi
done

echo ""

# Test public CSS files
echo "Testing Public CSS Files:"
echo "-------------------------"
css_files=(
    "widgets.css"
    "activity-feed.css"
    "conflict-alert.css"
    "auth.css"
    "session-warning.css"
    "integrations/jira.css"
    "integrations/conflict-resolution.css"
)

for file in "${css_files[@]}"; do
    url="$BASE_URL/public/css/$file"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "200" ]; then
        echo "✓ $file - 200 OK"
    else
        echo "✗ $file - $status"
    fi
done

echo ""

# Test module HTML files
echo "Testing Module HTML Files:"
echo "--------------------------"
html_files=(
    "module-0-onboarding.html"
    "module-1-present.html"
    "module-1.5-ai-generator.html"
    "module-1.6-project-history.html"
    "module-2-brd.html"
    "module-3-prd.html"
    "module-4-engineering-design.html"
    "module-5-alignment.html"
    "module-6-implementation.html"
    "conductor-unified-dashboard.html"
    "test-dashboard.html"
    "login.html"
    "register.html"
)

for file in "${html_files[@]}"; do
    url="$BASE_URL/demo/$file"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "200" ]; then
        echo "✓ $file - 200 OK"
    else
        echo "✗ $file - $status"
    fi
done

echo ""

# Test critical APIs
echo "Testing Critical APIs:"
echo "----------------------"
apis=(
    "/health"
    "/api/v1"
    "/api/v1/projects/summary"
    "/api/v1/dashboard/overview"
    "/api/v1/requirements"
    "/api/v1/brd"
    "/api/v1/prd"
    "/api/v1/narratives"
    "/api/v1/approvals"
    "/api/v1/presence/stats"
)

for api in "${apis[@]}"; do
    url="$BASE_URL$api"
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$status" = "200" ]; then
        echo "✓ $api - 200 OK"
    elif [ "$status" = "500" ]; then
        echo "⚠ $api - 500 Internal Server Error"
    elif [ "$status" = "404" ]; then
        echo "✗ $api - 404 Not Found"
    else
        echo "? $api - $status"
    fi
done

echo ""
echo "======================================"
echo "END OF REPORT"
echo "======================================"
