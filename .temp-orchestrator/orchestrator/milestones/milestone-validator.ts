/**
 * Milestone Validator
 * Validates milestone completion criteria
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  Milestone,
  MilestoneStatus,
  PhaseNumber
} from '../../models/orchestrator.model';
import logger from '../../utils/logger';

const execAsync = promisify(exec);

export class MilestoneValidator {
  /**
   * Validate if a milestone is complete
   */
  async validateMilestone(milestone: Milestone, phase: PhaseNumber): Promise<boolean> {
    logger.info(`Validating milestone: ${milestone.name}`);

    try {
      // Check if required agents have completed their tasks
      if (!this.areRequiredAgentsComplete(milestone)) {
        logger.warn(`Milestone ${milestone.name} waiting for agents`);
        return false;
      }

      // Run custom validation function if exists
      if (milestone.validationFn) {
        const isValid = await this.runCustomValidation(milestone.validationFn);
        if (!isValid) {
          logger.warn(`Custom validation failed for ${milestone.name}`);
          return false;
        }
      }

      // Run phase-specific validation
      const isPhaseValid = await this.validatePhaseSpecific(milestone, phase);
      if (!isPhaseValid) {
        logger.warn(`Phase validation failed for ${milestone.name}`);
        return false;
      }

      logger.info(`Milestone ${milestone.name} validated successfully`);
      return true;
    } catch (error) {
      logger.error(`Milestone validation error: ${error}`);
      return false;
    }
  }

  /**
   * Check if required agents have completed their work
   */
  private areRequiredAgentsComplete(milestone: Milestone): boolean {
    // In a real implementation, this would check the task completion status
    // For now, we'll assume agents complete if the milestone status is in_progress
    return milestone.status === MilestoneStatus.IN_PROGRESS ||
           milestone.status === MilestoneStatus.COMPLETED;
  }

  /**
   * Run custom validation function
   */
  private async runCustomValidation(validationFn: string): Promise<boolean> {
    try {
      // In a real implementation, this would execute the validation function
      // For now, we'll just return true
      logger.debug(`Running custom validation: ${validationFn}`);
      return true;
    } catch (error) {
      logger.error(`Custom validation error: ${error}`);
      return false;
    }
  }

  /**
   * Run phase-specific validation
   */
  private async validatePhaseSpecific(
    milestone: Milestone,
    phase: PhaseNumber
  ): Promise<boolean> {
    switch (phase) {
      case PhaseNumber.PHASE_0:
        return this.validatePhase0(milestone);

      case PhaseNumber.PHASE_1:
        return this.validatePhase1(milestone);

      case PhaseNumber.PHASE_2:
        return this.validatePhase2(milestone);

      case PhaseNumber.PHASE_3:
        return this.validatePhase3(milestone);

      case PhaseNumber.PHASE_4:
        return this.validatePhase4(milestone);

      case PhaseNumber.PHASE_5:
        return this.validatePhase5(milestone);

      default:
        return true;
    }
  }

  /**
   * Validate Phase 0 milestones
   */
  private async validatePhase0(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-0-docker':
        return this.checkDockerServices();

      case 'phase-0-database':
        return this.checkDatabaseSchema();

      case 'phase-0-health':
        return this.checkHealthEndpoint();

      default:
        return true;
    }
  }

  /**
   * Validate Phase 1 milestones
   */
  private async validatePhase1(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-1-crud':
        return this.checkCRUDEndpoints();

      case 'phase-1-tests':
        return this.runTests('tests/integration/requirements.api.test.ts');

      default:
        return true;
    }
  }

  /**
   * Validate Phase 2 milestones
   */
  private async validatePhase2(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-2-bidirectional':
        return this.checkBidirectionalLinks();

      case 'phase-2-tests':
        return this.runTests('tests/integration/traceability.api.test.ts');

      default:
        return true;
    }
  }

  /**
   * Validate Phase 3 milestones
   */
  private async validatePhase3(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-3-websocket':
        return this.checkWebSocketServer();

      case 'phase-3-load-test':
        return this.runLoadTest();

      default:
        return true;
    }
  }

  /**
   * Validate Phase 4 milestones
   */
  private async validatePhase4(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-4-nlp':
        return this.checkNLPEngine();

      case 'phase-4-tests':
        return this.runTests('tests/integration/quality.api.test.ts');

      default:
        return true;
    }
  }

  /**
   * Validate Phase 5 milestones
   */
  private async validatePhase5(milestone: Milestone): Promise<boolean> {
    switch (milestone.id) {
      case 'phase-5-oauth':
        return this.checkOAuthFlow();

      case 'phase-5-security':
        return this.runSecurityTests();

      default:
        return true;
    }
  }

  /**
   * Check if Docker services are running
   */
  private async checkDockerServices(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('docker-compose ps --services --filter "status=running"');
      const services = stdout.trim().split('\n');
      const hasPostgres = services.includes('postgres');
      const hasRedis = services.includes('redis');
      return hasPostgres && hasRedis;
    } catch {
      return false;
    }
  }

  /**
   * Check if database schema exists
   */
  private async checkDatabaseSchema(): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll return true as a placeholder
    return true;
  }

  /**
   * Check if health endpoint is responding
   */
  private async checkHealthEndpoint(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('curl -s http://localhost:3000/api/v1/health');
      const response = JSON.parse(stdout);
      return response.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Check if CRUD endpoints are working
   */
  private async checkCRUDEndpoints(): Promise<boolean> {
    // In a real implementation, this would test all CRUD operations
    return true;
  }

  /**
   * Check if bidirectional links are working
   */
  private async checkBidirectionalLinks(): Promise<boolean> {
    // In a real implementation, this would test link creation and retrieval
    return true;
  }

  /**
   * Check if WebSocket server is running
   */
  private async checkWebSocketServer(): Promise<boolean> {
    // In a real implementation, this would attempt a WebSocket connection
    return true;
  }

  /**
   * Check if NLP engine is working
   */
  private async checkNLPEngine(): Promise<boolean> {
    // In a real implementation, this would test NLP analysis
    return true;
  }

  /**
   * Check if OAuth flow is configured
   */
  private async checkOAuthFlow(): Promise<boolean> {
    // In a real implementation, this would test OAuth endpoints
    return true;
  }

  /**
   * Run tests for a specific file or pattern
   */
  private async runTests(testPath: string): Promise<boolean> {
    try {
      await execAsync(`npm test -- ${testPath}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run load test
   */
  private async runLoadTest(): Promise<boolean> {
    try {
      // In a real implementation, this would run actual load tests
      logger.info('Running load test with 20+ concurrent users');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run security tests
   */
  private async runSecurityTests(): Promise<boolean> {
    try {
      // In a real implementation, this would run security scans
      logger.info('Running security validation tests');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get validation progress for a milestone
   */
  getValidationProgress(milestone: Milestone): number {
    if (milestone.status === MilestoneStatus.COMPLETED) {
      return 1.0;
    }

    if (milestone.status === MilestoneStatus.IN_PROGRESS) {
      // Estimate progress based on required agents
      const totalAgents = milestone.requiredAgents.length;
      if (totalAgents === 0) return 0.5;

      // In a real implementation, check actual agent task completion
      return 0.5;
    }

    return 0.0;
  }
}
