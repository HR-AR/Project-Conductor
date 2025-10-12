/**
 * Core Sync Service
 * Orchestrates bi-directional synchronization between Jira Epics and BRDs
 */

import { Pool } from 'pg';
import {
  SyncJob,
  SyncMapping,
  SyncResult,
  SyncDirection,
  SyncOperationType,
  CreateSyncJobRequest,
  BulkSyncRequest,
  BulkSyncResponse,
  JiraEpic,
  BRDSyncData,
  ConflictResolutionStrategy,
  WebhookSyncRequest,
} from '../../models/sync.model';
import { BRD } from '../../models/brd.model';
import { FieldMapperService } from './field-mapper.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { SyncQueueService } from './sync-queue.service';
import { JiraService } from '../jira.service';
import { BRDService } from '../brd.service';
import pino from 'pino';

const logger = pino({ name: 'SyncService' });

export class SyncService {
  private pool: Pool;
  private fieldMapper: FieldMapperService;
  private conflictResolver: ConflictResolverService;
  private queue: SyncQueueService;
  private jiraService: JiraService;
  private brdService: BRDService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.fieldMapper = new FieldMapperService(pool);
    this.conflictResolver = new ConflictResolverService(pool);
    this.queue = new SyncQueueService(pool);
    this.jiraService = new JiraService();
    this.brdService = new BRDService(pool);

    // Listen to queue events for processing
    this.queue.on('job:process', (job: SyncJob) => {
      this.processJob(job).catch(error => {
        logger.error(`Error processing job ${job.id}:`, error);
        this.queue.failJob(job.id, error.message);
      });
    });
  }

  /**
   * Import Jira Epic as BRD
   */
  async importFromJira(
    jiraKey: string,
    projectKey: string,
    createdBy: string
  ): Promise<SyncResult> {
    const request: CreateSyncJobRequest = {
      direction: SyncDirection.JIRA_TO_BRD,
      operationType: SyncOperationType.CREATE,
      jiraKeys: [jiraKey],
      projectKey,
    };

    const job = await this.queue.createJob(request, createdBy);

    // Job will be processed asynchronously
    return {
      success: true,
      jobId: job.id,
      direction: SyncDirection.JIRA_TO_BRD,
      processedItems: 0,
      failedItems: 0,
      conflictCount: 0,
    };
  }

  /**
   * Export BRD to Jira Epic
   */
  async exportToJira(
    brdId: string,
    projectKey: string,
    createdBy: string
  ): Promise<SyncResult> {
    const request: CreateSyncJobRequest = {
      direction: SyncDirection.BRD_TO_JIRA,
      operationType: SyncOperationType.CREATE,
      brdIds: [brdId],
      projectKey,
    };

    const job = await this.queue.createJob(request, createdBy);

    return {
      success: true,
      jobId: job.id,
      direction: SyncDirection.BRD_TO_JIRA,
      processedItems: 0,
      failedItems: 0,
      conflictCount: 0,
    };
  }

  /**
   * Bulk import Jira Epics
   */
  async bulkImport(request: BulkSyncRequest, createdBy: string): Promise<BulkSyncResponse> {
    const syncRequest: CreateSyncJobRequest = {
      direction: SyncDirection.JIRA_TO_BRD,
      operationType: SyncOperationType.BULK_IMPORT,
      jiraKeys: request.jiraKeys,
      epicKey: request.epicKey,
      projectKey: request.projectKey,
      autoResolveConflicts: request.autoResolveConflicts,
      conflictStrategy: request.conflictStrategy,
    };

    const job = await this.queue.createJob(syncRequest, createdBy);

    return {
      jobId: job.id,
      totalItems: request.jiraKeys?.length || 0,
      successful: [],
      failed: [],
      conflicts: [],
    };
  }

  /**
   * Bulk export BRDs to Jira
   */
  async bulkExport(request: BulkSyncRequest, createdBy: string): Promise<BulkSyncResponse> {
    const syncRequest: CreateSyncJobRequest = {
      direction: SyncDirection.BRD_TO_JIRA,
      operationType: SyncOperationType.BULK_EXPORT,
      brdIds: request.brdIds,
      epicKey: request.epicKey,
      projectKey: request.projectKey,
      autoResolveConflicts: request.autoResolveConflicts,
      conflictStrategy: request.conflictStrategy,
    };

    const job = await this.queue.createJob(syncRequest, createdBy);

    return {
      jobId: job.id,
      totalItems: request.brdIds?.length || 0,
      successful: [],
      failed: [],
      conflicts: [],
    };
  }

  /**
   * Synchronize existing mapping (update)
   */
  async syncMapping(mappingId: string, direction: SyncDirection, createdBy: string): Promise<SyncResult> {
    const mapping = await this.getMapping(mappingId);

    if (!mapping) {
      throw new Error(`Mapping not found: ${mappingId}`);
    }

    if (!mapping.syncEnabled) {
      throw new Error(`Sync is disabled for mapping: ${mappingId}`);
    }

    const request: CreateSyncJobRequest = {
      direction,
      operationType: SyncOperationType.UPDATE,
      brdIds: [mapping.brdId],
      jiraKeys: [mapping.jiraKey],
    };

    const job = await this.queue.createJob(request, createdBy);

    return {
      success: true,
      jobId: job.id,
      direction,
      processedItems: 0,
      failedItems: 0,
      conflictCount: 0,
    };
  }

  /**
   * Handle Jira webhook event
   */
  async handleWebhook(payload: WebhookSyncRequest, createdBy: string = 'webhook'): Promise<SyncResult> {
    const mapping = await this.getMappingByJiraKey(payload.issueKey);

    if (!mapping || !mapping.syncEnabled || !mapping.autoSync) {
      return {
        success: false,
        jobId: '',
        direction: SyncDirection.JIRA_TO_BRD,
        processedItems: 0,
        failedItems: 0,
        conflictCount: 0,
        error: 'Mapping not found or sync not enabled',
      };
    }

    const request: CreateSyncJobRequest = {
      direction: SyncDirection.JIRA_TO_BRD,
      operationType: SyncOperationType.WEBHOOK_SYNC,
      brdIds: [mapping.brdId],
      jiraKeys: [payload.issueKey],
    };

    const job = await this.queue.createJob(request, createdBy);

    return {
      success: true,
      jobId: job.id,
      direction: SyncDirection.JIRA_TO_BRD,
      processedItems: 0,
      failedItems: 0,
      conflictCount: 0,
    };
  }

  /**
   * Process a sync job (called by queue)
   */
  private async processJob(job: SyncJob): Promise<void> {
    try {
      logger.info(`Processing sync job: ${job.id} (${job.direction})`);

      let processedItems = 0;
      let failedItems = 0;
      const failedIds: string[] = [];

      if (job.direction === SyncDirection.JIRA_TO_BRD) {
        // Sync from Jira to BRD
        const jiraKeys = job.jiraKeys || [];

        for (const jiraKey of jiraKeys) {
          try {
            await this.syncJiraToBRD(jiraKey, job);
            processedItems++;

            // Update progress
            const progress = Math.floor((processedItems / job.totalItems) * 100);
            await this.queue.updateJob(job.id, { progress, processedItems });
          } catch (error: any) {
            logger.error(`Failed to sync ${jiraKey}:`, error);
            failedItems++;
            failedIds.push(jiraKey);
          }
        }
      } else if (job.direction === SyncDirection.BRD_TO_JIRA) {
        // Sync from BRD to Jira
        const brdIds = job.brdIds || [];

        for (const brdId of brdIds) {
          try {
            await this.syncBRDToJira(brdId, job);
            processedItems++;

            // Update progress
            const progress = Math.floor((processedItems / job.totalItems) * 100);
            await this.queue.updateJob(job.id, { progress, processedItems });
          } catch (error: any) {
            logger.error(`Failed to sync ${brdId}:`, error);
            failedItems++;
            failedIds.push(brdId);
          }
        }
      } else if (job.direction === SyncDirection.BIDIRECTIONAL) {
        // Sync both directions
        // Implementation would sync based on last modified timestamps
        throw new Error('Bidirectional sync not yet implemented');
      }

      // Complete job
      await this.queue.updateJob(job.id, {
        processedItems,
        failedItems,
        progress: 100,
      });

      await this.queue.completeJob(job.id);

      logger.info(`Job completed: ${job.id} (${processedItems} processed, ${failedItems} failed)`);
    } catch (error: any) {
      logger.error(`Job failed: ${job.id}`, error);
      await this.queue.failJob(job.id, error.message);
    }
  }

  /**
   * Sync single Jira Epic to BRD
   */
  private async syncJiraToBRD(jiraKey: string, job: SyncJob): Promise<void> {
    // Fetch Jira Epic (stubbed for now)
    const epic = await this.fetchJiraEpic(jiraKey);

    if (!epic) {
      throw new Error(`Jira Epic not found: ${jiraKey}`);
    }

    // Check if mapping exists
    let mapping = await this.getMappingByJiraKey(jiraKey);
    let brd: BRD | null = null;

    if (mapping) {
      // Update existing BRD
      brd = await this.brdService.getBRDById(mapping.brdId);

      if (brd) {
        // Detect conflicts
        const baseData = await this.fieldMapper.mapJiraToBRD(epic);
        const localData = this.brdToSyncData(brd);
        const remoteData = baseData;

        const fieldsToCheck = [
          'title',
          'problemStatement',
          'businessImpact',
          'status',
          'budget',
        ];

        const diffs = this.conflictResolver.detectConflicts(
          localData as any,
          localData as any,
          remoteData as any,
          fieldsToCheck
        );

        const conflicts = diffs.filter(d => d.hasConflict);

        if (conflicts.length > 0) {
          // Create conflict records
          await this.conflictResolver.createConflicts(
            mapping.id,
            brd.id,
            jiraKey,
            conflicts,
            job.id
          );

          logger.warn(`Conflicts detected for BRD ${brd.id}: ${conflicts.length}`);

          // Auto-resolve if enabled
          const autoResolve = job.metadata?.autoResolveConflicts;
          const strategy = job.metadata?.conflictStrategy || ConflictResolutionStrategy.KEEP_REMOTE;

          if (autoResolve) {
            // Apply auto-resolution strategy
            for (const diff of conflicts) {
              let resolvedValue: any;

              if (strategy === ConflictResolutionStrategy.KEEP_LOCAL) {
                resolvedValue = diff.localValue;
              } else if (strategy === ConflictResolutionStrategy.KEEP_REMOTE) {
                resolvedValue = diff.remoteValue;
              } else {
                // For other strategies, create conflict record for manual resolution
                continue;
              }

              // Apply resolved value
              (remoteData as any)[diff.field] = resolvedValue;
            }
          } else {
            // Don't update if there are unresolved conflicts
            throw new Error(`Conflicts detected, manual resolution required`);
          }
        }

        // Update BRD
        const updateData = await this.fieldMapper.mapJiraToBRD(epic);
        await this.brdService.updateBRD(brd.id, updateData as any, 'system');

        // Update mapping
        await this.updateMapping(mapping.id, {
          lastSyncedAt: new Date(),
          lastModifiedRemote: new Date(epic.updated),
        });
      }
    } else {
      // Create new BRD
      const brdData = await this.fieldMapper.mapJiraToBRD(epic);

      // Ensure required fields
      if (!brdData.title) {
        throw new Error('Title is required');
      }
      if (!brdData.problemStatement) {
        throw new Error('Problem statement is required');
      }

      const createData = {
        title: brdData.title,
        problemStatement: brdData.problemStatement,
        businessImpact: brdData.businessImpact || '',
        successCriteria: brdData.successCriteria || [],
        timeline: brdData.timeline || {
          startDate: new Date().toISOString(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        budget: brdData.budget || 0,
        stakeholders: brdData.stakeholders || [],
      };

      const newBRD = await this.brdService.createBRD(createData, job.createdBy);

      // Create mapping
      await this.createMapping(
        newBRD.id,
        jiraKey,
        epic.id,
        epic.epicName,
        new Date(epic.created),
        new Date(epic.updated)
      );

      logger.info(`Created BRD ${newBRD.id} from Jira Epic ${jiraKey}`);
    }
  }

  /**
   * Sync single BRD to Jira Epic
   */
  private async syncBRDToJira(brdId: string, job: SyncJob): Promise<void> {
    // Fetch BRD
    const brd = await this.brdService.getBRDById(brdId);

    if (!brd) {
      throw new Error(`BRD not found: ${brdId}`);
    }

    // Check if mapping exists
    let mapping = await this.getMappingByBRDId(brdId);

    if (mapping) {
      // Update existing Jira Epic
      const jiraData = await this.fieldMapper.mapBRDToJira(brd);

      // Fetch current Jira Epic
      const currentEpic = await this.fetchJiraEpic(mapping.jiraKey);

      if (currentEpic) {
        // Detect conflicts
        const baseData = await this.fieldMapper.mapBRDToJira(brd);
        const localData = baseData;
        const remoteData = currentEpic;

        const fieldsToCheck = ['summary', 'description', 'status'];

        const diffs = this.conflictResolver.detectConflicts(
          localData as any,
          localData as any,
          remoteData as any,
          fieldsToCheck
        );

        const conflicts = diffs.filter(d => d.hasConflict);

        if (conflicts.length > 0) {
          await this.conflictResolver.createConflicts(
            mapping.id,
            brd.id,
            mapping.jiraKey,
            conflicts,
            job.id
          );

          logger.warn(`Conflicts detected for Jira ${mapping.jiraKey}: ${conflicts.length}`);

          // Handle auto-resolution
          const autoResolve = job.metadata?.autoResolveConflicts;
          if (!autoResolve) {
            throw new Error(`Conflicts detected, manual resolution required`);
          }
        }
      }

      // Update Jira Epic (stubbed)
      await this.updateJiraEpic(mapping.jiraKey, jiraData);

      // Update mapping
      await this.updateMapping(mapping.id, {
        lastSyncedAt: new Date(),
        lastModifiedLocal: brd.updatedAt,
      });

      logger.info(`Updated Jira Epic ${mapping.jiraKey} from BRD ${brdId}`);
    } else {
      // Create new Jira Epic
      const jiraData = await this.fieldMapper.mapBRDToJira(brd);

      if (!job.projectKey) {
        throw new Error('Project key is required to create Jira Epic');
      }

      // Create Epic in Jira (stubbed)
      const epic = await this.createJiraEpic(job.projectKey, jiraData);

      // Create mapping
      await this.createMapping(
        brd.id,
        epic.key,
        epic.id,
        epic.epicName,
        brd.createdAt,
        brd.updatedAt
      );

      logger.info(`Created Jira Epic ${epic.key} from BRD ${brdId}`);
    }
  }

  /**
   * Fetch Jira Epic (stub - would call actual Jira API)
   */
  private async fetchJiraEpic(jiraKey: string): Promise<JiraEpic | null> {
    // In production, this would call Jira REST API
    // For now, return mock data
    return {
      key: jiraKey,
      id: `jira-${jiraKey}`,
      summary: `Epic: ${jiraKey}`,
      description: 'Mock Jira Epic description',
      status: 'To Do',
      epicName: `Epic ${jiraKey}`,
      reporter: {
        accountId: 'user-123',
        displayName: 'John Doe',
        email: 'john@example.com',
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      labels: [],
    };
  }

  /**
   * Create Jira Epic (stub)
   */
  private async createJiraEpic(projectKey: string, data: Partial<JiraEpic>): Promise<JiraEpic> {
    // Would call Jira API to create epic
    const key = `${projectKey}-${Math.floor(Math.random() * 9000) + 1000}`;

    return {
      key,
      id: `jira-${key}`,
      summary: data.summary || 'New Epic',
      description: data.description,
      status: data.status || 'To Do',
      epicName: data.epicName,
      reporter: data.reporter || {
        accountId: 'system',
        displayName: 'System',
        email: 'system@conductor.com',
      },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      labels: data.labels || [],
    };
  }

  /**
   * Update Jira Epic (stub)
   */
  private async updateJiraEpic(jiraKey: string, data: Partial<JiraEpic>): Promise<void> {
    // Would call Jira API to update epic
    logger.info(`Updating Jira Epic ${jiraKey}:`, data);
  }

  /**
   * Create a new sync mapping
   */
  private async createMapping(
    brdId: string,
    jiraKey: string,
    jiraId: string,
    jiraEpicName: string | undefined,
    createdAt: Date,
    updatedAt: Date
  ): Promise<SyncMapping> {
    const mappingId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO sync_mappings (
        id, brd_id, jira_key, jira_id, jira_epic_name,
        last_synced_at, last_modified_local, last_modified_remote
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
      RETURNING *
    `;

    const values = [mappingId, brdId, jiraKey, jiraId, jiraEpicName, createdAt, updatedAt];
    const result = await this.pool.query(query, values);

    return this.mapRowToMapping(result.rows[0]);
  }

  /**
   * Update a sync mapping
   */
  private async updateMapping(
    mappingId: string,
    updates: {
      lastSyncedAt?: Date;
      lastModifiedLocal?: Date;
      lastModifiedRemote?: Date;
    }
  ): Promise<void> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.lastSyncedAt) {
      setClauses.push(`last_synced_at = $${paramIndex++}`);
      values.push(updates.lastSyncedAt);
    }

    if (updates.lastModifiedLocal) {
      setClauses.push(`last_modified_local = $${paramIndex++}`);
      values.push(updates.lastModifiedLocal);
    }

    if (updates.lastModifiedRemote) {
      setClauses.push(`last_modified_remote = $${paramIndex++}`);
      values.push(updates.lastModifiedRemote);
    }

    values.push(mappingId);
    const query = `
      UPDATE sync_mappings
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await this.pool.query(query, values);
  }

  /**
   * Get mapping by ID
   */
  async getMapping(mappingId: string): Promise<SyncMapping | null> {
    const query = 'SELECT * FROM sync_mappings WHERE id = $1';
    const result = await this.pool.query(query, [mappingId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMapping(result.rows[0]);
  }

  /**
   * Get mapping by BRD ID
   */
  async getMappingByBRDId(brdId: string): Promise<SyncMapping | null> {
    const query = 'SELECT * FROM sync_mappings WHERE brd_id = $1';
    const result = await this.pool.query(query, [brdId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMapping(result.rows[0]);
  }

  /**
   * Get mapping by Jira key
   */
  async getMappingByJiraKey(jiraKey: string): Promise<SyncMapping | null> {
    const query = 'SELECT * FROM sync_mappings WHERE jira_key = $1';
    const result = await this.pool.query(query, [jiraKey]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMapping(result.rows[0]);
  }

  /**
   * Get all mappings
   */
  async getAllMappings(): Promise<SyncMapping[]> {
    const query = 'SELECT * FROM sync_mappings ORDER BY last_synced_at DESC';
    const result = await this.pool.query(query);
    return result.rows.map(this.mapRowToMapping);
  }

  /**
   * Convert BRD to sync data format
   */
  private brdToSyncData(brd: BRD): BRDSyncData {
    return {
      id: brd.id,
      title: brd.title,
      problemStatement: brd.problemStatement,
      businessImpact: brd.businessImpact,
      successCriteria: brd.successCriteria,
      timeline: brd.timeline,
      budget: brd.budget,
      stakeholders: brd.stakeholders,
      status: brd.status,
      version: brd.version,
      approvals: brd.approvals,
      createdAt: brd.createdAt,
      updatedAt: brd.updatedAt,
      createdBy: brd.createdBy,
    };
  }

  /**
   * Map database row to SyncMapping
   */
  private mapRowToMapping(row: any): SyncMapping {
    return {
      id: row.id,
      brdId: row.brd_id,
      jiraKey: row.jira_key,
      jiraId: row.jira_id,
      jiraEpicName: row.jira_epic_name,
      lastSyncedAt: new Date(row.last_synced_at),
      lastModifiedLocal: new Date(row.last_modified_local),
      lastModifiedRemote: new Date(row.last_modified_remote),
      syncEnabled: row.sync_enabled,
      autoSync: row.auto_sync,
      conflictCount: row.conflict_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Expose services for external use
  getQueueService(): SyncQueueService {
    return this.queue;
  }

  getConflictResolverService(): ConflictResolverService {
    return this.conflictResolver;
  }

  getFieldMapperService(): FieldMapperService {
    return this.fieldMapper;
  }
}
