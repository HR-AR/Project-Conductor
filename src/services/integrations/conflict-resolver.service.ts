/**
 * Conflict Resolver Service
 * Detects and resolves synchronization conflicts using 3-way merge algorithm
 */

import { Pool } from 'pg';
import {
  SyncConflict,
  ConflictType,
  ConflictResolutionStrategy,
  FieldDiff,
  ResolveConflictRequest,
} from '../../models/sync.model';
import pino from 'pino';

const logger = pino({ name: 'ConflictResolverService' });

export class ConflictResolverService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Detect conflicts using 3-way merge algorithm
   * Compares base version with both local and remote versions
   */
  detectConflicts(
    baseData: Record<string, any>,
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    fieldsToCheck: string[]
  ): FieldDiff[] {
    const diffs: FieldDiff[] = [];

    for (const field of fieldsToCheck) {
      const baseValue = this.getFieldValue(baseData, field);
      const localValue = this.getFieldValue(localData, field);
      const remoteValue = this.getFieldValue(remoteData, field);

      const localChanged = !this.valuesEqual(baseValue, localValue);
      const remoteChanged = !this.valuesEqual(baseValue, remoteValue);

      // Conflict only if both changed and to different values
      const hasConflict =
        localChanged &&
        remoteChanged &&
        !this.valuesEqual(localValue, remoteValue);

      let conflictType: ConflictType | undefined;
      if (hasConflict) {
        conflictType = this.determineConflictType(field, baseValue, localValue, remoteValue);
      }

      diffs.push({
        field,
        baseValue,
        localValue,
        remoteValue,
        hasConflict,
        conflictType,
      });
    }

    return diffs;
  }

  /**
   * Determine the type of conflict
   */
  private determineConflictType(
    field: string,
    baseValue: any,
    localValue: any,
    remoteValue: any
  ): ConflictType {
    // Status field conflicts
    if (field === 'status') {
      return ConflictType.STATUS_MISMATCH;
    }

    // Deletion conflicts
    if ((localValue === null || localValue === undefined) ||
        (remoteValue === null || remoteValue === undefined)) {
      return ConflictType.DELETION;
    }

    // Concurrent modification
    return ConflictType.CONCURRENT_MODIFICATION;
  }

  /**
   * Create conflict records in database
   */
  async createConflicts(
    mappingId: string,
    brdId: string,
    jiraKey: string,
    diffs: FieldDiff[],
    syncJobId?: string
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    for (const diff of diffs) {
      if (!diff.hasConflict) {
        continue;
      }

      const conflictId = `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const query = `
        INSERT INTO sync_conflicts (
          id, sync_job_id, mapping_id, brd_id, jira_key, conflict_type,
          field, base_value, local_value, remote_value, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING *
      `;

      const values = [
        conflictId,
        syncJobId || null,
        mappingId,
        brdId,
        jiraKey,
        diff.conflictType,
        diff.field,
        JSON.stringify(diff.baseValue),
        JSON.stringify(diff.localValue),
        JSON.stringify(diff.remoteValue),
      ];

      const result = await this.pool.query(query, values);
      const conflict = this.mapRowToConflict(result.rows[0]);
      conflicts.push(conflict);

      logger.info(`Conflict detected: ${conflict.id} - ${conflict.field} (${conflict.conflictType})`);
    }

    // Update conflict count in mapping
    if (conflicts.length > 0) {
      await this.incrementConflictCount(mappingId, conflicts.length);
    }

    return conflicts;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(request: ResolveConflictRequest, resolvedBy: string): Promise<SyncConflict> {
    const conflict = await this.getConflict(request.conflictId);

    if (!conflict) {
      throw new Error(`Conflict not found: ${request.conflictId}`);
    }

    if (conflict.status === 'resolved') {
      throw new Error(`Conflict already resolved: ${request.conflictId}`);
    }

    let resolvedValue: any;

    switch (request.strategy) {
      case ConflictResolutionStrategy.KEEP_LOCAL:
        resolvedValue = conflict.localValue;
        break;

      case ConflictResolutionStrategy.KEEP_REMOTE:
        resolvedValue = conflict.remoteValue;
        break;

      case ConflictResolutionStrategy.MERGE:
        resolvedValue = await this.mergeValues(
          conflict.baseValue,
          conflict.localValue,
          conflict.remoteValue,
          conflict.field
        );
        break;

      case ConflictResolutionStrategy.MANUAL:
        if (request.resolvedValue === undefined) {
          throw new Error('Manual resolution requires resolvedValue');
        }
        resolvedValue = request.resolvedValue;
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${request.strategy}`);
    }

    const query = `
      UPDATE sync_conflicts
      SET
        resolution_strategy = $1,
        resolved_value = $2,
        resolved_by = $3,
        resolved_at = CURRENT_TIMESTAMP,
        status = 'resolved'
      WHERE id = $4
      RETURNING *
    `;

    const values = [
      request.strategy,
      JSON.stringify(resolvedValue),
      resolvedBy,
      request.conflictId,
    ];

    const result = await this.pool.query(query, values);
    const resolvedConflict = this.mapRowToConflict(result.rows[0]);

    logger.info(`Conflict resolved: ${resolvedConflict.id} using strategy ${request.strategy}`);

    // If applyToSimilar, resolve similar conflicts
    if (request.applyToSimilar) {
      await this.resolveSimilarConflicts(conflict, request.strategy, resolvedBy);
    }

    return resolvedConflict;
  }

  /**
   * Resolve similar pending conflicts with same field and type
   */
  private async resolveSimilarConflicts(
    baseConflict: SyncConflict,
    strategy: ConflictResolutionStrategy,
    resolvedBy: string
  ): Promise<number> {
    const query = `
      SELECT * FROM sync_conflicts
      WHERE field = $1
        AND conflict_type = $2
        AND status = 'pending'
        AND id != $3
    `;

    const result = await this.pool.query(query, [
      baseConflict.field,
      baseConflict.conflictType,
      baseConflict.id,
    ]);

    let resolvedCount = 0;

    for (const row of result.rows) {
      const conflict = this.mapRowToConflict(row);

      try {
        await this.resolveConflict(
          {
            conflictId: conflict.id,
            strategy,
          },
          resolvedBy
        );
        resolvedCount++;
      } catch (error) {
        logger.error(`Failed to resolve similar conflict ${conflict.id}:`, error);
      }
    }

    logger.info(`Resolved ${resolvedCount} similar conflicts using strategy ${strategy}`);
    return resolvedCount;
  }

  /**
   * Merge values intelligently based on field type
   */
  private async mergeValues(
    baseValue: any,
    localValue: any,
    remoteValue: any,
    field: string
  ): Promise<any> {
    // Array merging
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return this.mergeArrays(baseValue || [], localValue, remoteValue);
    }

    // Object merging
    if (
      typeof localValue === 'object' &&
      typeof remoteValue === 'object' &&
      localValue !== null &&
      remoteValue !== null
    ) {
      return this.mergeObjects(baseValue || {}, localValue, remoteValue);
    }

    // String concatenation for text fields
    if (
      typeof localValue === 'string' &&
      typeof remoteValue === 'string' &&
      (field.includes('description') || field.includes('statement'))
    ) {
      return this.mergeStrings(baseValue || '', localValue, remoteValue);
    }

    // For primitive types, prefer local by default
    return localValue;
  }

  /**
   * Merge arrays by combining unique elements
   */
  private mergeArrays(base: any[], local: any[], remote: any[]): any[] {
    const baseSet = new Set(base.map(v => JSON.stringify(v)));
    const merged = [...local];

    for (const item of remote) {
      const itemStr = JSON.stringify(item);
      // Add if not in base (new addition) or if already in local
      if (!baseSet.has(itemStr) || merged.some(l => JSON.stringify(l) === itemStr)) {
        if (!merged.some(l => JSON.stringify(l) === itemStr)) {
          merged.push(item);
        }
      }
    }

    return merged;
  }

  /**
   * Merge objects by combining non-conflicting fields
   */
  private mergeObjects(base: any, local: any, remote: any): any {
    const merged = { ...local };

    for (const key in remote) {
      if (!(key in local)) {
        // Field only in remote, add it
        merged[key] = remote[key];
      } else if (this.valuesEqual(local[key], base[key])) {
        // Local unchanged, use remote
        merged[key] = remote[key];
      }
      // Otherwise keep local value
    }

    return merged;
  }

  /**
   * Merge strings by combining changes
   */
  private mergeStrings(base: string, local: string, remote: string): string {
    // Simple merge: if one side didn't change, use the other
    if (local === base) {
      return remote;
    }
    if (remote === base) {
      return local;
    }

    // Both changed: concatenate with separator
    return `${local}\n\n---\n\n${remote}`;
  }

  /**
   * Get a conflict by ID
   */
  async getConflict(id: string): Promise<SyncConflict | null> {
    const query = 'SELECT * FROM sync_conflicts WHERE id = $1';
    const result = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConflict(result.rows[0]);
  }

  /**
   * Get all conflicts for a mapping
   */
  async getConflictsByMapping(mappingId: string, status?: string): Promise<SyncConflict[]> {
    let query = 'SELECT * FROM sync_conflicts WHERE mapping_id = $1';
    const values: any[] = [mappingId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapRowToConflict);
  }

  /**
   * Get all conflicts for a BRD
   */
  async getConflictsByBRD(brdId: string, status?: string): Promise<SyncConflict[]> {
    let query = 'SELECT * FROM sync_conflicts WHERE brd_id = $1';
    const values: any[] = [brdId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(this.mapRowToConflict);
  }

  /**
   * Get all conflicts for a sync job
   */
  async getConflictsByJob(jobId: string): Promise<SyncConflict[]> {
    const query = `
      SELECT * FROM sync_conflicts
      WHERE sync_job_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [jobId]);
    return result.rows.map(this.mapRowToConflict);
  }

  /**
   * Get pending conflicts count
   */
  async getPendingConflictsCount(brdId?: string): Promise<number> {
    let query = "SELECT COUNT(*) FROM sync_conflicts WHERE status = 'pending'";
    const values: any[] = [];

    if (brdId) {
      query += ' AND brd_id = $1';
      values.push(brdId);
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Ignore a conflict (mark as resolved without taking action)
   */
  async ignoreConflict(conflictId: string, ignoredBy: string): Promise<SyncConflict> {
    const query = `
      UPDATE sync_conflicts
      SET
        status = 'ignored',
        resolved_by = $1,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.pool.query(query, [ignoredBy, conflictId]);

    if (result.rows.length === 0) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    return this.mapRowToConflict(result.rows[0]);
  }

  /**
   * Delete old resolved conflicts
   */
  async cleanupOldConflicts(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM sync_conflicts
      WHERE status IN ('resolved', 'ignored')
        AND resolved_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;

    const result = await this.pool.query(query);
    const deletedCount = result.rowCount || 0;

    logger.info(`Cleaned up ${deletedCount} old conflicts`);
    return deletedCount;
  }

  /**
   * Compare two values for equality
   */
  private valuesEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }

    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b;
    }

    // Deep comparison for objects and arrays
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }

    // String comparison (case-insensitive and trimmed)
    if (typeof a === 'string' && typeof b === 'string') {
      return a.trim().toLowerCase() === b.trim().toLowerCase();
    }

    return false;
  }

  /**
   * Get field value from object (supports nested paths)
   */
  private getFieldValue(obj: Record<string, any>, field: string): any {
    const keys = field.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Increment conflict count for a mapping
   */
  private async incrementConflictCount(mappingId: string, count: number): Promise<void> {
    const query = `
      UPDATE sync_mappings
      SET conflict_count = conflict_count + $1
      WHERE id = $2
    `;

    await this.pool.query(query, [count, mappingId]);
  }

  /**
   * Map database row to SyncConflict
   */
  private mapRowToConflict(row: any): SyncConflict {
    return {
      id: row.id,
      syncJobId: row.sync_job_id,
      mappingId: row.mapping_id,
      brdId: row.brd_id,
      jiraKey: row.jira_key,
      conflictType: row.conflict_type as ConflictType,
      field: row.field,
      baseValue: row.base_value ? JSON.parse(row.base_value) : null,
      localValue: row.local_value ? JSON.parse(row.local_value) : null,
      remoteValue: row.remote_value ? JSON.parse(row.remote_value) : null,
      resolutionStrategy: row.resolution_strategy as ConflictResolutionStrategy | undefined,
      resolvedValue: row.resolved_value ? JSON.parse(row.resolved_value) : undefined,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      status: row.status,
      createdAt: new Date(row.created_at),
      metadata: row.metadata || {},
    };
  }
}
