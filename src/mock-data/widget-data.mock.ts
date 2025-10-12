/**
 * Mock Widget Data - Sample data for all widget types
 */

import { ProjectStatusData } from '../services/widget-renderers/project-status.widget';
import { BlockerData } from '../services/widget-renderers/blocker-alert.widget';
import { ApprovalStatusData } from '../services/widget-renderers/approval-status.widget';

export interface MockWidgetData {
  projectStatuses: ProjectStatusData[];
  blockers: BlockerData[];
  approvalStatuses: ApprovalStatusData[];
}

const mockWidgetData: MockWidgetData = {
  projectStatuses: [
    {
      projectId: '42',
      projectName: 'Mobile App Redesign',
      status: 'at-risk',
      progress: 65,
      phase: 'PRD → Engineering Design',
      blockers: [
        {
          id: 1,
          title: 'API team dependency delayed',
          severity: 'high',
          daysOverdue: 2
        },
        {
          id: 3,
          title: 'Design system approval pending',
          severity: 'medium',
          daysOverdue: 0
        }
      ],
      healthScore: 65,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
    },
    {
      projectId: '43',
      projectName: 'Payment Gateway Integration',
      status: 'on-track',
      progress: 90,
      phase: 'Engineering Design → Implementation',
      blockers: [],
      healthScore: 92,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 5) // 5 minutes ago
    },
    {
      projectId: '44',
      projectName: 'Customer Analytics Dashboard',
      status: 'blocked',
      progress: 45,
      phase: 'BRD → PRD',
      blockers: [
        {
          id: 5,
          title: 'Data privacy compliance review needed',
          severity: 'high',
          daysOverdue: 5
        },
        {
          id: 6,
          title: 'Budget approval required',
          severity: 'high',
          daysOverdue: 3
        }
      ],
      healthScore: 35,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    },
    {
      projectId: '45',
      projectName: 'Authentication System Upgrade',
      status: 'completed',
      progress: 100,
      phase: 'Implementation → Launch',
      blockers: [],
      healthScore: 100,
      lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    }
  ],

  blockers: [
    {
      id: 1,
      title: 'API team dependency delayed',
      description: 'Backend API endpoints required for mobile app integration are 2 days behind schedule. The API team is blocked by infrastructure issues.',
      severity: 'high',
      status: 'active',
      assignedTo: 'Backend Team',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      daysActive: 5,
      escalationCount: 1,
      milestoneId: 'milestone-42',
      projectId: '42'
    },
    {
      id: 2,
      title: 'Third-party library vulnerability',
      description: 'Security scan identified critical vulnerability in authentication library. Need to update and retest.',
      severity: 'high',
      status: 'escalated',
      assignedTo: 'Security Team',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      daysActive: 3,
      escalationCount: 2,
      milestoneId: 'milestone-45',
      projectId: '45'
    },
    {
      id: 3,
      title: 'Design system approval pending',
      description: 'New design components need UX lead approval before implementation.',
      severity: 'medium',
      status: 'active',
      assignedTo: 'Design Team',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      daysActive: 2,
      escalationCount: 0,
      milestoneId: 'milestone-42',
      projectId: '42'
    },
    {
      id: 4,
      title: 'Test environment unavailable',
      description: 'QA environment is down due to infrastructure maintenance. ETA 2 hours.',
      severity: 'low',
      status: 'active',
      assignedTo: 'DevOps Team',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      daysActive: 0,
      escalationCount: 0,
      milestoneId: 'milestone-43',
      projectId: '43'
    },
    {
      id: 5,
      title: 'Data privacy compliance review needed',
      description: 'Legal team review required for customer data collection and storage policies before proceeding with implementation.',
      severity: 'high',
      status: 'escalated',
      assignedTo: 'Legal & Compliance',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), // 8 days ago
      daysActive: 8,
      escalationCount: 3,
      milestoneId: 'milestone-44',
      projectId: '44'
    },
    {
      id: 6,
      title: 'Budget approval required',
      description: 'Additional $50k budget needed for third-party analytics tools. Awaiting CFO approval.',
      severity: 'high',
      status: 'active',
      assignedTo: 'Finance Team',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6 days ago
      daysActive: 6,
      escalationCount: 1,
      milestoneId: 'milestone-44',
      projectId: '44'
    }
  ],

  approvalStatuses: [
    {
      narrativeId: 1,
      narrativeVersion: 3,
      status: 'pending',
      totalReviewers: 4,
      approvedCount: 2,
      rejectedCount: 0,
      conditionalCount: 1,
      pendingCount: 1,
      reviewers: [
        {
          id: 1,
          name: 'Sarah Chen',
          role: 'CEO',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
        },
        {
          id: 2,
          name: 'Michael Torres',
          role: 'CTO',
          vote: 'conditional',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
          conditions: [
            'Reduce infrastructure budget to $60k',
            'Add security audit milestone before launch'
          ]
        },
        {
          id: 3,
          name: 'Emily Rodriguez',
          role: 'Product Manager',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 12) // 12 hours ago
        },
        {
          id: 4,
          name: 'David Kim',
          role: 'Engineering Lead',
          vote: 'pending'
        }
      ],
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
      initiatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) // 5 days ago
    },
    {
      narrativeId: 2,
      narrativeVersion: 2,
      status: 'approved',
      totalReviewers: 3,
      approvedCount: 3,
      rejectedCount: 0,
      conditionalCount: 0,
      pendingCount: 0,
      reviewers: [
        {
          id: 1,
          name: 'Sarah Chen',
          role: 'CEO',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4)
        },
        {
          id: 2,
          name: 'Michael Torres',
          role: 'CTO',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
        },
        {
          id: 3,
          name: 'Emily Rodriguez',
          role: 'Product Manager',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
        }
      ],
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago (completed before due)
      initiatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      finalizedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    },
    {
      narrativeId: 3,
      narrativeVersion: 1,
      status: 'rejected',
      totalReviewers: 3,
      approvedCount: 0,
      rejectedCount: 2,
      conditionalCount: 1,
      pendingCount: 0,
      reviewers: [
        {
          id: 1,
          name: 'Sarah Chen',
          role: 'CEO',
          vote: 'rejected',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          conditions: ['Budget exceeds approved limits', 'Timeline is unrealistic']
        },
        {
          id: 2,
          name: 'Michael Torres',
          role: 'CTO',
          vote: 'rejected',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          conditions: ['Technical approach needs revision']
        },
        {
          id: 5,
          name: 'Jessica Wang',
          role: 'CFO',
          vote: 'conditional',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
          conditions: ['Reduce budget by 30%']
        }
      ],
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago (overdue)
      initiatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      finalizedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
    },
    {
      narrativeId: 5,
      narrativeVersion: 1,
      status: 'conditional',
      totalReviewers: 3,
      approvedCount: 1,
      rejectedCount: 0,
      conditionalCount: 2,
      pendingCount: 0,
      reviewers: [
        {
          id: 1,
          name: 'Sarah Chen',
          role: 'CEO',
          vote: 'approved',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
        },
        {
          id: 2,
          name: 'Michael Torres',
          role: 'CTO',
          vote: 'conditional',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
          conditions: ['Add performance benchmarks', 'Include migration plan']
        },
        {
          id: 5,
          name: 'Jessica Wang',
          role: 'CFO',
          vote: 'conditional',
          votedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
          conditions: ['Provide detailed cost breakdown']
        }
      ],
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days from now
      initiatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
    }
  ]
};

export default mockWidgetData;
