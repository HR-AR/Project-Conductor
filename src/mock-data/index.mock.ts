import { ProjectSummary } from '../services/document-index.service';

export const mockIndexData: ProjectSummary[] = [
  {
    narrative_id: 1,
    project_id: 'project-42',
    title: 'Mobile App Redesign (BRD v3 - APPROVED)',
    type: 'brd',
    status: 'approved',
    health_score: 85,
    blockers: [
      {
        milestone_id: 'milestone-43',
        title: 'Push Notifications',
        days_overdue: 2
      }
    ],
    next_milestones: [
      {
        id: 'milestone-42',
        title: 'Home Screen Redesign',
        status: 'in_progress',
        progress: 80
      },
      {
        id: 'milestone-43',
        title: 'Push Notifications',
        status: 'blocked',
        progress: 0
      }
    ],
    approvers: [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        role: 'CEO',
        vote: 'approved'
      }
    ],
    last_indexed_at: new Date('2025-01-15T14:30:00Z')
  },
  {
    narrative_id: 2,
    project_id: 'project-101',
    title: 'E-commerce Payment Integration',
    type: 'brd',
    status: 'in_review',
    health_score: 92,
    blockers: [],
    next_milestones: [
      {
        id: 'milestone-101',
        title: 'Stripe Integration',
        status: 'in_progress',
        progress: 65
      },
      {
        id: 'milestone-102',
        title: 'PayPal Support',
        status: 'pending',
        progress: 0
      }
    ],
    approvers: [
      {
        id: 'user-2',
        name: 'Michael Rodriguez',
        role: 'CTO',
        vote: 'pending'
      },
      {
        id: 'user-3',
        name: 'Emily Watson',
        role: 'CFO',
        vote: 'pending'
      }
    ],
    last_indexed_at: new Date('2025-01-18T09:15:00Z')
  },
  {
    narrative_id: 3,
    project_id: 'project-203',
    title: 'Customer Analytics Dashboard',
    type: 'prd',
    status: 'approved',
    health_score: 78,
    blockers: [
      {
        milestone_id: 'milestone-203',
        title: 'Data Pipeline Setup',
        days_overdue: 5
      }
    ],
    next_milestones: [
      {
        id: 'milestone-203',
        title: 'Data Pipeline Setup',
        status: 'blocked',
        progress: 30
      },
      {
        id: 'milestone-204',
        title: 'Dashboard UI',
        status: 'pending',
        progress: 0
      }
    ],
    approvers: [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        role: 'CEO',
        vote: 'approved'
      },
      {
        id: 'user-2',
        name: 'Michael Rodriguez',
        role: 'CTO',
        vote: 'approved'
      }
    ],
    last_indexed_at: new Date('2025-01-16T11:20:00Z')
  },
  {
    narrative_id: 4,
    project_id: 'project-304',
    title: 'AI-Powered Recommendation Engine',
    type: 'prd',
    status: 'draft',
    health_score: 65,
    blockers: [
      {
        milestone_id: 'milestone-304',
        title: 'ML Model Training',
        days_overdue: 7
      },
      {
        milestone_id: 'milestone-305',
        title: 'Infrastructure Setup',
        days_overdue: 3
      }
    ],
    next_milestones: [
      {
        id: 'milestone-304',
        title: 'ML Model Training',
        status: 'blocked',
        progress: 15
      }
    ],
    approvers: [],
    last_indexed_at: new Date('2025-01-19T14:45:00Z')
  },
  {
    narrative_id: 5,
    project_id: 'project-405',
    title: 'Multi-Language Support',
    type: 'brd',
    status: 'approved',
    health_score: 95,
    blockers: [],
    next_milestones: [
      {
        id: 'milestone-405',
        title: 'Spanish Translation',
        status: 'in_progress',
        progress: 90
      },
      {
        id: 'milestone-406',
        title: 'French Translation',
        status: 'in_progress',
        progress: 75
      },
      {
        id: 'milestone-407',
        title: 'German Translation',
        status: 'pending',
        progress: 0
      }
    ],
    approvers: [
      {
        id: 'user-1',
        name: 'Sarah Chen',
        role: 'CEO',
        vote: 'approved'
      }
    ],
    last_indexed_at: new Date('2025-01-20T08:30:00Z')
  },
  {
    narrative_id: 6,
    project_id: 'project-506',
    title: 'Enterprise SSO Integration',
    type: 'design',
    status: 'in_review',
    health_score: 88,
    blockers: [],
    next_milestones: [
      {
        id: 'milestone-506',
        title: 'SAML Implementation',
        status: 'in_progress',
        progress: 55
      },
      {
        id: 'milestone-507',
        title: 'OAuth 2.0 Support',
        status: 'pending',
        progress: 0
      }
    ],
    approvers: [
      {
        id: 'user-2',
        name: 'Michael Rodriguez',
        role: 'CTO',
        vote: 'pending'
      },
      {
        id: 'user-4',
        name: 'David Kim',
        role: 'Security Lead',
        vote: 'conditional'
      }
    ],
    last_indexed_at: new Date('2025-01-17T16:00:00Z')
  },
  {
    narrative_id: 7,
    project_id: 'project-607',
    title: 'Real-time Collaboration Features',
    type: 'prd',
    status: 'approved',
    health_score: 82,
    blockers: [
      {
        milestone_id: 'milestone-608',
        title: 'WebSocket Scaling',
        days_overdue: 1
      }
    ],
    next_milestones: [
      {
        id: 'milestone-607',
        title: 'Live Cursors',
        status: 'in_progress',
        progress: 70
      },
      {
        id: 'milestone-608',
        title: 'WebSocket Scaling',
        status: 'blocked',
        progress: 40
      }
    ],
    approvers: [
      {
        id: 'user-2',
        name: 'Michael Rodriguez',
        role: 'CTO',
        vote: 'approved'
      }
    ],
    last_indexed_at: new Date('2025-01-19T10:15:00Z')
  },
  {
    narrative_id: 8,
    project_id: 'project-708',
    title: 'Performance Monitoring Dashboard',
    type: 'design',
    status: 'draft',
    health_score: 70,
    blockers: [
      {
        milestone_id: 'milestone-708',
        title: 'Metrics Collection',
        days_overdue: 4
      }
    ],
    next_milestones: [
      {
        id: 'milestone-708',
        title: 'Metrics Collection',
        status: 'blocked',
        progress: 25
      },
      {
        id: 'milestone-709',
        title: 'Alerting System',
        status: 'pending',
        progress: 0
      }
    ],
    approvers: [],
    last_indexed_at: new Date('2025-01-18T13:40:00Z')
  }
];
