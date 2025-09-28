#!/bin/bash

echo "🎯 Populating Project Conductor with Demo Data..."
echo ""

API_URL="http://localhost:3000/api/v1/requirements"

# Create some demo requirements
echo "Creating requirement 1: User Authentication..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication System",
    "description": "As a user, I want to securely log into the system using OAuth 2.0 so that my data remains protected",
    "category": "functional",
    "priority": "critical",
    "status": "approved",
    "createdBy": "John Smith"
  }' > /dev/null

echo "Creating requirement 2: Payment Processing..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Payment Processing Integration",
    "description": "System shall process payments through Stripe API with full PCI compliance and handle multiple currencies",
    "category": "functional",
    "priority": "high",
    "status": "in_review",
    "createdBy": "Sarah Chen"
  }' > /dev/null

echo "Creating requirement 3: Real-time Notifications..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Real-time Notification System",
    "description": "Users should receive instant notifications for important events via WebSocket connections",
    "category": "functional",
    "priority": "medium",
    "status": "draft",
    "createdBy": "Mike Wilson"
  }' > /dev/null

echo "Creating requirement 4: Performance Requirements..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Response Time Requirements",
    "description": "All API endpoints must respond within 200ms for 95% of requests under normal load conditions",
    "category": "non-functional",
    "priority": "high",
    "status": "approved",
    "createdBy": "Lisa Park"
  }' > /dev/null

echo "Creating requirement 5: Data Backup..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Automated Backup System",
    "description": "System shall perform automated backups every 6 hours with point-in-time recovery capability",
    "category": "technical",
    "priority": "high",
    "status": "implemented",
    "createdBy": "Tom Anderson"
  }' > /dev/null

echo "Creating requirement 6: GDPR Compliance..."
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{
    "title": "GDPR Data Privacy Compliance",
    "description": "Implement user data export, deletion, and consent management features per GDPR requirements",
    "category": "business",
    "priority": "critical",
    "status": "in_review",
    "createdBy": "Emma Davis"
  }' > /dev/null

echo ""
echo "✅ Demo data created successfully!"
echo ""
echo "📊 Current Requirements Status:"
curl -s $API_URL | jq '.pagination'
echo ""
echo "🚀 Open live-demo.html in your browser to see the requirements!"