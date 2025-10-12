/**
 * Engineering Design Controller - Request handlers for Engineering Design API
 */

import { Request, Response } from 'express';
import { EngineeringDesignService } from '../services/engineering-design.service';
import {
  CreateEngineeringDesignRequest,
  UpdateEngineeringDesignRequest,
  EngineeringDesignFilters,
} from '../models/engineering-design.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class EngineeringDesignController {
  private designService: EngineeringDesignService;

  constructor() {
    this.designService = new EngineeringDesignService();
    logger.info('Engineering Design Controller initialized with PostgreSQL');
  }

  createDesign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: CreateEngineeringDesignRequest = req.body;
    const createdBy = this.resolveRequestUserId(req);
    const design = await this.designService.createEngineeringDesign(data, createdBy);
    res.status(201).json({ success: true, data: design, message: 'Engineering design created successfully' });
  });

  getDesign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const design = await this.designService.getDesignById(id);
    if (!design) throw new NotFoundError('Engineering design not found');
    res.json({ success: true, data: design, message: 'Engineering design retrieved successfully' });
  });

  getAllDesigns = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: EngineeringDesignFilters = {
      prdId: req.query['prdId'] as string | undefined,
      team: req.query['team'] ? this.parseArrayParam(req.query['team']) as ('frontend' | 'backend' | 'mobile' | 'devops' | 'qa')[] : undefined,
      status: req.query['status'] ? this.parseArrayParam(req.query['status']) as ('draft' | 'under_review' | 'approved' | 'rejected')[] : undefined,
      createdBy: req.query['createdBy'] as string | undefined,
      search: req.query['search'] as string | undefined,
    };
    const designs = await this.designService.getAllDesigns(filters);
    res.json({ success: true, data: designs, message: 'Engineering designs retrieved successfully' });
  });

  updateDesign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateEngineeringDesignRequest = req.body;
    const design = await this.designService.updateDesign(id, data);
    res.json({ success: true, data: design, message: 'Engineering design updated successfully' });
  });

  deleteDesign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.designService.deleteDesign(id);
    res.json({ success: true, message: 'Engineering design deleted successfully' });
  });

  detectConflicts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await this.designService.detectConflicts(id);
    res.json({ success: true, data: result, message: 'Conflict detection completed' });
  });

  getDesignsByPRD = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { prdId } = req.params;
    const designs = await this.designService.getDesignsByPRD(prdId);
    res.json({ success: true, data: designs, message: 'Designs retrieved successfully' });
  });

  getTeamCapacity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.params;
    const capacity = await this.designService.getTeamCapacity(team);
    res.json({ success: true, data: capacity, message: 'Team capacity retrieved successfully' });
  });

  getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const summary = await this.designService.getSummary();
    res.json({ success: true, data: summary, message: 'Engineering design summary retrieved successfully' });
  });

  private parseArrayParam(param: unknown): string[] | undefined {
    if (!param) return undefined;
    return Array.isArray(param) ? param : [param as string];
  }

  private resolveRequestUserId(req: Request): string {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    if (headerUserId) return headerUserId;
    const defaultUserId = process.env['SYSTEM_USER_ID'];
    if (defaultUserId) return defaultUserId;
    throw new BadRequestError('x-user-id header is required');
  }
}

export default EngineeringDesignController;
