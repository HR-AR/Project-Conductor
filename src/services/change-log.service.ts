/**
 * Change Log Service - Business logic for Change Log management
 */

import { db } from '../config/database';
import {
  ChangeLogEntry,
  CreateChangeLogRequest,
  ApproveChangeRequest,
  ChangeLogFilters,
  ChangeLogSummary,
  DocumentComparison,
  ProjectChangeHistory,
  ChangeTimelineEntry,
} from '../models/change-log.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class ChangeLogService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  async createChangeLogEntry(data: CreateChangeLogRequest, createdBy: string): Promise<ChangeLogEntry> {
    const changeLogId = await generateUniqueId('CHANGE');

    const query = `
      INSERT INTO change_log (
        id, project_id, item, change, reason, impact, category, phase,
        approved_by, related_conflict_id, documents_before, documents_after, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      changeLogId,
      data.projectId,
      data.item,
      data.change,
      data.reason,
      data.impact,
      data.category,
      data.phase,
      JSON.stringify([]),
      data.relatedConflictId || null,
      JSON.stringify(data.documentsBefore),
      JSON.stringify(data.documentsAfter),
      createdBy,
    ];

    try {
      const result = await db.query(query, values);
      const entry = this.mapRowToChangeLog(result.rows[0]);

      if (this.webSocketService) {
        // this.webSocketService.broadcast('change:logged', entry);
      }

      logger.info({ changeLogId }, 'Change log entry created successfully');
      return entry;
    } catch (error) {
      logger.error({ error, changeLogId }, 'Error creating change log entry');
      throw new Error('Failed to create change log entry');
    }
  }

  async getChangeLogById(id: string): Promise<ChangeLogEntry | null> {
    const query = `SELECT cl.*, u.username as created_by_username FROM change_log cl LEFT JOIN users u ON cl.created_by = u.id WHERE cl.id = $1`;
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToChangeLog(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting change log entry');
      throw new Error('Failed to get change log entry');
    }
  }

  async getAllChangeLogs(filters: ChangeLogFilters = {}): Promise<ChangeLogEntry[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);
    const query = `SELECT cl.*, u.username as created_by_username FROM change_log cl LEFT JOIN users u ON cl.created_by = u.id ${whereClause} ORDER BY cl.timestamp DESC`;
    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToChangeLog(row));
    } catch (error) {
      logger.error({ error }, 'Error getting change logs');
      throw new Error('Failed to get change logs');
    }
  }

  async approveChange(id: string, approval: ApproveChangeRequest): Promise<ChangeLogEntry> {
    const getQuery = `SELECT * FROM change_log WHERE id = $1`;
    const changeLogResult = await db.query(getQuery, [id]);
    if (changeLogResult.rows.length === 0) throw new Error('Change log entry not found');

    const currentEntry = changeLogResult.rows[0];
    const approvals = JSON.parse(currentEntry.approved_by || '[]');

    const newApproval = {
      stakeholderId: approval.stakeholderId,
      decision: approval.decision,
      comments: approval.comments,
      timestamp: new Date(),
    };

    approvals.push(newApproval);

    const updateQuery = `UPDATE change_log SET approved_by = $1 WHERE id = $2 RETURNING *`;
    const result = await db.query(updateQuery, [JSON.stringify(approvals), id]);

    const entry = this.mapRowToChangeLog(result.rows[0]);

    if (this.webSocketService) {
      // this.webSocketService.broadcast('change:approved', { entry, approval: newApproval });
    }

    logger.info({ changeLogId: id }, 'Change log entry approved');
    return entry;
  }

  async getProjectHistory(projectId: string): Promise<ProjectChangeHistory> {
    const changes = await this.getAllChangeLogs({ projectId });

    const timeline: ChangeTimelineEntry[] = changes.map(c => ({
      timestamp: c.timestamp,
      item: c.item,
      change: c.change,
      category: c.category,
      phase: c.phase,
      impact: c.impact,
    }));

    const summary = await this.getSummary({ projectId });

    const majorMilestones = this.identifyMajorMilestones(changes);

    return {
      projectId,
      totalChanges: changes.length,
      timeline,
      summary,
      majorMilestones,
    };
  }

  async compareDocuments(_before: unknown, _after: unknown): Promise<DocumentComparison> {
    // This would implement a deep diff algorithm
    // For now, return a simplified comparison
    return {
      documentType: 'BRD',
      documentId: 'sample-id',
      versionBefore: 1,
      versionAfter: 2,
      changes: [],
    };
  }

  async getSummary(filters: ChangeLogFilters = {}): Promise<ChangeLogSummary> {
    const changes = await this.getAllChangeLogs(filters);

    const categoryCount: Record<string, number> = {
      scope: 0,
      timeline: 0,
      budget: 0,
      technical: 0,
      process: 0,
    };

    const phaseCount: Record<string, number> = {
      pushed_to_phase_2: 0,
      simplified: 0,
      removed: 0,
      added: 0,
      modified: 0,
    };

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let changesThisWeek = 0;
    let changesThisMonth = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    changes.forEach(change => {
      categoryCount[change.category]++;
      phaseCount[change.phase]++;

      const approvals = change.approvedBy || [];
      if (approvals.some(a => a.decision === 'approved')) approvedCount++;
      else if (approvals.some(a => a.decision === 'rejected')) rejectedCount++;
      else pendingCount++;

      if (change.timestamp >= oneWeekAgo) changesThisWeek++;
      if (change.timestamp >= oneMonthAgo) changesThisMonth++;
    });

    // Find most active category and phase
    const mostActiveCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] as 'scope' | 'timeline' | 'budget' | 'technical' | 'process' || 'scope';
    const mostCommonPhase = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])[0]?.[0] as 'pushed_to_phase_2' | 'simplified' | 'removed' | 'added' | 'modified' || 'modified';

    return {
      total: changes.length,
      byCategory: categoryCount as Record<'scope' | 'timeline' | 'budget' | 'technical' | 'process', number>,
      byPhase: phaseCount as Record<'pushed_to_phase_2' | 'simplified' | 'removed' | 'added' | 'modified', number>,
      totalApproved: approvedCount,
      totalPending: pendingCount,
      totalRejected: rejectedCount,
      changesThisWeek,
      changesThisMonth,
      mostActiveCategory,
      mostCommonPhase,
    };
  }

  private identifyMajorMilestones(changes: ChangeLogEntry[]): Array<{ date: Date; description: string; changesCount: number }> {
    // Group changes by week
    const weeklyChanges = new Map<string, ChangeLogEntry[]>();

    changes.forEach(change => {
      const weekKey = this.getWeekKey(change.timestamp);
      if (!weeklyChanges.has(weekKey)) {
        weeklyChanges.set(weekKey, []);
      }
      weeklyChanges.get(weekKey)!.push(change);
    });

    // Identify weeks with significant changes (>3 changes)
    const milestones: Array<{ date: Date; description: string; changesCount: number }> = [];

    weeklyChanges.forEach((weekChanges) => {
      if (weekChanges.length >= 3) {
        const firstChange = weekChanges[0];
        milestones.push({
          date: firstChange.timestamp,
          description: `Major updates: ${weekChanges.map(c => c.item).slice(0, 3).join(', ')}`,
          changesCount: weekChanges.length,
        });
      }
    });

    return milestones.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private getWeekKey(date: Date): string {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0] || '';
  }

  private buildWhereClause(filters: ChangeLogFilters): {
    whereClause: string;
    queryParams: (string | string[])[];
  } {
    const conditions: string[] = [];
    const queryParams: (string | string[])[] = [];
    let paramCount = 0;

    if (filters.projectId) {
      conditions.push(`cl.project_id = $${++paramCount}`);
      queryParams.push(filters.projectId);
    }
    if (filters.category && filters.category.length > 0) {
      conditions.push(`cl.category = ANY($${++paramCount})`);
      queryParams.push(filters.category);
    }
    if (filters.phase && filters.phase.length > 0) {
      conditions.push(`cl.phase = ANY($${++paramCount})`);
      queryParams.push(filters.phase);
    }
    if (filters.createdBy) {
      conditions.push(`cl.created_by = $${++paramCount}`);
      queryParams.push(filters.createdBy);
    }
    if (filters.relatedConflictId) {
      conditions.push(`cl.related_conflict_id = $${++paramCount}`);
      queryParams.push(filters.relatedConflictId);
    }
    if (filters.search) {
      conditions.push(`(cl.item ILIKE $${++paramCount} OR cl.change ILIKE $${paramCount} OR cl.reason ILIKE $${paramCount} OR cl.impact ILIKE $${paramCount})`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  private mapRowToChangeLog(row: any): ChangeLogEntry {
    const entry: ChangeLogEntry = {
      id: row.id as string,
      projectId: row.project_id as string,
      item: row.item as string,
      change: row.change as string,
      reason: row.reason as string,
      impact: row.impact as string,
      category: row.category as 'scope' | 'timeline' | 'budget' | 'technical' | 'process',
      phase: row.phase as 'pushed_to_phase_2' | 'simplified' | 'removed' | 'added' | 'modified',
      approvedBy: JSON.parse(row.approved_by as string || '[]').map((a: Record<string, unknown>) => ({
        ...a,
        timestamp: new Date(a.timestamp as string),
      })),
      relatedConflictId: row.related_conflict_id as string | undefined,
      documentsBefore: JSON.parse(row.documents_before as string || '[]'),
      documentsAfter: JSON.parse(row.documents_after as string || '[]'),
      timestamp: new Date(row.timestamp as string),
      createdBy: row.created_by as string,
    };

    if (row.created_by_username) {
      entry.createdByUser = {
        id: row.created_by as string,
        username: row.created_by_username as string,
      };
    }

    const approvals = entry.approvedBy || [];
    entry.isApproved = approvals.some(a => a.decision === 'approved');
    entry.approvalCount = approvals.filter(a => a.decision === 'approved').length;
    entry.rejectionCount = approvals.filter(a => a.decision === 'rejected').length;

    return entry;
  }
}

export { ChangeLogService };
export default ChangeLogService;
