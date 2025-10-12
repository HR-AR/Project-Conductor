import { NarrativeVersion } from '../models/narrative.model';

export const mockNarrativeVersions: NarrativeVersion[] = [
  {
    id: 1,
    narrative_id: 1,
    version: 1,
    content: `---
id: project-42
type: brd
status: draft
created_at: 2025-01-10T10:00:00Z
---

# Mobile App Redesign (BRD v1)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days.

## Business Case
Current retention: 45%
Target retention: 65%
Expected revenue impact: $2M ARR

## Initial Requirements
- Redesigned home screen
- Push notifications
- User profiles
`,
    author_id: 1,
    change_reason: 'Initial draft',
    is_auto_generated: false,
    created_at: new Date('2025-01-10T10:00:00Z')
  },
  {
    id: 2,
    narrative_id: 1,
    version: 2,
    content: `---
id: project-42
type: brd
status: rejected
---

# Mobile App Redesign (BRD v2)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days.

## Business Case
Current retention: 45%
Target retention: 65%
Expected revenue impact: $2M ARR

## GDPR Compliance
Added section on data retention and user consent.

## Requirements
- Redesigned home screen
- Push notifications
- User profiles
`,
    author_id: 1,
    change_reason: 'Added GDPR section per Legal feedback',
    is_auto_generated: false,
    created_at: new Date('2025-01-12T14:00:00Z')
  },
  {
    id: 3,
    narrative_id: 1,
    version: 3,
    content: `---
id: project-42
type: brd
status: approved
approved_at: 2025-01-15T14:30:00Z
health_score: 85
milestones:
  - id: milestone-42
    title: Home Screen Redesign
    status: in_progress
    progress: 80
  - id: milestone-43
    title: Push Notifications
    status: blocked
    progress: 0
---

# Mobile App Redesign (BRD v3 - APPROVED)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days, translating to $2M in additional annual recurring revenue.

## Status
{{widget type="project-status" project-id="42"}}

## Business Case
- Current retention: 45% at 30 days
- Target retention: 65% at 30 days
- Expected revenue impact: $2M ARR
- Investment: $60,000 (reduced from $75k per CFO condition)

## GDPR Compliance
- Data retention: 30 days max
- User consent: Required on first launch
- Right to deletion: Automated via settings

## Milestones

### 1. Home Screen Redesign [[milestone-42]]
Owner: Alex (Design Lead)
Timeline: Jan 20 - Feb 5
Status: 80% complete

### 2. Push Notifications [[milestone-43]]
Owner: Jamie (Backend Lead)
Timeline: Feb 6 - Feb 20
Status: ⚠️ Blocked - API team dependency

## Success Criteria
- 20% increase in 30-day retention
- $2M additional ARR
- Launch by April 30, 2025
`,
    author_id: 1,
    change_reason: 'Final revisions approved by all stakeholders',
    is_auto_generated: false,
    created_at: new Date('2025-01-15T14:30:00Z')
  }
];
