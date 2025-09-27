#!/bin/bash

# Phase 4 Exit Criteria Tests - Quality & Validation

echo "🧪 Running Phase 4 Exit Criteria Tests..."
echo "========================================"

# Test 1: Create test requirements first
echo -e "\n📝 Creating test requirements..."
REQ1=$(curl -s -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"The system should handle user authentication","description":"The system might provide appropriate security for user login","type":"FUNCTIONAL","priority":"high","status":"draft"}' | jq -r '.data.id')

REQ2=$(curl -s -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Performance must be fast","description":"Response times should be reasonable and it should handle many users","type":"NON_FUNCTIONAL","priority":"medium","status":"draft"}' | jq -r '.data.id')

echo "Created requirements: $REQ1, $REQ2"

# Test 2: Ambiguity detection
echo -e "\n🔍 Test 1: Ambiguity Detection"
ANALYSIS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/requirements/$REQ1/analyze \
  -H "Content-Type: application/json")

QUALITY_SCORE=$(echo "$ANALYSIS_RESPONSE" | jq -r '.data.qualityScore')
ISSUES_COUNT=$(echo "$ANALYSIS_RESPONSE" | jq '.data.issues | length')

if [ -n "$QUALITY_SCORE" ] && [ "$QUALITY_SCORE" != "null" ] && [ "$ISSUES_COUNT" -gt 0 ]; then
  echo "✅ Ambiguity detection works - Score: $QUALITY_SCORE, Issues found: $ISSUES_COUNT"
else
  echo "❌ Ambiguity detection failed"
  exit 1
fi

# Test 3: Quality scoring
echo -e "\n📊 Test 2: Quality Scoring"
if [ "$QUALITY_SCORE" -ge 0 ] && [ "$QUALITY_SCORE" -le 100 ]; then
  echo "✅ Quality scoring works - Score in valid range (0-100)"
else
  echo "❌ Quality scoring failed - Invalid score: $QUALITY_SCORE"
  exit 1
fi

# Test 4: Suggestions for improvement
echo -e "\n💡 Test 3: Improvement Suggestions"
SUGGESTIONS=$(echo "$ANALYSIS_RESPONSE" | jq -r '.data.suggestions')
SUGGESTIONS_COUNT=$(echo "$ANALYSIS_RESPONSE" | jq '.data.suggestions | length')

if [ -n "$SUGGESTIONS" ] && [ "$SUGGESTIONS" != "null" ] && [ "$SUGGESTIONS_COUNT" -gt 0 ]; then
  echo "✅ Improvement suggestions provided - $SUGGESTIONS_COUNT suggestions"
else
  echo "❌ No improvement suggestions provided"
  exit 1
fi

# Test 5: Review workflow
echo -e "\n📝 Test 4: Review Workflow"
# Create a review
REVIEW_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/requirements/$REQ2/reviews \
  -H "Content-Type: application/json" \
  -H "x-user-id: reviewer-123" \
  -d '{
    "reviewerId": "reviewer-123",
    "comments": "Needs more specific performance metrics"
  }')

REVIEW_ID=$(echo "$REVIEW_RESPONSE" | jq -r '.data.id')
if [ -n "$REVIEW_ID" ] && [ "$REVIEW_ID" != "null" ]; then
  echo "✅ Review created - ID: $REVIEW_ID"
else
  echo "❌ Review creation failed"
  exit 1
fi

# Submit review decision
DECISION_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/v1/reviews/$REVIEW_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: reviewer-123" \
  -d '{
    "decision": "changes_requested",
    "comments": "Please specify exact response time requirements (e.g., < 200ms)"
  }')

DECISION=$(echo "$DECISION_RESPONSE" | jq -r '.data.decision')
if [ "$DECISION" = "changes_requested" ]; then
  echo "✅ Review decision submitted - Status: $DECISION"
else
  echo "❌ Review decision failed"
  exit 1
fi

# Test 6: Quality metrics
echo -e "\n📈 Test 5: Quality Metrics Dashboard"
METRICS_RESPONSE=$(curl -s http://localhost:3000/api/v1/metrics/quality)
AVG_SCORE=$(echo "$METRICS_RESPONSE" | jq -r '.data.averageQualityScore')
TOTAL_ANALYZED=$(echo "$METRICS_RESPONSE" | jq -r '.data.requirementsAnalyzed')

if [ -n "$AVG_SCORE" ] && [ "$AVG_SCORE" != "null" ] && [ -n "$TOTAL_ANALYZED" ] && [ "$TOTAL_ANALYZED" != "null" ]; then
  echo "✅ Quality metrics available - Average score: $AVG_SCORE, Total analyzed: $TOTAL_ANALYZED"
else
  echo "❌ Quality metrics failed"
  exit 1
fi

# Summary
echo -e "\n========================================"
echo "✅ Phase 4 Exit Criteria: ALL TESTS PASSED"
echo "========================================"
echo ""
echo "Summary:"
echo "✅ Ambiguity detection identifies vague/weak terms"
echo "✅ Quality scoring for requirements (0-100 scale)"
echo "✅ Suggestions for improvement provided"
echo "✅ Review workflow with approve/reject functionality"
echo "✅ Quality metrics dashboard available"
echo ""
echo "🚀 Ready to advance to Phase 5: External Integrations"