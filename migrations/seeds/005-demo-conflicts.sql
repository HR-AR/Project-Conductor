-- Demo Conflicts Seed Data
-- Creates sample conflicts including the "Killer Demo" security conflict

-- Conflict 1: Security Vulnerability - Hardcoded API Keys (KILLER DEMO STORY)
-- This conflict is automatically detected by the Security Agent when scanning DESIGN-2024-001
INSERT INTO conflicts (
  id, type, title, description, severity, raised_by, raised_by_role,
  affected_documents, affected_items, discussion, options, resolution, status
) VALUES (
  'CONFLICT-2024-001',
  'technical',
  'Critical Security Vulnerability: API Keys in Environment Files',
  'The engineering design proposes storing API keys and secrets in .env files. This is a critical security vulnerability because:

1. **.env files are often committed to version control** - Even if .gitignore is configured, developers may accidentally commit them, exposing credentials
2. **No access control** - Anyone with filesystem access can read plain-text secrets
3. **No audit trail** - Can''t track who accessed keys or detect unauthorized access
4. **No rotation mechanism** - Changing keys requires manual updates across all environments
5. **Compliance violations** - Fails PCI-DSS, SOC 2, and GDPR requirements for credential management

**Detected in**: DESIGN-2024-001 - Mobile App Redesign
**Vulnerable code mention**: "Store API keys and secrets in .env files for easy configuration management"

**Industry Best Practices**:
- Use dedicated secret management systems (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
- Implement secret rotation
- Enforce access controls and audit logging
- Never store secrets in source code or environment files',
  'critical',
  '550e8400-e29b-41d4-a716-446655440007',
  'engineering',
  '[
    {"type": "engineering_design", "id": "DESIGN-2024-001", "title": "Mobile App Redesign Engineering Design"}
  ]'::jsonb,
  '[
    "API key storage mechanism",
    "Payment gateway credentials",
    "Third-party service secrets",
    "Database connection strings"
  ]'::jsonb,
  '[
    {
      "id": "COMMENT-001",
      "userId": "550e8400-e29b-41d4-a716-446655440007",
      "userName": "Security Agent",
      "comment": "🚨 CRITICAL SECURITY ISSUE: This design violates fundamental security principles. API keys in .env files have caused numerous high-profile data breaches. We cannot proceed with this approach.",
      "timestamp": "2025-01-10T09:00:00Z"
    },
    {
      "id": "COMMENT-002",
      "userId": "550e8400-e29b-41d4-a716-446655440005",
      "userName": "David Kim",
      "comment": "I understand the concern. We chose .env for simplicity, but I agree security is paramount. What''s the recommended alternative that won''t delay our timeline?",
      "timestamp": "2025-01-10T10:15:00Z"
    },
    {
      "id": "COMMENT-003",
      "userId": "550e8400-e29b-41d4-a716-446655440007",
      "userName": "Security Agent",
      "comment": "AWS Secrets Manager is the best option. It''s already in our infrastructure, supports automatic rotation, and integrates with our IAM policies. Implementation adds 2-3 days but prevents potential multi-million dollar breaches.",
      "timestamp": "2025-01-10T11:30:00Z"
    }
  ]'::jsonb,
  '[
    {
      "id": "OPTION-001",
      "title": "Use AWS Secrets Manager",
      "description": "Migrate all secrets to AWS Secrets Manager with automatic rotation and IAM-based access control",
      "pros": ["Industry standard", "Automatic rotation", "Audit logging", "Integrates with existing infrastructure"],
      "cons": ["Adds 2-3 days to timeline", "Requires AWS SDK integration"],
      "cost": "$50/month + API calls",
      "timeline": "3 days",
      "votes": [
        {"userId": "550e8400-e29b-41d4-a716-446655440007", "userName": "Security Agent", "vote": "strongly_support", "reason": "This is the only secure solution"},
        {"userId": "550e8400-e29b-41d4-a716-446655440005", "userName": "David Kim", "vote": "support", "reason": "Acceptable timeline impact for proper security"},
        {"userId": "550e8400-e29b-41d4-a716-446655440002", "userName": "Mike Johnson", "vote": "support", "reason": "3-day delay is manageable, security is critical"}
      ]
    },
    {
      "id": "OPTION-002",
      "title": "Use HashiCorp Vault",
      "description": "Deploy HashiCorp Vault for centralized secret management",
      "pros": ["Multi-cloud support", "Dynamic secrets", "Strong access policies"],
      "cons": ["Requires new infrastructure", "Team training needed", "Higher operational overhead"],
      "cost": "$500/month (self-hosted) or $3000/month (HCP Vault)",
      "timeline": "2 weeks",
      "votes": [
        {"userId": "550e8400-e29b-41d4-a716-446655440002", "userName": "Mike Johnson", "vote": "oppose", "reason": "Timeline impact too large, over-engineered for our needs"}
      ]
    },
    {
      "id": "OPTION-003",
      "title": "Enhanced .env with Encryption",
      "description": "Keep .env approach but encrypt files using git-crypt",
      "pros": ["Minimal code changes", "No timeline impact"],
      "cons": ["Still not ideal", "Manual key distribution", "Limited audit trail"],
      "cost": "$0",
      "timeline": "1 day",
      "votes": [
        {"userId": "550e8400-e29b-41d4-a716-446655440007", "userName": "Security Agent", "vote": "strongly_oppose", "reason": "Does not address fundamental issues, still vulnerable"}
      ]
    }
  ]'::jsonb,
  NULL,
  'open'
);

-- Conflict 2: Timeline vs Budget Trade-off
INSERT INTO conflicts (
  id, type, title, description, severity, raised_by, raised_by_role,
  affected_documents, affected_items, discussion, options, resolution, status
) VALUES (
  'CONFLICT-2024-002',
  'timeline',
  'Feature Scope vs Q1 Launch Timeline',
  'Product wants all 4 features delivered by April 30 (Q1 target), but Engineering estimates require until May 31 for full implementation with quality. Cutting scope risks not meeting success criteria. Extending timeline risks missing Q1 revenue targets.',
  'high',
  '550e8400-e29b-41d4-a716-446655440008',
  'tpm',
  '[
    {"type": "prd", "id": "PRD-2024-001", "title": "Mobile App Redesign PRD"},
    {"type": "engineering_design", "id": "DESIGN-2024-001", "title": "Mobile App Redesign Design"}
  ]'::jsonb,
  '[
    "Launch timeline (April 30 vs May 31)",
    "Feature scope (all 4 features vs phased approach)",
    "Quality targets (80% test coverage requirement)"
  ]'::jsonb,
  '[
    {
      "id": "COMMENT-004",
      "userId": "550e8400-e29b-41d4-a716-446655440003",
      "userName": "Alex Rivera",
      "comment": "Q1 launch is critical for our investor demo and customer commitments. We need all features to hit the BRD success criteria.",
      "timestamp": "2025-01-08T14:00:00Z"
    },
    {
      "id": "COMMENT-005",
      "userId": "550e8400-e29b-41d4-a716-446655440005",
      "userName": "David Kim",
      "comment": "I understand the business pressure, but rushing will compromise quality. We can do 3 features by April 30, or all 4 by May 31.",
      "timestamp": "2025-01-08T15:30:00Z"
    }
  ]'::jsonb,
  '[
    {
      "id": "OPTION-004",
      "title": "Phase 1: Core Features by April 30",
      "description": "Launch with FEAT-001, FEAT-002, FEAT-003 by April 30. Add FEAT-004 in May as Phase 2 update.",
      "pros": ["Hits Q1 deadline", "Maintains quality", "Addresses core success criteria"],
      "cons": ["Personalization missing at launch", "Two releases needed"],
      "timeline": "April 30 (Phase 1), May 31 (Phase 2)",
      "votes": [
        {"userId": "550e8400-e29b-41d4-a716-446655440005", "userName": "David Kim", "vote": "strongly_support", "reason": "Best balance of quality and timeline"},
        {"userId": "550e8400-e29b-41d4-a716-446655440008", "userName": "James Wilson", "vote": "support", "reason": "Phased approach reduces risk"}
      ]
    },
    {
      "id": "OPTION-005",
      "title": "All Features by May 31",
      "description": "Deliver all 4 features with full quality by May 31, miss Q1 target",
      "pros": ["Complete feature set", "No technical debt", "Better user experience"],
      "cons": ["Misses Q1 deadline", "May impact investor confidence"],
      "timeline": "May 31",
      "votes": [
        {"userId": "550e8400-e29b-41d4-a716-446655440003", "userName": "Alex Rivera", "vote": "oppose", "reason": "Cannot miss Q1 deadline"}
      ]
    }
  ]'::jsonb,
  NULL,
  'discussing'
);

-- Conflict 3: Budget Overrun - Collaboration Features
INSERT INTO conflicts (
  id, type, title, description, severity, raised_by, raised_by_role,
  affected_documents, affected_items, discussion, options, resolution, status
) VALUES (
  'CONFLICT-2024-003',
  'budget',
  'Real-time Collaboration Infrastructure Costs Exceed Budget',
  'Initial BRD allocated $200K for collaboration features. Engineering design reveals infrastructure costs (Redis Cluster, WebSocket servers, load balancers) will cost $320K annually in cloud costs, plus $80K one-time setup. Total: $400K vs $200K budget.',
  'medium',
  '550e8400-e29b-41d4-a716-446655440006',
  'engineering',
  '[
    {"type": "brd", "id": "BRD-2024-002", "title": "Real-time Collaboration BRD"},
    {"type": "engineering_design", "id": "DESIGN-2024-002", "title": "Real-time Collaboration Design"}
  ]'::jsonb,
  '[
    "Infrastructure budget ($200K allocated, $400K needed)",
    "Redis Cluster costs",
    "WebSocket server scaling",
    "Load balancer requirements"
  ]'::jsonb,
  '[]'::jsonb,
  '[
    {
      "id": "OPTION-006",
      "title": "Approve Additional Budget",
      "description": "Increase project budget from $200K to $400K",
      "pros": ["Full feature set delivered", "Proper scalability"],
      "cons": ["Budget overrun", "May require VP approval"],
      "timeline": "2 weeks for budget approval"
    },
    {
      "id": "OPTION-007",
      "title": "Reduce User Capacity",
      "description": "Support 5 concurrent users instead of 10, reduce infrastructure",
      "pros": ["Stays within budget", "Faster implementation"],
      "cons": ["Doesn''t meet BRD requirements", "May not satisfy enterprise customers"],
      "timeline": "No change"
    }
  ]'::jsonb,
  NULL,
  'open'
);

-- Verify Conflicts created
SELECT
  id,
  type,
  title,
  severity,
  status,
  raised_by_role,
  (SELECT COUNT(*) FROM jsonb_array_elements(discussion)) as comment_count,
  (SELECT COUNT(*) FROM jsonb_array_elements(options)) as option_count
FROM conflicts
WHERE id LIKE 'CONFLICT-%'
ORDER BY severity DESC, id;

-- Summary
SELECT
  'Demo Conflicts Created' as status,
  COUNT(*) as total_conflicts,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_conflicts,
  COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_conflicts,
  COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_conflicts,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_conflicts,
  COUNT(CASE WHEN status = 'discussing' THEN 1 END) as discussing_conflicts
FROM conflicts
WHERE id LIKE 'CONFLICT-%';

-- Highlight the Killer Demo conflict
SELECT
  '🚨 KILLER DEMO CONFLICT' as alert,
  id,
  title,
  severity,
  'This conflict will be auto-detected by Security Agent' as demo_trigger
FROM conflicts
WHERE id = 'CONFLICT-2024-001';
