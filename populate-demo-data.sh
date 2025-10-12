#!/bin/bash

# populate-demo-data.sh
# Populates the database with comprehensive demo data for the "Killer Demo" investor presentation

set -e  # Exit on error

echo "========================================"
echo "Project Conductor - Demo Data Population"
echo "========================================"
echo ""

# Configuration
DB_USER="${DB_USER:-conductor}"
DB_NAME="${DB_NAME:-conductor}"

# Check if docker-compose is running
if docker ps | grep -q conductor_postgres; then
    echo "✅ Using Docker PostgreSQL container"
    USE_DOCKER=true
else
    echo "❌ Docker container 'conductor_postgres' not found"
    echo "Please start Docker services first: docker-compose up -d postgres"
    exit 1
fi

# Seed files in order
SEED_FILES=(
    "001-demo-users.sql"
    "002-demo-brds.sql"
    "003-demo-prds.sql"
    "004-demo-engineering-designs.sql"
    "005-demo-conflicts.sql"
    "006-demo-change-log.sql"
    "007-demo-comments.sql"
)

echo "Starting demo data population..."
echo ""

# Track success/failure
SUCCESS_COUNT=0
FAIL_COUNT=0
TOTAL_FILES=${#SEED_FILES[@]}

# Execute each seed file
for seed_file in "${SEED_FILES[@]}"; do
    SEED_PATH="migrations/seeds/$seed_file"

    if [ ! -f "$SEED_PATH" ]; then
        echo "❌ ERROR: Seed file not found: $SEED_PATH"
        ((FAIL_COUNT++))
        continue
    fi

    echo "→ Running: $seed_file"

    if docker exec -i conductor_postgres psql -U $DB_USER -d $DB_NAME < "$SEED_PATH" > /dev/null 2>&1; then
        echo "  ✅ Success"
        ((SUCCESS_COUNT++))
    else
        echo "  ❌ Failed"
        ((FAIL_COUNT++))
        echo "  Error details:"
        docker exec -i conductor_postgres psql -U $DB_USER -d $DB_NAME < "$SEED_PATH" 2>&1 | grep -E "ERROR|error" | head -3
    fi

    echo ""
done

# Summary
echo "========================================"
echo "Demo Data Population Complete!"
echo "========================================"
echo ""
echo "Results:"
echo "  ✅ Successful: $SUCCESS_COUNT / $TOTAL_FILES"
echo "  ❌ Failed:     $FAIL_COUNT / $TOTAL_FILES"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 All demo data loaded successfully!"
    echo ""
    echo "Demo Data Summary:"
    echo "  👥 8 Demo Users (Business, Product, Engineering, Security, TPM)"
    echo "  📄 3 BRDs (Approved, Under Review, Draft)"
    echo "  📋 2 PRDs (Aligned, Draft)"
    echo "  🏗️  2 Engineering Designs (1 with security vulnerability)"
    echo "  ⚠️  3 Conflicts (1 Critical, 1 High, 1 Medium)"
    echo "  📝 4 Change Log Entries"
    echo ""
    echo "🚨 KILLER DEMO READY!"
    echo "   - Security vulnerability in DESIGN-2024-001"
    echo "   - Critical conflict (CONFLICT-2024-001) ready for demo"
    echo "   - Complete workflow: BRD → PRD → Design → Conflict"
    echo ""
    echo "Next Steps:"
    echo "  1. Start the application: npm start"
    echo "  2. Open dashboard: http://localhost:3000"
    echo "  3. Navigate to Module 5 (Alignment) to see conflicts"
    echo "  4. Demo the Security Agent conflict detection!"
    echo ""
    exit 0
else
    echo "⚠️  Some seed files failed to load"
    echo "Check the error messages above for details"
    echo ""
    exit 1
fi
