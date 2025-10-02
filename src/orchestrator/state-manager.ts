/**
 * State Manager
 * Handles persistence and retrieval of orchestrator state
 */

import fs from 'fs/promises';
import path from 'path';
import {
  OrchestratorState,
  PhaseNumber,
  PhaseStatus,
  AgentType,
  AgentMetrics,
  ErrorLog,
  Lesson,
  ProgressSnapshot,
  AgentTask,
  Milestone,
  AgentStatus,
  MilestoneStatus
} from '../models/orchestrator.model';
import logger from '../utils/logger';

export class StateManager {
  private readonly conductorDir: string;
  private readonly stateFile: string;
  private readonly progressFile: string;
  private readonly errorsFile: string;
  private readonly lessonsFile: string;
  private readonly dashboardFile: string;

  private state: OrchestratorState | null = null;
  private lessons: Lesson[] = [];
  private progressHistory: ProgressSnapshot[] = [];

  constructor(baseDir: string = process.cwd()) {
    this.conductorDir = path.join(baseDir, '.conductor');
    this.stateFile = path.join(this.conductorDir, 'state.json');
    this.progressFile = path.join(this.conductorDir, 'progress.md');
    this.errorsFile = path.join(this.conductorDir, 'errors.log');
    this.lessonsFile = path.join(this.conductorDir, 'lessons.json');
    this.dashboardFile = path.join(this.conductorDir, 'dashboard.md');
  }

  /**
   * Initialize the state manager and load existing state
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureDirectoryExists();
      await this.loadState();
      await this.loadLessons();
      logger.info('State manager initialized');
    } catch (error) {
      logger.error('Failed to initialize state manager', error);
      throw error;
    }
  }

  /**
   * Ensure .conductor directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.conductorDir);
    } catch {
      await fs.mkdir(this.conductorDir, { recursive: true });
      logger.info('Created .conductor directory');
    }
  }

  /**
   * Load state from disk or create initial state
   */
  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      this.state = JSON.parse(data, this.reviver);
      logger.info('State loaded from disk');
    } catch {
      this.state = this.createInitialState();
      await this.saveState();
      logger.info('Created initial state');
    }
  }

  /**
   * Create initial orchestrator state
   */
  private createInitialState(): OrchestratorState {
    const now = new Date();

    return {
      currentPhase: PhaseNumber.PHASE_0,
      completedPhases: [],
      activeAgents: [],
      phaseStatuses: {
        [PhaseNumber.PHASE_0]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_1]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_2]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_3]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_4]: PhaseStatus.NOT_STARTED,
        [PhaseNumber.PHASE_5]: PhaseStatus.NOT_STARTED
      },
      milestones: {},
      tasks: [],
      metrics: this.createInitialMetrics(),
      startedAt: now,
      lastUpdated: now,
      autoAdvanceEnabled: true,
      errors: []
    };
  }

  /**
   * Create initial metrics for all agents
   */
  private createInitialMetrics(): Record<AgentType, AgentMetrics> {
    const agents = Object.values(AgentType);
    const metrics: Partial<Record<AgentType, AgentMetrics>> = {};

    for (const agent of agents) {
      metrics[agent] = {
        agentType: agent,
        tasksCompleted: 0,
        tasksFailed: 0,
        averageCompletionTime: 0,
        successRate: 0
      };
    }

    return metrics as Record<AgentType, AgentMetrics>;
  }

  /**
   * Save current state to disk
   */
  async saveState(): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    try {
      this.state.lastUpdated = new Date();
      const data = JSON.stringify(this.state, this.replacer, 2);
      await fs.writeFile(this.stateFile, data, 'utf-8');
      logger.debug('State saved to disk');
    } catch (error) {
      logger.error('Failed to save state', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): OrchestratorState {
    if (!this.state) {
      throw new Error('State not initialized');
    }
    return this.state;
  }

  /**
   * Update current phase
   */
  async setCurrentPhase(phase: PhaseNumber): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    this.state.currentPhase = phase;
    this.state.phaseStatuses[phase] = PhaseStatus.IN_PROGRESS;
    await this.saveState();

    logger.info(`Phase updated to ${phase}`);
  }

  /**
   * Mark phase as completed
   */
  async completePhase(phase: PhaseNumber): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    if (!this.state.completedPhases.includes(phase)) {
      this.state.completedPhases.push(phase);
    }
    this.state.phaseStatuses[phase] = PhaseStatus.COMPLETED;
    await this.saveState();

    logger.info(`Phase ${phase} marked as completed`);
  }

  /**
   * Update milestone status
   */
  async updateMilestone(milestone: Milestone): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    this.state.milestones[milestone.id] = milestone;
    await this.saveState();
  }

  /**
   * Add agent task
   */
  async addTask(task: AgentTask): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    this.state.tasks.push(task);

    if (!this.state.activeAgents.includes(task.agentType)) {
      this.state.activeAgents.push(task.agentType);
    }

    await this.saveState();
  }

  /**
   * Update agent task
   */
  async updateTask(taskId: string, updates: Partial<AgentTask>): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    const taskIndex = this.state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    this.state.tasks[taskIndex] = {
      ...this.state.tasks[taskIndex],
      ...updates
    };

    // Update metrics when task completes
    if (updates.status === AgentStatus.COMPLETED || updates.status === AgentStatus.FAILED) {
      await this.updateAgentMetrics(this.state.tasks[taskIndex]);
    }

    await this.saveState();
  }

  /**
   * Update agent metrics based on completed task
   */
  private async updateAgentMetrics(task: AgentTask): Promise<void> {
    if (!this.state) return;

    const metrics = this.state.metrics[task.agentType];
    if (!metrics) return;

    if (task.status === AgentStatus.COMPLETED) {
      metrics.tasksCompleted++;

      if (task.startedAt && task.completedAt) {
        const duration = task.completedAt.getTime() - task.startedAt.getTime();
        metrics.averageCompletionTime =
          (metrics.averageCompletionTime * (metrics.tasksCompleted - 1) + duration) /
          metrics.tasksCompleted;
      }
    } else if (task.status === AgentStatus.FAILED) {
      metrics.tasksFailed++;
    }

    metrics.successRate =
      metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed);
    metrics.lastActiveAt = new Date();
  }

  /**
   * Log error
   */
  async logError(error: ErrorLog): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized');
    }

    this.state.errors.push(error);

    // Keep only last 100 errors in state
    if (this.state.errors.length > 100) {
      this.state.errors = this.state.errors.slice(-100);
    }

    // Append to errors log file
    const logLine = `[${error.timestamp.toISOString()}] [${error.severity}] Phase ${error.phase}${error.agent ? ` - ${error.agent}` : ''}: ${error.error}\n${error.stack || ''}\n\n`;
    await fs.appendFile(this.errorsFile, logLine, 'utf-8');

    await this.saveState();
  }

  /**
   * Load lessons from disk
   */
  private async loadLessons(): Promise<void> {
    try {
      const data = await fs.readFile(this.lessonsFile, 'utf-8');
      this.lessons = JSON.parse(data, this.reviver);
    } catch {
      this.lessons = [];
    }
  }

  /**
   * Add lesson learned
   */
  async addLesson(lesson: Lesson): Promise<void> {
    this.lessons.push(lesson);
    await this.saveLessons();
    logger.info(`Lesson recorded: ${lesson.description}`);
  }

  /**
   * Save lessons to disk
   */
  private async saveLessons(): Promise<void> {
    const data = JSON.stringify(this.lessons, this.replacer, 2);
    await fs.writeFile(this.lessonsFile, data, 'utf-8');
  }

  /**
   * Get lessons filtered by criteria
   */
  getLessons(filter?: {
    phase?: PhaseNumber;
    agent?: AgentType;
    category?: Lesson['category'];
  }): Lesson[] {
    let filtered = [...this.lessons];

    if (filter?.phase !== undefined) {
      filtered = filtered.filter(l => l.phase === filter.phase);
    }
    if (filter?.agent) {
      filtered = filtered.filter(l => l.agent === filter.agent);
    }
    if (filter?.category) {
      filtered = filtered.filter(l => l.category === filter.category);
    }

    return filtered;
  }

  /**
   * Record progress snapshot
   */
  async recordProgress(snapshot: ProgressSnapshot): Promise<void> {
    this.progressHistory.push(snapshot);

    // Keep only last 1000 snapshots in memory
    if (this.progressHistory.length > 1000) {
      this.progressHistory = this.progressHistory.slice(-1000);
    }

    await this.updateProgressFile(snapshot);
  }

  /**
   * Update progress.md file
   */
  private async updateProgressFile(snapshot: ProgressSnapshot): Promise<void> {
    const entry = `
## ${snapshot.timestamp.toISOString()}
- **Phase**: ${snapshot.phase}
- **Phase Progress**: ${(snapshot.phaseProgress * 100).toFixed(1)}%
- **Overall Progress**: ${(snapshot.overallProgress * 100).toFixed(1)}%
- **Active Tasks**: ${snapshot.activeTasks}
- **Completed Tasks**: ${snapshot.completedTasks}
- **Failed Tasks**: ${snapshot.failedTasks}
${snapshot.estimatedCompletion ? `- **Estimated Completion**: ${snapshot.estimatedCompletion.toISOString()}` : ''}
`;

    await fs.appendFile(this.progressFile, entry, 'utf-8');
  }

  /**
   * Get progress history
   */
  getProgressHistory(limit?: number): ProgressSnapshot[] {
    if (limit) {
      return this.progressHistory.slice(-limit);
    }
    return [...this.progressHistory];
  }

  /**
   * Clean up old data
   */
  async cleanup(options: {
    keepErrorDays?: number;
    keepProgressDays?: number;
  } = {}): Promise<void> {
    const { keepErrorDays = 30, keepProgressDays = 7 } = options;

    if (!this.state) return;

    // Clean old errors from state
    const errorCutoff = new Date();
    errorCutoff.setDate(errorCutoff.getDate() - keepErrorDays);
    this.state.errors = this.state.errors.filter(e => e.timestamp > errorCutoff);

    // Clean old progress snapshots
    const progressCutoff = new Date();
    progressCutoff.setDate(progressCutoff.getDate() - keepProgressDays);
    this.progressHistory = this.progressHistory.filter(p => p.timestamp > progressCutoff);

    await this.saveState();
    logger.info('Cleanup completed');
  }

  /**
   * JSON replacer for Date serialization
   */
  private replacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * JSON reviver for Date deserialization
   */
  private reviver(key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null && '__type' in value) {
      const obj = value as { __type: string; value: string };
      if (obj.__type === 'Date') {
        return new Date(obj.value);
      }
    }
    return value;
  }

  /**
   * Create backup of current state
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.conductorDir, `state-backup-${timestamp}.json`);

    if (this.state) {
      const data = JSON.stringify(this.state, this.replacer, 2);
      await fs.writeFile(backupFile, data, 'utf-8');
      logger.info(`State backup created: ${backupFile}`);
    }

    return backupFile;
  }

  /**
   * Restore state from backup
   */
  async restoreBackup(backupFile: string): Promise<void> {
    const data = await fs.readFile(backupFile, 'utf-8');
    this.state = JSON.parse(data, this.reviver);
    await this.saveState();
    logger.info('State restored from backup');
  }
}
