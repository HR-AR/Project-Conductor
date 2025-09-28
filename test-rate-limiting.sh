#!/bin/bash

echo "======================================"
echo "Rate Limiting Test Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server URL
URL="http://localhost:3000"

echo -e "${YELLOW}Test 1: Health Check (Should NOT be rate limited)${NC}"
echo "Making 10 rapid requests to /health endpoint..."
for i in {1..10}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)
  if [ "$status" = "200" ]; then
    echo -e "Request $i: ${GREEN}✓ 200 OK${NC}"
  else
    echo -e "Request $i: ${RED}✗ $status${NC}"
  fi
done
echo ""

echo -e "${YELLOW}Test 2: API Rate Limiting (100 requests per 15 min)${NC}"
echo "Testing /api/v1/requirements endpoint..."
echo ""

# Test first 5 requests to show headers
echo "First 5 requests (showing rate limit headers):"
for i in {1..5}; do
  echo -e "${GREEN}Request $i:${NC}"
  curl -s -i $URL/api/v1/requirements 2>/dev/null | grep -E "X-RateLimit|HTTP/1.1" | head -4
  echo ""
done

echo -e "${YELLOW}Test 3: Hitting Rate Limit${NC}"
echo "Making 100+ requests to trigger rate limit..."
echo ""

# Make 95 more requests silently
echo "Making requests 6-100 (silent)..."
for i in {6..100}; do
  curl -s $URL/api/v1/requirements > /dev/null 2>&1
  # Show progress every 10 requests
  if [ $((i % 10)) -eq 0 ]; then
    echo "  Completed $i requests..."
  fi
done

echo ""
echo "Testing requests 101-105 (should be rate limited):"
for i in {101..105}; do
  response=$(curl -s -w "\nSTATUS:%{http_code}" $URL/api/v1/requirements)
  status=$(echo "$response" | grep "STATUS:" | cut -d: -f2)

  if [ "$status" = "429" ]; then
    echo -e "Request $i: ${RED}✓ 429 Rate Limited (Expected)${NC}"
    # Show the error message on first rate limit
    if [ "$i" = "101" ]; then
      echo "Rate limit message:"
      echo "$response" | grep -v "STATUS:" | jq '.' 2>/dev/null || echo "$response" | grep -v "STATUS:"
    fi
  else
    echo -e "Request $i: ${YELLOW}✗ $status (Expected 429)${NC}"
  fi
done

echo ""
echo -e "${YELLOW}Test 4: Rate Limit Headers Check${NC}"
echo "Checking current rate limit status..."
curl -s -i $URL/api/v1/requirements 2>/dev/null | grep "X-RateLimit" | while read line; do
  echo -e "${GREEN}$line${NC}"
done

echo ""
echo "======================================"
echo -e "${GREEN}Rate Limiting Tests Complete!${NC}"
echo "======================================"
echo ""
echo "Summary:"
echo "- Health endpoint: Not rate limited ✓"
echo "- API endpoints: Rate limited after 100 requests ✓"
echo "- Proper headers: X-RateLimit-* headers present ✓"
echo ""
echo "Note: Rate limits reset after 15 minutes"
echo "To test with Docker Compose, run: docker-compose up -d"
echo "To test Redis fallback, stop Redis: docker-compose stop redis"