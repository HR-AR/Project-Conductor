/**
 * BRD Service - Business logic for Business Requirements Document management
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  BRD,
  CreateBRDRequest,
  UpdateBRDRequest,
  ApproveBRDRequest,
  BRDFilters,
  BRDApprovalStatus,
  BRDSummary,
  Stakeholder,
  Approval,
  BRD_STATUS,
  APPROVAL_DECISION,
} from '../models/brd.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class BRDService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a new BRD
   */
  async createBRD(data: CreateBRDRequest, createdBy: string): Promise<BRD> {
    const brdId = await generateUniqueId('BRD');

    // Generate IDs for stakeholders
    const stakeholders: Stakeholder[] = data.stakeholders.map(s => ({
      ...s,
      id: generateUniqueId('STK').toString(),
    }));

    const query = `
      INSERT INTO brds (
        id, title, problem_statement, business_impact, success_criteria,
        timeline_start_date, timeline_target_date, budget, stakeholders,
        status, version, approvals, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      brdId,
      data.title,
      data.problemStatement,
      data.businessImpact,
      JSON.stringify(data.successCriteria),
      new Date(data.timeline.startDate),
      new Date(data.timeline.targetDate),
      data.budget,
      JSON.stringify(stakeholders),
      BRD_STATUS.DRAFT,
      1,
      JSON.stringify([]),
      createdBy,
    ];

    try {
      const result = await db.query(query, values);
      const brd = this.mapRowToBRD(result.rows[0]);

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('brd:created', brd);
      }

      logger.info({ brdId }, 'BRD created successfully');
      return brd;
    } catch (error) {
      logger.error({ error, brdId }, 'Error creating BRD');
      throw new Error('Failed to create BRD');
    }
  }

  /**
   * Get BRD by ID
   */
  async getBRDById(id: string): Promise<BRD | null> {
    const query = `
      SELECT
        b.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM brds b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToBRD(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting BRD by ID');
      throw new Error('Failed to get BRD');
    }
  }

  /**
   * Get all BRDs with filtering
   */
  async getAllBRDs(filters: BRDFilters = {}): Promise<BRD[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);

    const query = `
      SELECT
        b.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM brds b
      LEFT JOIN users u ON b.created_by = u.id
      ${whereClause}
      ORDER BY b.created_at DESC
    `;

    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToBRD(row));
    } catch (error) {
      logger.error({ error }, 'Error getting BRDs');
      throw new Error('Failed to get BRDs');
    }
  }

  /**
   * Update a BRD
   */
  async updateBRD(id: string, data: UpdateBRDRequest): Promise<BRD> {
    return await db.withTransaction(async (client: PoolClient) => {
      const updateFields: string[] = [];
      const updateValues: (string | number | Date | string[])[] = [];
      let paramCount = 0;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.problemStatement !== undefined) {
        updateFields.push(`problem_statement = $${++paramCount}`);
        updateValues.push(data.problemStatement);
      }
      if (data.businessImpact !== undefined) {
        updateFields.push(`business_impact = $${++paramCount}`);
        updateValues.push(data.businessImpact);
      }
      if (data.successCriteria !== undefined) {
        updateFields.push(`success_criteria = $${++paramCount}`);
        updateValues.push(JSON.stringify(data.successCriteria));
      }
      if (data.timeline !== undefined) {
        updateFields.push(`timeline_start_date = $${++paramCount}`);
        updateValues.push(new Date(data.timeline.startDate));
        updateFields.push(`timeline_target_date = $${++paramCount}`);
        updateValues.push(new Date(data.timeline.targetDate));
      }
      if (data.budget !== undefined) {
        updateFields.push(`budget = $${++paramCount}`);
        updateValues.push(data.budget);
      }
      if (data.stakeholders !== undefined) {
        const stakeholders: Stakeholder[] = data.stakeholders.map(s => ({
          ...s,
          id: generateUniqueId('STK').toString(),
        }));
        updateFields.push(`stakeholders = $${++paramCount}`);
        updateValues.push(JSON.stringify(stakeholders));
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${++paramCount}`);
        updateValues.push(data.status);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Increment version
      updateFields.push(`version = version + 1`);

      const updateQuery = `
        UPDATE brds
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new Error('BRD not found');
      }

      const brd = this.mapRowToBRD(result.rows[0]);

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('brd:updated', brd);
      }

      logger.info({ brdId: id }, 'BRD updated successfully');
      return brd;
    });
  }

  /**
   * Delete a BRD (soft delete by archiving)
   */
  async deleteBRD(id: string): Promise<void> {
    const query = `
      UPDATE brds
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `;

    try {
      const result = await db.query(query, [BRD_STATUS.REJECTED, id]);

      if (result.rows.length === 0) {
        throw new Error('BRD not found');
      }

      logger.info({ brdId: id }, 'BRD deleted successfully');
    } catch (error) {
      logger.error({ error, id }, 'Error deleting BRD');
      throw error;
    }
  }

  /**
   * Approve or reject a BRD
   */
  async approveBRD(id: string, approval: ApproveBRDRequest): Promise<BRD> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Get current BRD
      const getBrdQuery = `SELECT * FROM brds WHERE id = $1`;
      const brdResult = await client.query(getBrdQuery, [id]);

      if (brdResult.rows.length === 0) {
        throw new Error('BRD not found');
      }

      const currentBrd = brdResult.rows[0];
      // JSONB field: PostgreSQL returns object, not string
      const approvalsData = typeof currentBrd.approvals === 'string' ? JSON.parse(currentBrd.approvals) : (currentBrd.approvals || []);
      const approvals: Approval[] = approvalsData;

      // Add or update approval
      const existingIndex = approvals.findIndex(a => a.stakeholderId === approval.stakeholderId);
      const newApproval: Approval = {
        stakeholderId: approval.stakeholderId,
        decision: approval.decision,
        comments: approval.comments,
        timestamp: new Date(),
      };

      if (existingIndex >= 0) {
        approvals[existingIndex] = newApproval;
      } else {
        approvals.push(newApproval);
      }

      // Check if all stakeholders have approved
      // JSONB field: PostgreSQL returns object, not string
      const stakeholdersData = typeof currentBrd.stakeholders === 'string' ? JSON.parse(currentBrd.stakeholders) : (currentBrd.stakeholders || []);
      const stakeholders: Stakeholder[] = stakeholdersData;
      const allApproved = stakeholders.every(s =>
        approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.APPROVED)
      );

      const newStatus = allApproved ? BRD_STATUS.APPROVED : BRD_STATUS.UNDER_REVIEW;

      // Update BRD
      const updateQuery = `
        UPDATE brds
        SET approvals = $1, status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        JSON.stringify(approvals),
        newStatus,
        id,
      ]);

      const brd = this.mapRowToBRD(result.rows[0]);

      // Emit WebSocket events
      if (this.webSocketService) {
        if (approval.decision === APPROVAL_DECISION.APPROVED) {
          // this.webSocketService.broadcast('brd:approved', { brd, approval: newApproval });
          if (allApproved) {
            // this.webSocketService.broadcast('brd:fully_approved', brd);
          }
        } else {
          // this.webSocketService.broadcast('brd:rejected', { brd, approval: newApproval });
        }
      }

      logger.info({ brdId: id, approval: approval.decision }, 'BRD approval recorded');
      return brd;
    });
  }

  /**
   * Get BRD approval status
   */
  async getBRDApprovalStatus(id: string): Promise<BRDApprovalStatus> {
    const brd = await this.getBRDById(id);

    if (!brd) {
      throw new Error('BRD not found');
    }

    const approvals = brd.approvals || [];
    const stakeholders = brd.stakeholders || [];

    const approved = stakeholders.filter(s =>
      approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.APPROVED)
    );

    const rejected = stakeholders.filter(s =>
      approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.REJECTED)
    );

    const pending = stakeholders.filter(s =>
      !approvals.some(a => a.stakeholderId === s.id)
    );

    return {
      brdId: id,
      isFullyApproved: approved.length === stakeholders.length,
      totalStakeholders: stakeholders.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      pendingCount: pending.length,
      pending,
      approved,
      rejected,
    };
  }

  /**
   * Get BRD summary statistics
   */
  async getBRDSummary(): Promise<BRDSummary> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        SUM(budget) as total_budget,
        AVG(budget) as average_budget
      FROM brds
    `;

    try {
      const result = await db.query(query);
      const row = result.rows[0];

      // Get department distribution
      const allBrds = await this.getAllBRDs();
      const departmentDistribution: Record<string, number> = {
        business: 0,
        product: 0,
        engineering: 0,
        marketing: 0,
        sales: 0,
      };

      allBrds.forEach(brd => {
        brd.stakeholders.forEach(stakeholder => {
          if (departmentDistribution[stakeholder.department] !== undefined) {
            departmentDistribution[stakeholder.department]++;
          }
        });
      });

      // Count fully approved BRDs
      const fullyApproved = allBrds.filter(brd => {
        const approvals = brd.approvals || [];
        const stakeholders = brd.stakeholders || [];
        return stakeholders.every(s =>
          approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.APPROVED)
        );
      }).length;

      return {
        total: parseInt(row.total),
        byStatus: {
          draft: parseInt(row.draft_count),
          under_review: parseInt(row.under_review_count),
          approved: parseInt(row.approved_count),
          rejected: parseInt(row.rejected_count),
        },
        byDepartment: departmentDistribution as Record<'business' | 'product' | 'engineering' | 'marketing' | 'sales', number>,
        totalBudget: parseFloat(row.total_budget) || 0,
        averageBudget: parseFloat(row.average_budget) || 0,
        fullyApproved,
        pendingApproval: parseInt(row.under_review_count),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting BRD summary');
      throw new Error('Failed to get BRD summary');
    }
  }

  /**
   * Build WHERE clause for filtering BRDs
   */
  private buildWhereClause(filters: BRDFilters): {
    whereClause: string;
    queryParams: (string | number | Date | string[])[];
  } {
    const conditions: string[] = [];
    const queryParams: (string | number | Date | string[])[] = [];
    let paramCount = 0;

    if (filters.status && filters.status.length > 0) {
      conditions.push(`b.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }

    if (filters.createdBy) {
      conditions.push(`b.created_by = $${++paramCount}`);
      queryParams.push(filters.createdBy);
    }

    if (filters.minBudget !== undefined) {
      conditions.push(`b.budget >= $${++paramCount}`);
      queryParams.push(filters.minBudget);
    }

    if (filters.maxBudget !== undefined) {
      conditions.push(`b.budget <= $${++paramCount}`);
      queryParams.push(filters.maxBudget);
    }

    if (filters.startDateFrom) {
      conditions.push(`b.timeline_start_date >= $${++paramCount}`);
      queryParams.push(new Date(filters.startDateFrom));
    }

    if (filters.startDateTo) {
      conditions.push(`b.timeline_start_date <= $${++paramCount}`);
      queryParams.push(new Date(filters.startDateTo));
    }

    if (filters.search) {
      const titleParam = ++paramCount;
      const problemParam = ++paramCount;
      conditions.push(`(b.title ILIKE $${titleParam} OR b.problem_statement ILIKE $${problemParam})`);
      queryParams.push(`%${filters.search}%`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  /**
   * Map database row to BRD interface
   */
  private mapRowToBRD(row: any): BRD {
    // JSONB fields: PostgreSQL returns objects, not strings
    const stakeholdersData = typeof row.stakeholders === 'string' ? JSON.parse(row.stakeholders) : (row.stakeholders || []);
    const approvalsData = typeof row.approvals === 'string' ? JSON.parse(row.approvals) : (row.approvals || []);
    const successCriteriaData = typeof row.success_criteria === 'string' ? JSON.parse(row.success_criteria) : (row.success_criteria || []);

    const stakeholders: Stakeholder[] = stakeholdersData;
    const approvals: Approval[] = approvalsData.map((a: Record<string, unknown>) => ({
      ...a,
      timestamp: new Date(a.timestamp as string),
    }));

    const brd: BRD = {
      id: row.id as string,
      title: row.title as string,
      problemStatement: row.problem_statement as string,
      businessImpact: row.business_impact as string,
      successCriteria: successCriteriaData,
      timeline: {
        startDate: new Date(row.timeline_start_date as string),
        targetDate: new Date(row.timeline_target_date as string),
      },
      budget: row.budget as number,
      stakeholders,
      status: row.status as 'draft' | 'under_review' | 'approved' | 'rejected',
      version: row.version as number,
      approvals,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
    };

    // Add computed fields
    if (row.created_by_username) {
      brd.createdByUser = {
        id: row.created_by as string,
        username: row.created_by_username as string,
        // ...(row.created_by_first_name && { firstName: row.created_by_first_name as string }),
        // ...(row.created_by_last_name && { lastName: row.created_by_last_name as string }),
      };
    }

    brd.isFullyApproved = stakeholders.every(s =>
      approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.APPROVED)
    );

    brd.pendingApprovals = stakeholders.filter(s =>
      !approvals.some(a => a.stakeholderId === s.id)
    );

    brd.approvedStakeholders = stakeholders.filter(s =>
      approvals.some(a => a.stakeholderId === s.id && a.decision === APPROVAL_DECISION.APPROVED)
    );

    return brd;
  }
}

export { BRDService };
export default BRDService;
