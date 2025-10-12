/**
 * PRD Controller - Request handlers for PRD API
 */

import { Request, Response } from 'express';
import { PRDService } from '../services/prd.service';
import {
  CreatePRDRequest,
  UpdatePRDRequest,
  AlignPRDRequest,
  AddFeatureRequest,
  AddUserStoryRequest,
  PRDFilters,
} from '../models/prd.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class PRDController {
  private prdService: PRDService;

  constructor() {
    this.prdService = new PRDService();
    logger.info('PRD Controller initialized with PostgreSQL');
  }

  /**
   * Create a new PRD
   * POST /api/v1/prd
   */
  createPRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreatePRDRequest = req.body;
      const createdBy = this.resolveRequestUserId(req);

      const prd = await this.prdService.createPRD(data, createdBy);

      res.status(201).json({
        success: true,
        data: prd,
        message: 'PRD created successfully',
      });
    }
  );

  /**
   * Generate PRD from approved BRD
   * POST /api/v1/prd/generate/:brdId
   */
  generateFromBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { brdId } = req.params;
      const createdBy = this.resolveRequestUserId(req);

      const prd = await this.prdService.generateFromBRD(brdId, createdBy);

      res.status(201).json({
        success: true,
        data: prd,
        message: 'PRD generated from BRD successfully',
      });
    }
  );

  /**
   * Get PRD by ID
   * GET /api/v1/prd/:id
   */
  getPRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const prd = await this.prdService.getPRDById(id);

      if (!prd) {
        throw new NotFoundError('PRD not found');
      }

      res.json({
        success: true,
        data: prd,
        message: 'PRD retrieved successfully',
      });
    }
  );

  /**
   * Get all PRDs with filtering
   * GET /api/v1/prd
   */
  getAllPRDs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters: PRDFilters = {
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as ('draft' | 'under_review' | 'aligned' | 'locked')[] : undefined,
        brdId: req.query['brdId'] as string | undefined,
        createdBy: req.query['createdBy'] as string | undefined,
        search: req.query['search'] as string | undefined,
      };

      const prds = await this.prdService.getAllPRDs(filters);

      res.json({
        success: true,
        data: prds,
        message: 'PRDs retrieved successfully',
      });
    }
  );

  /**
   * Update a PRD
   * PUT /api/v1/prd/:id
   */
  updatePRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const data: UpdatePRDRequest = req.body;

      const prd = await this.prdService.updatePRD(id, data);

      res.json({
        success: true,
        data: prd,
        message: 'PRD updated successfully',
      });
    }
  );

  /**
   * Delete a PRD
   * DELETE /api/v1/prd/:id
   */
  deletePRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      await this.prdService.deletePRD(id);

      res.json({
        success: true,
        message: 'PRD deleted successfully',
      });
    }
  );

  /**
   * Record stakeholder alignment
   * POST /api/v1/prd/:id/align
   */
  alignPRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const alignment: AlignPRDRequest = req.body;

      const prd = await this.prdService.alignPRD(id, alignment);

      res.json({
        success: true,
        data: prd,
        message: 'PRD alignment recorded successfully',
      });
    }
  );

  /**
   * Lock PRD for engineering review
   * POST /api/v1/prd/:id/lock
   */
  lockPRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const prd = await this.prdService.lockPRD(id);

      res.json({
        success: true,
        data: prd,
        message: 'PRD locked for engineering review',
      });
    }
  );

  /**
   * Add feature to PRD
   * POST /api/v1/prd/:id/features
   */
  addFeature = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const feature: AddFeatureRequest = req.body;

      const prd = await this.prdService.addFeature(id, feature);

      res.status(201).json({
        success: true,
        data: prd,
        message: 'Feature added to PRD successfully',
      });
    }
  );

  /**
   * Add user story to PRD
   * POST /api/v1/prd/:id/stories
   */
  addUserStory = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const story: AddUserStoryRequest = req.body;

      const prd = await this.prdService.addUserStory(id, story);

      res.status(201).json({
        success: true,
        data: prd,
        message: 'User story added to PRD successfully',
      });
    }
  );

  /**
   * Get PRD alignment status
   * GET /api/v1/prd/:id/alignment-status
   */
  getAlignmentStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const status = await this.prdService.getPRDAlignmentStatus(id);

      res.json({
        success: true,
        data: status,
        message: 'PRD alignment status retrieved successfully',
      });
    }
  );

  /**
   * Get PRD summary statistics
   * GET /api/v1/prd/summary
   */
  getSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const summary = await this.prdService.getPRDSummary();

      res.json({
        success: true,
        data: summary,
        message: 'PRD summary retrieved successfully',
      });
    }
  );

  /**
   * Helper method to parse array parameters from query string
   */
  private parseArrayParam(param: unknown): string[] | undefined {
    if (!param) return undefined;
    return Array.isArray(param) ? param : [param as string];
  }

  /**
   * Resolve user identifier from request headers or fallback configuration
   */
  private resolveRequestUserId(req: Request): string {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    if (headerUserId) {
      return headerUserId;
    }

    const defaultUserId = process.env['SYSTEM_USER_ID'];
    if (defaultUserId) {
      return defaultUserId;
    }

    throw new BadRequestError('x-user-id header is required');
  }
}

export default PRDController;
