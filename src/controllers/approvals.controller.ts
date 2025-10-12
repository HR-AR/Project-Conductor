/**
 * Approvals Controller - Request handlers for Approval API
 */

import { Request, Response } from 'express';
import { ApprovalWorkflowService } from '../services/approval-workflow.service';
import { DecisionRegisterService } from '../services/decision-register.service';
import { simpleMockService } from '../services/simple-mock.service';
import {
  CreateApprovalRequest,
  VoteRequest,
  ApprovalFilters,
} from '../models/approval.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class ApprovalsController {
  private approvalWorkflowService: ApprovalWorkflowService;
  private decisionRegisterService: DecisionRegisterService;
  private useMock: boolean;

  constructor() {
    this.useMock = process.env['USE_MOCK_DB'] !== 'false';

    if (this.useMock) {
      // Use mock service for both workflow and decision register
      this.approvalWorkflowService = simpleMockService as unknown as ApprovalWorkflowService;
      this.decisionRegisterService = simpleMockService as unknown as DecisionRegisterService;
      logger.info('Using mock approval services (database unavailable)');
    } else {
      this.approvalWorkflowService = new ApprovalWorkflowService();
      this.decisionRegisterService = new DecisionRegisterService();
    }
  }

  /**
   * Initiate review process
   * POST /api/v1/approvals/initiate
   */
  initiateReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreateApprovalRequest = req.body;
      const initiatedBy = this.resolveRequestUserId(req);

      // Validate request
      if (!data.narrative_id || !data.narrative_version || !data.reviewer_ids || data.reviewer_ids.length === 0) {
        throw new BadRequestError('Missing required fields: narrative_id, narrative_version, reviewer_ids');
      }

      if (!data.due_date) {
        throw new BadRequestError('Due date is required');
      }

      const result = await this.approvalWorkflowService.initiateReview(data, parseInt(initiatedBy));

      res.status(201).json({
        success: true,
        data: result,
        message: 'Review process initiated successfully',
      });
    }
  );

  /**
   * Record a vote
   * POST /api/v1/approvals/:id/vote
   */
  recordVote = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const voteData: VoteRequest = req.body;

      // Validate request
      if (!voteData.reviewer_id || !voteData.vote || !voteData.reasoning) {
        throw new BadRequestError('Missing required fields: reviewer_id, vote, reasoning');
      }

      if (!['approve', 'reject', 'conditional'].includes(voteData.vote)) {
        throw new BadRequestError('Invalid vote type. Must be: approve, reject, or conditional');
      }

      if (voteData.vote === 'conditional' && (!voteData.conditions || voteData.conditions.length === 0)) {
        throw new BadRequestError('Conditions are required for conditional votes');
      }

      const approvalId = parseInt(id);
      const status = await this.approvalWorkflowService.recordVote(approvalId, voteData);

      res.json({
        success: true,
        data: status,
        message: 'Vote recorded successfully',
      });
    }
  );

  /**
   * Get pending approvals for current user
   * GET /api/v1/approvals/pending
   */
  getPendingApprovals = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = this.resolveRequestUserId(req);
      const reviewerId = parseInt(userId);

      const pendingApprovals = await this.approvalWorkflowService.getPendingApprovals(reviewerId);

      res.json({
        success: true,
        data: pendingApprovals,
        message: 'Pending approvals retrieved successfully',
      });
    }
  );

  /**
   * Get decision register for a narrative
   * GET /api/v1/approvals/:narrativeId/decisions
   */
  getDecisions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { narrativeId } = req.params;
      const version = req.query['version'] ? parseInt(req.query['version'] as string) : undefined;

      const decisions = await this.decisionRegisterService.getDecisions(
        parseInt(narrativeId),
        version
      );

      res.json({
        success: true,
        data: decisions,
        message: 'Decision register retrieved successfully',
      });
    }
  );

  /**
   * Get approval status for a narrative
   * GET /api/v1/approvals/:narrativeId/status
   */
  getApprovalStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { narrativeId } = req.params;
      const version = req.query['version'] ? parseInt(req.query['version'] as string) : undefined;

      if (!version) {
        throw new BadRequestError('Version parameter is required');
      }

      // Get the approval for this narrative and version
      const filters: ApprovalFilters = {
        narrative_id: parseInt(narrativeId),
      };

      const approvals = await this.approvalWorkflowService.getApprovals(filters);

      // Find the approval for the specific version
      const approval = approvals.find(a => a.narrative_version === version);

      if (!approval) {
        throw new NotFoundError('Approval not found for this narrative version');
      }

      // Check approval status
      const statusCheck = await this.decisionRegisterService.checkApprovalStatus(approval.id);

      // Get all decisions
      const decisions = await this.decisionRegisterService.getDecisions(
        parseInt(narrativeId),
        version
      );

      res.json({
        success: true,
        data: {
          approval_id: approval.id,
          narrative_id: approval.narrative_id,
          narrative_version: approval.narrative_version,
          status: approval.status,
          total_reviewers: statusCheck.total_reviewers,
          approved_count: statusCheck.approved_count,
          rejected_count: statusCheck.rejected_count,
          conditional_count: statusCheck.conditional_count,
          pending_count: statusCheck.total_reviewers - statusCheck.decisions_count,
          all_voted: statusCheck.all_voted,
          is_approved: statusCheck.approved_count === statusCheck.total_reviewers,
          decisions: decisions.map(d => ({
            id: d.decision_id,
            narrative_id: d.narrative_id,
            narrative_version: d.narrative_version,
            reviewer_id: d.reviewer_id,
            reviewer_name: d.reviewer_name,
            vote: d.vote,
            reasoning: d.reasoning,
            conditions: d.conditions,
            created_at: d.created_at,
          })),
        },
        message: 'Approval status retrieved successfully',
      });
    }
  );

  /**
   * Finalize review
   * POST /api/v1/approvals/:id/finalize
   */
  finalizeReview = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const approvalId = parseInt(id);
      const result = await this.approvalWorkflowService.finalizeReview(approvalId);

      res.json({
        success: true,
        data: result,
        message: 'Review finalized successfully',
      });
    }
  );

  /**
   * Get all approvals with filtering
   * GET /api/v1/approvals
   */
  getAllApprovals = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters: ApprovalFilters = {
        narrative_id: req.query['narrativeId'] ? parseInt(req.query['narrativeId'] as string) : undefined,
        reviewer_id: req.query['reviewerId'] ? parseInt(req.query['reviewerId'] as string) : undefined,
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as ('pending' | 'approved' | 'rejected' | 'conditional')[] : undefined,
        overdue: req.query['overdue'] === 'true',
      };

      const approvals = await this.approvalWorkflowService.getApprovals(filters);

      res.json({
        success: true,
        data: approvals,
        message: 'Approvals retrieved successfully',
      });
    }
  );

  /**
   * Get approval by ID
   * GET /api/v1/approvals/:id
   */
  getApprovalById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const approval = await this.approvalWorkflowService.getApprovalById(parseInt(id));

      if (!approval) {
        throw new NotFoundError('Approval not found');
      }

      res.json({
        success: true,
        data: approval,
        message: 'Approval retrieved successfully',
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

    if (this.useMock) {
      return '1'; // Mock user ID
    }

    const defaultUserId = process.env['SYSTEM_USER_ID'];
    if (defaultUserId) {
      return defaultUserId;
    }

    throw new BadRequestError('x-user-id header is required');
  }
}

export default ApprovalsController;
