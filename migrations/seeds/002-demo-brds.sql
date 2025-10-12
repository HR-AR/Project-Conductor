-- Demo BRDs (Business Requirements Documents) Seed Data
-- Creates sample BRDs for the "Killer Demo" workflow

-- BRD 1: Mobile App Redesign (Main demo story - will trigger security conflict)
INSERT INTO brds (
  id, title, problem_statement, business_impact, success_criteria,
  timeline, budget, stakeholders,
  status, version, approvals, created_by
) VALUES (
  'BRD-2024-001',
  'Mobile App Redesign - Enhanced User Experience',
  'Our mobile app has a 2.8-star rating due to poor UX, slow performance, and outdated design. Users abandon the checkout process 60% of the time on mobile. Competitors have superior mobile experiences, resulting in lost market share.',
  'Improving mobile UX is projected to increase conversion rates by 25%, reduce support tickets by 40%, and recover $2.5M in annual lost revenue. This is critical for Q1 2025 growth targets.',
  '[
    {"criterion": "Increase mobile conversion rate from 15% to 25%", "metric": "Conversion rate", "target": "25%"},
    {"criterion": "Reduce cart abandonment from 60% to 35%", "metric": "Abandonment rate", "target": "35%"},
    {"criterion": "Improve app store rating from 2.8 to 4.2 stars", "metric": "App rating", "target": "4.2"},
    {"criterion": "Decrease page load time to under 2 seconds", "metric": "Load time", "target": "<2s"}
  ]'::jsonb,
  '{"startDate": "2025-01-15", "targetDate": "2025-04-30"}'::jsonb,
  150000.00,
  '[
    {"id": "STK-001", "name": "Sarah Chen", "role": "VP of Product", "department": "product", "email": "sarah.chen@projectconductor.demo"},
    {"id": "STK-002", "name": "Mike Johnson", "role": "Head of Engineering", "department": "engineering", "email": "mike.johnson@projectconductor.demo"},
    {"id": "STK-003", "name": "Alex Rivera", "role": "Product Manager", "department": "product", "email": "alex.rivera@projectconductor.demo"},
    {"id": "STK-004", "name": "James Wilson", "role": "TPM", "department": "engineering", "email": "james.wilson@projectconductor.demo"}
  ]'::jsonb,
  'approved',
  1,
  '[
    {"stakeholderId": "STK-001", "decision": "approved", "comments": "Critical for Q1 targets. Approved with full budget.", "timestamp": "2024-12-15T10:30:00Z"},
    {"stakeholderId": "STK-002", "decision": "approved", "comments": "Team capacity confirmed. We can deliver by April 30.", "timestamp": "2024-12-16T14:20:00Z"},
    {"stakeholderId": "STK-003", "decision": "approved", "comments": "UX research validates the approach.", "timestamp": "2024-12-17T09:15:00Z"},
    {"stakeholderId": "STK-004", "decision": "approved", "comments": "Timeline is aggressive but achievable.", "timestamp": "2024-12-18T11:00:00Z"}
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440003'
);

-- BRD 2: Real-time Collaboration Features
INSERT INTO brds (
  id, title, problem_statement, business_impact, success_criteria,
  timeline, budget, stakeholders,
  status, version, approvals, created_by
) VALUES (
  'BRD-2024-002',
  'Real-time Collaboration & Document Editing',
  'Teams lose 15+ hours per week due to version control issues and lack of real-time collaboration. Documents are emailed back and forth, creating confusion and duplicated work.',
  'Real-time collaboration will save $500K annually in productivity losses and reduce project cycle times by 30%. Enterprise customers cite this as a key requirement for renewals.',
  '[
    {"criterion": "Enable simultaneous editing by 10+ users", "metric": "Concurrent users", "target": "10+"},
    {"criterion": "Reduce document conflicts by 90%", "metric": "Conflict rate", "target": "<5%"},
    {"criterion": "Achieve 99.9% uptime for collaboration features", "metric": "Uptime", "target": "99.9%"}
  ]'::jsonb,
  '{"startDate": "2025-02-01", "targetDate": "2025-06-15"}'::jsonb,
  200000.00,
  '[
    {"id": "STK-005", "name": "Priya Patel", "role": "Enterprise PM", "department": "product", "email": "priya.patel@projectconductor.demo"},
    {"id": "STK-006", "name": "David Kim", "role": "Backend Lead", "department": "engineering", "email": "david.kim@projectconductor.demo"},
    {"id": "STK-007", "name": "Sarah Chen", "role": "VP of Product", "department": "product", "email": "sarah.chen@projectconductor.demo"}
  ]'::jsonb,
  'under_review',
  1,
  '[
    {"stakeholderId": "STK-007", "decision": "approved", "comments": "High priority for enterprise segment. Approved.", "timestamp": "2024-12-20T15:45:00Z"},
    {"stakeholderId": "STK-006", "decision": "approved_with_conditions", "comments": "Concerned about WebSocket scalability. Need architecture review.", "timestamp": "2024-12-21T10:30:00Z"}
  ]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440004'
);

-- BRD 3: AI-Powered Requirements Analysis
INSERT INTO brds (
  id, title, problem_statement, business_impact, success_criteria,
  timeline, budget, stakeholders,
  status, version, approvals, created_by
) VALUES (
  'BRD-2024-003',
  'AI-Powered Requirements Analysis & Conflict Detection',
  'Requirements documents contain ambiguities and conflicts that are only discovered late in development, causing 40% of project delays. Manual review is time-consuming and error-prone.',
  'AI-powered analysis can detect 90% of ambiguities and conflicts before development starts, reducing rework by $1.2M annually and accelerating time-to-market by 3 weeks per project.',
  '[
    {"criterion": "Detect 90% of requirement ambiguities automatically", "metric": "Detection rate", "target": "90%"},
    {"criterion": "Reduce requirements-related defects by 60%", "metric": "Defect reduction", "target": "60%"},
    {"criterion": "Decrease requirements review time by 50%", "metric": "Review time", "target": "-50%"}
  ]'::jsonb,
  '{"startDate": "2025-03-01", "targetDate": "2025-08-31"}'::jsonb,
  300000.00,
  '[
    {"id": "STK-008", "name": "Sarah Chen", "role": "VP of Product", "department": "product", "email": "sarah.chen@projectconductor.demo"},
    {"id": "STK-009", "name": "Emily Zhang", "role": "ML Engineer", "department": "engineering", "email": "emily.zhang@projectconductor.demo"}
  ]'::jsonb,
  'draft',
  1,
  '[]'::jsonb,
  '550e8400-e29b-41d4-a716-446655440001'
);

-- Verify BRDs created
SELECT
  id,
  title,
  status,
  budget,
  timeline->>'targetDate' as target_date,
  (SELECT COUNT(*) FROM jsonb_array_elements(stakeholders)) as stakeholder_count,
  (SELECT COUNT(*) FROM jsonb_array_elements(approvals)) as approval_count
FROM brds
WHERE id LIKE 'BRD-%'
ORDER BY id;

-- Summary
SELECT
  'Demo BRDs Created' as status,
  COUNT(*) as total_brds,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  SUM(budget)::money as total_budget
FROM brds
WHERE id LIKE 'BRD-%';
