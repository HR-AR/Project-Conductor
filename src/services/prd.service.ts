/**
 * PRD Service - Business logic for Product Requirements Document management
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  PRD,
  CreatePRDRequest,
  UpdatePRDRequest,
  AlignPRDRequest,
  AddFeatureRequest,
  AddUserStoryRequest,
  PRDFilters,
  PRDSummary,
  PRDAlignmentStatus,
  Feature,
  UserStory,
  Alignment,
  PRD_STATUS,
  ALIGNMENT_STATUS,
} from '../models/prd.model';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

class PRDService {
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a new PRD
   */
  async createPRD(data: CreatePRDRequest, createdBy: string): Promise<PRD> {
    const prdId = await generateUniqueId('PRD');

    // Generate IDs for features and user stories
    const features: Feature[] = data.features.map(f => ({
      ...f,
      id: generateUniqueId('FEAT').toString(),
    }));

    const userStories: UserStory[] = data.userStories.map(us => ({
      ...us,
      id: generateUniqueId('STORY').toString(),
    }));

    const query = `
      INSERT INTO prds (
        id, brd_id, title, features, user_stories, technical_requirements,
        dependencies, status, version, alignments, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      prdId,
      data.brdId,
      data.title,
      JSON.stringify(features),
      JSON.stringify(userStories),
      JSON.stringify(data.technicalRequirements),
      JSON.stringify(data.dependencies),
      PRD_STATUS.DRAFT,
      1,
      JSON.stringify([]),
      createdBy,
    ];

    try {
      const result = await db.query(query, values);
      const prd = this.mapRowToPRD(result.rows[0]);

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('prd:created', prd);
      }

      logger.info({ prdId }, 'PRD created successfully');
      return prd;
    } catch (error) {
      logger.error({ error, prdId }, 'Error creating PRD');
      throw new Error('Failed to create PRD');
    }
  }

  /**
   * Generate PRD from approved BRD
   */
  async generateFromBRD(brdId: string, createdBy: string): Promise<PRD> {
    // Get the BRD
    const brdQuery = `SELECT * FROM brds WHERE id = $1 AND status = 'approved'`;
    const brdResult = await db.query(brdQuery, [brdId]);

    if (brdResult.rows.length === 0) {
      throw new Error('BRD not found or not approved');
    }

    const brd = brdResult.rows[0];

    // Generate PRD from BRD data
    const prdData: CreatePRDRequest = {
      brdId,
      title: `PRD: ${brd.title}`,
      features: [],
      userStories: [],
      technicalRequirements: [],
      dependencies: [],
    };

    const prd = await this.createPRD(prdData, createdBy);

    // Emit WebSocket event
    if (this.webSocketService) {
      // this.webSocketService.broadcast('prd:generated', prd);
    }

    logger.info({ prdId: prd.id, brdId }, 'PRD generated from BRD');
    return prd;
  }

  /**
   * Get PRD by ID
   */
  async getPRDById(id: string): Promise<PRD | null> {
    const query = `
      SELECT
        p.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        b.title as brd_title,
        b.status as brd_status
      FROM prds p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN brds b ON p.brd_id = b.id
      WHERE p.id = $1
    `;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToPRD(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting PRD by ID');
      throw new Error('Failed to get PRD');
    }
  }

  /**
   * Get all PRDs with filtering
   */
  async getAllPRDs(filters: PRDFilters = {}): Promise<PRD[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);

    const query = `
      SELECT
        p.*,
        u.username as created_by_username,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        b.title as brd_title,
        b.status as brd_status
      FROM prds p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN brds b ON p.brd_id = b.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `;

    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToPRD(row));
    } catch (error) {
      logger.error({ error }, 'Error getting PRDs');
      throw new Error('Failed to get PRDs');
    }
  }

  /**
   * Update a PRD
   */
  async updatePRD(id: string, data: UpdatePRDRequest): Promise<PRD> {
    return await db.withTransaction(async (client: PoolClient) => {
      const updateFields: string[] = [];
      const updateValues: (string | string[])[] = [];
      let paramCount = 0;

      if (data.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        updateValues.push(data.title);
      }
      if (data.features !== undefined) {
        const features: Feature[] = data.features.map(f => ({
          ...f,
          id: generateUniqueId('FEAT').toString(),
        }));
        updateFields.push(`features = $${++paramCount}`);
        updateValues.push(JSON.stringify(features));
      }
      if (data.userStories !== undefined) {
        const userStories: UserStory[] = data.userStories.map(us => ({
          ...us,
          id: generateUniqueId('STORY').toString(),
        }));
        updateFields.push(`user_stories = $${++paramCount}`);
        updateValues.push(JSON.stringify(userStories));
      }
      if (data.technicalRequirements !== undefined) {
        updateFields.push(`technical_requirements = $${++paramCount}`);
        updateValues.push(JSON.stringify(data.technicalRequirements));
      }
      if (data.dependencies !== undefined) {
        updateFields.push(`dependencies = $${++paramCount}`);
        updateValues.push(JSON.stringify(data.dependencies));
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
        UPDATE prds
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      updateValues.push(id);

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new Error('PRD not found');
      }

      const prd = this.mapRowToPRD(result.rows[0]);

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('prd:updated', prd);
      }

      logger.info({ prdId: id }, 'PRD updated successfully');
      return prd;
    });
  }

  /**
   * Delete a PRD
   */
  async deletePRD(id: string): Promise<void> {
    const query = `DELETE FROM prds WHERE id = $1 RETURNING id`;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error('PRD not found');
      }

      logger.info({ prdId: id }, 'PRD deleted successfully');
    } catch (error) {
      logger.error({ error, id }, 'Error deleting PRD');
      throw error;
    }
  }

  /**
   * Record stakeholder alignment on PRD
   */
  async alignPRD(id: string, alignment: AlignPRDRequest): Promise<PRD> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Get current PRD
      const getPrdQuery = `SELECT * FROM prds WHERE id = $1`;
      const prdResult = await client.query(getPrdQuery, [id]);

      if (prdResult.rows.length === 0) {
        throw new Error('PRD not found');
      }

      const currentPrd = prdResult.rows[0];
      const alignments: Alignment[] = JSON.parse(currentPrd.alignments || '[]');

      // Add or update alignment
      const existingIndex = alignments.findIndex(a => a.stakeholderId === alignment.stakeholderId);
      const newAlignment: Alignment = {
        stakeholderId: alignment.stakeholderId,
        status: alignment.status,
        concerns: alignment.concerns,
        timestamp: new Date(),
      };

      if (existingIndex >= 0) {
        alignments[existingIndex] = newAlignment;
      } else {
        alignments.push(newAlignment);
      }

      // Update PRD
      const updateQuery = `
        UPDATE prds
        SET alignments = $1, status = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const newStatus = currentPrd.status === PRD_STATUS.DRAFT ? PRD_STATUS.UNDER_REVIEW : currentPrd.status;

      const result = await client.query(updateQuery, [
        JSON.stringify(alignments),
        newStatus,
        id,
      ]);

      const prd = this.mapRowToPRD(result.rows[0]);

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('prd:aligned', { prd, alignment: newAlignment });
      }

      logger.info({ prdId: id, alignment: alignment.status }, 'PRD alignment recorded');
      return prd;
    });
  }

  /**
   * Lock PRD for engineering review
   */
  async lockPRD(id: string): Promise<PRD> {
    const prd = await this.updatePRD(id, { status: PRD_STATUS.LOCKED });

    // Emit WebSocket event
    if (this.webSocketService) {
      // this.webSocketService.broadcast('prd:locked', prd);
    }

    logger.info({ prdId: id }, 'PRD locked for engineering review');
    return prd;
  }

  /**
   * Add a feature to PRD
   */
  async addFeature(prdId: string, featureData: AddFeatureRequest): Promise<PRD> {
    const prd = await this.getPRDById(prdId);

    if (!prd) {
      throw new Error('PRD not found');
    }

    const feature: Feature = {
      ...featureData,
      id: generateUniqueId('FEAT').toString(),
    };

    const updatedFeatures = [...prd.features, feature];
    const updatedPrd = await this.updatePRD(prdId, { features: updatedFeatures as Omit<Feature, 'id'>[] });

    // Emit WebSocket event
    if (this.webSocketService) {
      // this.webSocketService.broadcast('prd:feature_added', { prd: updatedPrd, feature });
    }

    logger.info({ prdId, featureId: feature.id }, 'Feature added to PRD');
    return updatedPrd;
  }

  /**
   * Add a user story to PRD
   */
  async addUserStory(prdId: string, storyData: AddUserStoryRequest): Promise<PRD> {
    const prd = await this.getPRDById(prdId);

    if (!prd) {
      throw new Error('PRD not found');
    }

    const userStory: UserStory = {
      ...storyData,
      id: generateUniqueId('STORY').toString(),
    };

    const updatedUserStories = [...prd.userStories, userStory];
    const updatedPrd = await this.updatePRD(prdId, { userStories: updatedUserStories as Omit<UserStory, 'id'>[] });

    // Emit WebSocket event
    if (this.webSocketService) {
      // this.webSocketService.broadcast('prd:user_story_added', { prd: updatedPrd, userStory });
    }

    logger.info({ prdId, userStoryId: userStory.id }, 'User story added to PRD');
    return updatedPrd;
  }

  /**
   * Get PRD alignment status
   */
  async getPRDAlignmentStatus(id: string): Promise<PRDAlignmentStatus> {
    const prd = await this.getPRDById(id);

    if (!prd) {
      throw new Error('PRD not found');
    }

    const alignments = prd.alignments || [];

    // Get stakeholders from source BRD
    const brdQuery = `SELECT stakeholders FROM brds WHERE id = $1`;
    const brdResult = await db.query(brdQuery, [prd.brdId]);
    const stakeholders = brdResult.rows.length > 0 ? JSON.parse(brdResult.rows[0].stakeholders || '[]') : [];

    const aligned = alignments.filter(a => a.status === ALIGNMENT_STATUS.ALIGNED).length;
    const alignBut = alignments.filter(a => a.status === ALIGNMENT_STATUS.ALIGN_BUT).length;
    const notAligned = alignments.filter(a => a.status === ALIGNMENT_STATUS.NOT_ALIGNED).length;
    const pending = stakeholders.length - alignments.length;

    const stakeholdersWithConcerns = alignments
      .filter(a => a.concerns && a.concerns.length > 0)
      .map(a => ({
        stakeholderId: a.stakeholderId,
        status: a.status,
        concerns: a.concerns || '',
      }));

    return {
      prdId: id,
      isFullyAligned: aligned === stakeholders.length,
      totalStakeholders: stakeholders.length,
      aligned,
      alignBut,
      notAligned,
      pending,
      stakeholdersWithConcerns,
    };
  }

  /**
   * Get PRD summary statistics
   */
  async getPRDSummary(): Promise<PRDSummary> {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'under_review' THEN 1 END) as under_review_count,
        COUNT(CASE WHEN status = 'aligned' THEN 1 END) as aligned_count,
        COUNT(CASE WHEN status = 'locked' THEN 1 END) as locked_count
      FROM prds
    `;

    try {
      const result = await db.query(query);
      const row = result.rows[0];

      // Get all PRDs for additional calculations
      const allPrds = await this.getAllPRDs();

      let totalFeatures = 0;
      let totalUserStories = 0;
      const featurePriorityCount: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      allPrds.forEach(prd => {
        totalFeatures += prd.features.length;
        totalUserStories += prd.userStories.length;

        prd.features.forEach(feature => {
          featurePriorityCount[feature.priority]++;
        });
      });

      return {
        total: parseInt(row.total),
        byStatus: {
          draft: parseInt(row.draft_count),
          under_review: parseInt(row.under_review_count),
          aligned: parseInt(row.aligned_count),
          locked: parseInt(row.locked_count),
        },
        totalFeatures,
        totalUserStories,
        byFeaturePriority: featurePriorityCount as Record<'critical' | 'high' | 'medium' | 'low', number>,
        fullyAligned: parseInt(row.aligned_count),
        needsAlignment: parseInt(row.under_review_count),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting PRD summary');
      throw new Error('Failed to get PRD summary');
    }
  }

  /**
   * Build WHERE clause for filtering PRDs
   */
  private buildWhereClause(filters: PRDFilters): {
    whereClause: string;
    queryParams: (string | string[])[];
  } {
    const conditions: string[] = [];
    const queryParams: (string | string[])[] = [];
    let paramCount = 0;

    if (filters.status && filters.status.length > 0) {
      conditions.push(`p.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }

    if (filters.brdId) {
      conditions.push(`p.brd_id = $${++paramCount}`);
      queryParams.push(filters.brdId);
    }

    if (filters.createdBy) {
      conditions.push(`p.created_by = $${++paramCount}`);
      queryParams.push(filters.createdBy);
    }

    if (filters.search) {
      conditions.push(`p.title ILIKE $${++paramCount}`);
      queryParams.push(`%${filters.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  /**
   * Map database row to PRD interface
   */
  private mapRowToPRD(row: any): PRD {
    const features: Feature[] = JSON.parse(row['features'] as string || '[]');
    const userStories: UserStory[] = JSON.parse(row['user_stories'] as string || '[]');
    const alignments: Alignment[] = JSON.parse(row['alignments'] as string || '[]').map((a: Record<string, unknown>) => ({
      ...a,
      timestamp: new Date(a['timestamp'] as string),
    }));

    const prd: PRD = {
      id: row['id'] as string,
      brdId: row['brd_id'] as string,
      title: row['title'] as string,
      features,
      userStories,
      technicalRequirements: JSON.parse(row['technical_requirements'] as string || '[]'),
      dependencies: JSON.parse(row['dependencies'] as string || '[]'),
      status: row['status'] as 'draft' | 'under_review' | 'aligned' | 'locked',
      version: row['version'] as number,
      alignments,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
      createdBy: row['created_by'] as string,
    };

    // Add computed fields
    if (row['created_by_username']) {
      prd.createdByUser = {
        id: row['created_by'] as string,
        username: row['created_by_username'] as string,
        // ...(row['created_by_first_name'] && { firstName: row['created_by_first_name'] as string }),
        // ...(row['created_by_last_name'] && { lastName: row['created_by_last_name'] as string }),
      };
    }

    if (row['brd_title']) {
      prd.sourceBRD = {
        id: row['brd_id'] as string,
        title: row['brd_title'] as string,
        status: row['brd_status'] as string,
      };
    }

    prd.alignmentSummary = {
      aligned: alignments.filter(a => a.status === ALIGNMENT_STATUS.ALIGNED).length,
      alignBut: alignments.filter(a => a.status === ALIGNMENT_STATUS.ALIGN_BUT).length,
      notAligned: alignments.filter(a => a.status === ALIGNMENT_STATUS.NOT_ALIGNED).length,
      pending: 0,
    };

    return prd;
  }
}

export { PRDService };
export default PRDService;
