/**
 * BRD Controller - Request handlers for BRD API
 */

import { Request, Response } from 'express';
import { BRDService } from '../services/brd.service';
import {
  CreateBRDRequest,
  UpdateBRDRequest,
  ApproveBRDRequest,
  BRDFilters,
} from '../models/brd.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class BRDController {
  private brdService: BRDService;

  constructor() {
    this.brdService = new BRDService();
    logger.info('BRD Controller initialized with PostgreSQL');
  }

  /**
   * Create a new BRD
   * POST /api/v1/brd
   */
  createBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreateBRDRequest = req.body;
      const createdBy = this.resolveRequestUserId(req);

      const brd = await this.brdService.createBRD(data, createdBy);

      res.status(201).json({
        success: true,
        data: brd,
        message: 'BRD created successfully',
      });
    }
  );

  /**
   * Get BRD by ID
   * GET /api/v1/brd/:id
   */
  getBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const brd = await this.brdService.getBRDById(id);

      if (!brd) {
        throw new NotFoundError('BRD not found');
      }

      res.json({
        success: true,
        data: brd,
        message: 'BRD retrieved successfully',
      });
    }
  );

  /**
   * Get all BRDs with filtering
   * GET /api/v1/brd
   */
  getAllBRDs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters: BRDFilters = {
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as ('draft' | 'under_review' | 'approved' | 'rejected')[] : undefined,
        createdBy: req.query['createdBy'] as string | undefined,
        stakeholderEmail: req.query['stakeholderEmail'] as string | undefined,
        department: req.query['department'] ? this.parseArrayParam(req.query['department']) as ('business' | 'product' | 'engineering' | 'marketing' | 'sales')[] : undefined,
        minBudget: req.query['minBudget'] ? parseInt(req.query['minBudget'] as string) : undefined,
        maxBudget: req.query['maxBudget'] ? parseInt(req.query['maxBudget'] as string) : undefined,
        startDateFrom: req.query['startDateFrom'] as string | undefined,
        startDateTo: req.query['startDateTo'] as string | undefined,
        search: req.query['search'] as string | undefined,
      };

      const brds = await this.brdService.getAllBRDs(filters);

      res.json({
        success: true,
        data: brds,
        message: 'BRDs retrieved successfully',
      });
    }
  );

  /**
   * Update a BRD
   * PUT /api/v1/brd/:id
   */
  updateBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const data: UpdateBRDRequest = req.body;

      const brd = await this.brdService.updateBRD(id, data);

      res.json({
        success: true,
        data: brd,
        message: 'BRD updated successfully',
      });
    }
  );

  /**
   * Delete a BRD
   * DELETE /api/v1/brd/:id
   */
  deleteBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      await this.brdService.deleteBRD(id);

      res.json({
        success: true,
        message: 'BRD deleted successfully',
      });
    }
  );

  /**
   * Approve or reject a BRD
   * POST /api/v1/brd/:id/approve
   */
  approveBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const approval: ApproveBRDRequest = req.body;

      const brd = await this.brdService.approveBRD(id, approval);

      res.json({
        success: true,
        data: brd,
        message: `BRD ${approval.decision} successfully`,
      });
    }
  );

  /**
   * Get BRD approval status
   * GET /api/v1/brd/:id/approval-status
   */
  getApprovalStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const status = await this.brdService.getBRDApprovalStatus(id);

      res.json({
        success: true,
        data: status,
        message: 'BRD approval status retrieved successfully',
      });
    }
  );

  /**
   * Get BRD summary statistics
   * GET /api/v1/brd/summary
   */
  getSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const summary = await this.brdService.getBRDSummary();

      res.json({
        success: true,
        data: summary,
        message: 'BRD summary retrieved successfully',
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

export default BRDController;
