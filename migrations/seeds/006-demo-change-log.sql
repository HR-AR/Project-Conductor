-- Demo Change Log Seed Data
-- Records changes made during the workflow progression

-- Change 1: BRD Approved
INSERT INTO change_log (
  id, project_id, item, change, reason, impact, category, phase,
  approved_by, related_conflict_id, documents_before, documents_after,
  timestamp, created_by
) VALUES (
  'CHANGE-001',
  'PRJ-2024-001',
  'BRD-2024-001: Mobile App Redesign',
  'BRD status changed from "under_review" to "approved"',
  'All stakeholders approved the business case. Success criteria validated through user research. Budget and timeline confirmed.',
  'Project can proceed to PRD phase. Development team can begin technical planning. $150K budget allocated.',
  'process',
  'added',
  '[
    {"userId": "550e8400-e29b-41d4-a716-446655440001", "userName": "Sarah Chen", "role": "VP of Product"},
    {"userId": "550e8400-e29b-41d4-a716-446655440002", "userName": "Mike Johnson", "role": "Head of Engineering"}
  ]'::jsonb,
  NULL,
  '[{"type": "brd", "id": "BRD-2024-001", "version": 1, "status": "under_review"}]'::jsonb,
  '[{"type": "brd", "id": "BRD-2024-001", "version": 1, "status": "approved"}]'::jsonb,
  '2024-12-18T12:00:00Z'::timestamp,
  '550e8400-e29b-41d4-a716-446655440003'
);

-- Change 2: PRD Created from BRD
INSERT INTO change_log (
  id, project_id, item, change, reason, impact, category, phase,
  approved_by, related_conflict_id, documents_before, documents_after,
  timestamp, created_by
) VALUES (
  'CHANGE-002',
  'PRJ-2024-001',
  'PRD-2024-001: Mobile App Redesign PRD',
  'PRD generated from approved BRD with 4 features and 4 user stories',
  'Translating business requirements into product features. Breaking down high-level goals into actionable development work.',
  'Engineering can begin technical design. 460 hours of development work estimated across 4 features.',
  'process',
  'added',
  '[]'::jsonb,
  NULL,
  '[]'::jsonb,
  '[{"type": "prd", "id": "PRD-2024-001", "version": 1, "status": "draft", "featureCount": 4}]'::jsonb,
  '2024-12-22T09:00:00Z'::timestamp,
  '550e8400-e29b-41d4-a716-446655440003'
);

-- Change 3: Feature Scope Adjusted Due to Timeline Conflict
INSERT INTO change_log (
  id, project_id, item, change, reason, impact, category, phase,
  approved_by, related_conflict_id, documents_before, documents_after,
  timestamp, created_by
) VALUES (
  'CHANGE-003',
  'PRJ-2024-001',
  'PRD-2024-001: Feature Scope',
  'FEAT-004 (Personalized Home Screen) moved to Phase 2 release',
  'Timeline conflict resolution: Engineering cannot deliver all 4 features by April 30 Q1 deadline with required quality standards.',
  'Phase 1 launch (April 30) will include FEAT-001, FEAT-002, FEAT-003. FEAT-004 delivered in Phase 2 (May 31). Reduces initial dev from 460 to 300 hours.',
  'scope',
  'pushed_to_phase_2',
  '[
    {"userId": "550e8400-e29b-41d4-a716-446655440003", "userName": "Alex Rivera", "role": "Product Manager"},
    {"userId": "550e8400-e29b-41d4-a716-446655440005", "userName": "David Kim", "role": "Engineering Lead"}
  ]'::jsonb,
  'CONFLICT-2024-002',
  '[{"type": "prd", "id": "PRD-2024-001", "version": 1, "featureCount": 4}]'::jsonb,
  '[{"type": "prd", "id": "PRD-2024-001", "version": 2, "phase1Features": 3, "phase2Features": 1}]'::jsonb,
  '2025-01-09T16:30:00Z'::timestamp,
  '550e8400-e29b-41d4-a716-446655440008'
);

-- Change 4: Security Requirement Added
INSERT INTO change_log (
  id, project_id, item, change, reason, impact, category, phase,
  approved_by, related_conflict_id, documents_before, documents_after,
  timestamp, created_by
) VALUES (
  'CHANGE-004',
  'PRJ-2024-001',
  'DESIGN-2024-001: Security Architecture',
  'Secret management updated from ".env files" to "AWS Secrets Manager"',
  'Critical security vulnerability detected by Security Agent. Storing API keys in .env files violates security best practices and compliance requirements (PCI-DSS, SOC 2, GDPR).',
  'Adds 3 days to timeline but prevents potential multi-million dollar security breaches. Requires AWS SDK integration and IAM policy updates. Monthly cost: $50.',
  'technical',
  'modified',
  '[
    {"userId": "550e8400-e29b-41d4-a716-446655440007", "userName": "Security Agent", "role": "Security"},
    {"userId": "550e8400-e29b-41d4-a716-446655440005", "userName": "David Kim", "role": "Engineering Lead"}
  ]'::jsonb,
  'CONFLICT-2024-001',
  '[{"type": "engineering_design", "id": "DESIGN-2024-001", "securityApproach": "Store API keys in .env files"}]'::jsonb,
  '[{"type": "engineering_design", "id": "DESIGN-2024-001", "securityApproach": "Use AWS Secrets Manager with automatic rotation"}]'::jsonb,
  '2025-01-10T14:00:00Z'::timestamp,
  '550e8400-e29b-41d4-a716-446655440007'
);

-- Verify Change Log created
SELECT
  id,
  item,
  category,
  phase,
  related_conflict_id,
  (SELECT COUNT(*) FROM jsonb_array_elements(approved_by)) as approver_count,
  timestamp
FROM change_log
WHERE id LIKE 'CHANGE-%'
ORDER BY timestamp;

-- Summary
SELECT
  'Demo Change Log Created' as status,
  COUNT(*) as total_changes,
  COUNT(CASE WHEN category = 'scope' THEN 1 END) as scope_changes,
  COUNT(CASE WHEN category = 'technical' THEN 1 END) as technical_changes,
  COUNT(CASE WHEN category = 'process' THEN 1 END) as process_changes,
  COUNT(CASE WHEN related_conflict_id IS NOT NULL THEN 1 END) as conflict_related_changes
FROM change_log
WHERE id LIKE 'CHANGE-%';
