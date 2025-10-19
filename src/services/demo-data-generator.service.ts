import { faker } from '@faker-js/faker';
import { generateUniqueId } from '../utils/id-generator';

/**
 * Demo Data Generator Service
 * Generates realistic demo data for 3 scenarios using Faker.js
 */

export interface DemoScenario {
  name: string;
  description: string;
  teamSize: number;
  daysAgo: number;
  status: 'active' | 'at_risk' | 'blocked';
  projects: DemoProject[];
  approvals: DemoApproval[];
  comments: DemoComment[];
  milestones: DemoMilestone[];
}

export interface DemoProject {
  id: string;
  title: string;
  type: 'brd' | 'prd' | 'engineering_design';
  status: 'draft' | 'in_review' | 'approved' | 'in_progress';
  health_score: number;
  owner: DemoUser;
  team: DemoUser[];
  created_at: Date;
  updated_at: Date;
  description: string;
  goals: string[];
  milestones: string[];
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface DemoApproval {
  id: string;
  project_id: string;
  approver: DemoUser;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  feedback?: string;
  conditions?: string[];
  approved_at?: Date;
  sla_hours: number;
  hours_elapsed: number;
}

export interface DemoComment {
  id: string;
  project_id: string;
  user: DemoUser;
  content: string;
  created_at: Date;
  replies: number;
}

export interface DemoMilestone {
  id: string;
  project_id: string;
  title: string;
  owner: DemoUser;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  start_date: Date;
  end_date: Date;
  blockers?: string[];
}

export class DemoDataGeneratorService {
  /**
   * Generate demo data for Business Team scenario
   * Website Redesign: 8 members, 30 days in, at-risk
   */
  generateBusinessScenario(): DemoScenario {
    const teamSize = 8;
    const daysAgo = 30;

    // Generate team members
    const team = this.generateTeam(teamSize, 'business');
    const owner = team[0];

    // Generate projects
    const project1 = this.generateProject({
      title: 'Website Redesign - Q2 2025',
      type: 'brd',
      status: 'in_review',
      health_score: 65,
      owner,
      team: team.slice(0, 5),
      daysAgo: 30,
      description: 'Complete redesign of company website to improve conversion rates and user experience',
      goals: [
        'Increase conversion rate by 25%',
        'Reduce bounce rate to <40%',
        'Improve mobile responsiveness',
        'Modernize brand identity'
      ]
    });

    const project2 = this.generateProject({
      title: 'Q2 Marketing Campaign Strategy',
      type: 'prd',
      status: 'approved',
      health_score: 85,
      owner: team[1],
      team: team.slice(1, 4),
      daysAgo: 45,
      description: 'Multi-channel marketing campaign targeting new customer segments',
      goals: [
        'Generate 500 qualified leads',
        'Increase brand awareness by 30%',
        'Launch across 4 channels (Email, Social, PPC, Content)'
      ]
    });

    // Generate approvals (some approved, some pending)
    const approvals = [
      this.generateApproval(project1.id, team[2], 'approved', { daysAgo: 2, feedback: 'Great vision! Let\'s prioritize mobile-first approach.' }),
      this.generateApproval(project1.id, team[3], 'approved', { daysAgo: 1, feedback: 'Approved with condition: Keep budget under $75k', conditions: ['Budget cap: $75,000'] }),
      this.generateApproval(project1.id, team[4], 'pending', { slaHours: 48, hoursElapsed: 38 }),
      this.generateApproval(project1.id, team[5], 'pending', { slaHours: 72, hoursElapsed: 10 }),
      this.generateApproval(project2.id, team[2], 'approved', { daysAgo: 10 }),
    ];

    // Generate comments
    const comments = [
      this.generateComment(project1.id, team[1], 'Love the direction! Have we considered accessibility requirements?', 5),
      this.generateComment(project1.id, team[3], 'The timeline seems tight. Can we push Phase 2 to Q3?', 12),
      this.generateComment(project1.id, owner, 'Good point. Let me break down the phases more granularly.', 0),
      this.generateComment(project2.id, team[0], 'Campaign looks solid. What\'s our contingency if lead gen misses target?', 3),
    ];

    // Generate milestones
    const milestones = [
      this.generateMilestone(project1.id, 'Design System Audit', team[2], 'completed', 100, { daysAgo: 20, duration: 10 }),
      this.generateMilestone(project1.id, 'User Research & Personas', team[1], 'completed', 100, { daysAgo: 15, duration: 14 }),
      this.generateMilestone(project1.id, 'Wireframes & Prototypes', team[2], 'in_progress', 75, { daysAgo: 10, duration: 20 }),
      this.generateMilestone(project1.id, 'Content Strategy', team[3], 'blocked', 30, { daysAgo: 5, duration: 15, blockers: ['Waiting on brand guidelines', 'SEO team bandwidth'] }),
      this.generateMilestone(project1.id, 'Development Kickoff', team[4], 'not_started', 0, { daysAgo: -5, duration: 30 }),
    ];

    return {
      name: 'Business Team',
      description: 'Website Redesign - 8 members, 30 days in, at-risk',
      teamSize,
      daysAgo,
      status: 'at_risk',
      projects: [project1, project2],
      approvals,
      comments,
      milestones
    };
  }

  /**
   * Generate demo data for Engineering Team scenario
   * API Migration: 15 members, 60 days in, blocked
   */
  generateEngineeringScenario(): DemoScenario {
    const teamSize = 15;
    const daysAgo = 60;

    const team = this.generateTeam(teamSize, 'engineering');
    const owner = team[0];

    const project1 = this.generateProject({
      title: 'Legacy API Migration to GraphQL',
      type: 'engineering_design',
      status: 'in_progress',
      health_score: 45,
      owner,
      team: team.slice(0, 10),
      daysAgo: 60,
      description: 'Migrate monolithic REST API to microservices architecture with GraphQL gateway',
      goals: [
        'Reduce API response time by 50%',
        'Enable real-time subscriptions',
        'Improve developer experience',
        'Maintain 99.9% uptime during migration'
      ]
    });

    const project2 = this.generateProject({
      title: 'Database Sharding Strategy',
      type: 'prd',
      status: 'in_review',
      health_score: 70,
      owner: team[1],
      team: team.slice(1, 6),
      daysAgo: 30,
      description: 'Implement horizontal database sharding to scale to 10M+ users',
      goals: [
        'Support 10M active users',
        'Zero downtime migration',
        'Query performance <100ms p95'
      ]
    });

    const approvals = [
      this.generateApproval(project1.id, team[2], 'approved', { daysAgo: 45, feedback: 'Architecture looks solid. Let\'s proceed with POC.' }),
      this.generateApproval(project1.id, team[3], 'conditional', { daysAgo: 40, feedback: 'Approved if we add rollback strategy', conditions: ['Document rollback plan', 'Add feature flags'] }),
      this.generateApproval(project1.id, team[4], 'pending', { slaHours: 120, hoursElapsed: 115 }), // SLA warning imminent
      this.generateApproval(project1.id, team[5], 'rejected', { daysAgo: 35, feedback: 'Security review needed before proceeding' }),
      this.generateApproval(project2.id, team[3], 'approved', { daysAgo: 5 }),
    ];

    const comments = [
      this.generateComment(project1.id, team[2], 'POC results look promising. 47% latency reduction observed.', 8),
      this.generateComment(project1.id, team[5], 'Security audit complete. Found 3 medium-severity issues. Details in attached doc.', 15),
      this.generateComment(project1.id, owner, 'Thanks! Addressing security issues in Sprint 12. ETA: 2 weeks.', 2),
      this.generateComment(project1.id, team[6], 'Migration scripts ready for review. Can someone from DevOps take a look?', 6),
      this.generateComment(project2.id, team[1], 'Sharding key selection is critical. Let\'s schedule architecture review.', 4),
    ];

    const milestones = [
      this.generateMilestone(project1.id, 'GraphQL Schema Design', team[1], 'completed', 100, { daysAgo: 50, duration: 14 }),
      this.generateMilestone(project1.id, 'POC Development', team[2], 'completed', 100, { daysAgo: 35, duration: 21 }),
      this.generateMilestone(project1.id, 'Security Audit', team[5], 'completed', 100, { daysAgo: 20, duration: 10 }),
      this.generateMilestone(project1.id, 'Migration Scripts', team[6], 'blocked', 60, { daysAgo: 15, duration: 20, blockers: ['Waiting on DevOps review', 'Test environment unavailable'] }),
      this.generateMilestone(project1.id, 'Production Rollout', team[0], 'not_started', 0, { daysAgo: -10, duration: 30 }),
      this.generateMilestone(project2.id, 'Sharding Strategy Doc', team[1], 'in_progress', 80, { daysAgo: 20, duration: 15 }),
    ];

    return {
      name: 'Engineering Team',
      description: 'API Migration - 15 members, 60 days in, blocked',
      teamSize,
      daysAgo,
      status: 'blocked',
      projects: [project1, project2],
      approvals,
      comments,
      milestones
    };
  }

  /**
   * Generate demo data for Product Team scenario
   * Mobile App Launch: 12 members, just starting
   */
  generateProductScenario(): DemoScenario {
    const teamSize = 12;
    const daysAgo = 5;

    const team = this.generateTeam(teamSize, 'product');
    const owner = team[0];

    const project1 = this.generateProject({
      title: 'Mobile App - iOS & Android Launch',
      type: 'prd',
      status: 'draft',
      health_score: 90,
      owner,
      team: team.slice(0, 8),
      daysAgo: 5,
      description: 'Native mobile apps for iOS and Android with offline-first architecture',
      goals: [
        'Launch in App Store & Play Store by Q3',
        'Achieve 4.5+ star rating',
        'Support offline mode',
        '100k downloads in first month'
      ]
    });

    const project2 = this.generateProject({
      title: 'Mobile App - BRD & Market Analysis',
      type: 'brd',
      status: 'draft',
      health_score: 95,
      owner,
      team: team.slice(0, 4),
      daysAgo: 3,
      description: 'Business case and market analysis for mobile app expansion',
      goals: [
        'Validate market opportunity ($5M+ TAM)',
        'Define competitive differentiation',
        'Project ROI timeline'
      ]
    });

    const approvals = [
      this.generateApproval(project1.id, team[1], 'pending', { slaHours: 72, hoursElapsed: 5 }),
      this.generateApproval(project1.id, team[2], 'pending', { slaHours: 72, hoursElapsed: 2 }),
      this.generateApproval(project2.id, team[3], 'pending', { slaHours: 48, hoursElapsed: 10 }),
    ];

    const comments = [
      this.generateComment(project1.id, team[1], 'Exciting! Do we have research on user demand for offline mode?', 2),
      this.generateComment(project1.id, owner, 'Yes! 67% of surveyed users requested it. Will add data to appendix.', 0),
      this.generateComment(project2.id, team[2], 'Market analysis looks thorough. What about international expansion?', 5),
    ];

    const milestones = [
      this.generateMilestone(project1.id, 'Market Research', owner, 'completed', 100, { daysAgo: 3, duration: 7 }),
      this.generateMilestone(project1.id, 'User Personas & Journey Maps', team[1], 'in_progress', 60, { daysAgo: 2, duration: 10 }),
      this.generateMilestone(project1.id, 'Technical Architecture', team[4], 'in_progress', 40, { daysAgo: 1, duration: 14 }),
      this.generateMilestone(project1.id, 'UI/UX Design', team[5], 'not_started', 0, { daysAgo: -5, duration: 21 }),
      this.generateMilestone(project1.id, 'Development Sprint 1', team[6], 'not_started', 0, { daysAgo: -15, duration: 14 }),
    ];

    return {
      name: 'Product Team',
      description: 'Mobile App Launch - 12 members, just starting',
      teamSize,
      daysAgo,
      status: 'active',
      projects: [project1, project2],
      approvals,
      comments,
      milestones
    };
  }

  /**
   * Helper: Generate realistic team members
   */
  private generateTeam(size: number, department: string): DemoUser[] {
    const roles = {
      business: ['Business Director', 'Strategy Lead', 'Business Analyst', 'Designer', 'Copywriter', 'Analytics Lead', 'Brand Manager', 'Customer Success Manager'],
      engineering: ['Tech Lead', 'Senior Engineer', 'Backend Engineer', 'Frontend Engineer', 'DevOps Engineer', 'QA Engineer', 'Security Engineer', 'Data Engineer', 'Mobile Engineer', 'Site Reliability Engineer'],
      product: ['Product Manager', 'Product Designer', 'UX Researcher', 'Product Analyst', 'Engineering Manager', 'iOS Developer', 'Android Developer', 'Backend Engineer', 'QA Lead', 'Product Marketing']
    };

    const departmentRoles = roles[department as keyof typeof roles] || roles.product;

    return Array.from({ length: size }, (_, i) => ({
      id: `demo-user-${generateUniqueId('USR')}`,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: departmentRoles[i % departmentRoles.length],
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({ min: 1, max: 70 })}`
    }));
  }

  /**
   * Helper: Generate a demo project
   */
  private generateProject(config: {
    title: string;
    type: 'brd' | 'prd' | 'engineering_design';
    status: 'draft' | 'in_review' | 'approved' | 'in_progress';
    health_score: number;
    owner: DemoUser;
    team: DemoUser[];
    daysAgo: number;
    description: string;
    goals: string[];
  }): DemoProject {
    const created = faker.date.recent({ days: config.daysAgo });
    const updated = faker.date.recent({ days: Math.floor(config.daysAgo / 2) });

    return {
      id: `demo-project-${generateUniqueId('PRJ')}`,
      title: config.title,
      type: config.type,
      status: config.status,
      health_score: config.health_score,
      owner: config.owner,
      team: config.team,
      created_at: created,
      updated_at: updated,
      description: config.description,
      goals: config.goals,
      milestones: [] // Will be populated separately
    };
  }

  /**
   * Helper: Generate an approval
   */
  private generateApproval(
    projectId: string,
    approver: DemoUser,
    status: 'pending' | 'approved' | 'rejected' | 'conditional',
    options: {
      daysAgo?: number;
      feedback?: string;
      conditions?: string[];
      slaHours?: number;
      hoursElapsed?: number;
    } = {}
  ): DemoApproval {
    const slaHours = options.slaHours || 72;
    const hoursElapsed = options.hoursElapsed || 0;

    return {
      id: `demo-approval-${generateUniqueId('APR')}`,
      project_id: projectId,
      approver,
      status,
      feedback: options.feedback,
      conditions: options.conditions,
      approved_at: options.daysAgo ? faker.date.recent({ days: options.daysAgo }) : undefined,
      sla_hours: slaHours,
      hours_elapsed: hoursElapsed
    };
  }

  /**
   * Helper: Generate a comment
   */
  private generateComment(
    projectId: string,
    user: DemoUser,
    content: string,
    replies: number
  ): DemoComment {
    return {
      id: `demo-comment-${generateUniqueId('CMT')}`,
      project_id: projectId,
      user,
      content,
      created_at: faker.date.recent({ days: 10 }),
      replies
    };
  }

  /**
   * Helper: Generate a milestone
   */
  private generateMilestone(
    projectId: string,
    title: string,
    owner: DemoUser,
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked',
    progress: number,
    options: {
      daysAgo: number;
      duration: number;
      blockers?: string[];
    }
  ): DemoMilestone {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - options.daysAgo);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + options.duration);

    return {
      id: `demo-milestone-${generateUniqueId('MLS')}`,
      project_id: projectId,
      title,
      owner,
      status,
      progress,
      start_date: startDate,
      end_date: endDate,
      blockers: options.blockers
    };
  }

  /**
   * Get scenario by name
   */
  getScenario(scenarioName: 'business' | 'engineering' | 'product'): DemoScenario {
    switch (scenarioName) {
      case 'business':
        return this.generateBusinessScenario();
      case 'engineering':
        return this.generateEngineeringScenario();
      case 'product':
        return this.generateProductScenario();
      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }
}

// Singleton instance
const demoDataGeneratorService = new DemoDataGeneratorService();
export default demoDataGeneratorService;
