/**
 * Mock data for Approvals and Decisions
 * Demonstrates the immutable decision register with sample approval workflows
 */

import { Approval, Decision } from '../models/approval.model';

/**
 * Mock approvals for narrative review processes
 */
export const mockApprovals: Approval[] = [
  {
    id: 1,
    narrative_id: 1,
    narrative_version: 1,
    reviewer_id: 1,
    status: 'approved',
    due_date: new Date('2025-01-15T23:59:59Z'),
    created_at: new Date('2025-01-10T10:00:00Z'),
    updated_at: new Date('2025-01-12T16:30:00Z'),
  },
  {
    id: 2,
    narrative_id: 1,
    narrative_version: 2,
    reviewer_id: 1,
    status: 'rejected',
    due_date: new Date('2025-01-18T23:59:59Z'),
    created_at: new Date('2025-01-12T14:00:00Z'),
    updated_at: new Date('2025-01-13T09:15:00Z'),
  },
  {
    id: 3,
    narrative_id: 1,
    narrative_version: 3,
    reviewer_id: 1,
    status: 'approved',
    due_date: new Date('2025-01-20T23:59:59Z'),
    created_at: new Date('2025-01-15T08:00:00Z'),
    updated_at: new Date('2025-01-15T14:30:00Z'),
  },
  {
    id: 4,
    narrative_id: 2,
    narrative_version: 1,
    reviewer_id: 2,
    status: 'conditional',
    due_date: new Date('2025-02-01T23:59:59Z'),
    created_at: new Date('2025-01-25T10:00:00Z'),
    updated_at: new Date('2025-01-26T11:00:00Z'),
  },
  {
    id: 5,
    narrative_id: 3,
    narrative_version: 1,
    reviewer_id: 3,
    status: 'pending',
    due_date: new Date('2025-02-10T23:59:59Z'),
    created_at: new Date('2025-02-01T09:00:00Z'),
    updated_at: new Date('2025-02-01T09:00:00Z'),
  },
];

/**
 * Mock decisions - immutable decision register
 * Once a decision is recorded, it cannot be modified or deleted
 */
export const mockDecisions: Decision[] = [
  // Narrative 1, Version 1 - Approved by all reviewers
  {
    id: 1,
    narrative_id: 1,
    narrative_version: 1,
    reviewer_id: 1,
    vote: 'approve',
    reasoning: 'Strong business case with clear metrics. Mobile redesign is necessary to improve retention.',
    created_at: new Date('2025-01-11T10:30:00Z'),
  },
  {
    id: 2,
    narrative_id: 1,
    narrative_version: 1,
    reviewer_id: 2,
    vote: 'approve',
    reasoning: 'Good technical foundation. Design system supports the proposed changes.',
    created_at: new Date('2025-01-11T14:00:00Z'),
  },
  {
    id: 3,
    narrative_id: 1,
    narrative_version: 1,
    reviewer_id: 3,
    vote: 'conditional',
    reasoning: 'Budget is too high. Approve if reduced to $60k.',
    conditions: [
      'Reduce budget from $75k to $60k',
      'Provide detailed cost breakdown',
    ],
    created_at: new Date('2025-01-12T16:30:00Z'),
  },

  // Narrative 1, Version 2 - Rejected due to missing requirements
  {
    id: 4,
    narrative_id: 1,
    narrative_version: 2,
    reviewer_id: 1,
    vote: 'reject',
    reasoning: 'GDPR section is incomplete. Missing data retention policy and user consent flow details.',
    created_at: new Date('2025-01-13T09:15:00Z'),
  },
  {
    id: 5,
    narrative_id: 1,
    narrative_version: 2,
    reviewer_id: 2,
    vote: 'reject',
    reasoning: 'Legal team flagged privacy concerns. Need more comprehensive compliance documentation.',
    created_at: new Date('2025-01-13T11:00:00Z'),
  },

  // Narrative 1, Version 3 - Approved with conditions met
  {
    id: 6,
    narrative_id: 1,
    narrative_version: 3,
    reviewer_id: 1,
    vote: 'approve',
    reasoning: 'All GDPR requirements addressed. Excellent work on compliance documentation.',
    created_at: new Date('2025-01-15T10:00:00Z'),
  },
  {
    id: 7,
    narrative_id: 1,
    narrative_version: 3,
    reviewer_id: 2,
    vote: 'approve',
    reasoning: 'Design is solid. Technical implementation plan is clear and achievable.',
    created_at: new Date('2025-01-15T12:15:00Z'),
  },
  {
    id: 8,
    narrative_id: 1,
    narrative_version: 3,
    reviewer_id: 3,
    vote: 'approve',
    reasoning: 'Budget reduced to $60k as requested. Financial projections are realistic.',
    created_at: new Date('2025-01-15T14:30:00Z'),
  },

  // Narrative 2, Version 1 - Conditional approval
  {
    id: 9,
    narrative_id: 2,
    narrative_version: 1,
    reviewer_id: 2,
    vote: 'conditional',
    reasoning: 'Good concept but needs refinement. Approve with conditions below.',
    conditions: [
      'Add performance benchmarks',
      'Include rollback plan',
      'Define success metrics more specifically',
    ],
    created_at: new Date('2025-01-26T11:00:00Z'),
  },
  {
    id: 10,
    narrative_id: 2,
    narrative_version: 1,
    reviewer_id: 3,
    vote: 'conditional',
    reasoning: 'Timeline is aggressive. Need more buffer for testing.',
    conditions: [
      'Extend testing phase by 2 weeks',
      'Add integration testing milestone',
    ],
    created_at: new Date('2025-01-26T15:30:00Z'),
  },

  // Narrative 3, Version 1 - Still pending (no decisions yet)
  // No decisions recorded yet - approval still in pending state
];

/**
 * Mock reviewer assignments
 * Maps approval IDs to assigned reviewers
 */
export const mockApprovalReviewers = [
  // Approval 1: Narrative 1, Version 1
  { approval_id: 1, reviewer_id: 1, status: 'approved' },
  { approval_id: 1, reviewer_id: 2, status: 'approved' },
  { approval_id: 1, reviewer_id: 3, status: 'conditional' },

  // Approval 2: Narrative 1, Version 2
  { approval_id: 2, reviewer_id: 1, status: 'rejected' },
  { approval_id: 2, reviewer_id: 2, status: 'rejected' },

  // Approval 3: Narrative 1, Version 3
  { approval_id: 3, reviewer_id: 1, status: 'approved' },
  { approval_id: 3, reviewer_id: 2, status: 'approved' },
  { approval_id: 3, reviewer_id: 3, status: 'approved' },

  // Approval 4: Narrative 2, Version 1
  { approval_id: 4, reviewer_id: 2, status: 'conditional' },
  { approval_id: 4, reviewer_id: 3, status: 'conditional' },

  // Approval 5: Narrative 3, Version 1
  { approval_id: 5, reviewer_id: 3, status: 'pending' },
  { approval_id: 5, reviewer_id: 4, status: 'pending' },
];

/**
 * Sample reviewers (mock users)
 */
export const mockReviewers = [
  { id: 1, name: 'Sarah Chen', role: 'CEO', email: 'sarah.chen@company.com' },
  { id: 2, name: 'Alex Kim', role: 'CTO', email: 'alex.kim@company.com' },
  { id: 3, name: 'Jamie Rivera', role: 'CFO', email: 'jamie.rivera@company.com' },
  { id: 4, name: 'Taylor Morgan', role: 'Legal Counsel', email: 'taylor.morgan@company.com' },
];

/**
 * Helper function to get decisions for a specific narrative and version
 */
export function getDecisionsByNarrative(narrativeId: number, version?: number): Decision[] {
  return mockDecisions.filter(d =>
    d.narrative_id === narrativeId &&
    (version === undefined || d.narrative_version === version)
  );
}

/**
 * Helper function to get pending approvals for a reviewer
 */
export function getPendingApprovalsForReviewer(reviewerId: number): Approval[] {
  const pendingApprovalIds = mockApprovalReviewers
    .filter(ar => ar.reviewer_id === reviewerId && ar.status === 'pending')
    .map(ar => ar.approval_id);

  return mockApprovals.filter(a => pendingApprovalIds.includes(a.id));
}

/**
 * Helper function to check if all reviewers have voted
 */
export function checkAllReviewersVoted(approvalId: number): boolean {
  const reviewers = mockApprovalReviewers.filter(ar => ar.approval_id === approvalId);
  const totalReviewers = reviewers.length;

  const approval = mockApprovals.find(a => a.id === approvalId);
  if (!approval) return false;

  const decisions = mockDecisions.filter(d =>
    d.narrative_id === approval.narrative_id &&
    d.narrative_version === approval.narrative_version
  );

  return decisions.length >= totalReviewers;
}
