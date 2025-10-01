#!/bin/bash

echo "=================================================="
echo "Project Conductor - Integration Verification"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_count=0
pass_count=0
fail_count=0

check_file() {
    local file=$1
    local name=$2
    ((check_count++))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name exists"
        ((pass_count++))
        return 0
    else
        echo -e "${RED}✗${NC} $name missing"
        ((fail_count++))
        return 1
    fi
}

check_contains() {
    local file=$1
    local pattern=$2
    local name=$3
    ((check_count++))
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name"
        ((pass_count++))
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        ((fail_count++))
        return 1
    fi
}

echo "1. Checking core files..."
echo "-----------------------------------"
check_file "dashboard-state-manager.js" "Core state manager"
check_file "module-state-sync.js" "Module sync library"
check_file "STATE_SYNC_INTEGRATION.md" "Integration docs"
check_file "IMPLEMENTATION_SUMMARY.md" "Implementation summary"
check_file "QUICK_REFERENCE.md" "Quick reference"
echo ""

echo "2. Checking dashboard integration..."
echo "-----------------------------------"
check_contains "conductor-unified-dashboard.html" "ModuleCache" "Dashboard has cache system"
check_contains "conductor-unified-dashboard.html" "preloadModule" "Dashboard has pre-loading"
check_contains "conductor-unified-dashboard.html" "STATE_UPDATE" "Dashboard has state sync"
check_contains "conductor-unified-dashboard.html" "ConductorDebug" "Dashboard has debug tools"
echo ""

echo "3. Checking module integrations..."
echo "-----------------------------------"
check_contains "module-0-onboarding.html" "module-state-sync.js" "Module 0: Sync script included"
check_contains "module-0-onboarding.html" "ConductorModuleState.init(0)" "Module 0: Initialized"

check_contains "module-2-business-input.html" "module-state-sync.js" "Module 2: Sync script included"
check_contains "module-2-business-input.html" "ConductorModuleState.init(2)" "Module 2: Initialized"

check_contains "module-3-prd-alignment.html" "module-state-sync.js" "Module 3: Sync script included"
check_contains "module-3-prd-alignment.html" "ConductorModuleState.init(3)" "Module 3: Initialized"

check_contains "module-4-implementation.html" "module-state-sync.js" "Module 4: Sync script included"
check_contains "module-4-implementation.html" "ConductorModuleState.init(4)" "Module 4: Initialized"

check_contains "module-5-change-impact.html" "module-state-sync.js" "Module 5: Sync script included"
check_contains "module-5-change-impact.html" "ConductorModuleState.init(5)" "Module 5: Initialized"
echo ""

echo "4. Checking core classes..."
echo "-----------------------------------"
check_contains "dashboard-state-manager.js" "class ModuleCache" "ModuleCache class"
check_contains "dashboard-state-manager.js" "class StateManager" "StateManager class"
check_contains "dashboard-state-manager.js" "class PreloadStrategy" "PreloadStrategy class"
check_contains "dashboard-state-manager.js" "class OfflineStorage" "OfflineStorage class"
check_contains "dashboard-state-manager.js" "class ProgressTracker" "ProgressTracker class"
check_contains "dashboard-state-manager.js" "class ErrorHandler" "ErrorHandler class"
echo ""

echo "5. Checking key features..."
echo "-----------------------------------"
check_contains "dashboard-state-manager.js" "evictLRU" "LRU cache eviction"
check_contains "dashboard-state-manager.js" "createStateDiff" "State diff algorithm"
check_contains "dashboard-state-manager.js" "save(state)" "Offline storage"
check_contains "module-state-sync.js" "onStateUpdate" "State update events"
check_contains "module-state-sync.js" "localStorage" "LocalStorage backup"
echo ""

echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo -e "Total checks: $check_count"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Integration is complete.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open conductor-unified-dashboard.html in a browser"
    echo "2. Open browser console (F12)"
    echo "3. Navigate between modules to test pre-loading"
    echo "4. Type 'ConductorDebug.getPerformanceStats()' in console"
    echo "5. Check module state with 'ConductorModuleState.getMetadata()'"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
    exit 1
fi
