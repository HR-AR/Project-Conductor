/**
 * Orchestrator Routes
 * API endpoints for orchestrator control and monitoring
 */

import { Router, Request, Response } from 'express';
import { OrchestratorEngine } from '../orchestrator/orchestrator-engine';
import { DashboardGenerator } from '../orchestrator/dashboard-generator';
import { AgentType } from '../models/orchestrator.model';
import logger from '../utils/logger';

const router = Router();

// Global orchestrator instance (will be initialized in index.ts)
let orchestrator: OrchestratorEngine | null = null;
let dashboardGenerator: DashboardGenerator | null = null;

/**
 * Initialize orchestrator
 */
export function initializeOrchestrator(): OrchestratorEngine {
  if (!orchestrator) {
    orchestrator = new OrchestratorEngine();
    dashboardGenerator = new DashboardGenerator();

    // Listen to orchestrator events
    orchestrator.on('dashboard-update', async () => {
      if (dashboardGenerator) {
        const data = await orchestrator!.getDashboardData();
        await dashboardGenerator.generate(data);
      }
    });

    orchestrator.on('error', (error) => {
      logger.error('Orchestrator error event', error);
    });

    logger.info('Orchestrator initialized');
  }

  return orchestrator;
}

/**
 * Get orchestrator instance
 */
export function getOrchestrator(): OrchestratorEngine | null {
  return orchestrator;
}

/**
 * GET /api/v1/orchestrator/status
 * Get current orchestrator status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const result = await orchestrator.getStatus();
    res.json(result);
  } catch (error) {
    logger.error('Failed to get orchestrator status', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/start
 * Start the orchestrator
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      orchestrator = initializeOrchestrator();
    }

    await orchestrator.start();

    res.json({
      success: true,
      message: 'Orchestrator started'
    });
  } catch (error) {
    logger.error('Failed to start orchestrator', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start orchestrator',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/stop
 * Stop the orchestrator
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(400).json({
        success: false,
        message: 'Orchestrator not running'
      });
    }

    await orchestrator.stop();

    res.json({
      success: true,
      message: 'Orchestrator stopped'
    });
  } catch (error) {
    logger.error('Failed to stop orchestrator', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop orchestrator',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/advance
 * Advance to next phase
 */
router.post('/advance', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const result = await orchestrator.advance();
    res.json(result);
  } catch (error) {
    logger.error('Failed to advance phase', error);
    res.status(500).json({
      success: false,
      message: 'Failed to advance phase',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/rollback
 * Rollback to previous phase
 */
router.post('/rollback', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const result = await orchestrator.rollback();
    res.json(result);
  } catch (error) {
    logger.error('Failed to rollback phase', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rollback phase',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/test
 * Run tests for current phase
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const result = await orchestrator.runTests();
    res.json(result);
  } catch (error) {
    logger.error('Failed to run tests', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run tests',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/orchestrator/deploy/:agentType
 * Deploy specific agent
 */
router.post('/deploy/:agentType', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const { agentType } = req.params;

    if (!Object.values(AgentType).includes(agentType as AgentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid agent type: ${agentType}`
      });
    }

    const result = await orchestrator.deployAgent(agentType as AgentType);
    res.json(result);
  } catch (error) {
    logger.error('Failed to deploy agent', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deploy agent',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/orchestrator/report
 * Generate orchestrator report
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const result = await orchestrator.generateReport();
    res.json(result);
  } catch (error) {
    logger.error('Failed to generate report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/orchestrator/dashboard
 * Get dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    if (!orchestrator) {
      return res.status(503).json({
        success: false,
        message: 'Orchestrator not initialized'
      });
    }

    const data = await orchestrator.getDashboardData();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Failed to get dashboard data', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
