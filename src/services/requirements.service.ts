/**
 * Requirements Service - Business logic for requirements management
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  Requirement,
  RequirementVersion,
  CreateRequirementRequest,
  UpdateRequirementRequest,
  RequirementFilters,
  PaginationParams,
  PaginatedResponse,
  RequirementSummary,
  REQUIREMENT_STATUS,
  RequirementStatusType,
  RequirementPriorityType,
} from '../models/requirement.model';
import IdGenerator from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

interface GetRequirementOptions {
  includeArchived?: boolean;
  client?: PoolClient;
}

interface RequirementRow {
  id: string;
  title: string;
  description: string | null;
  status: RequirementStatusType;
  priority: RequirementPriorityType;
  assigned_to: string | null;
  created_by: string;
  due_date: Date | null;
  estimated_effort: number | null;
  actual_effort: number | null;
  completion_percentage: number;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  created_by_username: string;
  created_by_first_name: string | null;
  created_by_last_name: string | null;
  assigned_to_username?: string | null;
  assigned_to_first_name?: string | null;
  assigned_to_last_name?: string | null;
}

interface RequirementVersionRow {
  id: string;
  requirement_id: string;
  version_number: number;
  title: string;
  description: string | null;
  status: RequirementStatusType;
  priority: RequirementPriorityType;
  assigned_to: string | null;
  due_date: Date | null;
  estimated_effort: number | null;
  actual_effort: number | null;
  completion_percentage: number;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  changed_by: string;
  change_reason: string | null;
  created_at: Date;
  changed_by_username?: string;
  changed_by_first_name?: string | null;
  changed_by_last_name?: string | null;
}

class RequirementsService {
  private webSocketService?: WebSocketService | undefined;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }
  /**
   * Create a new requirement
   */
  async createRequirement(
    data: CreateRequirementRequest,
    createdBy: string
  ): Promise<Requirement> {
    const requirementId = IdGenerator.generateRequirementId();

    const query = `
      INSERT INTO requirements (
        id, title, description, priority, assigned_to, created_by,
        due_date, estimated_effort, tags, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      requirementId,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.assignedTo || null,
      createdBy,
      data.dueDate ? new Date(data.dueDate) : null,
      data.estimatedEffort || null,
      data.tags || [],
      data.metadata || null,
    ];

    try {
      const result = await db.query(query, values);
      const requirement = result.rows[0];

      // Create initial version
      await this.createVersion(requirement, createdBy, 'Initial creation');

      // Get the complete requirement with user details
      const fullRequirement = await this.getRequirementById(requirement.id);

      // Emit WebSocket event for requirement creation
      if (this.webSocketService) {
        this.webSocketService.broadcastRequirementUpdate(
          requirement.id,
          fullRequirement,
          'created',
          createdBy
        );
      }

      return fullRequirement;
    } catch (error) {
      logger.error({ error }, 'Error creating requirement');
      throw new Error('Failed to create requirement');
    }
  }

  /**
   * Get requirement by ID with user details
   */
  async getRequirementById(id: string, options: GetRequirementOptions = {}): Promise<Requirement> {
    const { includeArchived = false, client } = options;

    const query = `
      SELECT
        r.*,
        u1.username as created_by_username,
        u1.first_name as created_by_first_name,
        u1.last_name as created_by_last_name,
        u2.username as assigned_to_username,
        u2.first_name as assigned_to_first_name,
        u2.last_name as assigned_to_last_name
      FROM requirements r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      WHERE r.id = $1${includeArchived ? '' : " AND r.status != 'archived'"}
    `;

    try {
      const executor = client ? client.query.bind(client) : db.query.bind(db);
      const result = await executor(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Requirement not found');
      }

      return this.mapRowToRequirement(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting requirement by ID');
      throw error;
    }
  }

  /**
   * Bulk update multiple requirements in a single transaction
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: UpdateRequirementRequest }>,
    updatedBy: string
  ): Promise<void> {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      for (const update of updates) {
        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: (string | number | string[] | Date | Record<string, any> | null)[] = [];
        let paramCount = 0;

        if (update.data.title !== undefined) {
          updateFields.push(`title = $${++paramCount}`);
          updateValues.push(update.data.title);
        }
        if (update.data.description !== undefined) {
          updateFields.push(`description = $${++paramCount}`);
          updateValues.push(update.data.description);
        }
        if (update.data.status !== undefined) {
          updateFields.push(`status = $${++paramCount}`);
          updateValues.push(update.data.status);

          if (update.data.status === REQUIREMENT_STATUS.COMPLETED) {
            updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
          }
        }
        if (update.data.priority !== undefined) {
          updateFields.push(`priority = $${++paramCount}`);
          updateValues.push(update.data.priority);
        }
        if (update.data.assignedTo !== undefined) {
          updateFields.push(`assigned_to = $${++paramCount}`);
          updateValues.push(update.data.assignedTo);
        }

        if (updateFields.length > 0) {
          const updateQuery = `
            UPDATE requirements
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${++paramCount}
          `;
          updateValues.push(update.id);

          await client.query(updateQuery, updateValues);
        }
      }

      await client.query('COMMIT');
      logger.info({ count: updates.length, updatedBy }, 'Bulk update successful');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, count: updates.length }, 'Bulk update failed - rolled back');
      throw new Error('Bulk update failed');
    } finally {
      client.release();
    }
  }

  /**
   * Get paginated list of requirements with filters
   */
  async getRequirements(
    filters: RequirementFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Requirement>> {
    const { whereClause, queryParams, paramCount } = this.buildWhereClause(filters);
    const offset = (pagination.page - 1) * pagination.limit;

    // Build ORDER BY clause
    const sortBy = pagination.sortBy || 'created_at';
    const sortOrder = pagination.sortOrder || 'DESC';
    const orderBy = `ORDER BY r.${sortBy} ${sortOrder}`;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM requirements r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      ${whereClause}
    `;

    // Data query
    const dataQuery = `
      SELECT
        r.*,
        u1.username as created_by_username,
        u1.first_name as created_by_first_name,
        u1.last_name as created_by_last_name,
        u2.username as assigned_to_username,
        u2.first_name as assigned_to_first_name,
        u2.last_name as assigned_to_last_name
      FROM requirements r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, queryParams),
        db.query(dataQuery, [...queryParams, pagination.limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / pagination.limit);

      const requirements = dataResult.rows.map((row: RequirementRow) => this.mapRowToRequirement(row));

      return {
        data: requirements,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        }
      };
    } catch (error) {
      logger.error({ error }, 'Error getting requirements');
      throw new Error('Failed to get requirements');
    }
  }

  /**
   * Update a requirement
   */
  async updateRequirement(
    id: string,
    data: UpdateRequirementRequest,
    updatedBy: string,
    changeReason?: string
  ): Promise<Requirement> {
    // Get current requirement for versioning (unused but kept for potential future use)
    // const currentRequirement = await this.getRequirementById(id);

    return await db.withTransaction(async (client: PoolClient) => {
      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: (string | number | string[] | Date | Record<string, any> | null)[] = [];
      let paramCount = 0;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(data.description);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${++paramCount}`);
        updateValues.push(data.status);

        // Set completed_at if status is completed
        if (data.status === REQUIREMENT_STATUS.COMPLETED) {
          updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
        }
      }
      if (data.priority !== undefined) {
        updateFields.push(`priority = $${++paramCount}`);
        updateValues.push(data.priority);
      }
      if (data.assignedTo !== undefined) {
        updateFields.push(`assigned_to = $${++paramCount}`);
        updateValues.push(data.assignedTo);
      }
      if (data.dueDate !== undefined) {
        updateFields.push(`due_date = $${++paramCount}`);
        updateValues.push(data.dueDate ? new Date(data.dueDate) : null);
      }
      if (data.estimatedEffort !== undefined) {
        updateFields.push(`estimated_effort = $${++paramCount}`);
        updateValues.push(data.estimatedEffort);
      }
      if (data.actualEffort !== undefined) {
        updateFields.push(`actual_effort = $${++paramCount}`);
        updateValues.push(data.actualEffort);
      }
      if (data.completionPercentage !== undefined) {
        updateFields.push(`completion_percentage = $${++paramCount}`);
        updateValues.push(data.completionPercentage);
      }
      if (data.tags !== undefined) {
        updateFields.push(`tags = $${++paramCount}`);
        updateValues.push(data.tags);
      }
      if (data.metadata !== undefined) {
        updateFields.push(`metadata = $${++paramCount}`);
        updateValues.push(data.metadata);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      const updateQuery = `
        UPDATE requirements
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Requirement not found');
      }

      const updatedRequirement = result.rows[0];

      // Create version record
      await this.createVersionWithClient(
        client,
        updatedRequirement,
        updatedBy,
        changeReason || 'Requirement updated'
      );

      // Get updated requirement with user details
      const updatedRequirementWithDetails = await this.getRequirementById(id, {
        includeArchived: true,
        client,
      });

      // Emit WebSocket event for requirement update
      if (this.webSocketService) {
        this.webSocketService.broadcastRequirementUpdate(
          id,
          updatedRequirementWithDetails,
          'updated',
          updatedBy
        );
      }

      return updatedRequirementWithDetails;
    });
  }

  /**
   * Soft delete a requirement
   */
  async deleteRequirement(id: string, deletedBy: string): Promise<void> {
    const query = `
      UPDATE requirements
      SET status = 'archived', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status != 'archived'
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('Requirement not found or already archived');
      }

      const archivedRequirement = result.rows[0];

      // Create version record for deletion
      await this.createVersion(archivedRequirement, deletedBy, 'Requirement archived');

      // Get the complete requirement for WebSocket broadcast
      const fullRequirement = await this.getRequirementById(id, { includeArchived: true });

      // Emit WebSocket event for requirement deletion/archival
      if (this.webSocketService) {
        this.webSocketService.broadcastRequirementUpdate(
          id,
          fullRequirement,
          'deleted',
          deletedBy
        );
      }
    } catch (error) {
      logger.error({ error, id }, 'Error deleting requirement');
      throw error;
    }
  }

  /**
   * Get version history for a requirement
   */
  async getRequirementVersions(requirementId: string): Promise<RequirementVersion[]> {
    const query = `
      SELECT
        rv.*,
        u.username as changed_by_username,
        u.first_name as changed_by_first_name,
        u.last_name as changed_by_last_name
      FROM requirements_versions rv
      LEFT JOIN users u ON rv.changed_by = u.id
      WHERE rv.requirement_id = $1
      ORDER BY rv.version_number DESC
    `;

    try {
      const result = await db.query(query, [requirementId]);
      return result.rows.map((row: RequirementVersionRow) => this.mapRowToVersion(row));
    } catch (error) {
      logger.error({ error, requirementId }, 'Error getting requirement versions');
      throw new Error('Failed to get requirement versions');
    }
  }

  /**
   * Get requirements summary statistics
   */
  async getRequirementsSummary(filters: RequirementFilters = {}): Promise<RequirementSummary> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);

    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority_count,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical_priority_count,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('completed', 'archived', 'cancelled') THEN 1 END) as overdue_count,
        COUNT(CASE WHEN completed_at >= date_trunc('month', CURRENT_DATE) AND status = 'completed' THEN 1 END) as completed_this_month
      FROM requirements r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      ${whereClause}
    `;

    try {
      const result = await db.query(query, queryParams);
      const row = result.rows[0];

      return {
        total: parseInt(row.total),
        byStatus: {
          draft: parseInt(row.draft_count),
          active: parseInt(row.active_count),
          completed: parseInt(row.completed_count),
          archived: parseInt(row.archived_count),
          cancelled: parseInt(row.cancelled_count),
          under_review: 0,
          approved: 0,
          rejected: 0,
          changes_requested: 0,
        },
        byPriority: {
          low: parseInt(row.low_priority_count),
          medium: parseInt(row.medium_priority_count),
          high: parseInt(row.high_priority_count),
          critical: parseInt(row.critical_priority_count),
        },
        overdue: parseInt(row.overdue_count),
        completedThisMonth: parseInt(row.completed_this_month),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting requirements summary');
      throw new Error('Failed to get requirements summary');
    }
  }

  /**
   * Create a version record for a requirement
   */
  private async createVersion(
    requirement: Requirement,
    changedBy: string,
    changeReason: string
  ): Promise<void> {
    const client = await db.getClient();
    try {
      await this.createVersionWithClient(client, requirement, changedBy, changeReason);
    } finally {
      client.release();
    }
  }

  /**
   * Create a version record using an existing client
   */
  private async createVersionWithClient(
    client: PoolClient,
    requirement: Requirement,
    changedBy: string,
    changeReason: string
  ): Promise<void> {
    // Get next version number
    const versionQuery = `
      SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
      FROM requirements_versions
      WHERE requirement_id = $1
    `;

    const versionResult = await client.query(versionQuery, [requirement.id]);
    const nextVersion = versionResult.rows[0].next_version;

    const insertQuery = `
      INSERT INTO requirements_versions (
        requirement_id, version_number, title, description, status, priority,
        assigned_to, due_date, estimated_effort, actual_effort, completion_percentage,
        tags, metadata, changed_by, change_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    const values = [
      requirement.id,
      nextVersion,
      requirement.title,
      requirement.description,
      requirement.status,
      requirement.priority,
      requirement.assignedTo,
      requirement.dueDate,
      requirement.estimatedEffort,
      requirement.actualEffort,
      requirement.completionPercentage,
      requirement.tags,
      requirement.metadata,
      changedBy,
      changeReason,
    ];

    await client.query(insertQuery, values);
  }

  /**
   * Build WHERE clause for filtering requirements
   */
  private buildWhereClause(filters: RequirementFilters): {
    whereClause: string;
    queryParams: (string | string[] | Date)[];
    paramCount: number;
  } {
    const conditions: string[] = ['r.status != \'archived\'']; // Always exclude archived by default
    const queryParams: (string | string[] | Date)[] = [];
    let paramCount = 0;

    if (filters.status && filters.status.length > 0) {
      conditions.pop(); // Remove default archived exclusion if status is explicitly filtered
      conditions.push(`r.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }

    if (filters.priority && filters.priority.length > 0) {
      conditions.push(`r.priority = ANY($${++paramCount})`);
      queryParams.push(filters.priority);
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      conditions.push(`r.assigned_to = ANY($${++paramCount})`);
      queryParams.push(filters.assignedTo);
    }

    if (filters.createdBy && filters.createdBy.length > 0) {
      conditions.push(`r.created_by = ANY($${++paramCount})`);
      queryParams.push(filters.createdBy);
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`r.tags && $${++paramCount}`);
      queryParams.push(filters.tags);
    }

    if (filters.dueDateFrom) {
      conditions.push(`r.due_date >= $${++paramCount}`);
      queryParams.push(new Date(filters.dueDateFrom));
    }

    if (filters.dueDateTo) {
      conditions.push(`r.due_date <= $${++paramCount}`);
      queryParams.push(new Date(filters.dueDateTo));
    }

    if (filters.search) {
      const titleParamIndex = ++paramCount;
      const descriptionParamIndex = ++paramCount;
      conditions.push(`(r.title ILIKE $${titleParamIndex} OR r.description ILIKE $${descriptionParamIndex})`);
      queryParams.push(`%${filters.search}%`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { whereClause, queryParams, paramCount };
  }

  /**
   * Map database row to Requirement interface
   */
  private mapRowToRequirement(row: RequirementRow): Requirement {
    const requirement: Requirement = {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      createdBy: row.created_by,
      completionPercentage: row.completion_percentage,
      tags: row.tags ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByUser: {
        id: row.created_by,
        username: row.created_by_username,
        ...(row.created_by_first_name !== null && { firstName: row.created_by_first_name }),
        ...(row.created_by_last_name !== null && { lastName: row.created_by_last_name }),
      },
    };

    // Add optional properties only if they exist
    if (row.description !== null) requirement.description = row.description;
    if (row.assigned_to !== null) requirement.assignedTo = row.assigned_to;
    if (row.due_date !== null) requirement.dueDate = row.due_date;
    if (row.estimated_effort !== null) requirement.estimatedEffort = row.estimated_effort;
    if (row.actual_effort !== null) requirement.actualEffort = row.actual_effort;
    if (row.metadata !== null) requirement.metadata = row.metadata;
    if (row.completed_at !== null) requirement.completedAt = row.completed_at;
    if (row.assigned_to_username) {
      requirement.assignedToUser = {
        id: row.assigned_to!,
        username: row.assigned_to_username,
        ...(row.assigned_to_first_name !== null && { firstName: row.assigned_to_first_name }),
        ...(row.assigned_to_last_name !== null && { lastName: row.assigned_to_last_name }),
      };
    }

    return requirement;
  }

  /**
   * Map database row to RequirementVersion interface
   */
  private mapRowToVersion(row: RequirementVersionRow): RequirementVersion {
    const version: RequirementVersion = {
      id: row.id,
      requirementId: row.requirement_id,
      versionNumber: row.version_number,
      title: row.title,
      status: row.status,
      priority: row.priority,
      completionPercentage: row.completion_percentage,
      tags: row.tags ?? [],
      changedBy: row.changed_by,
      createdAt: row.created_at,
    };

    // Add optional properties only if they exist
    if (row.description !== null) version.description = row.description;
    if (row.assigned_to !== null) version.assignedTo = row.assigned_to;
    if (row.due_date !== null) version.dueDate = row.due_date;
    if (row.estimated_effort !== null) version.estimatedEffort = row.estimated_effort;
    if (row.actual_effort !== null) version.actualEffort = row.actual_effort;
    if (row.metadata !== null) version.metadata = row.metadata;
    if (row.change_reason !== null) version.changeReason = row.change_reason;

    return version;
  }
}

export { RequirementsService };
export default RequirementsService;
