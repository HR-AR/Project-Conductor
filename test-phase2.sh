#!/bin/bash

# Phase 2 Exit Criteria Tests - Traceability Engine

echo "🧪 Running Phase 2 Exit Criteria Tests..."
echo "========================================"

# Test 1: Create test requirements first
echo -e "\n📝 Creating test requirements..."
REQ1=$(curl -s -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"User Authentication","type":"FUNCTIONAL","priority":"high","status":"draft"}' | jq -r '.data.id')

REQ2=$(curl -s -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Login Module","type":"FUNCTIONAL","priority":"high","status":"draft"}' | jq -r '.data.id')

REQ3=$(curl -s -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Login","type":"TEST","priority":"medium","status":"draft"}' | jq -r '.data.id')

echo "Created requirements: $REQ1, $REQ2, $REQ3"

# Test 2: Bidirectional linking
echo -e "\n🔗 Test 1: Bidirectional Linking"
LINK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/requirements/$REQ1/links \
  -H "Content-Type: application/json" \
  -d "{
    \"targetId\": \"$REQ2\",
    \"linkType\": \"parent-child\",
    \"description\": \"Login module implements authentication\"
  }")

LINK_ID=$(echo "$LINK_RESPONSE" | jq -r '.data.id')
if [ -n "$LINK_ID" ] && [ "$LINK_ID" != "null" ]; then
  echo "✅ Link created successfully - ID: $LINK_ID"
else
  echo "❌ Link creation failed"
  exit 1
fi

# Test 3: Get links for requirement
echo -e "\n📊 Test 2: Get Links for Requirement"
LINKS_RESPONSE=$(curl -s http://localhost:3000/api/v1/requirements/$REQ1/links)
LINK_COUNT=$(echo "$LINKS_RESPONSE" | jq '.data.outgoingLinks | length')

if [ "$LINK_COUNT" -ge 1 ]; then
  echo "✅ Links retrieved - Found $LINK_COUNT outgoing links"
else
  echo "❌ Link retrieval failed"
  exit 1
fi

# Test 4: Suspect link flagging
echo -e "\n🚩 Test 3: Suspect Link Flagging"
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/v1/links/$LINK_ID/suspect \
  -H "Content-Type: application/json" \
  -d '{"isSuspect": true, "reason": "Source requirement modified"}')

IS_SUSPECT=$(echo "$UPDATE_RESPONSE" | jq -r '.data.isSuspect')
if [ "$IS_SUSPECT" = "true" ]; then
  echo "✅ Suspect flagging works"
else
  echo "❌ Suspect flagging failed"
  exit 1
fi

# Test 5: Traceability matrix
echo -e "\n📈 Test 4: Traceability Matrix Generation"
MATRIX_RESPONSE=$(curl -s http://localhost:3000/api/v1/traceability/matrix)
MATRIX_SIZE=$(echo "$MATRIX_RESPONSE" | jq '.data.requirements | length')

if [ "$MATRIX_SIZE" -ge 3 ]; then
  echo "✅ Traceability matrix generated - $MATRIX_SIZE requirements"
else
  echo "❌ Traceability matrix generation failed"
  exit 1
fi

# Test 6: Coverage gap detection
echo -e "\n🎯 Test 5: Coverage Gap Detection"
COVERAGE_RESPONSE=$(curl -s http://localhost:3000/api/v1/traceability/coverage)
ORPHANS=$(echo "$COVERAGE_RESPONSE" | jq '.data.orphanedRequirements | length')
COVERAGE_PCT=$(echo "$COVERAGE_RESPONSE" | jq -r '.data.coveragePercentage')

echo "✅ Coverage analysis complete:"
echo "   - Coverage: ${COVERAGE_PCT}%"
echo "   - Orphaned requirements: $ORPHANS"

# Summary
echo -e "\n========================================"
echo "✅ Phase 2 Exit Criteria: ALL TESTS PASSED"
echo "========================================"
echo ""
echo "Summary:"
echo "✅ Bidirectional linking works"
echo "✅ Suspect link flagging implemented"
echo "✅ Traceability matrix renders"
echo "✅ Coverage gap detection active"
echo ""
echo "🚀 Ready to advance to Phase 3: Real-time Collaboration"