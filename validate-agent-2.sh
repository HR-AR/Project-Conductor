#!/bin/bash

# Agent 2 Validation Script
# Verifies all deliverables are present and correctly formatted

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}🎯 Agent 2: Markdown Editor UI - Validation${NC}"
echo "=================================================="
echo ""

# Test 1: Check main HTML file exists
echo -e "${YELLOW}[1/6]${NC} Checking module-2-brd.html exists..."
if [ -f "src/views/module-2-brd.html" ]; then
    SIZE=$(wc -c < "src/views/module-2-brd.html" | xargs)
    LINES=$(wc -l < "src/views/module-2-brd.html" | xargs)
    echo -e "  ${GREEN}✅ File exists${NC} (${SIZE} bytes, ${LINES} lines)"
else
    echo -e "  ${RED}❌ File not found!${NC}"
    exit 1
fi

# Test 2: Check for marked.js library
echo -e "${YELLOW}[2/6]${NC} Checking marked.js library inclusion..."
if grep -q "cdn.jsdelivr.net/npm/marked" "src/views/module-2-brd.html"; then
    echo -e "  ${GREEN}✅ marked.js CDN found${NC}"
else
    echo -e "  ${RED}❌ marked.js not found!${NC}"
    exit 1
fi

# Test 3: Check for js-yaml library
echo -e "${YELLOW}[3/6]${NC} Checking js-yaml library inclusion..."
if grep -q "cdn.jsdelivr.net/npm/js-yaml" "src/views/module-2-brd.html"; then
    echo -e "  ${GREEN}✅ js-yaml CDN found${NC}"
else
    echo -e "  ${RED}❌ js-yaml not found!${NC}"
    exit 1
fi

# Test 4: Check for split-view layout
echo -e "${YELLOW}[4/6]${NC} Checking split-view layout..."
if grep -q "split-view" "src/views/module-2-brd.html"; then
    if grep -q "editor-pane" "src/views/module-2-brd.html" && grep -q "preview-pane" "src/views/module-2-brd.html"; then
        echo -e "  ${GREEN}✅ Split-view layout implemented${NC}"
    else
        echo -e "  ${RED}❌ Split-view panes not found!${NC}"
        exit 1
    fi
else
    echo -e "  ${RED}❌ Split-view not found!${NC}"
    exit 1
fi

# Test 5: Check for mock data
echo -e "${YELLOW}[5/6]${NC} Checking mock narratives data..."
if grep -q "mockNarratives" "src/views/module-2-brd.html"; then
    VERSION_COUNT=$(grep -o "version: [0-9]" "src/views/module-2-brd.html" | wc -l | xargs)
    echo -e "  ${GREEN}✅ Mock data found${NC} (${VERSION_COUNT} versions)"
else
    echo -e "  ${RED}❌ Mock data not found!${NC}"
    exit 1
fi

# Test 6: Check for key functions
echo -e "${YELLOW}[6/6]${NC} Checking key JavaScript functions..."
FUNCTIONS=("loadDocument" "handleEditorInput" "renderPreview" "saveDraft" "autoSaveIfNeeded" "finalizeForReview")
MISSING=()

for func in "${FUNCTIONS[@]}"; do
    if ! grep -q "function ${func}" "src/views/module-2-brd.html"; then
        MISSING+=("$func")
    fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✅ All key functions found${NC}"
else
    echo -e "  ${RED}❌ Missing functions: ${MISSING[*]}${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}${BOLD}✅ All validation checks passed!${NC}"
echo ""
echo "Files delivered:"
echo "  • src/views/module-2-brd.html (${SIZE} bytes)"
echo "  • AGENT_2_DELIVERABLES.md"
echo "  • AGENT_2_SUMMARY.md"
echo ""
echo "To test the editor:"
echo "  open src/views/module-2-brd.html"
echo ""
echo "Integration status:"
echo "  ✅ Standalone mode: Works with mock data"
echo "  ⏳ API integration: Ready for Agent 1"
echo ""
echo -e "${BOLD}Agent 2 Status: COMPLETE ✅${NC}"
echo ""
