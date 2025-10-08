#!/bin/bash

# Performance Testing Script
# Measures response times for key endpoints

BASE_URL="http://localhost:3000"
ITERATIONS=10

echo "======================================================"
echo "  Performance Testing - Response Time Analysis"
echo "======================================================"
echo "Base URL: $BASE_URL"
echo "Iterations per endpoint: $ITERATIONS"
echo "Date: $(date)"
echo ""

# Function to test endpoint performance
test_performance() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    echo "Testing: $description"
    echo "Endpoint: $method $endpoint"

    local total_time=0
    local min_time=999999
    local max_time=0

    for i in $(seq 1 $ITERATIONS); do
        if [ "$method" = "GET" ]; then
            response_time=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL$endpoint" 2>&1)
        elif [ "$method" = "POST" ]; then
            response_time=$(curl -s -w "%{time_total}" -o /dev/null -X POST "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" 2>&1)
        fi

        # Convert to milliseconds
        response_time_ms=$(echo "$response_time * 1000" | bc)
        response_time_int=${response_time_ms%.*}

        total_time=$((total_time + response_time_int))

        if [ $response_time_int -lt $min_time ]; then
            min_time=$response_time_int
        fi

        if [ $response_time_int -gt $max_time ]; then
            max_time=$response_time_int
        fi
    done

    avg_time=$((total_time / ITERATIONS))

    echo "  Min: ${min_time}ms"
    echo "  Max: ${max_time}ms"
    echo "  Avg: ${avg_time}ms"

    if [ $avg_time -lt 100 ]; then
        echo "  Status: ✅ Excellent (<100ms)"
    elif [ $avg_time -lt 500 ]; then
        echo "  Status: ✅ Good (<500ms)"
    else
        echo "  Status: ⚠️  Slow (>${avg_time}ms)"
    fi

    echo ""
}

# Core endpoints
test_performance "GET" "/health" "Health Check"
test_performance "GET" "/api/v1/projects" "List Projects"
test_performance "GET" "/api/v1/projects/summary" "Project Summary"
test_performance "GET" "/api/v1/projects/PROJ-20251007-0001" "Get Project by ID"
test_performance "GET" "/api/v1/projects/PROJ-20251007-0001/details" "Get Project Details"
test_performance "GET" "/api/v1/projects/PROJ-20251007-0001/timeline" "Get Project Timeline"
test_performance "GET" "/api/v1/projects/PROJ-20251007-0001/similar" "Get Similar Projects"

# BRD/PRD/Design
test_performance "GET" "/api/v1/brd" "List BRDs"
test_performance "GET" "/api/v1/brd/BRD-20251007-0001" "Get BRD by ID"
test_performance "GET" "/api/v1/prd" "List PRDs"
test_performance "GET" "/api/v1/prd/PRD-20251007-0001" "Get PRD by ID"
test_performance "GET" "/api/v1/engineering-design" "List Designs"

# Workflow
test_performance "GET" "/api/v1/conflicts" "List Conflicts"
test_performance "GET" "/api/v1/change-log" "List Change Logs"

# Requirements
test_performance "GET" "/api/v1/requirements" "List Requirements"
test_performance "GET" "/api/v1/links" "List Links"
test_performance "GET" "/api/v1/traceability/matrix" "Traceability Matrix"

# Quality/Metrics
test_performance "GET" "/api/v1/quality" "Quality Metrics"
test_performance "GET" "/api/v1/quality/dashboard" "Quality Dashboard"
test_performance "GET" "/api/v1/quality/report" "Quality Report"

echo "======================================================"
echo "  Performance Test Complete"
echo "======================================================"
echo "All response times are averages over $ITERATIONS iterations"
echo "Target: <100ms for cached, <500ms for complex queries"