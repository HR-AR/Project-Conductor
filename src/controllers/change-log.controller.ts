/**
 * Change Log Controller - Request handlers for Change Log API
 */

import { Request, Response } from 'express';
import { ChangeLogService } from '../services/change-log.service';
import { CreateChangeLogRequest, ApproveChangeRequest, ChangeLogFilters } from '../models/change-log.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class ChangeLogController {
  private changeLogService: ChangeLogService;

  constructor() {
    this.changeLogService = new ChangeLogService();
    logger.info('Change Log Controller initialized with PostgreSQL');
  }

  createChangeLog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: CreateChangeLogRequest = req.body;
    const createdBy = this.resolveRequestUserId(req);
    const entry = await this.changeLogService.createChangeLogEntry(data, createdBy);
    res.status(201).json({ success: true, data: entry, message: 'Change log entry created successfully' });
  });

  getChangeLog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const entry = await this.changeLogService.getChangeLogById(id);
    if (!entry) throw new NotFoundError('Change log entry not found');
    res.json({ success: true, data: entry, message: 'Change log entry retrieved successfully' });
  });

  getAllChangeLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: ChangeLogFilters = {
      projectId: req.query['projectId'] as string | undefined,
      category: req.query['category'] ? this.parseArrayParam(req.query['category']) as ('scope' | 'timeline' | 'budget' | 'technical' | 'process')[] : undefined,
      phase: req.query['phase'] ? this.parseArrayParam(req.query['phase']) as ('pushed_to_phase_2' | 'simplified' | 'removed' | 'added' | 'modified')[] : undefined,
      createdBy: req.query['createdBy'] as string | undefined,
      relatedConflictId: req.query['relatedConflictId'] as string | undefined,
      search: req.query['search'] as string | undefined,
    };
    const entries = await this.changeLogService.getAllChangeLogs(filters);
    res.json({ success: true, data: entries, message: 'Change log entries retrieved successfully' });
  });

  approveChange = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const approval: ApproveChangeRequest = req.body;
    const entry = await this.changeLogService.approveChange(id, approval);
    res.json({ success: true, data: entry, message: 'Change log entry approved successfully' });
  });

  getProjectHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const history = await this.changeLogService.getProjectHistory(projectId);
    res.json({ success: true, data: history, message: 'Project history retrieved successfully' });
  });

  getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: ChangeLogFilters = { projectId: req.query['projectId'] as string };
    const summary = await this.changeLogService.getSummary(filters);
    res.json({ success: true, data: summary, message: 'Change log summary retrieved successfully' });
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

export default ChangeLogController;
