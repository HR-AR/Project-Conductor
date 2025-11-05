/**
 * Activity Service - Business logic for agent activity logging
 */

import { db } from '../config/database';
import {
  AgentActivityEvent,
  AgentActivityEventType,
  ActivitySeverity,
  ActivityStatus,
  ActivityLogRecord,
  ActivityLogFilters,
  ActivityLogQueryResult,
  ActivityStats,
  AgentStartedEventData,
  AgentProgressEventData,
  AgentCompletedEventData,
  AgentConflictDetectedEventData,
  AgentPausedEventData,
  AgentErrorEventData
} from '../models/activity.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class ActivityService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Log agent started event
   */
  async logAgentStarted(data: AgentStartedEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.STARTED,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.STARTED,
      ActivitySeverity.INFO,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentStarted(data);
      }

      logger.debug({ activityId, agentType: data.agentType, taskId: data.taskId }, 'Agent started event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent started event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Log agent progress event
   */
  async logAgentProgress(data: AgentProgressEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.PROGRESS,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.IN_PROGRESS,
      ActivitySeverity.INFO,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentProgress(data);
      }

      logger.debug({ activityId, agentType: data.agentType, taskId: data.taskId, progress: data.progress }, 'Agent progress event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent progress event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Log agent completed event
   */
  async logAgentCompleted(data: AgentCompletedEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.COMPLETED,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.COMPLETED,
      data.result.success ? ActivitySeverity.SUCCESS : ActivitySeverity.WARNING,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentCompleted(data);
      }

      logger.debug({ activityId, agentType: data.agentType, taskId: data.taskId, success: data.result.success }, 'Agent completed event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent completed event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Log agent conflict detected event
   */
  async logAgentConflictDetected(data: AgentConflictDetectedEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const severityMap: Record<string, ActivitySeverity> = {
      low: ActivitySeverity.INFO,
      medium: ActivitySeverity.WARNING,
      high: ActivitySeverity.ERROR,
      critical: ActivitySeverity.CRITICAL
    };

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.CONFLICT_DETECTED,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.CONFLICT,
      severityMap[data.severity] || ActivitySeverity.WARNING,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentConflictDetected(data);
      }

      logger.warn({ activityId, agentType: data.agentType, taskId: data.taskId, conflictType: data.conflictType }, 'Agent conflict detected event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent conflict detected event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Log agent paused event
   */
  async logAgentPaused(data: AgentPausedEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.PAUSED,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.PAUSED,
      ActivitySeverity.WARNING,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentPaused(data);
      }

      logger.info({ activityId, agentType: data.agentType, taskId: data.taskId, reason: data.reason }, 'Agent paused event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent paused event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Log agent error event
   */
  async logAgentError(data: AgentErrorEventData): Promise<void> {
    const activityId = await generateUniqueId('ACT');

    const query = `
      INSERT INTO activity_log (
        id, event_type, agent_type, agent_name, task_id, task_description,
        project_id, status, severity, payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      activityId,
      AgentActivityEventType.ERROR,
      data.agentType,
      data.agentName,
      data.taskId,
      data.taskDescription,
      data.projectId || null,
      ActivityStatus.FAILED,
      ActivitySeverity.ERROR,
      JSON.stringify(data),
      data.timestamp
    ];

    try {
      await db.query(query, values);

      // Emit WebSocket event (non-blocking)
      if (this.webSocketService) {
        this.webSocketService.emitAgentError(data);
      }

      logger.error({ activityId, agentType: data.agentType, taskId: data.taskId, error: data.error }, 'Agent error event logged');
    } catch (error) {
      logger.error({ error, activityId, agentType: data.agentType }, 'Error logging agent error event');
      // Don't throw - event logging should not block agent execution
    }
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters: ActivityLogFilters): Promise<ActivityLogQueryResult> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (filters.projectId) {
      paramCount++;
      conditions.push(`project_id = $${paramCount}`);
      values.push(filters.projectId);
    }

    if (filters.agentType) {
      paramCount++;
      conditions.push(`agent_type = $${paramCount}`);
      values.push(filters.agentType);
    }

    if (filters.eventType) {
      paramCount++;
      conditions.push(`event_type = $${paramCount}`);
      values.push(filters.eventType);
    }

    if (filters.status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
    }

    if (filters.severity) {
      paramCount++;
      conditions.push(`severity = $${paramCount}`);
      values.push(filters.severity);
    }

    if (filters.startDate) {
      paramCount++;
      conditions.push(`timestamp >= $${paramCount}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      conditions.push(`timestamp <= $${paramCount}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM activity_log ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = parseInt((countResult.rows[0] as any)?.count, 10);

    // Get paginated results
    const query = `
      SELECT * FROM activity_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    values.push(limit, offset);

    const result = await db.query(query, values);

    return {
      activities: result.rows.map((row: any) => this.mapRowToActivityLog(row)),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total
    };
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(projectId?: string): Promise<ActivityStats> {
    const whereClause = projectId ? 'WHERE project_id = $1' : '';
    const values = projectId ? [projectId] : [];

    // Get event counts by type
    const eventTypeQuery = `
      SELECT event_type, COUNT(*) as count
      FROM activity_log
      ${whereClause}
      GROUP BY event_type
    `;
    const eventTypeResult = await db.query(eventTypeQuery, values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsByType = eventTypeResult.rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.event_type] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<AgentActivityEventType, number>);

    // Get event counts by severity
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM activity_log
      ${whereClause}
      GROUP BY severity
    `;
    const severityResult = await db.query(severityQuery, values);
    const eventsBySeverity = severityResult.rows.reduce((acc: any, row: any) => {
      acc[row.severity] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<ActivitySeverity, number>);

    // Get event counts by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM activity_log
      ${whereClause}
      GROUP BY status
    `;
    const statusResult = await db.query(statusQuery, values);
    const eventsByStatus = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<ActivityStatus, number>);

    // Get agent stats
    const agentStatsQuery = `
      SELECT
        agent_type,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
        AVG(CASE
          WHEN event_type = 'agent.completed' AND (payload->>'duration')::numeric IS NOT NULL
          THEN (payload->>'duration')::numeric
          ELSE NULL
        END) as avg_duration
      FROM activity_log
      ${whereClause}
      GROUP BY agent_type
    `;
    const agentStatsResult = await db.query(agentStatsQuery, values);
    const agentStats = agentStatsResult.rows.map((row: any) => ({
      agentType: row.agent_type,
      totalTasks: parseInt(row.total_tasks, 10),
      completedTasks: parseInt(row.completed_tasks, 10),
      failedTasks: parseInt(row.failed_tasks, 10),
      averageDuration: parseFloat(row.avg_duration || '0'),
      successRate: row.total_tasks > 0 ? (row.completed_tasks / row.total_tasks) * 100 : 0
    }));

    // Get recent errors
    const errorsQuery = `
      SELECT * FROM activity_log
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} event_type = $${values.length + 1}
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const errorsResult = await db.query(errorsQuery, [...values, AgentActivityEventType.ERROR]);
    const recentErrors = errorsResult.rows.map((row: any) => this.mapRowToActivityLog(row));

    // Get recent conflicts
    const conflictsQuery = `
      SELECT * FROM activity_log
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} event_type = $${values.length + 1}
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const conflictsResult = await db.query(conflictsQuery, [...values, AgentActivityEventType.CONFLICT_DETECTED]);
    const recentConflicts = conflictsResult.rows.map((row: any) => this.mapRowToActivityLog(row));

    const totalQuery = `SELECT COUNT(*) as count FROM activity_log ${whereClause}`;
    const totalResult = await db.query(totalQuery, values);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalEvents = parseInt((totalResult.rows[0] as any)?.count, 10);

    return {
      totalEvents,
      eventsByType: eventsByType as Record<AgentActivityEventType, number>,
      eventsBySeverity: eventsBySeverity as Record<ActivitySeverity, number>,
      eventsByStatus: eventsByStatus as Record<ActivityStatus, number>,
      agentStats,
      recentErrors,
      recentConflicts
    };
  }

  /**
   * Map database row to activity log record
   */
  private mapRowToActivityLog(row: any): ActivityLogRecord {
    return {
      id: row.id,
      event_type: row.event_type,
      agent_type: row.agent_type,
      agent_name: row.agent_name,
      task_id: row.task_id,
      task_description: row.task_description,
      project_id: row.project_id,
      status: row.status,
      severity: row.severity,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      timestamp: row.timestamp,
      created_at: row.created_at
    };
  }
}

export default ActivityService;
