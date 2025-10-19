import { Request, Response } from 'express';
import logger from '../utils/logger';

interface OnboardingData {
    projectType: string;
    projectTitle: string;
    projectDescription: string;
    projectOwner: string;
    startDate: string;
    endDate: string;
    teamMembers: string[];
    goals: string[];
    milestones: Array<{
        title: string;
        owner: string;
        endDate: string;
    }>;
}

export class OnboardingController {
    /**
     * Create a new project from onboarding wizard
     */
    async createProject(req: Request, res: Response): Promise<void> {
        try {
            const data: OnboardingData = req.body;

            logger.info(`Creating project from onboarding wizard: ${data.projectType} - ${data.projectTitle}`);

            // Generate unique ID
            const projectId = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Create project object
            const project = {
                id: projectId,
                type: data.projectType,
                title: data.projectTitle,
                description: data.projectDescription,
                owner_id: data.projectOwner,
                start_date: data.startDate,
                end_date: data.endDate,
                status: 'active',
                health_score: 100,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                team_members: data.teamMembers,
                goals: data.goals,
                milestones: data.milestones.map((m, index) => ({
                    id: `MLS-${Date.now()}-${index}`,
                    project_id: projectId,
                    title: m.title,
                    owner: m.owner,
                    status: 'not_started',
                    progress: 0,
                    start_date: data.startDate,
                    end_date: m.endDate,
                    created_at: new Date().toISOString()
                }))
            };

            // In production, save to database
            // For now, we'll just return success
            logger.info(`Project created successfully: ${projectId}`);

            res.status(201).json({
                success: true,
                data: project,
                message: 'Project created successfully'
            });
        } catch (error) {
            logger.error(`Failed to create project from onboarding: ${error}`);
            res.status(500).json({
                success: false,
                message: 'Failed to create project',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get project templates for quick start
     */
    async getTemplates(req: Request, res: Response): Promise<void> {
        try {
            const templates = [
                {
                    id: 'mobile-app',
                    name: 'Mobile App Development',
                    type: 'prd',
                    description: 'Complete mobile app project template',
                    goals: [
                        'Launch iOS and Android apps',
                        'Achieve 10,000 downloads in first month',
                        'Maintain 4.5+ star rating'
                    ],
                    milestones: [
                        { title: 'Design & Prototyping', duration: 2 },
                        { title: 'MVP Development', duration: 6 },
                        { title: 'Beta Testing', duration: 2 },
                        { title: 'Launch', duration: 1 }
                    ]
                },
                {
                    id: 'website-redesign',
                    name: 'Website Redesign',
                    type: 'brd',
                    description: 'Comprehensive website overhaul project',
                    goals: [
                        'Increase conversion rate by 25%',
                        'Reduce bounce rate to <40%',
                        'Improve mobile responsiveness'
                    ],
                    milestones: [
                        { title: 'UX Research', duration: 2 },
                        { title: 'Design System', duration: 3 },
                        { title: 'Development', duration: 6 },
                        { title: 'QA & Launch', duration: 2 }
                    ]
                },
                {
                    id: 'api-migration',
                    name: 'API Migration',
                    type: 'design',
                    description: 'Technical infrastructure upgrade',
                    goals: [
                        'Migrate to microservices architecture',
                        'Reduce API response time by 50%',
                        'Achieve 99.9% uptime'
                    ],
                    milestones: [
                        { title: 'Architecture Design', duration: 2 },
                        { title: 'Service Implementation', duration: 8 },
                        { title: 'Migration & Testing', duration: 4 },
                        { title: 'Deployment', duration: 1 }
                    ]
                }
            ];

            res.json({
                success: true,
                data: templates,
                message: 'Project templates retrieved successfully'
            });
        } catch (error) {
            logger.error(`Failed to get templates: ${error}`);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve templates',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}

export default new OnboardingController();
