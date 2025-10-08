#!/bin/bash

# API Endpoint Validation Script
# Tests all major endpoints for production readiness

BASE_URL="http://localhost:3000"
RESULTS_FILE="/tmp/api-test-results.json"
echo "[]" > $RESULTS_FILE

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4
    local data=$5

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${YELLOW}Testing:${NC} $method $endpoint"
    echo "Description: $description"

    # Make request and measure time
    start_time=$(date +%s%3N)

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>&1)
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi

    # Parse response
    status_code=$(echo "$response" | tail -n 2 | head -n 1)
    response_time=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -2)

    # Calculate response time in ms
    response_time_ms=$(echo "$response_time * 1000" | bc)
    response_time_int=${response_time_ms%.*}

    # Check status code
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $status_code (expected $expected_status)"
        echo "Response Time: ${response_time_int}ms"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Validate response format for 200/201 responses
        if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
            if echo "$body" | grep -q '"success"'; then
                echo -e "${GREEN}✓${NC} Response format valid (contains 'success' field)"
            else
                echo -e "${RED}✗${NC} Response format invalid (missing 'success' field)"
            fi
        fi

        # Show sample of response
        echo "Response sample:"
        echo "$body" | head -c 200
        echo "..."

    else
        echo -e "${RED}✗ FAIL${NC} - Status: $status_code (expected $expected_status)"
        echo "Response Time: ${response_time_int}ms"
        echo "Response body:"
        echo "$body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    # Check performance (<500ms target)
    if [ "$response_time_int" -gt 500 ]; then
        echo -e "${YELLOW}⚠ WARNING:${NC} Slow response time (>${response_time_int}ms, target <500ms)"
    fi
}

echo "======================================================"
echo "  API Endpoint Validation - Production Readiness"
echo "======================================================"
echo "Base URL: $BASE_URL"
echo "Starting tests at $(date)"
echo ""

# 1. Health Check
test_endpoint "GET" "/health" "Health check endpoint" "200"

# 2. Projects API
test_endpoint "GET" "/api/v1/projects" "List all projects" "200"
test_endpoint "GET" "/api/v1/projects/summary" "Get project statistics" "200"
test_endpoint "GET" "/api/v1/projects/proj-001" "Get single project by ID" "200"
test_endpoint "GET" "/api/v1/projects/proj-001/details" "Get project with full traceability" "200"
test_endpoint "GET" "/api/v1/projects/proj-001/timeline" "Get project timeline events" "200"
test_endpoint "GET" "/api/v1/projects/proj-001/similar" "Get similar projects" "200"

# 3. Projects API - Pagination
test_endpoint "GET" "/api/v1/projects?page=1&limit=5" "List projects with pagination" "200"

# 4. Projects API - Filtering
test_endpoint "GET" "/api/v1/projects?status=active" "Filter projects by status" "200"
test_endpoint "GET" "/api/v1/projects?search=Mobile" "Search projects by keyword" "200"

# 5. BRD API
test_endpoint "GET" "/api/v1/brd" "List all BRDs" "200"
test_endpoint "GET" "/api/v1/brd/brd-001" "Get single BRD by ID" "200"

# 6. BRD API - Filtering
test_endpoint "GET" "/api/v1/brd?status=approved" "Filter BRDs by status" "200"
test_endpoint "GET" "/api/v1/brd?projectId=proj-001" "Filter BRDs by project" "200"

# 7. PRD API
test_endpoint "GET" "/api/v1/prd" "List all PRDs" "200"
test_endpoint "GET" "/api/v1/prd/prd-001" "Get single PRD by ID" "200"

# 8. PRD API - Filtering
test_endpoint "GET" "/api/v1/prd?status=approved" "Filter PRDs by status" "200"
test_endpoint "GET" "/api/v1/prd?projectId=proj-001" "Filter PRDs by project" "200"

# 9. Engineering Design API
test_endpoint "GET" "/api/v1/engineering-design" "List all engineering designs" "200"
test_endpoint "GET" "/api/v1/engineering-design/ed-001" "Get single engineering design by ID" "200"

# 10. Conflicts API
test_endpoint "GET" "/api/v1/conflicts" "List all conflicts" "200"
test_endpoint "GET" "/api/v1/conflicts?status=open" "Filter conflicts by status" "200"

# 11. Change Log API
test_endpoint "GET" "/api/v1/change-log" "List all change logs" "200"
test_endpoint "GET" "/api/v1/change-log?entityType=project" "Filter change logs by entity type" "200"
test_endpoint "GET" "/api/v1/change-log?entityId=proj-001" "Filter change logs by entity ID" "200"

# 12. AI Generation API
test_endpoint "POST" "/api/v1/generation/brd-from-idea" "Generate BRD from idea" "201" \
    '{"idea":"Build a mobile app for task management","userId":"user-001"}'

# 13. Requirements API
test_endpoint "GET" "/api/v1/requirements" "List all requirements" "200"
test_endpoint "GET" "/api/v1/requirements?page=1&limit=10" "List requirements with pagination" "200"

# 14. Links API
test_endpoint "GET" "/api/v1/links" "List all requirement links" "200"

# 15. Traceability API
test_endpoint "GET" "/api/v1/traceability/matrix" "Get traceability matrix" "200"

# 16. Comments API
test_endpoint "GET" "/api/v1/comments" "List all comments" "200"

# 17. Quality API
test_endpoint "GET" "/api/v1/quality/analyze" "Analyze requirement quality" "200"

# 18. Review API
test_endpoint "GET" "/api/v1/review" "List all reviews" "200"

# 19. Metrics API
test_endpoint "GET" "/api/v1/metrics" "Get project metrics" "200"

# 20. Error Handling - 404
test_endpoint "GET" "/api/v1/projects/non-existent-id" "Test 404 for missing project" "404"
test_endpoint "GET" "/api/v1/brd/non-existent-id" "Test 404 for missing BRD" "404"

# 21. Error Handling - Invalid Routes
test_endpoint "GET" "/api/v1/invalid-endpoint" "Test 404 for invalid route" "404"

echo ""
echo "======================================================"
echo "  Test Summary"
echo "======================================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi