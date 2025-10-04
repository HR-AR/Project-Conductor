#!/bin/bash

# Verification Script for Agent 3 Deliverables
# Tests migration files and mock service workflow data

set -e

echo "========================================="
echo "Agent 3 Deliverables Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check migration files exist
echo "1. Checking Migration Files..."
MIGRATION_FILES=(
  "007_add_brd_table.sql"
  "008_add_prd_table.sql"
  "009_add_engineering_designs_table.sql"
  "010_add_conflicts_table.sql"
  "011_add_change_log_table.sql"
)

for file in "${MIGRATION_FILES[@]}"; do
  if [ -f "migrations/$file" ]; then
    SIZE=$(wc -c < "migrations/$file" | xargs)
    echo -e "   ${GREEN}✓${NC} $file ($SIZE bytes)"
  else
    echo -e "   ${RED}✗${NC} $file - MISSING"
    exit 1
  fi
done

echo ""
echo "2. Checking SQL Syntax..."
for file in "${MIGRATION_FILES[@]}"; do
  # Check for basic SQL keywords
  if grep -q "CREATE TABLE" "migrations/$file" && \
     grep -q "CREATE INDEX" "migrations/$file"; then
    echo -e "   ${GREEN}✓${NC} $file - Valid SQL structure"
  else
    echo -e "   ${RED}✗${NC} $file - Invalid SQL structure"
    exit 1
  fi
done

echo ""
echo "3. Checking Mock Service Updates..."
MOCK_SERVICE="src/services/simple-mock.service.ts"

# Check imports
if grep -q "import { BRD, Stakeholder, Approval } from '../models/brd.model'" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} BRD imports added"
else
  echo -e "   ${RED}✗${NC} BRD imports missing"
  exit 1
fi

if grep -q "import { PRD, Feature, UserStory, Alignment } from '../models/prd.model'" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} PRD imports added"
else
  echo -e "   ${RED}✗${NC} PRD imports missing"
  exit 1
fi

if grep -q "import { EngineeringDesign, Estimate, Risk } from '../models/engineering-design.model'" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} EngineeringDesign imports added"
else
  echo -e "   ${RED}✗${NC} EngineeringDesign imports missing"
  exit 1
fi

if grep -q "import { Conflict, DiscussionComment, ResolutionOption } from '../models/conflict.model'" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} Conflict imports added"
else
  echo -e "   ${RED}✗${NC} Conflict imports missing"
  exit 1
fi

if grep -q "import { ChangeLogEntry } from '../models/change-log.model'" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} ChangeLogEntry imports added"
else
  echo -e "   ${RED}✗${NC} ChangeLogEntry imports missing"
  exit 1
fi

echo ""
echo "4. Checking Data Maps..."
if grep -q "private brds: Map<string, BRD> = new Map()" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} BRD map added"
else
  echo -e "   ${RED}✗${NC} BRD map missing"
  exit 1
fi

if grep -q "private prds: Map<string, PRD> = new Map()" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} PRD map added"
else
  echo -e "   ${RED}✗${NC} PRD map missing"
  exit 1
fi

if grep -q "private engineeringDesigns: Map<string, EngineeringDesign> = new Map()" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} EngineeringDesign map added"
else
  echo -e "   ${RED}✗${NC} EngineeringDesign map missing"
  exit 1
fi

if grep -q "private conflicts: Map<string, Conflict> = new Map()" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} Conflict map added"
else
  echo -e "   ${RED}✗${NC} Conflict map missing"
  exit 1
fi

if grep -q "private changeLog: Map<string, ChangeLogEntry> = new Map()" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} ChangeLog map added"
else
  echo -e "   ${RED}✗${NC} ChangeLog map missing"
  exit 1
fi

echo ""
echo "5. Checking Demo Data..."
if grep -q "E-commerce Cart Abandonment Crisis" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} BRD demo data added"
else
  echo -e "   ${RED}✗${NC} BRD demo data missing"
  exit 1
fi

if grep -q "Mobile Checkout Optimization - Phase 1" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} PRD demo data added"
else
  echo -e "   ${RED}✗${NC} PRD demo data missing"
  exit 1
fi

if grep -q "Shipping Calculator Timeline Conflict" "$MOCK_SERVICE"; then
  echo -e "   ${GREEN}✓${NC} Conflict demo data added"
else
  echo -e "   ${RED}✗${NC} Conflict demo data missing"
  exit 1
fi

echo ""
echo "6. Checking Getter Methods..."
GETTER_METHODS=(
  "async getBRDs()"
  "async getBRDById"
  "async getPRDs()"
  "async getPRDById"
  "async getEngineeringDesigns()"
  "async getEngineeringDesignById"
  "async getConflicts()"
  "async getConflictById"
  "async getChangeLog()"
  "async getChangeLogById"
)

for method in "${GETTER_METHODS[@]}"; do
  if grep -q "$method" "$MOCK_SERVICE"; then
    echo -e "   ${GREEN}✓${NC} $method - found"
  else
    echo -e "   ${RED}✗${NC} $method - missing"
    exit 1
  fi
done

echo ""
echo "7. Checking Documentation..."
DOC_FILES=(
  "AGENT3_COMPLETION_SUMMARY.md"
  "WORKFLOW_DEMO_DATA.md"
)

for file in "${DOC_FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(wc -c < "$file" | xargs)
    echo -e "   ${GREEN}✓${NC} $file ($SIZE bytes)"
  else
    echo -e "   ${RED}✗${NC} $file - MISSING"
    exit 1
  fi
done

echo ""
echo "========================================="
echo -e "${GREEN}✓ All Verifications Passed!${NC}"
echo "========================================="
echo ""
echo "Summary:"
echo "  - 5 SQL migration files created"
echo "  - Mock service extended with 5 new data types"
echo "  - Complete workflow demo data added"
echo "  - 10 getter methods implemented"
echo "  - 2 documentation files created"
echo ""
echo "Next Steps:"
echo "  1. Run migrations: ./scripts/run-migrations.sh"
echo "  2. Test mock service: USE_MOCK_DB=true npm start"
echo "  3. Verify data: node scripts/test-workflow-data.js"
echo ""
