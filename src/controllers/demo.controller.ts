import { Request, Response } from 'express';
import demoDataGeneratorService from '../services/demo-data-generator.service';

/**
 * Demo Controller
 * Handles demo data generation for scenario-based exploration
 */
export class DemoController {
  /**
   * POST /api/v1/demo/seed
   * Generate demo data for a specific scenario
   */
  async seedDemoData(req: Request, res: Response): Promise<void> {
    try {
      const { scenario } = req.body;

      // Validate scenario
      const validScenarios = ['business', 'engineering', 'product'];
      if (!scenario || !validScenarios.includes(scenario)) {
        res.status(400).json({
          success: false,
          message: `Invalid scenario. Must be one of: ${validScenarios.join(', ')}`
        });
        return;
      }

      // Generate scenario data
      const demoData = demoDataGeneratorService.getScenario(scenario as 'business' | 'engineering' | 'product');

      // Return demo data (client will store in sessionStorage)
      res.json({
        success: true,
        data: demoData,
        message: `Demo data generated for ${demoData.name} scenario`,
        meta: {
          scenario: scenario,
          projects: demoData.projects.length,
          team_size: demoData.teamSize,
          approvals: demoData.approvals.length,
          comments: demoData.comments.length,
          milestones: demoData.milestones.length
        }
      });
    } catch (error) {
      console.error('[DemoController] Failed to seed demo data:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate demo data'
      });
    }
  }

  /**
   * GET /api/v1/demo/scenarios
   * Get list of available demo scenarios
   */
  async getAvailableScenarios(req: Request, res: Response): Promise<void> {
    try {
      const scenarios = [
        {
          id: 'business',
          name: 'Business Team',
          description: 'Website Redesign - 8 members, 30 days in, at-risk',
          team_size: 8,
          duration_days: 30,
          status: 'at_risk',
          icon: '📊',
          highlights: [
            '3 of 5 approvals complete',
            'Content strategy milestone blocked',
            'Budget discussions ongoing'
          ]
        },
        {
          id: 'engineering',
          name: 'Engineering Team',
          description: 'API Migration - 15 members, 60 days in, blocked',
          team_size: 15,
          duration_days: 60,
          status: 'blocked',
          icon: '⚙️',
          highlights: [
            'Security audit completed',
            'Migration scripts awaiting DevOps review',
            'SLA warning on pending approval'
          ]
        },
        {
          id: 'product',
          name: 'Product Team',
          description: 'Mobile App Launch - 12 members, just starting',
          team_size: 12,
          duration_days: 5,
          status: 'active',
          icon: '📱',
          highlights: [
            'Market research complete',
            'User personas in progress',
            'All approvals pending'
          ]
        }
      ];

      res.json({
        success: true,
        data: scenarios
      });
    } catch (error) {
      console.error('[DemoController] Failed to get scenarios:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get scenarios'
      });
    }
  }
}

// Singleton instance
const demoController = new DemoController();
export default demoController;
