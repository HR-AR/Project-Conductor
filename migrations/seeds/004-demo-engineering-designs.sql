-- Demo Engineering Designs Seed Data
-- CRITICAL: Design 1 contains intentional security vulnerability for "Killer Demo" story

-- Design 1: Mobile App Redesign - WITH SECURITY VULNERABILITY
-- This design intentionally mentions storing API keys in .env files (CRITICAL security flaw)
-- The Security Agent will detect this and create a conflict
INSERT INTO engineering_designs (
  id, prd_id, team, approach, architecture, estimates, risks, dependencies, conflicts, status, created_by
) VALUES (
  'DESIGN-2024-001',
  'PRD-2024-001',
  'mobile',
  'We will implement a complete mobile app redesign using React Native with a modular architecture. The approach includes:

1. **Frontend Architecture**: Component-based design with React Native, Redux Toolkit for state, and React Navigation 6.x
2. **Backend Integration**: RESTful API client with automatic retry logic and request queuing
3. **Performance**: Implement lazy loading, image optimization with FastImage, and aggressive caching strategy
4. **Security**: Store API keys and secrets in .env files for easy configuration management
5. **Testing**: Jest for unit tests, Detox for E2E tests, achieving 80%+ code coverage
6. **Deployment**: CodePush for OTA updates, staged rollout starting at 5% of users

**Key Technical Decisions**:
- React Native 0.72 for latest features and performance
- TypeScript for type safety
- Styled-components for themeable UI
- React Query for data fetching and caching
- Sentry for error tracking and performance monitoring',
  '{
    "layers": [
      {
        "name": "Presentation Layer",
        "components": ["Screens", "Components", "Navigation", "Theme System"],
        "technology": "React Native, TypeScript, Styled-components"
      },
      {
        "name": "State Management",
        "components": ["Redux Store", "React Query Cache", "Async Storage"],
        "technology": "Redux Toolkit, React Query, AsyncStorage"
      },
      {
        "name": "Business Logic",
        "components": ["Services", "Hooks", "Utils", "Validators"],
        "technology": "TypeScript, Custom Hooks"
      },
      {
        "name": "Data Layer",
        "components": ["API Client", "Local Database", "Secure Storage"],
        "technology": "Axios, SQLite, Keychain/Keystore"
      }
    ],
    "data_flow": "User Action → Component → Hook → Service → API Client → Backend",
    "security_model": "Store sensitive configuration in .env files, use HTTPS for all API calls, implement certificate pinning"
  }'::jsonb,
  '[
    {
      "featureId": "FEAT-001",
      "featureTitle": "Streamlined Checkout Flow",
      "hours": 120,
      "engineers": 2,
      "startDate": "2025-01-20",
      "endDate": "2025-02-10"
    },
    {
      "featureId": "FEAT-002",
      "featureTitle": "Modern UI with Dark Mode",
      "hours": 80,
      "engineers": 2,
      "startDate": "2025-01-20",
      "endDate": "2025-02-05"
    },
    {
      "featureId": "FEAT-003",
      "featureTitle": "Performance Optimization",
      "hours": 100,
      "engineers": 2,
      "startDate": "2025-02-06",
      "endDate": "2025-02-28"
    },
    {
      "featureId": "FEAT-004",
      "featureTitle": "Personalized Home Screen",
      "hours": 160,
      "engineers": 3,
      "startDate": "2025-03-01",
      "endDate": "2025-04-01"
    }
  ]'::jsonb,
  '[
    {
      "id": "RISK-001",
      "title": "React Native Upgrade Compatibility",
      "description": "Upgrading to RN 0.72 may break existing native modules",
      "severity": "medium",
      "mitigation": "Test all native modules in staging, have rollback plan ready",
      "probability": "medium"
    },
    {
      "id": "RISK-002",
      "title": "Performance on Low-end Devices",
      "description": "Complex animations may lag on Android devices with <4GB RAM",
      "severity": "high",
      "mitigation": "Implement performance profiling, reduce animations on low-end devices",
      "probability": "high"
    },
    {
      "id": "RISK-003",
      "title": "App Store Review Delays",
      "description": "iOS app review can take 2-5 days, may impact launch timeline",
      "severity": "low",
      "mitigation": "Submit for review 1 week before launch, have expedited review plan",
      "probability": "high"
    }
  ]'::jsonb,
  '[
    "Backend API v2.0 must be deployed before mobile app launch",
    "CDN configuration for image optimization",
    "Payment gateway integration complete",
    "Push notification service configured",
    "Analytics tracking plan finalized",
    "App Store and Google Play accounts set up"
  ]'::jsonb,
  '[]'::jsonb,
  'draft',
  '550e8400-e29b-41d4-a716-446655440005'
);

-- Design 2: Real-time Collaboration - SECURE IMPLEMENTATION
INSERT INTO engineering_designs (
  id, prd_id, team, approach, architecture, estimates, risks, dependencies, conflicts, status, created_by
) VALUES (
  'DESIGN-2024-002',
  'PRD-2024-002',
  'backend',
  'We will implement real-time collaboration using WebSockets with a horizontally scalable architecture:

1. **WebSocket Server**: Socket.io with Redis adapter for multi-server scaling
2. **Conflict Resolution**: Operational Transform (OT) algorithm for concurrent edits
3. **Data Persistence**: PostgreSQL for document storage, Redis for session state
4. **Event Distribution**: Message queue for reliable event delivery across servers
5. **Security**: JWT authentication, rate limiting, DDoS protection
6. **Monitoring**: Real-time metrics for connection health, latency, and throughput

**Scalability Plan**:
- Horizontal scaling of WebSocket servers behind load balancer
- Redis Cluster for session management
- Database read replicas for document queries
- CDN for static assets and initial document load',
  '{
    "layers": [
      {
        "name": "Load Balancer",
        "components": ["HAProxy/Nginx with WebSocket support"],
        "technology": "HAProxy 2.5+"
      },
      {
        "name": "Application Servers",
        "components": ["WebSocket Handlers", "Authentication", "Rate Limiting"],
        "technology": "Node.js, Socket.io, Express"
      },
      {
        "name": "State Management",
        "components": ["Redis Cluster", "Session Store", "Presence Tracking"],
        "technology": "Redis 7.0 Cluster Mode"
      },
      {
        "name": "Data Persistence",
        "components": ["Document Store", "Version History", "Audit Logs"],
        "technology": "PostgreSQL 15 with JSONB"
      },
      {
        "name": "Message Queue",
        "components": ["Event Bus", "Change Notifications"],
        "technology": "RabbitMQ/Kafka"
      }
    ],
    "data_flow": "Client → Load Balancer → WebSocket Server → Redis → PostgreSQL",
    "security_model": "JWT tokens in HTTP-only cookies, TLS 1.3, rate limiting per user"
  }'::jsonb,
  '[
    {
      "featureId": "FEAT-005",
      "featureTitle": "Concurrent Editing",
      "hours": 240,
      "engineers": 3,
      "startDate": "2025-02-05",
      "endDate": "2025-03-20"
    },
    {
      "featureId": "FEAT-006",
      "featureTitle": "Presence Indicators",
      "hours": 60,
      "engineers": 1,
      "startDate": "2025-03-01",
      "endDate": "2025-03-15"
    },
    {
      "featureId": "FEAT-007",
      "featureTitle": "Version History",
      "hours": 120,
      "engineers": 2,
      "startDate": "2025-03-21",
      "endDate": "2025-04-20"
    }
  ]'::jsonb,
  '[
    {
      "id": "RISK-004",
      "title": "WebSocket Connection Stability",
      "description": "Corporate firewalls may block WebSocket connections",
      "severity": "high",
      "mitigation": "Implement WebSocket fallback to long-polling, test in enterprise networks",
      "probability": "medium"
    },
    {
      "id": "RISK-005",
      "title": "Operational Transform Complexity",
      "description": "OT algorithm is complex and hard to debug when issues arise",
      "severity": "medium",
      "mitigation": "Use battle-tested OT library (ShareDB), extensive testing with concurrent edits",
      "probability": "low"
    }
  ]'::jsonb,
  '[
    "Redis Cluster deployed and configured",
    "Load balancer with WebSocket support",
    "SSL certificates for WSS protocol",
    "Monitoring and alerting infrastructure",
    "Database capacity planning complete"
  ]'::jsonb,
  '[]'::jsonb,
  'draft',
  '550e8400-e29b-41d4-a716-446655440006'
);

-- Verify Engineering Designs created
SELECT
  id,
  prd_id,
  team,
  status,
  (SELECT COUNT(*) FROM jsonb_array_elements(estimates)) as feature_estimates,
  (SELECT COUNT(*) FROM jsonb_array_elements(risks)) as risk_count,
  (SELECT SUM((value->>'hours')::int) FROM jsonb_array_elements(estimates)) as total_hours
FROM engineering_designs
WHERE id LIKE 'DESIGN-%'
ORDER BY id;

-- Summary
SELECT
  'Demo Engineering Designs Created' as status,
  COUNT(*) as total_designs,
  COUNT(CASE WHEN team = 'mobile' THEN 1 END) as mobile_designs,
  COUNT(CASE WHEN team = 'backend' THEN 1 END) as backend_designs,
  SUM((SELECT SUM((value->>'hours')::int) FROM jsonb_array_elements(estimates))) as total_engineering_hours
FROM engineering_designs
WHERE id LIKE 'DESIGN-%';

-- CRITICAL: Show the security vulnerability in Design 1
SELECT
  'SECURITY VULNERABILITY DETECTED' as alert,
  id as design_id,
  'Design mentions storing API keys in .env files' as vulnerability,
  'CRITICAL' as severity,
  'This will trigger the Security Agent conflict detection' as note
FROM engineering_designs
WHERE id = 'DESIGN-2024-001'
AND approach LIKE '%API keys%'
AND approach LIKE '%.env%';
