-- Demo PRDs (Product Requirements Documents) Seed Data
-- Generated from approved BRDs

-- PRD 1: Mobile App Redesign (Generated from BRD-2024-001)
-- This PRD will lead to an Engineering Design with a security vulnerability
INSERT INTO prds (
  id, brd_id, title, features, user_stories, technical_requirements,
  dependencies, status, version, alignments, created_by
) VALUES (
  'PRD-2024-001',
  'BRD-2024-001',
  'PRD: Mobile App Redesign - Enhanced User Experience',
  '[
    {
      "id": "FEAT-001",
      "title": "Streamlined Checkout Flow",
      "description": "Reduce checkout from 5 steps to 2 steps with autofill and saved payment methods",
      "priority": "high",
      "effort": "large",
      "acceptance_criteria": [
        "User can complete checkout in 2 taps",
        "Payment methods are securely saved",
        "Autofill works for 95% of fields"
      ]
    },
    {
      "id": "FEAT-002",
      "title": "Modern UI with Dark Mode",
      "description": "Redesign app with Material Design 3, support light/dark/auto themes",
      "priority": "high",
      "effort": "medium",
      "acceptance_criteria": [
        "All screens support dark mode",
        "Theme switches instantly",
        "Accessibility contrast ratios met"
      ]
    },
    {
      "id": "FEAT-003",
      "title": "Performance Optimization",
      "description": "Lazy loading, image optimization, and caching to achieve <2s load times",
      "priority": "critical",
      "effort": "medium",
      "acceptance_criteria": [
        "Home screen loads in <2 seconds",
        "Product images load progressively",
        "Network requests cached for 5 minutes"
      ]
    },
    {
      "id": "FEAT-004",
      "title": "Personalized Home Screen",
      "description": "ML-powered recommendations based on user behavior and preferences",
      "priority": "medium",
      "effort": "large",
      "acceptance_criteria": [
        "Recommendations update in real-time",
        "Click-through rate increases by 30%",
        "Personalization respects privacy settings"
      ]
    }
  ]'::jsonb,
  '[
    {
      "id": "STORY-001",
      "featureId": "FEAT-001",
      "title": "As a mobile shopper, I want to checkout quickly so I don''t abandon my cart",
      "description": "Users should be able to complete purchase with minimal friction",
      "acceptanceCriteria": ["Checkout completes in <30 seconds", "No unnecessary form fields", "Clear error messages"],
      "priority": "high"
    },
    {
      "id": "STORY-002",
      "featureId": "FEAT-002",
      "title": "As a user who works at night, I want dark mode so my eyes don''t strain",
      "description": "Dark mode should be available throughout the app",
      "acceptanceCriteria": ["Dark mode covers all screens", "Auto-switch at sunset", "Manual toggle available"],
      "priority": "high"
    },
    {
      "id": "STORY-003",
      "featureId": "FEAT-003",
      "title": "As a user with slow internet, I want fast loading so I don''t wait",
      "description": "App should feel instant even on 3G",
      "acceptanceCriteria": ["Perceived load time <1s", "Progressive loading", "Works offline"],
      "priority": "critical"
    },
    {
      "id": "STORY-004",
      "featureId": "FEAT-004",
      "title": "As a returning user, I want personalized recommendations so I discover relevant products",
      "description": "Home screen should show products I''m likely to buy",
      "acceptanceCriteria": ["Recommendations are relevant", "Updates daily", "Opt-out available"],
      "priority": "medium"
    }
  ]'::jsonb,
  '[
    "React Native 0.72+ for cross-platform development",
    "Redux Toolkit for state management",
    "React Query for data fetching and caching",
    "FastImage for optimized image loading",
    "Secure storage for payment credentials (CRITICAL)",
    "Analytics SDK for user behavior tracking",
    "Push notification service integration",
    "A/B testing framework for feature rollout"
  ]'::jsonb,
  '[
    "Backend API must support pagination for product lists",
    "CDN for image optimization and delivery",
    "Payment gateway SDK v3.0+",
    "User authentication service with OAuth 2.0",
    "ML recommendation engine API"
  ]'::jsonb,
  'aligned',
  1,
  '[
    {
      "teamId": "product",
      "teamName": "Product Team",
      "status": "aligned",
      "comments": "All features validated with user research. Priority order confirmed.",
      "timestamp": "2024-12-22T10:00:00Z"
    },
    {
      "teamId": "engineering",
      "teamName": "Engineering Team",
      "status": "aligned",
      "comments": "Technical approach is sound. Capacity confirmed for Q1 delivery.",
      "timestamp": "2024-12-23T14:30:00Z"
    },
    {
      "teamId": "design",
      "teamName": "Design Team",
      "status": "aligned",
      "comments": "Designs complete. Ready for development handoff.",
      "timestamp": "2024-12-23T16:00:00Z"
    }
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440003'
);

-- PRD 2: Real-time Collaboration (Generated from BRD-2024-002)
INSERT INTO prds (
  id, brd_id, title, features, user_stories, technical_requirements,
  dependencies, status, version, alignments, created_by
) VALUES (
  'PRD-2024-002',
  'BRD-2024-002',
  'PRD: Real-time Collaboration & Document Editing',
  '[
    {
      "id": "FEAT-005",
      "title": "Concurrent Editing with Conflict Resolution",
      "description": "Multiple users can edit the same document simultaneously with operational transform",
      "priority": "critical",
      "effort": "large",
      "acceptance_criteria": [
        "10+ users can edit concurrently",
        "Changes sync in <100ms",
        "No data loss on conflicts"
      ]
    },
    {
      "id": "FEAT-006",
      "title": "Real-time Presence Indicators",
      "description": "Show who is viewing/editing each section of the document",
      "priority": "high",
      "effort": "small",
      "acceptance_criteria": [
        "User avatars show in real-time",
        "Cursor positions are visible",
        "Presence updates instantly"
      ]
    },
    {
      "id": "FEAT-007",
      "title": "Version History & Rollback",
      "description": "Complete audit trail with ability to restore previous versions",
      "priority": "high",
      "effort": "medium",
      "acceptance_criteria": [
        "Every change is recorded",
        "Rollback works to any point",
        "Diff view shows changes"
      ]
    }
  ]'::jsonb,
  '[
    {
      "id": "STORY-005",
      "featureId": "FEAT-005",
      "title": "As a team member, I want to edit documents with colleagues without conflicts",
      "description": "Team should be able to collaborate in real-time",
      "acceptanceCriteria": ["No \"locked for editing\" messages", "Changes merge automatically", "Conflicts are rare and resolvable"],
      "priority": "critical"
    },
    {
      "id": "STORY-006",
      "featureId": "FEAT-006",
      "title": "As a collaborator, I want to see who else is working on the document",
      "description": "Awareness of other users prevents duplicate work",
      "acceptanceCriteria": ["See active users", "See cursor positions", "Get notified when users join/leave"],
      "priority": "high"
    }
  ]'::jsonb,
  '[
    "WebSocket server with horizontal scaling",
    "Operational Transform (OT) or CRDT for conflict resolution",
    "Redis for session management and presence tracking",
    "PostgreSQL for version history storage",
    "Message queue (RabbitMQ/Kafka) for event distribution"
  ]'::jsonb,
  '[
    "Load balancer with WebSocket support",
    "Redis cluster for high availability",
    "CDN for static assets",
    "Monitoring and alerting for WebSocket health"
  ]'::jsonb,
  'draft',
  1,
  '[
    {
      "teamId": "product",
      "teamName": "Product Team",
      "status": "aligned",
      "comments": "Feature set matches enterprise requirements. Priority validated.",
      "timestamp": "2024-12-26T11:00:00Z"
    }
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440004'
);

-- Verify PRDs created
SELECT
  id,
  brd_id,
  title,
  status,
  (SELECT COUNT(*) FROM jsonb_array_elements(features)) as feature_count,
  (SELECT COUNT(*) FROM jsonb_array_elements(user_stories)) as story_count,
  (SELECT COUNT(*) FROM jsonb_array_elements(alignments)) as alignment_count
FROM prds
WHERE id LIKE 'PRD-%'
ORDER BY id;

-- Summary
SELECT
  'Demo PRDs Created' as status,
  COUNT(*) as total_prds,
  COUNT(CASE WHEN status = 'aligned' THEN 1 END) as aligned,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  SUM((SELECT COUNT(*) FROM jsonb_array_elements(features))) as total_features,
  SUM((SELECT COUNT(*) FROM jsonb_array_elements(user_stories))) as total_stories
FROM prds
WHERE id LIKE 'PRD-%';
