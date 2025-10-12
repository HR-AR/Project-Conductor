/**
 * Engineering Design Service - Business logic for Engineering Design management
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  EngineeringDesign,
  CreateEngineeringDesignRequest,
  UpdateEngineeringDesignRequest,
  ConflictDetectionResult,
  EngineeringDesignFilters,
  EngineeringDesignSummary,
  TeamCapacity,
  Estimate,
  Risk,
  DesignConflict,
} from '../models/engineering-design.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class EngineeringDesignService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a new Engineering Design
   */
  async createEngineeringDesign(data: CreateEngineeringDesignRequest, createdBy: string): Promise<EngineeringDesign> {
    const designId = await generateUniqueId('DESIGN');

    // Generate IDs for risks
    const risks: Risk[] = data.risks.map(r => ({
      ...r,
      id: generateUniqueId('RISK').toString(),
    }));

    // Parse estimates with dates
    const estimates: Estimate[] = data.estimates.map((e: any) => ({
      featureId: e.featureId,
      featureTitle: e.featureTitle,
      hours: e.hours,
      engineers: e.engineers,
      ...(e.startDate && { startDate: new Date(e.startDate) }),
      ...(e.endDate && { endDate: new Date(e.endDate) }),
    }));

    const query = `
      INSERT INTO engineering_designs (
        id, prd_id, team, approach, architecture, estimates, risks,
        dependencies, conflicts, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      designId,
      data.prdId,
      data.team,
      data.approach,
      data.architecture,
      JSON.stringify(estimates),
      JSON.stringify(risks),
      JSON.stringify(data.dependencies),
      JSON.stringify([]),
      'draft',
      createdBy,
    ];

    try {
      const result = await db.query(query, values);
      const design = this.mapRowToDesign(result.rows[0]);

      // Detect conflicts automatically
      await this.detectConflicts(designId);

      if (this.webSocketService) {
        // this.webSocketService.broadcast('design:created', design);
      }

      logger.info({ designId }, 'Engineering design created successfully');
      return design;
    } catch (error) {
      logger.error({ error, designId }, 'Error creating engineering design');
      throw new Error('Failed to create engineering design');
    }
  }

  /**
   * Get design by ID
   */
  async getDesignById(id: string): Promise<EngineeringDesign | null> {
    const query = `
      SELECT
        ed.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        p.title as prd_title,
        p.status as prd_status
      FROM engineering_designs ed
      LEFT JOIN users u ON ed.created_by = u.id
      LEFT JOIN prds p ON ed.prd_id = p.id
      WHERE ed.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) return null;
      return this.mapRowToDesign(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting engineering design');
      throw new Error('Failed to get engineering design');
    }
  }

  /**
   * Get all designs with filtering
   */
  async getAllDesigns(filters: EngineeringDesignFilters = {}): Promise<EngineeringDesign[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);

    const query = `
      SELECT
        ed.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        p.title as prd_title,
        p.status as prd_status
      FROM engineering_designs ed
      LEFT JOIN users u ON ed.created_by = u.id
      LEFT JOIN prds p ON ed.prd_id = p.id
      ${whereClause}
      ORDER BY ed.created_at DESC
    `;

    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToDesign(row));
    } catch (error) {
      logger.error({ error }, 'Error getting engineering designs');
      throw new Error('Failed to get engineering designs');
    }
  }

  /**
   * Update engineering design
   */
  async updateDesign(id: string, data: UpdateEngineeringDesignRequest): Promise<EngineeringDesign> {
    return await db.withTransaction(async (client: PoolClient) => {
      const updateFields: string[] = [];
      const updateValues: (string | string[])[] = [];
      let paramCount = 0;

      if (data.approach !== undefined) {
        updateFields.push(`approach = $${++paramCount}`);
        updateValues.push(data.approach);
      }
      if (data.architecture !== undefined) {
        updateFields.push(`architecture = $${++paramCount}`);
        updateValues.push(data.architecture);
      }
      if (data.estimates !== undefined) {
        const estimates: Estimate[] = data.estimates.map((e: any) => ({
          featureId: e.featureId,
          featureTitle: e.featureTitle,
          hours: e.hours,
          engineers: e.engineers,
          ...(e.startDate && { startDate: new Date(e.startDate) }),
          ...(e.endDate && { endDate: new Date(e.endDate) }),
        }));
        updateFields.push(`estimates = $${++paramCount}`);
        updateValues.push(JSON.stringify(estimates));
      }
      if (data.risks !== undefined) {
        const risks: Risk[] = data.risks.map(r => ({
          ...r,
          id: generateUniqueId('RISK').toString(),
        }));
        updateFields.push(`risks = $${++paramCount}`);
        updateValues.push(JSON.stringify(risks));
      }
      if (data.dependencies !== undefined) {
        updateFields.push(`dependencies = $${++paramCount}`);
        updateValues.push(JSON.stringify(data.dependencies));
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${++paramCount}`);
        updateValues.push(data.status);
      }

      if (updateFields.length === 0) throw new Error('No fields to update');

      const updateQuery = `
        UPDATE engineering_designs
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${++paramCount}
        RETURNING *
      `;
      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);
      if (result.rows.length === 0) throw new Error('Engineering design not found');

      const design = this.mapRowToDesign(result.rows[0]);

      if (this.webSocketService) {
        // this.webSocketService.broadcast('design:updated', design);
      }

      logger.info({ designId: id }, 'Engineering design updated successfully');
      return design;
    });
  }

  /**
   * Delete engineering design
   */
  async deleteDesign(id: string): Promise<void> {
    const query = `DELETE FROM engineering_designs WHERE id = $1 RETURNING id`;
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) throw new Error('Engineering design not found');
      logger.info({ designId: id }, 'Engineering design deleted successfully');
    } catch (error) {
      logger.error({ error, id }, 'Error deleting engineering design');
      throw error;
    }
  }

  /**
   * Detect conflicts between design estimates and BRD timeline/budget
   */
  async detectConflicts(id: string): Promise<ConflictDetectionResult> {
    const design = await this.getDesignById(id);
    if (!design) throw new Error('Engineering design not found');

    // Get associated PRD and BRD
    const prdQuery = `SELECT brd_id FROM prds WHERE id = $1`;
    const prdResult = await db.query(prdQuery, [design.prdId]);
    if (prdResult.rows.length === 0) throw new Error('PRD not found');

    const brdQuery = `SELECT budget, timeline_target_date FROM brds WHERE id = $1`;
    const brdResult = await db.query(brdQuery, [prdResult.rows[0].brd_id]);
    if (brdResult.rows.length === 0) throw new Error('BRD not found');

    const brd = brdResult.rows[0];
    const conflicts: DesignConflict[] = [];

    // Calculate total estimated hours and duration
    const totalHours = design.estimates.reduce((sum, e) => sum + e.hours, 0);
    const totalEngineers = Math.max(...design.estimates.map(e => e.engineers));
    const estimatedDays = Math.ceil(totalHours / (totalEngineers * 8));

    // Check timeline conflict
    const targetDate = new Date(brd.timeline_target_date);
    const estimatedEndDate = new Date();
    estimatedEndDate.setDate(estimatedEndDate.getDate() + estimatedDays);

    if (estimatedEndDate > targetDate) {
      conflicts.push({
        id: generateUniqueId('CONF').toString(),
        type: 'timeline',
        description: `Estimated completion (${estimatedDays} days) exceeds BRD target date`,
        impact: `Delivery delayed by ${Math.ceil((estimatedEndDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))} days`,
        alternatives: ['Add more engineers', 'Reduce scope', 'Extend timeline'],
      });
    }

    // Check budget conflict (assuming $100/hour average rate)
    const estimatedCost = totalHours * 100;
    if (estimatedCost > brd.budget) {
      conflicts.push({
        id: generateUniqueId('CONF').toString(),
        type: 'budget',
        description: `Estimated cost ($${estimatedCost}) exceeds BRD budget ($${brd.budget})`,
        impact: `Over budget by $${estimatedCost - brd.budget}`,
        alternatives: ['Increase budget', 'Reduce scope', 'Use contractors'],
      });
    }

    // Update design with conflicts
    if (conflicts.length > 0) {
      await db.query(
        `UPDATE engineering_designs SET conflicts = $1 WHERE id = $2`,
        [JSON.stringify(conflicts), id]
      );

      if (this.webSocketService) {
        // this.webSocketService.broadcast('design:conflict_detected', { designId: id, conflicts });
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      summary: {
        timeline: conflicts.filter(c => c.type === 'timeline').length,
        budget: conflicts.filter(c => c.type === 'budget').length,
        scope: conflicts.filter(c => c.type === 'scope').length,
        technical: conflicts.filter(c => c.type === 'technical').length,
      },
    };
  }

  /**
   * Get designs by PRD
   */
  async getDesignsByPRD(prdId: string): Promise<EngineeringDesign[]> {
    return this.getAllDesigns({ prdId });
  }

  /**
   * Get team capacity
   */
  async getTeamCapacity(team: string): Promise<TeamCapacity> {
    // This would normally query a team/resource management system
    // For now, return mock data
    return {
      team: team as 'frontend' | 'backend' | 'mobile' | 'devops' | 'qa',
      availableEngineers: 5,
      currentWorkload: 800,
      availableCapacity: 1200,
      utilizationPercentage: 40,
    };
  }

  /**
   * Get summary statistics
   */
  async getSummary(): Promise<EngineeringDesignSummary> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM engineering_designs
    `;

    try {
      const result = await db.query(query);
      const row = result.rows[0];

      const allDesigns = await this.getAllDesigns();

      let totalHours = 0;
      let totalEngineers = 0;
      let designsWithConflicts = 0;
      let totalRisks = 0;
      let criticalRisks = 0;
      const teamCounts: Record<string, number> = {
        frontend: 0,
        backend: 0,
        mobile: 0,
        devops: 0,
        qa: 0,
      };

      allDesigns.forEach(design => {
        teamCounts[design.team]++;
        totalHours += design.estimates.reduce((sum, e) => sum + e.hours, 0);
        totalEngineers += Math.max(...design.estimates.map(e => e.engineers), 0);
        if (design.conflicts.length > 0) designsWithConflicts++;
        totalRisks += design.risks.length;
        criticalRisks += design.risks.filter(r => r.severity === 'critical').length;
      });

      return {
        total: parseInt(row.total),
        byTeam: teamCounts as Record<'frontend' | 'backend' | 'mobile' | 'devops' | 'qa', number>,
        byStatus: {
          draft: parseInt(row.draft_count),
          under_review: parseInt(row.under_review_count),
          approved: parseInt(row.approved_count),
          rejected: parseInt(row.rejected_count),
        },
        totalEstimatedHours: totalHours,
        totalEngineers,
        averageEstimatePerDesign: allDesigns.length > 0 ? totalHours / allDesigns.length : 0,
        designsWithConflicts,
        totalRisks,
        criticalRisks,
      };
    } catch (error) {
      logger.error({ error }, 'Error getting engineering design summary');
      throw new Error('Failed to get engineering design summary');
    }
  }

  /**
   * Build WHERE clause for filtering
   */
  private buildWhereClause(filters: EngineeringDesignFilters): {
    whereClause: string;
    queryParams: (string | number | string[])[];
  } {
    const conditions: string[] = [];
    const queryParams: (string | number | string[])[] = [];
    let paramCount = 0;

    if (filters.prdId) {
      conditions.push(`ed.prd_id = $${++paramCount}`);
      queryParams.push(filters.prdId);
    }
    if (filters.team && filters.team.length > 0) {
      conditions.push(`ed.team = ANY($${++paramCount})`);
      queryParams.push(filters.team);
    }
    if (filters.status && filters.status.length > 0) {
      conditions.push(`ed.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }
    if (filters.createdBy) {
      conditions.push(`ed.created_by = $${++paramCount}`);
      queryParams.push(filters.createdBy);
    }
    if (filters.search) {
      conditions.push(`(ed.approach ILIKE $${++paramCount} OR ed.architecture ILIKE $${paramCount})`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  /**
   * Map database row to EngineeringDesign
   */
  private mapRowToDesign(row: any): EngineeringDesign {
    const estimatesData = typeof row.estimates === 'string'
      ? JSON.parse(row.estimates)
      : (row.estimates || []);
    const estimates: Estimate[] = estimatesData.map((e: any) => ({
      ...e,
      startDate: e.startDate ? new Date(e.startDate as string) : undefined,
      endDate: e.endDate ? new Date(e.endDate as string) : undefined,
    }));

    const risks: Risk[] = typeof row.risks === 'string'
      ? JSON.parse(row.risks)
      : (row.risks || []);

    const conflicts: DesignConflict[] = typeof row.conflicts === 'string'
      ? JSON.parse(row.conflicts)
      : (row.conflicts || []);

    const dependenciesData = typeof row.dependencies === 'string'
      ? JSON.parse(row.dependencies)
      : (row.dependencies || []);

    const design: EngineeringDesign = {
      id: row.id as string,
      prdId: row.prd_id as string,
      team: row.team as 'frontend' | 'backend' | 'mobile' | 'devops' | 'qa',
      approach: row.approach as string,
      architecture: row.architecture as string,
      estimates,
      risks,
      dependencies: dependenciesData,
      conflicts,
      status: row.status as 'draft' | 'under_review' | 'approved' | 'rejected',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
    };

    if (row.created_by_username) {
      design.createdByUser = {
        id: row.created_by as string,
        username: row.created_by_username as string,
        // ...(row.created_by_first_name && { firstName: row.created_by_first_name as string }),
        // ...(row.created_by_last_name && { lastName: row.created_by_last_name as string }),
      };
    }

    if (row.prd_title) {
      design.sourcePRD = {
        id: row.prd_id as string,
        title: row.prd_title as string,
        status: row.prd_status as string,
      };
    }

    design.totalEstimatedHours = estimates.reduce((sum, e) => sum + e.hours, 0);
    design.totalEngineers = Math.max(...estimates.map(e => e.engineers), 0);
    design.estimatedDuration = Math.ceil(design.totalEstimatedHours / (design.totalEngineers * 8));
    design.hasConflicts = conflicts.length > 0;
    design.criticalRisks = risks.filter(r => r.severity === 'critical').length;

    return design;
  }
}

export { EngineeringDesignService };
export default EngineeringDesignService;
