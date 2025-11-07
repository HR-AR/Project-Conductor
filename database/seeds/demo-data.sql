-- Demo Data for Project Conductor
-- This script populates the database with realistic demo data
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

-- ============================================================================
-- DEMO USERS
-- ============================================================================

INSERT INTO users (id, username, email, full_name, role, created_at) VALUES
  ('user-pm-001', 'product_manager', 'pm@projectconductor.demo', 'Product Manager', 'manager', NOW()),
  ('user-eng-001', 'lead_engineer', 'lead@projectconductor.demo', 'Lead Engineer', 'developer', NOW()),
  ('user-eng-002', 'senior_dev', 'senior@projectconductor.demo', 'Senior Developer', 'developer', NOW()),
  ('user-qa-001', 'qa_lead', 'qa@projectconductor.demo', 'QA Lead', 'tester', NOW()),
  ('user-design-001', 'ux_designer', 'design@projectconductor.demo', 'UX Designer', 'designer', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO PROJECTS
-- ============================================================================

INSERT INTO projects (id, name, description, status, owner_id, created_at, updated_at) VALUES
  (
    'proj-mobile-001',
    'Mobile App Redesign',
    'Complete redesign of the mobile application with modern UI/UX principles, improved performance, and new features',
    'active',
    'user-pm-001',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    'proj-api-001',
    'API Gateway Implementation',
    'Build a scalable API gateway to handle microservices communication, rate limiting, and authentication',
    'active',
    'user-eng-001',
    NOW() - INTERVAL '45 days',
    NOW()
  ),
  (
    'proj-portal-001',
    'Customer Support Portal',
    'Self-service customer portal with ticketing system, knowledge base, and live chat integration',
    'planning',
    'user-pm-001',
    NOW() - INTERVAL '15 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO REQUIREMENTS (Mobile App Redesign)
-- ============================================================================

INSERT INTO requirements (id, project_id, title, description, status, priority, assigned_to, due_date, estimated_effort, completion_percentage, tags, created_at, updated_at) VALUES
  (
    'req-mob-001',
    'proj-mobile-001',
    'User Authentication System',
    'Implement secure OAuth2-based authentication with biometric login support (Face ID, Touch ID) and social login options (Google, Apple)',
    'in_progress',
    'high',
    'user-eng-001',
    NOW() + INTERVAL '7 days',
    40,
    65,
    ARRAY['security', 'authentication', 'mobile'],
    NOW() - INTERVAL '25 days',
    NOW()
  ),
  (
    'req-mob-002',
    'proj-mobile-001',
    'Onboarding Flow Redesign',
    'Create intuitive 3-step onboarding process with interactive tutorials and progress indicators',
    'completed',
    'high',
    'user-design-001',
    NOW() - INTERVAL '5 days',
    16,
    100,
    ARRAY['ux', 'onboarding', 'mobile'],
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'req-mob-003',
    'proj-mobile-001',
    'Dark Mode Support',
    'Implement system-wide dark mode with automatic switching based on device settings',
    'in_progress',
    'medium',
    'user-eng-002',
    NOW() + INTERVAL '14 days',
    24,
    40,
    ARRAY['ui', 'accessibility', 'mobile'],
    NOW() - INTERVAL '18 days',
    NOW()
  ),
  (
    'req-mob-004',
    'proj-mobile-001',
    'Offline Mode Capability',
    'Enable core features to work offline with automatic sync when connection is restored',
    'pending',
    'high',
    'user-eng-001',
    NOW() + INTERVAL '21 days',
    56,
    0,
    ARRAY['feature', 'offline', 'sync'],
    NOW() - INTERVAL '15 days',
    NOW()
  ),
  (
    'req-mob-005',
    'proj-mobile-001',
    'Push Notifications',
    'Implement smart push notifications with user preferences and quiet hours',
    'in_progress',
    'medium',
    'user-eng-002',
    NOW() + INTERVAL '10 days',
    32,
    25,
    ARRAY['notifications', 'engagement'],
    NOW() - INTERVAL '12 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO REQUIREMENTS (API Gateway)
-- ============================================================================

INSERT INTO requirements (id, project_id, title, description, status, priority, assigned_to, due_date, estimated_effort, completion_percentage, tags, created_at, updated_at) VALUES
  (
    'req-api-001',
    'proj-api-001',
    'Rate Limiting Engine',
    'Implement distributed rate limiting with Redis, supporting per-user and per-IP limits',
    'completed',
    'critical',
    'user-eng-001',
    NOW() - INTERVAL '10 days',
    40,
    100,
    ARRAY['security', 'scalability', 'backend'],
    NOW() - INTERVAL '40 days',
    NOW() - INTERVAL '8 days'
  ),
  (
    'req-api-002',
    'proj-api-001',
    'JWT Authentication Middleware',
    'Create authentication middleware supporting JWT tokens with refresh token rotation',
    'completed',
    'critical',
    'user-eng-001',
    NOW() - INTERVAL '15 days',
    32,
    100,
    ARRAY['security', 'authentication', 'backend'],
    NOW() - INTERVAL '38 days',
    NOW() - INTERVAL '12 days'
  ),
  (
    'req-api-003',
    'proj-api-001',
    'Request/Response Logging',
    'Implement comprehensive logging with correlation IDs and performance metrics',
    'in_progress',
    'high',
    'user-eng-002',
    NOW() + INTERVAL '5 days',
    24,
    70,
    ARRAY['monitoring', 'observability'],
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    'req-api-004',
    'proj-api-001',
    'Circuit Breaker Pattern',
    'Add circuit breaker for external service calls to prevent cascade failures',
    'pending',
    'high',
    'user-eng-001',
    NOW() + INTERVAL '12 days',
    40,
    0,
    ARRAY['reliability', 'resilience'],
    NOW() - INTERVAL '25 days',
    NOW()
  ),
  (
    'req-api-005',
    'proj-api-001',
    'API Documentation Portal',
    'Create interactive API documentation using OpenAPI/Swagger with live examples',
    'in_progress',
    'medium',
    'user-eng-002',
    NOW() + INTERVAL '8 days',
    16,
    45,
    ARRAY['documentation', 'developer-experience'],
    NOW() - INTERVAL '20 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO REQUIREMENTS (Customer Portal)
-- ============================================================================

INSERT INTO requirements (id, project_id, title, description, status, priority, assigned_to, due_date, estimated_effort, completion_percentage, tags, created_at, updated_at) VALUES
  (
    'req-port-001',
    'proj-portal-001',
    'Ticket Management System',
    'Build comprehensive ticket system with priority levels, SLA tracking, and auto-assignment',
    'pending',
    'critical',
    'user-eng-001',
    NOW() + INTERVAL '30 days',
    80,
    0,
    ARRAY['feature', 'support', 'backend'],
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'req-port-002',
    'proj-portal-001',
    'Knowledge Base with Search',
    'Create searchable knowledge base with categories, tags, and helpful/not-helpful voting',
    'pending',
    'high',
    'user-eng-002',
    NOW() + INTERVAL '35 days',
    64,
    0,
    ARRAY['feature', 'content', 'search'],
    NOW() - INTERVAL '8 days',
    NOW()
  ),
  (
    'req-port-003',
    'proj-portal-001',
    'Live Chat Integration',
    'Integrate real-time chat with agent availability status and file sharing',
    'pending',
    'medium',
    NULL,
    NOW() + INTERVAL '40 days',
    48,
    0,
    ARRAY['feature', 'real-time', 'communication'],
    NOW() - INTERVAL '5 days',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO REQUIREMENT LINKS
-- ============================================================================

INSERT INTO requirement_links (id, source_id, target_id, link_type, created_by, created_at) VALUES
  ('link-001', 'req-mob-001', 'req-api-002', 'depends_on', 'user-eng-001', NOW() - INTERVAL '20 days'),
  ('link-002', 'req-mob-004', 'req-mob-001', 'depends_on', 'user-eng-001', NOW() - INTERVAL '15 days'),
  ('link-003', 'req-mob-005', 'req-mob-001', 'depends_on', 'user-eng-002', NOW() - INTERVAL '12 days'),
  ('link-004', 'req-api-003', 'req-api-001', 'related_to', 'user-eng-001', NOW() - INTERVAL '25 days'),
  ('link-005', 'req-api-004', 'req-api-001', 'related_to', 'user-eng-001', NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMO COMMENTS
-- ============================================================================

INSERT INTO comments (id, requirement_id, user_id, content, created_at, updated_at) VALUES
  (
    'comment-001',
    'req-mob-001',
    'user-eng-001',
    'Implemented the OAuth2 flow. Now working on biometric integration. Face ID works great on iOS, testing Touch ID next.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'comment-002',
    'req-mob-001',
    'user-qa-001',
    'Tested on iOS 16 and 17 - works perfectly. Android testing pending. Can we add a fallback for devices without biometric support?',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    'comment-003',
    'req-mob-003',
    'user-design-001',
    'Dark mode color palette looks amazing! One suggestion: increase contrast slightly for better accessibility (WCAG AA compliance).',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'comment-004',
    'req-api-003',
    'user-eng-002',
    'Added correlation IDs to all requests. Performance metrics are being tracked with Prometheus. Dashboard coming soon.',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  (
    'comment-005',
    'req-mob-002',
    'user-pm-001',
    'Excellent work on the onboarding flow! User testing showed 40% better comprehension compared to old flow. Marking as complete.',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT
  'Demo data loaded successfully!' as message,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM projects) as projects,
  (SELECT COUNT(*) FROM requirements) as requirements,
  (SELECT COUNT(*) FROM requirement_links) as links,
  (SELECT COUNT(*) FROM comments) as comments;
