/**
 * Sync Queue Service
 * Manages background job queue for sync operations with retry logic
 */

import { Pool } from 'pg';
import {
  SyncJob,
  SyncJobStatus,
  CreateSyncJobRequest,
  UpdateSyncJobRequest,
  SyncHistoryEntry,
} from '../../models/sync.model';
import { EventEmitter } from 'events';
import pino from 'pino';

const logger = pino({ name: 'SyncQueueService' });

interface QueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  total: number;
}

export class SyncQueueService extends EventEmitter {
  private pool: Pool;
  private processingJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private retryDelays: number[] = [1000, 5000, 15000, 60000]; // Exponential backoff in ms
  private isProcessing: boolean = false;

  constructor(pool: Pool, maxConcurrentJobs: number = 3) {
    super();
    this.pool = pool;
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * Create a new sync job
   */
  async createJob(request: CreateSyncJobRequest, createdBy: string): Promise<SyncJob> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO sync_jobs (
        id, direction, operation_type, status, total_items,
        brd_ids, jira_keys, epic_key, project_key,
        created_by, metadata
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const totalItems = Math.max(
      request.brdIds?.length || 0,
      request.jiraKeys?.length || 0,
      1
    );

    const metadata: Record<string, any> = {
      autoResolveConflicts: request.autoResolveConflicts || false,
      conflictStrategy: request.conflictStrategy,
    };

    if (request.fieldMappings) {
      metadata.customFieldMappings = request.fieldMappings;
    }

    const values = [
      jobId,
      request.direction,
      request.operationType,
      totalItems,
      JSON.stringify(request.brdIds || []),
      JSON.stringify(request.jiraKeys || []),
      request.epicKey,
      request.projectKey,
      createdBy,
      JSON.stringify(metadata),
    ];

    const result = await this.pool.query(query, values);
    const job = this.mapRowToJob(result.rows[0]);

    await this.addHistory(jobId, 'job_created', { totalItems }, createdBy);

    logger.info(`Sync job created: ${jobId} (${request.direction})`);
    this.emit('job:created', job);

    // Start processing if not already running
    this.startProcessing();

    return job;
  }

  /**
   * Update job status and progress
   */
  async updateJob(jobId: string, updates: UpdateSyncJobRequest): Promise<SyncJob> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);

      if (updates.status === SyncJobStatus.IN_PROGRESS && !updates.progress) {
        setClauses.push(`started_at = CURRENT_TIMESTAMP`);
      } else if (
        updates.status === SyncJobStatus.COMPLETED ||
        updates.status === SyncJobStatus.FAILED ||
        updates.status === SyncJobStatus.CANCELLED
      ) {
        setClauses.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.progress !== undefined) {
      setClauses.push(`progress = $${paramIndex++}`);
      values.push(updates.progress);
    }

    if (updates.processedItems !== undefined) {
      setClauses.push(`processed_items = $${paramIndex++}`);
      values.push(updates.processedItems);
    }

    if (updates.failedItems !== undefined) {
      setClauses.push(`failed_items = $${paramIndex++}`);
      values.push(updates.failedItems);
    }

    if (updates.error !== undefined) {
      setClauses.push(`error = $${paramIndex++}`);
      values.push(updates.error);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(jobId);
    const query = `
      UPDATE sync_jobs
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const job = this.mapRowToJob(result.rows[0]);

    if (updates.status) {
      await this.addHistory(jobId, `status_changed_to_${updates.status}`, updates);
      this.emit(`job:${updates.status}`, job);
    }

    if (updates.progress !== undefined) {
      this.emit('job:progress', job);
    }

    return job;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<SyncJob | null> {
    const query = 'SELECT * FROM sync_jobs WHERE id = $1';
    const result = await this.pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Get all jobs with filters
   */
  async getJobs(filters?: {
    status?: SyncJobStatus[];
    direction?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: SyncJob[]; total: number }> {
    let query = 'SELECT * FROM sync_jobs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status && filters.status.length > 0) {
      query += ` AND status = ANY($${paramIndex++})`;
      values.push(filters.status);
    }

    if (filters?.direction) {
      query += ` AND direction = $${paramIndex++}`;
      values.push(filters.direction);
    }

    if (filters?.createdBy) {
      query += ` AND created_by = $${paramIndex++}`;
      values.push(filters.createdBy);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Add sorting and pagination
    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await this.pool.query(query, values);
    const jobs = result.rows.map(this.mapRowToJob);

    return { jobs, total };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const query = `
      SELECT
        status,
        COUNT(*) as count
      FROM sync_jobs
      GROUP BY status
    `;

    const result = await this.pool.query(query);
    const stats: QueueStats = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      stats.total += count;

      switch (row.status) {
        case SyncJobStatus.PENDING:
        case SyncJobStatus.RETRYING:
          stats.pending += count;
          break;
        case SyncJobStatus.IN_PROGRESS:
          stats.inProgress += count;
          break;
        case SyncJobStatus.COMPLETED:
          stats.completed += count;
          break;
        case SyncJobStatus.FAILED:
        case SyncJobStatus.CANCELLED:
          stats.failed += count;
          break;
      }
    }

    return stats;
  }

  /**
   * Cancel a pending or in-progress job
   */
  async cancelJob(jobId: string, cancelledBy: string): Promise<SyncJob> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status === SyncJobStatus.COMPLETED || job.status === SyncJobStatus.CANCELLED) {
      throw new Error(`Job already ${job.status}: ${jobId}`);
    }

    const updatedJob = await this.updateJob(jobId, {
      status: SyncJobStatus.CANCELLED,
      error: `Cancelled by ${cancelledBy}`,
    });

    this.processingJobs.delete(jobId);

    await this.addHistory(jobId, 'job_cancelled', {}, cancelledBy);
    logger.info(`Job cancelled: ${jobId}`);

    return updatedJob;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<SyncJob> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== SyncJobStatus.FAILED) {
      throw new Error(`Job is not in failed state: ${jobId}`);
    }

    if (job.retryCount >= job.maxRetries) {
      throw new Error(`Job has exceeded max retries: ${jobId}`);
    }

    const query = `
      UPDATE sync_jobs
      SET
        status = 'retrying',
        retry_count = retry_count + 1,
        error = NULL
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.pool.query(query, [jobId]);
    const updatedJob = this.mapRowToJob(result.rows[0]);

    await this.addHistory(jobId, 'job_retrying', { attempt: updatedJob.retryCount });
    logger.info(`Job retrying: ${jobId} (attempt ${updatedJob.retryCount})`);

    // Delay before retrying
    const delay = this.retryDelays[Math.min(updatedJob.retryCount - 1, this.retryDelays.length - 1)];
    setTimeout(() => {
      this.startProcessing();
    }, delay);

    return updatedJob;
  }

  /**
   * Start processing pending jobs
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (true) {
        // Check if we can process more jobs
        if (this.processingJobs.size >= this.maxConcurrentJobs) {
          break;
        }

        // Get next pending job
        const nextJob = await this.getNextPendingJob();

        if (!nextJob) {
          break; // No more jobs to process
        }

        // Process job asynchronously
        this.processJob(nextJob).catch(error => {
          logger.error(`Error processing job ${nextJob.id}:`, error);
        });
      }
    } finally {
      this.isProcessing = false;

      // If there are still jobs and capacity, restart processing
      if (this.processingJobs.size < this.maxConcurrentJobs) {
        const stats = await this.getStats();
        if (stats.pending > 0) {
          setTimeout(() => this.startProcessing(), 1000);
        }
      }
    }
  }

  /**
   * Get next pending job from queue
   */
  private async getNextPendingJob(): Promise<SyncJob | null> {
    const query = `
      SELECT * FROM sync_jobs
      WHERE status IN ('pending', 'retrying')
        AND id NOT IN (${Array.from(this.processingJobs).map((_, i) => `$${i + 1}`).join(',')})
      ORDER BY
        CASE WHEN status = 'retrying' THEN 0 ELSE 1 END,
        created_at ASC
      LIMIT 1
    `;

    const values = Array.from(this.processingJobs);
    const result = values.length > 0
      ? await this.pool.query(query, values)
      : await this.pool.query(
          "SELECT * FROM sync_jobs WHERE status IN ('pending', 'retrying') ORDER BY created_at ASC LIMIT 1"
        );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  /**
   * Process a single job
   */
  private async processJob(job: SyncJob): Promise<void> {
    this.processingJobs.add(job.id);

    try {
      await this.updateJob(job.id, { status: SyncJobStatus.IN_PROGRESS });

      // Emit event for external processing
      // The actual sync logic will be handled by SyncService
      this.emit('job:process', job);

      logger.info(`Processing job: ${job.id}`);
    } catch (error: any) {
      logger.error(`Error starting job ${job.id}:`, error);

      await this.updateJob(job.id, {
        status: SyncJobStatus.FAILED,
        error: error.message,
      });

      this.processingJobs.delete(job.id);

      // Auto-retry if under max retries
      if (job.retryCount < job.maxRetries) {
        setTimeout(() => {
          this.retryJob(job.id).catch(retryError => {
            logger.error(`Failed to retry job ${job.id}:`, retryError);
          });
        }, this.retryDelays[job.retryCount] || 60000);
      }
    }
  }

  /**
   * Mark job as completed (called by SyncService)
   */
  async completeJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: SyncJobStatus.COMPLETED });
    this.processingJobs.delete(jobId);
    await this.addHistory(jobId, 'job_completed', {});
    this.startProcessing(); // Process next job
  }

  /**
   * Mark job as failed (called by SyncService)
   */
  async failJob(jobId: string, error: string): Promise<void> {
    const job = await this.getJob(jobId);

    if (!job) {
      return;
    }

    await this.updateJob(jobId, {
      status: SyncJobStatus.FAILED,
      error,
    });

    this.processingJobs.delete(jobId);
    await this.addHistory(jobId, 'job_failed', { error });

    // Auto-retry if under max retries
    if (job.retryCount < job.maxRetries) {
      setTimeout(() => {
        this.retryJob(jobId).catch(retryError => {
          logger.error(`Failed to retry job ${jobId}:`, retryError);
        });
      }, this.retryDelays[job.retryCount] || 60000);
    } else {
      logger.error(`Job failed after ${job.retryCount} retries: ${jobId}`);
    }

    this.startProcessing(); // Process next job
  }

  /**
   * Add history entry for a job
   */
  private async addHistory(
    jobId: string,
    action: string,
    details: Record<string, any> = {},
    performedBy?: string
  ): Promise<void> {
    const historyId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO sync_history (id, job_id, action, details, performed_by)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await this.pool.query(query, [
      historyId,
      jobId,
      action,
      JSON.stringify(details),
      performedBy || null,
    ]);
  }

  /**
   * Get job history
   */
  async getHistory(jobId: string): Promise<SyncHistoryEntry[]> {
    const query = `
      SELECT * FROM sync_history
      WHERE job_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.pool.query(query, [jobId]);
    return result.rows.map(this.mapRowToHistory);
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM sync_jobs
      WHERE status IN ('completed', 'cancelled')
        AND completed_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    const result = await this.pool.query(query);
    const deletedCount = result.rowCount || 0;

    logger.info(`Cleaned up ${deletedCount} old jobs`);
    return deletedCount;
  }

  /**
   * Map database row to SyncJob
   */
  private mapRowToJob(row: any): SyncJob {
    return {
      id: row.id,
      direction: row.direction,
      operationType: row.operation_type,
      status: row.status as SyncJobStatus,
      progress: row.progress,
      totalItems: row.total_items,
      processedItems: row.processed_items,
      failedItems: row.failed_items,
      brdIds: row.brd_ids ? JSON.parse(row.brd_ids) : undefined,
      jiraKeys: row.jira_keys ? JSON.parse(row.jira_keys) : undefined,
      epicKey: row.epic_key,
      projectKey: row.project_key,
      error: row.error,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  /**
   * Map database row to SyncHistoryEntry
   */
  private mapRowToHistory(row: any): SyncHistoryEntry {
    return {
      id: row.id,
      jobId: row.job_id,
      timestamp: new Date(row.timestamp),
      action: row.action,
      details: row.details ? JSON.parse(row.details) : {},
      performedBy: row.performed_by,
    };
  }
}
