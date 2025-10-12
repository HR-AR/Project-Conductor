#!/bin/bash

# ServiceWorker Testing Script
# Component 3.4 - ServiceWorker Caching

echo "=========================================="
echo "ServiceWorker Implementation Test"
echo "Component 3.4 - Aggressive Caching"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking if server is running...${NC}"
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Server is running on port 3000${NC}"
else
    echo "✗ Server is not running!"
    echo "  Please run: npm start"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Checking if ServiceWorker file exists...${NC}"
if [ -f "public/service-worker.js" ]; then
    echo -e "${GREEN}✓ service-worker.js exists${NC}"
    LINES=$(wc -l < public/service-worker.js)
    echo "  Lines: $LINES"
else
    echo "✗ service-worker.js not found!"
    exit 1
fi

echo ""
echo -e "${YELLOW}3. Checking if offline.html exists...${NC}"
if [ -f "public/offline.html" ]; then
    echo -e "${GREEN}✓ offline.html exists${NC}"
    LINES=$(wc -l < public/offline.html)
    echo "  Lines: $LINES"
else
    echo "✗ offline.html not found!"
    exit 1
fi

echo ""
echo -e "${YELLOW}4. Checking cache version...${NC}"
VERSION=$(grep "CACHE_VERSION = " public/service-worker.js | head -1 | cut -d "'" -f 2)
echo -e "${GREEN}✓ Cache version: $VERSION${NC}"

echo ""
echo -e "${YELLOW}5. Counting cached files...${NC}"
CACHED_FILES=$(grep -A 30 "STATIC_FILES_TO_CACHE = \[" public/service-worker.js | grep -c "'/")
echo -e "${GREEN}✓ $CACHED_FILES files configured for caching${NC}"

echo ""
echo -e "${YELLOW}6. Testing ServiceWorker endpoint...${NC}"
if curl -s http://localhost:3000/public/service-worker.js | grep -q "CACHE_VERSION"; then
    echo -e "${GREEN}✓ ServiceWorker is accessible at /public/service-worker.js${NC}"
else
    echo "✗ ServiceWorker endpoint not accessible!"
    exit 1
fi

echo ""
echo -e "${YELLOW}7. Testing offline.html endpoint...${NC}"
if curl -s http://localhost:3000/public/offline.html | grep -q "You're Offline"; then
    echo -e "${GREEN}✓ Offline page is accessible at /public/offline.html${NC}"
else
    echo "✗ Offline page endpoint not accessible!"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}All checks passed!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open: http://localhost:3000/conductor-unified-dashboard.html"
echo "2. Open DevTools Console"
echo "3. Look for: [ServiceWorker] Registration successful"
echo "4. Reload page (should be instant on 2nd load)"
echo ""
echo "Manual tests:"
echo "- DevTools > Application > Service Workers"
echo "- DevTools > Application > Cache Storage"
echo "- DevTools > Network > Check 'Offline' > Reload"
echo ""
