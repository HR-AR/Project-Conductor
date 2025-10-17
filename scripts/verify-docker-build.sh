#!/bin/bash

# Docker Build Verification Script
# Verifies that all required files are copied to the Docker container

set -e

echo "======================================"
echo "DOCKER BUILD VERIFICATION"
echo "======================================"
echo ""

# Build the image
echo "Step 1: Building Docker image..."
docker build -t project-conductor-test . || {
    echo "❌ Build failed!"
    exit 1
}
echo "✓ Build successful"
echo ""

# Verify directories
echo "Step 2: Verifying directory structure..."

echo -n "  Checking /app/src: "
docker run --rm project-conductor-test test -d /app/src && echo "✓" || { echo "✗"; exit 1; }

echo -n "  Checking /app/dist: "
docker run --rm project-conductor-test test -d /app/dist && echo "✓" || { echo "✗"; exit 1; }

echo -n "  Checking /app/public: "
docker run --rm project-conductor-test test -d /app/public && echo "✓" || { echo "✗"; exit 1; }

echo -n "  Checking /app/public/js: "
docker run --rm project-conductor-test test -d /app/public/js && echo "✓" || { echo "✗"; exit 1; }

echo -n "  Checking /app/public/css: "
docker run --rm project-conductor-test test -d /app/public/css && echo "✓" || { echo "✗"; exit 1; }

echo ""

# Verify critical JS files
echo "Step 3: Verifying critical JavaScript files..."

echo -n "  auth-client.js: "
docker run --rm project-conductor-test test -f /app/public/js/auth-client.js && echo "✓" || { echo "✗"; exit 1; }

echo -n "  auth-guard.js: "
docker run --rm project-conductor-test test -f /app/public/js/auth-guard.js && echo "✓" || { echo "✗"; exit 1; }

echo -n "  widget-updater.js: "
docker run --rm project-conductor-test test -f /app/public/js/widget-updater.js && echo "✓" || { echo "✗"; exit 1; }

echo -n "  session-manager.js: "
docker run --rm project-conductor-test test -f /app/public/js/session-manager.js && echo "✓" || { echo "✗"; exit 1; }

echo -n "  activity-tracker.js: "
docker run --rm project-conductor-test test -f /app/public/js/activity-tracker.js && echo "✓" || { echo "✗"; exit 1; }

echo ""

# Verify critical CSS files
echo "Step 4: Verifying critical CSS files..."

echo -n "  widgets.css: "
docker run --rm project-conductor-test test -f /app/public/css/widgets.css && echo "✓" || { echo "✗"; exit 1; }

echo -n "  auth.css: "
docker run --rm project-conductor-test test -f /app/public/css/auth.css && echo "✓" || { echo "✗"; exit 1; }

echo -n "  session-warning.css: "
docker run --rm project-conductor-test test -f /app/public/css/session-warning.css && echo "✓" || { echo "✗"; exit 1; }

echo ""

# Verify HTML files
echo "Step 5: Verifying HTML module files..."

echo -n "  conductor-unified-dashboard.html: "
docker run --rm project-conductor-test test -f /app/conductor-unified-dashboard.html && echo "✓" || { echo "✗"; exit 1; }

echo -n "  module-0-onboarding.html: "
docker run --rm project-conductor-test test -f /app/module-0-onboarding.html && echo "✓" || { echo "✗"; exit 1; }

echo -n "  module-1-present.html: "
docker run --rm project-conductor-test test -f /app/module-1-present.html && echo "✓" || { echo "✗"; exit 1; }

echo ""

# Show directory contents
echo "Step 6: Listing container structure..."
echo ""
echo "Root directory (/app):"
docker run --rm project-conductor-test ls -la /app | grep -E "^d|html$|^total"
echo ""
echo "Public JS directory:"
docker run --rm project-conductor-test ls -la /app/public/js | head -8
echo ""
echo "Public CSS directory:"
docker run --rm project-conductor-test ls -la /app/public/css | head -8
echo ""

# Optional: Start container and test endpoints
echo "======================================"
echo "Step 7: Optional - Test live endpoints"
echo "======================================"
echo ""
echo "To test the container locally, run:"
echo "  docker run -p 3000:3000 project-conductor-test"
echo ""
echo "Then in another terminal:"
echo "  curl -I http://localhost:3000/public/js/auth-client.js"
echo "  curl -I http://localhost:3000/public/css/widgets.css"
echo "  curl -I http://localhost:3000/demo/module-0-onboarding.html"
echo ""

echo "======================================"
echo "✓ ALL VERIFICATION CHECKS PASSED!"
echo "======================================"
echo ""
echo "The Docker image is correctly built with all required files."
echo "Ready for deployment to production."
