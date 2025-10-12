/**
 * Conflict Service - Business logic for Conflict Resolution management
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  Conflict,
  CreateConflictRequest,
  UpdateConflictRequest,
  AddCommentRequest,
  AddResolutionOptionRequest,
  VoteOnOptionRequest,
  ResolveConflictRequest,
  ConflictFilters,
  ConflictSummary,
  ConflictResolutionAnalytics,
  DiscussionComment,
  ResolutionOption,
  Vote,
  Resolution,
} from '../models/conflict.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class ConflictService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a new conflict
   */
  async createConflict(data: CreateConflictRequest): Promise<Conflict> {
    const conflictId = await generateUniqueId('CONFLICT');

    const query = `
      INSERT INTO conflicts (
        id, type, title, description, severity, raised_by, raised_by_role,
        affected_documents, affected_items, discussion, options, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      conflictId,
      data.type,
      data.title,
      data.description,
      data.severity,
      data.raisedBy,
      data.raisedByRole,
      JSON.stringify(data.affectedDocuments),
      JSON.stringify(data.affectedItems),
      JSON.stringify([]),
      JSON.stringify([]),
      'open',
    ];

    try {
      const result = await db.query(query, values);
      const conflict = this.mapRowToConflict(result.rows[0]);

      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:created', conflict);
      }

      logger.info({ conflictId }, 'Conflict created successfully');
      return conflict;
    } catch (error) {
      logger.error({ error, conflictId }, 'Error creating conflict');
      throw new Error('Failed to create conflict');
    }
  }

  async getConflictById(id: string): Promise<Conflict | null> {
    const query = `SELECT c.*, u.username as raised_by_username FROM conflicts c LEFT JOIN users u ON c.raised_by = u.id WHERE c.id = $1`;
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToConflict(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting conflict');
      throw new Error('Failed to get conflict');
    }
  }

  async getAllConflicts(filters: ConflictFilters = {}): Promise<Conflict[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);
    const query = `SELECT c.*, u.username as raised_by_username FROM conflicts c LEFT JOIN users u ON c.raised_by = u.id ${whereClause} ORDER BY c.created_at DESC`;
    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToConflict(row));
    } catch (error) {
      logger.error({ error }, 'Error getting conflicts');
      throw new Error('Failed to get conflicts');
    }
  }

  async updateConflict(id: string, data: UpdateConflictRequest): Promise<Conflict> {
    return await db.withTransaction(async (client: PoolClient) => {
      const updateFields: string[] = [];
      const updateValues: (string | string[])[] = [];
      let paramCount = 0;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(data.description);
      }
      if (data.severity !== undefined) {
        updateFields.push(`severity = $${++paramCount}`);
        updateValues.push(data.severity);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${++paramCount}`);
        updateValues.push(data.status);
      }
      if (data.affectedItems !== undefined) {
        updateFields.push(`affected_items = $${++paramCount}`);
        updateValues.push(JSON.stringify(data.affectedItems));
      }

      if (updateFields.length === 0) throw new Error('No fields to update');

      const updateQuery = `UPDATE conflicts SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${++paramCount} RETURNING *`;
      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);
      if (result.rows.length === 0) throw new Error('Conflict not found');

      const conflict = this.mapRowToConflict(result.rows[0]);
      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:updated', conflict);
      }

      logger.info({ conflictId: id }, 'Conflict updated successfully');
      return conflict;
    });
  }

  async deleteConflict(id: string): Promise<void> {
    const query = `DELETE FROM conflicts WHERE id = $1 RETURNING id`;
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) throw new Error('Conflict not found');
      logger.info({ conflictId: id }, 'Conflict deleted successfully');
    } catch (error) {
      logger.error({ error, id }, 'Error deleting conflict');
      throw error;
    }
  }

  async addComment(id: string, comment: AddCommentRequest): Promise<Conflict> {
    return await db.withTransaction(async (client: PoolClient) => {
      const getQuery = `SELECT * FROM conflicts WHERE id = $1`;
      const conflictResult = await client.query(getQuery, [id]);
      if (conflictResult.rows.length === 0) throw new Error('Conflict not found');

      const currentConflict = conflictResult.rows[0];
      const discussion: DiscussionComment[] = JSON.parse(currentConflict.discussion || '[]');

      const newComment: DiscussionComment = {
        ...comment,
        id: generateUniqueId('DISC').toString(),
        timestamp: new Date(),
      };

      discussion.push(newComment);

      const updateQuery = `UPDATE conflicts SET discussion = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`;
      const newStatus = currentConflict.status === 'open' ? 'discussing' : currentConflict.status;
      const result = await client.query(updateQuery, [JSON.stringify(discussion), newStatus, id]);

      const conflict = this.mapRowToConflict(result.rows[0]);
      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:comment', { conflict, comment: newComment });
      }

      logger.info({ conflictId: id }, 'Comment added to conflict');
      return conflict;
    });
  }

  async addOption(id: string, optionData: AddResolutionOptionRequest): Promise<Conflict> {
    return await db.withTransaction(async (client: PoolClient) => {
      const getQuery = `SELECT * FROM conflicts WHERE id = $1`;
      const conflictResult = await client.query(getQuery, [id]);
      if (conflictResult.rows.length === 0) throw new Error('Conflict not found');

      const currentConflict = conflictResult.rows[0];
      const options: ResolutionOption[] = JSON.parse(currentConflict.options || '[]');

      const newOption: ResolutionOption = {
        ...optionData,
        id: generateUniqueId('OPT').toString(),
        votes: [],
      };

      options.push(newOption);

      const updateQuery = `UPDATE conflicts SET options = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
      const result = await client.query(updateQuery, [JSON.stringify(options), id]);

      const conflict = this.mapRowToConflict(result.rows[0]);
      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:option_added', { conflict, option: newOption });
      }

      logger.info({ conflictId: id, optionId: newOption.id }, 'Option added to conflict');
      return conflict;
    });
  }

  async vote(id: string, optionId: string, voteData: VoteOnOptionRequest): Promise<Conflict> {
    return await db.withTransaction(async (client: PoolClient) => {
      const getQuery = `SELECT * FROM conflicts WHERE id = $1`;
      const conflictResult = await client.query(getQuery, [id]);
      if (conflictResult.rows.length === 0) throw new Error('Conflict not found');

      const currentConflict = conflictResult.rows[0];
      const options: ResolutionOption[] = JSON.parse(currentConflict.options || '[]');

      const optionIndex = options.findIndex(o => o.id === optionId);
      if (optionIndex === -1) throw new Error('Resolution option not found');

      const newVote: Vote = {
        userId: voteData.userId,
        userName: voteData.userName,
        userRole: voteData.userRole,
        timestamp: new Date(),
      };

      // Remove any existing vote from this user on this option
      options[optionIndex].votes = options[optionIndex].votes.filter(v => v.userId !== voteData.userId);
      options[optionIndex].votes.push(newVote);

      const updateQuery = `UPDATE conflicts SET options = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
      const result = await client.query(updateQuery, [JSON.stringify(options), id]);

      const conflict = this.mapRowToConflict(result.rows[0]);
      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:vote_cast', { conflict, optionId, vote: newVote });
      }

      logger.info({ conflictId: id, optionId }, 'Vote cast on conflict option');
      return conflict;
    });
  }

  async resolveConflict(id: string, resolutionData: ResolveConflictRequest): Promise<{ conflict: Conflict, updatedDocuments: unknown[] }> {
    return await db.withTransaction(async (client: PoolClient) => {
      const resolution: Resolution = {
        ...resolutionData,
        approvedBy: resolutionData.approvedBy.map(a => ({
          ...a,
          timestamp: new Date(),
        })),
        documentsUpdated: resolutionData.documentsUpdated.map(d => ({
          ...d,
          version: 1,
        })),
        implementedAt: new Date(),
      };

      const updateQuery = `UPDATE conflicts SET resolution = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`;
      const result = await client.query(updateQuery, [JSON.stringify(resolution), 'resolved', id]);

      if (result.rows.length === 0) throw new Error('Conflict not found');

      const conflict = this.mapRowToConflict(result.rows[0]);

      if (this.webSocketService) {
        // this.webSocketService.broadcast('conflict:resolved', conflict);
      }

      logger.info({ conflictId: id }, 'Conflict resolved successfully');
      return { conflict, updatedDocuments: resolution.documentsUpdated };
    });
  }

  async getConflictAnalytics(projectId: string): Promise<ConflictResolutionAnalytics[]> {
    const conflicts = await this.getAllConflicts({ brdId: projectId });

    return conflicts.filter(c => c.resolution).map(conflict => {
      const timeToResolve = conflict.resolution?.implementedAt
        ? (conflict.resolution.implementedAt.getTime() - conflict.createdAt.getTime()) / (1000 * 60 * 60)
        : undefined;

      const participants = new Set([
        ...conflict.discussion.map(d => d.userId),
        ...conflict.options.flatMap(o => o.votes.map(v => v.userId)),
      ]);

      const participantsByRole: Record<string, number> = {
        business: 0,
        product: 0,
        engineering: 0,
        tpm: 0,
      };

      conflict.discussion.forEach(d => {
        if (participantsByRole[d.userRole] !== undefined) {
          participantsByRole[d.userRole]++;
        }
      });

      const winningOption = conflict.options.find(o => o.id === conflict.resolution?.selectedOptionId);
      const winningOptionVotes = winningOption?.votes.length || 0;
      const totalVotes = conflict.options.reduce((sum, o) => sum + o.votes.length, 0);
      const consensusPercentage = totalVotes > 0 ? (winningOptionVotes / totalVotes) * 100 : 0;

      return {
        conflictId: conflict.id,
        timeToResolve,
        commentCount: conflict.discussion.length,
        optionCount: conflict.options.length,
        voteCount: totalVotes,
        participantCount: participants.size,
        participantsByRole: participantsByRole as Record<'business' | 'product' | 'engineering' | 'tpm', number>,
        winningOptionVotes,
        consensusPercentage,
      };
    });
  }

  async getSummary(): Promise<ConflictSummary> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'discussing' THEN 1 END) as discussing_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count
      FROM conflicts
    `;

    try {
      const result = await db.query(query);
      const row = result.rows[0];
      const allConflicts = await this.getAllConflicts();

      const typeCount: Record<string, number> = { timeline: 0, budget: 0, scope: 0, technical: 0 };
      const severityCount: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
      const roleCount: Record<string, number> = { business: 0, product: 0, engineering: 0, tpm: 0 };
      let totalComments = 0;
      let totalOptions = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      allConflicts.forEach(conflict => {
        typeCount[conflict.type]++;
        severityCount[conflict.severity]++;
        roleCount[conflict.raisedByRole]++;
        totalComments += conflict.discussion.length;
        totalOptions += conflict.options.length;

        if (conflict.resolution) {
          resolvedCount++;
          const resolutionTime = (conflict.resolution.implementedAt.getTime() - conflict.createdAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTime += resolutionTime;
        }
      });

      const avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;

      return {
        total: parseInt(row.total),
        byStatus: {
          open: parseInt(row.open_count),
          discussing: parseInt(row.discussing_count),
          resolved: parseInt(row.resolved_count),
          closed: parseInt(row.closed_count),
        },
        byType: typeCount as Record<'timeline' | 'budget' | 'scope' | 'technical', number>,
        bySeverity: severityCount as Record<'low' | 'medium' | 'high' | 'critical', number>,
        byRole: roleCount as Record<'business' | 'product' | 'engineering' | 'tpm', number>,
        avgResolutionTime,
        totalComments,
        totalOptions,
        resolvedThisMonth: resolvedCount,
      };
    } catch (error) {
      logger.error({ error }, 'Error getting conflict summary');
      throw new Error('Failed to get conflict summary');
    }
  }

  private buildWhereClause(filters: ConflictFilters): {
    whereClause: string;
    queryParams: (string | string[])[];
  } {
    const conditions: string[] = [];
    const queryParams: (string | string[])[] = [];
    let paramCount = 0;

    if (filters.status && filters.status.length > 0) {
      conditions.push(`c.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }
    if (filters.type && filters.type.length > 0) {
      conditions.push(`c.type = ANY($${++paramCount})`);
      queryParams.push(filters.type);
    }
    if (filters.severity && filters.severity.length > 0) {
      conditions.push(`c.severity = ANY($${++paramCount})`);
      queryParams.push(filters.severity);
    }
    if (filters.raisedBy) {
      conditions.push(`c.raised_by = $${++paramCount}`);
      queryParams.push(filters.raisedBy);
    }
    if (filters.search) {
      conditions.push(`(c.title ILIKE $${++paramCount} OR c.description ILIKE $${paramCount})`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  private mapRowToConflict(row: any): Conflict {
    // PostgreSQL JSONB columns return as objects, not strings
    const discussionData = typeof row.discussion === 'string' ? JSON.parse(row.discussion) : (row.discussion || []);
    const discussion: DiscussionComment[] = discussionData.map((d: Record<string, unknown>) => ({
      ...d,
      timestamp: new Date(d.timestamp as string),
    }));

    const optionsData = typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []);
    const options: ResolutionOption[] = optionsData.map((o: Record<string, unknown>) => ({
      ...o,
      votes: ((o.votes as Record<string, unknown>[]) || []).map(v => ({
        ...v,
        timestamp: new Date(v.timestamp as string),
      })),
    }));

    const resolution = row.resolution
      ? (typeof row.resolution === 'string' ? JSON.parse(row.resolution) : row.resolution)
      : undefined;

    if (resolution) {
      resolution.implementedAt = new Date(resolution.implementedAt);
      resolution.approvedBy = resolution.approvedBy.map((a: Record<string, unknown>) => ({
        ...a,
        timestamp: new Date(a.timestamp as string),
      }));
    }

    const affectedDocuments = typeof row.affected_documents === 'string'
      ? JSON.parse(row.affected_documents)
      : (row.affected_documents || {});

    const affectedItems = typeof row.affected_items === 'string'
      ? JSON.parse(row.affected_items)
      : (row.affected_items || []);

    const conflict: Conflict = {
      id: row.id as string,
      type: row.type as 'timeline' | 'budget' | 'scope' | 'technical',
      title: row.title as string,
      description: row.description as string,
      severity: row.severity as 'low' | 'medium' | 'high' | 'critical',
      raisedBy: row.raised_by as string,
      raisedByRole: row.raised_by_role as 'business' | 'product' | 'engineering' | 'tpm',
      affectedDocuments,
      affectedItems,
      discussion,
      options,
      resolution,
      status: row.status as 'open' | 'discussing' | 'resolved' | 'closed',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };

    if (row.raised_by_username) {
      conflict.raisedByUser = {
        id: row.raised_by as string,
        username: row.raised_by_username as string,
      };
    }

    conflict.totalComments = discussion.length;
    conflict.totalOptions = options.length;
    conflict.mostVotedOption = options.sort((a, b) => b.votes.length - a.votes.length)[0];
    conflict.participantCount = new Set([
      ...discussion.map(d => d.userId),
      ...options.flatMap(o => o.votes.map(v => v.userId)),
    ]).size;

    return conflict;
  }
}

export { ConflictService };
export default ConflictService;
