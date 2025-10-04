/**
 * Conflict Controller - Request handlers for Conflict Resolution API
 */

import { Request, Response } from 'express';
import { ConflictService } from '../services/conflict.service';
import { simpleMockService } from '../services/simple-mock.service';
import { CreateConflictRequest, UpdateConflictRequest, AddCommentRequest, AddResolutionOptionRequest, VoteOnOptionRequest, ResolveConflictRequest, ConflictFilters } from '../models/conflict.model';
import { asyncHandler, NotFoundError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class ConflictController {
  private conflictService: ConflictService;
  private useMock: boolean;

  constructor() {
    this.useMock = process.env['USE_MOCK_DB'] !== 'false';
    this.conflictService = this.useMock ? simpleMockService as unknown as ConflictService : new ConflictService();
    if (this.useMock) logger.info('Using mock Conflict service (database unavailable)');
  }

  createConflict = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: CreateConflictRequest = req.body;
    const conflict = await this.conflictService.createConflict(data);
    res.status(201).json({ success: true, data: conflict, message: 'Conflict created successfully' });
  });

  getConflict = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const conflict = await this.conflictService.getConflictById(id);
    if (!conflict) throw new NotFoundError('Conflict not found');
    res.json({ success: true, data: conflict, message: 'Conflict retrieved successfully' });
  });

  getAllConflicts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters: ConflictFilters = {
      status: req.query['status'] ? this.parseArrayParam(req.query['status']) as ('open' | 'discussing' | 'resolved' | 'closed')[] : undefined,
      type: req.query['type'] ? this.parseArrayParam(req.query['type']) as ('timeline' | 'budget' | 'scope' | 'technical')[] : undefined,
      severity: req.query['severity'] ? this.parseArrayParam(req.query['severity']) as ('low' | 'medium' | 'high' | 'critical')[] : undefined,
      raisedBy: req.query['raisedBy'] as string | undefined,
      search: req.query['search'] as string | undefined,
    };
    const conflicts = await this.conflictService.getAllConflicts(filters);
    res.json({ success: true, data: conflicts, message: 'Conflicts retrieved successfully' });
  });

  updateConflict = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateConflictRequest = req.body;
    const conflict = await this.conflictService.updateConflict(id, data);
    res.json({ success: true, data: conflict, message: 'Conflict updated successfully' });
  });

  deleteConflict = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.conflictService.deleteConflict(id);
    res.json({ success: true, message: 'Conflict deleted successfully' });
  });

  addComment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const comment: AddCommentRequest = req.body;
    const conflict = await this.conflictService.addComment(id, comment);
    res.status(201).json({ success: true, data: conflict, message: 'Comment added successfully' });
  });

  addOption = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const option: AddResolutionOptionRequest = req.body;
    const conflict = await this.conflictService.addOption(id, option);
    res.status(201).json({ success: true, data: conflict, message: 'Resolution option added successfully' });
  });

  vote = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id, optionId } = req.params;
    const voteData: VoteOnOptionRequest = { ...req.body, optionId };
    const conflict = await this.conflictService.vote(id, optionId, voteData);
    res.json({ success: true, data: conflict, message: 'Vote cast successfully' });
  });

  resolve = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const resolution: ResolveConflictRequest = req.body;
    const result = await this.conflictService.resolveConflict(id, resolution);
    res.json({ success: true, data: result, message: 'Conflict resolved successfully' });
  });

  getAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const analytics = await this.conflictService.getConflictAnalytics(projectId);
    res.json({ success: true, data: analytics, message: 'Conflict analytics retrieved successfully' });
  });

  getSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const summary = await this.conflictService.getSummary();
    res.json({ success: true, data: summary, message: 'Conflict summary retrieved successfully' });
  });

  private parseArrayParam(param: unknown): string[] | undefined {
    if (!param) return undefined;
    return Array.isArray(param) ? param : [param as string];
  }
}

export default ConflictController;
