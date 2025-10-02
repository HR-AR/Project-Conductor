/**
 * Phase Manager
 * Manages phase transitions and milestone tracking
 */

import {
  PhaseNumber,
  PhaseStatus,
  PhaseDefinition,
  Milestone,
  MilestoneStatus,
  AgentType,
  AgentTask,
  AgentStatus,
  PhaseTransition,
  Lesson
} from '../models/orchestrator.model';
import { StateManager } from './state-manager';
import { MilestoneValidator } from './milestones/milestone-validator';
import { PHASE_DEFINITIONS } from './phases/phase-definitions';
import logger from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PhaseManager {
  private stateManager: StateManager;
  private milestoneValidator: MilestoneValidator;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.milestoneValidator = new MilestoneValidator();
  }

  /**
   * Get current phase definition
   */
  getCurrentPhase(): PhaseDefinition {
    const state = this.stateManager.getState();
    return PHASE_DEFINITIONS[state.currentPhase];
  }

  /**
   * Get phase definition by number
   */
  getPhase(phase: PhaseNumber): PhaseDefinition {
    return PHASE_DEFINITIONS[phase];
  }

  /**
   * Get all phase definitions
   */
  getAllPhases(): PhaseDefinition[] {
    return Object.values(PHASE_DEFINITIONS);
  }

  /**
   * Check if current phase is complete
   */
  async isCurrentPhaseComplete(): Promise<boolean> {
    const currentPhase = this.getCurrentPhase();
    const state = this.stateManager.getState();

    // Check if all milestones are completed
    for (const milestone of currentPhase.milestones) {
      const stateMilestone = state.milestones[milestone.id];
      if (!stateMilestone || stateMilestone.status !== MilestoneStatus.COMPLETED) {
        logger.debug(`Milestone ${milestone.id} not completed`);
        return false;
      }
    }

    // Run exit criteria validation
    const exitCriteriaValid = await this.validateExitCriteria(currentPhase);
    if (!exitCriteriaValid) {
      logger.debug('Exit criteria not met');
      return false;
    }

    logger.info(`Phase ${currentPhase.phase} is complete`);
    return true;
  }

  /**
   * Validate phase exit criteria
   */
  private async validateExitCriteria(phase: PhaseDefinition): Promise<boolean> {
    // Run the phase test command
    try {
      logger.info(`Running phase ${phase.phase} tests: ${phase.testCommand}`);
      await execAsync(phase.testCommand);
      logger.info(`Phase ${phase.phase} tests passed`);
      return true;
    } catch (error) {
      logger.warn(`Phase ${phase.phase} tests failed`, error);
      return false;
    }
  }

  /**
   * Advance to next phase
   */
  async advancePhase(): Promise<boolean> {
    const state = this.stateManager.getState();
    const currentPhase = state.currentPhase;

    // Check if current phase is complete
    const isComplete = await this.isCurrentPhaseComplete();
    if (!isComplete) {
      logger.warn('Cannot advance: current phase not complete');
      return false;
    }

    // Check if there's a next phase
    const nextPhase = currentPhase + 1;
    if (nextPhase > PhaseNumber.PHASE_5) {
      logger.info('All phases completed!');
      return false;
    }

    // Check if dependencies are met
    const nextPhaseDef = PHASE_DEFINITIONS[nextPhase];
    const dependenciesMet = this.areDependenciesMet(nextPhaseDef);
    if (!dependenciesMet) {
      logger.warn('Cannot advance: dependencies not met');
      return false;
    }

    // Record transition
    const transition: PhaseTransition = {
      from: currentPhase,
      to: nextPhase,
      timestamp: new Date(),
      automatic: state.autoAdvanceEnabled,
      reason: 'Phase completed successfully',
      testsRun: true,
      testsPassed: true
    };

    // Complete current phase
    await this.stateManager.completePhase(currentPhase);

    // Advance to next phase
    await this.stateManager.setCurrentPhase(nextPhase);

    // Initialize milestones for next phase
    await this.initializePhase(nextPhase);

    logger.info(`Advanced from Phase ${currentPhase} to Phase ${nextPhase}`);

    // Record lesson
    await this.stateManager.addLesson({
      id: `phase-${currentPhase}-completion`,
      timestamp: new Date(),
      phase: currentPhase,
      category: 'success',
      description: `Successfully completed Phase ${currentPhase}: ${PHASE_DEFINITIONS[currentPhase].name}`,
      impact: 'Phase progression'
    });

    return true;
  }

  /**
   * Rollback to previous phase
   */
  async rollbackPhase(): Promise<boolean> {
    const state = this.stateManager.getState();
    const currentPhase = state.currentPhase;

    if (currentPhase === PhaseNumber.PHASE_0) {
      logger.warn('Cannot rollback: already at Phase 0');
      return false;
    }

    const previousPhase = currentPhase - 1;

    // Create backup before rollback
    await this.stateManager.createBackup();

    // Set to previous phase
    await this.stateManager.setCurrentPhase(previousPhase);

    // Remove current phase from completed phases
    const completedPhases = state.completedPhases.filter(p => p !== currentPhase);
    state.completedPhases = completedPhases;
    await this.stateManager.saveState();

    logger.warn(`Rolled back from Phase ${currentPhase} to Phase ${previousPhase}`);

    // Record lesson
    await this.stateManager.addLesson({
      id: `phase-${currentPhase}-rollback`,
      timestamp: new Date(),
      phase: currentPhase,
      category: 'failure',
      description: `Rolled back from Phase ${currentPhase} to Phase ${previousPhase}`,
      impact: 'Phase regression'
    });

    return true;
  }

  /**
   * Initialize a phase
   */
  async initializePhase(phase: PhaseNumber): Promise<void> {
    const phaseDef = PHASE_DEFINITIONS[phase];

    logger.info(`Initializing Phase ${phase}: ${phaseDef.name}`);

    // Initialize milestones
    for (const milestone of phaseDef.milestones) {
      await this.stateManager.updateMilestone({
        ...milestone,
        status: MilestoneStatus.PENDING
      });
    }

    // Create initial tasks for the phase
    await this.createPhaseTasks(phaseDef);
  }

  /**
   * Create tasks for a phase
   */
  private async createPhaseTasks(phase: PhaseDefinition): Promise<void> {
    for (const milestone of phase.milestones) {
      for (const agentType of milestone.requiredAgents) {
        const task: AgentTask = {
          id: `${phase.phase}-${milestone.id}-${agentType}`,
          agentType,
          phase: phase.phase,
          milestone: milestone.id,
          description: `${milestone.description} [${agentType}]`,
          priority: this.calculateTaskPriority(phase.phase, agentType),
          createdAt: new Date(),
          status: AgentStatus.WAITING
        };

        await this.stateManager.addTask(task);
      }
    }
  }

  /**
   * Calculate task priority
   */
  private calculateTaskPriority(phase: PhaseNumber, agentType: AgentType): number {
    // Higher priority for earlier phases
    const phasePriority = (6 - phase) * 100;

    // Agent-specific priority
    const agentPriorities: Record<AgentType, number> = {
      [AgentType.MODELS]: 10,
      [AgentType.API]: 8,
      [AgentType.TEST]: 5,
      [AgentType.REALTIME]: 7,
      [AgentType.QUALITY]: 6,
      [AgentType.INTEGRATION]: 4
    };

    return phasePriority + agentPriorities[agentType];
  }

  /**
   * Check if phase dependencies are met
   */
  private areDependenciesMet(phase: PhaseDefinition): boolean {
    const state = this.stateManager.getState();

    for (const dependency of phase.dependencies) {
      if (!state.completedPhases.includes(dependency)) {
        logger.debug(`Dependency Phase ${dependency} not completed`);
        return false;
      }
    }

    return true;
  }

  /**
   * Update milestone status
   */
  async updateMilestoneStatus(
    milestoneId: string,
    status: MilestoneStatus
  ): Promise<void> {
    const state = this.stateManager.getState();
    const milestone = state.milestones[milestoneId];

    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    const updatedMilestone: Milestone = {
      ...milestone,
      status
    };

    if (status === MilestoneStatus.IN_PROGRESS && !milestone.startedAt) {
      updatedMilestone.startedAt = new Date();
    }

    if (status === MilestoneStatus.COMPLETED) {
      updatedMilestone.completedAt = new Date();
    }

    await this.stateManager.updateMilestone(updatedMilestone);

    logger.info(`Milestone ${milestoneId} status updated to ${status}`);

    // Check if this completes the phase and auto-advance is enabled
    if (state.autoAdvanceEnabled) {
      const isPhaseComplete = await this.isCurrentPhaseComplete();
      if (isPhaseComplete) {
        logger.info('Phase complete - auto-advancing');
        await this.advancePhase();
      }
    }
  }

  /**
   * Validate a milestone
   */
  async validateMilestone(milestoneId: string): Promise<boolean> {
    const state = this.stateManager.getState();
    const milestone = state.milestones[milestoneId];

    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    const isValid = await this.milestoneValidator.validateMilestone(
      milestone,
      state.currentPhase
    );

    if (isValid && milestone.status !== MilestoneStatus.COMPLETED) {
      await this.updateMilestoneStatus(milestoneId, MilestoneStatus.COMPLETED);
    }

    return isValid;
  }

  /**
   * Get phase progress (0.0 to 1.0)
   */
  getPhaseProgress(phase: PhaseNumber): number {
    const state = this.stateManager.getState();
    const phaseDef = PHASE_DEFINITIONS[phase];

    if (!phaseDef) return 0;

    const totalMilestones = phaseDef.milestones.length;
    if (totalMilestones === 0) return 1.0;

    let completedMilestones = 0;
    let progressSum = 0;

    for (const milestone of phaseDef.milestones) {
      const stateMilestone = state.milestones[milestone.id];

      if (stateMilestone?.status === MilestoneStatus.COMPLETED) {
        completedMilestones++;
        progressSum += 1.0;
      } else if (stateMilestone?.status === MilestoneStatus.IN_PROGRESS) {
        progressSum += this.milestoneValidator.getValidationProgress(stateMilestone);
      }
    }

    return progressSum / totalMilestones;
  }

  /**
   * Get overall progress across all phases (0.0 to 1.0)
   */
  getOverallProgress(): number {
    const totalPhases = 6; // Phases 0-5
    let totalProgress = 0;

    for (let i = 0; i <= PhaseNumber.PHASE_5; i++) {
      totalProgress += this.getPhaseProgress(i);
    }

    return totalProgress / totalPhases;
  }

  /**
   * Get estimated completion time
   */
  getEstimatedCompletion(): Date | null {
    const state = this.stateManager.getState();
    const overallProgress = this.getOverallProgress();

    if (overallProgress === 0) return null;

    const elapsed = new Date().getTime() - state.startedAt.getTime();
    const totalEstimated = elapsed / overallProgress;
    const remaining = totalEstimated - elapsed;

    return new Date(Date.now() + remaining);
  }
}
