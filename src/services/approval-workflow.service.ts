/**
 * Approval Workflow Service - Manages approval process lifecycle
 * Orchestrates review initiation, assignment, voting, and finalization
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  Approval,
  CreateApprovalRequest,
  VoteRequest,
  ApprovalStatusResponse,
  PendingApproval,
  ApprovalFilters,
  FinalizedApprovalResult,
  ApprovalInitiationResponse,
  APPROVAL_STATUS,
  VOTE_TYPE,
} from '../models/approval.model';
import { DecisionRegisterService } from './decision-register.service';
import WebSocketService from './websocket.service';
import logger from '../utils/logger';

export class ApprovalWorkflowService {
  private decisionRegisterService: DecisionRegisterService;
  private webSocketService?: WebSocketService;

  constructor(webSocketService?: WebSocketService) {
    this.decisionRegisterService = new DecisionRegisterService();
    this.webSocketService = webSocketService;
  }

  /**
   * Initiate review process for a narrative
   */
  async initiateReview(request: CreateApprovalRequest, initiatedBy: number): Promise<ApprovalInitiationResponse> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Create approval record
      const approvalQuery = `
        INSERT INTO approvals (
          narrative_id,
          narrative_version,
          reviewer_id,
          status,
          due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      // Use first reviewer as the primary reviewer_id (legacy field)
      const primaryReviewerId = request.reviewer_ids[0] || initiatedBy;

      const approvalResult = await client.query(approvalQuery, [
        request.narrative_id,
        request.narrative_version,
        primaryReviewerId,
        APPROVAL_STATUS.PENDING,
        new Date(request.due_date),
      ]);

      const approval = this.mapRowToApproval(approvalResult.rows[0]);

      // Assign reviewers
      const reviewers = await this.assignReviewers(
        approval.id,
        request.reviewer_ids,
        client
      );

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('approval:initiated', {
        //   approval,
        //   reviewers,
        // });
      }

      logger.info({
        approvalId: approval.id,
        narrativeId: request.narrative_id,
        reviewerCount: reviewers.length,
      }, 'Review process initiated');

      return {
        approval,
        reviewers,
        message: `Review initiated with ${reviewers.length} reviewer(s)`,
      };
    });
  }

  /**
   * Assign reviewers to an approval (auto-assign based on rules)
   */
  async assignReviewers(
    approvalId: number,
    reviewerIds: number[],
    client?: PoolClient
  ): Promise<Array<{ reviewer_id: number; status: 'pending' | 'approved' | 'rejected' | 'conditional' }>> {
    const reviewers: Array<{ reviewer_id: number; status: 'pending' | 'approved' | 'rejected' | 'conditional' }> = [];

    for (const reviewerId of reviewerIds) {
      const query = `
        INSERT INTO approval_reviewers (
          approval_id,
          reviewer_id,
          status
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (approval_id, reviewer_id)
        DO UPDATE SET status = EXCLUDED.status
        RETURNING *
      `;

      const result = client
        ? await client.query(query, [approvalId, reviewerId, APPROVAL_STATUS.PENDING])
        : await db.query(query, [approvalId, reviewerId, APPROVAL_STATUS.PENDING]);

      reviewers.push({
        reviewer_id: result.rows[0].reviewer_id as number,
        status: result.rows[0].status as 'pending' | 'approved' | 'rejected' | 'conditional',
      });
    }

    logger.info({
      approvalId,
      reviewerCount: reviewers.length,
    }, 'Reviewers assigned to approval');

    return reviewers;
  }

  /**
   * Record a vote and update approval status
   */
  async recordVote(
    approvalId: number,
    vote: VoteRequest
  ): Promise<ApprovalStatusResponse> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Get approval details
      const approval = await this.getApprovalById(approvalId);

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Check if reviewer is authorized
      const reviewerQuery = `
        SELECT * FROM approval_reviewers
        WHERE approval_id = $1 AND reviewer_id = $2
      `;
      const reviewerResult = await client.query(reviewerQuery, [approvalId, vote.reviewer_id]);

      if (reviewerResult.rows.length === 0) {
        throw new Error('Reviewer not authorized for this approval');
      }

      // Record decision in immutable register
      const decision = await this.decisionRegisterService.recordDecision(
        approval.narrative_id,
        approval.narrative_version,
        vote,
        client
      );

      // Update reviewer status
      const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'conditional'> = {
        [VOTE_TYPE.APPROVE]: APPROVAL_STATUS.APPROVED,
        [VOTE_TYPE.REJECT]: APPROVAL_STATUS.REJECTED,
        [VOTE_TYPE.CONDITIONAL]: APPROVAL_STATUS.CONDITIONAL,
      };

      const updateReviewerQuery = `
        UPDATE approval_reviewers
        SET status = $1
        WHERE approval_id = $2 AND reviewer_id = $3
      `;
      await client.query(updateReviewerQuery, [
        statusMap[vote.vote],
        approvalId,
        vote.reviewer_id,
      ]);

      // Check if all reviewers have voted
      const statusCheck = await this.decisionRegisterService.checkApprovalStatus(approvalId);

      // Get all decisions for this approval
      const decisions = await this.decisionRegisterService.getDecisions(
        approval.narrative_id,
        approval.narrative_version
      );

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('approval:voted', {
        //   approvalId,
        //   decision,
        //   allVoted: statusCheck.all_voted,
        // });
      }

      logger.info({
        approvalId,
        reviewerId: vote.reviewer_id,
        vote: vote.vote,
        allVoted: statusCheck.all_voted,
      }, 'Vote recorded');

      return {
        approval_id: approvalId,
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
          vote: d.vote,
          reasoning: d.reasoning,
          conditions: d.conditions,
          created_at: d.created_at,
        })),
      };
    });
  }

  /**
   * Finalize review and determine consensus
   */
  async finalizeReview(approvalId: number): Promise<FinalizedApprovalResult> {
    return await db.withTransaction(async (client: PoolClient) => {
      // Get approval
      const approval = await this.getApprovalById(approvalId);

      if (!approval) {
        throw new Error('Approval not found');
      }

      // Check approval status
      const statusCheck = await this.decisionRegisterService.checkApprovalStatus(approvalId);

      if (!statusCheck.all_voted) {
        throw new Error('Cannot finalize: Not all reviewers have voted');
      }

      // Determine final status
      let finalStatus: 'pending' | 'approved' | 'rejected' | 'conditional' = APPROVAL_STATUS.APPROVED;

      if (statusCheck.rejected_count > 0) {
        finalStatus = APPROVAL_STATUS.REJECTED;
      } else if (statusCheck.conditional_count > 0) {
        finalStatus = APPROVAL_STATUS.CONDITIONAL;
      }

      // Update approval status
      const updateQuery = `
        UPDATE approvals
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      await client.query(updateQuery, [finalStatus, approvalId]);

      // Get conditional decisions for task creation
      const conditionalDecisions = await this.decisionRegisterService.getConditionalDecisions(
        approval.narrative_id,
        approval.narrative_version
      );

      // Extract all conditions for task creation
      const conditionalTasks: string[] = [];
      conditionalDecisions.forEach(decision => {
        if (decision.conditions) {
          conditionalTasks.push(...decision.conditions);
        }
      });

      // Emit WebSocket event
      if (this.webSocketService) {
        // this.webSocketService.broadcast('approval:finalized', {
        //   approvalId,
        //   finalStatus,
        //   conditionalTasks,
        // });
      }

      logger.info({
        approvalId,
        finalStatus,
        conditionalTaskCount: conditionalTasks.length,
      }, 'Review finalized');

      return {
        approval_id: approvalId,
        narrative_id: approval.narrative_id,
        final_status: finalStatus,
        total_reviewers: statusCheck.total_reviewers,
        approved_count: statusCheck.approved_count,
        rejected_count: statusCheck.rejected_count,
        conditional_count: statusCheck.conditional_count,
        all_voted: statusCheck.all_voted,
        is_approved: finalStatus === APPROVAL_STATUS.APPROVED,
        conditional_tasks: conditionalTasks.length > 0 ? conditionalTasks : undefined,
      };
    });
  }

  /**
   * Get approval by ID
   */
  async getApprovalById(id: number): Promise<Approval | null> {
    const query = `
      SELECT * FROM approvals
      WHERE id = $1
    `;

    try {
      const result = await db.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToApproval(result.rows[0]);
    } catch (error) {
      logger.error({ error, id }, 'Error getting approval by ID');
      throw new Error('Failed to get approval');
    }
  }

  /**
   * Get pending approvals for a reviewer
   */
  async getPendingApprovals(reviewerId: number): Promise<PendingApproval[]> {
    const query = `
      SELECT
        a.id as approval_id,
        a.narrative_id,
        a.narrative_version,
        a.status,
        a.due_date,
        a.created_at,
        ar.status as reviewer_status,
        d.vote
      FROM approvals a
      JOIN approval_reviewers ar ON a.id = ar.approval_id
      LEFT JOIN decision_register d ON
        d.narrative_id = a.narrative_id AND
        d.narrative_version = a.narrative_version AND
        d.reviewer_id = ar.reviewer_id
      WHERE ar.reviewer_id = $1
        AND ar.status = 'pending'
      ORDER BY a.due_date ASC, a.created_at DESC
    `;

    try {
      const result = await db.query(query, [reviewerId]);

      return result.rows.map((row: any) => ({
        approval_id: row.approval_id as number,
        narrative_id: row.narrative_id as number,
        narrative_version: row.narrative_version as number,
        narrative_title: row.narrative_title as string | undefined,
        status: row.status as 'pending' | 'approved' | 'rejected' | 'conditional',
        due_date: new Date(row.due_date as string),
        created_at: new Date(row.created_at as string),
        has_voted: row.vote !== null,
        vote: row.vote as 'approve' | 'reject' | 'conditional' | undefined,
      }));
    } catch (error) {
      logger.error({ error, reviewerId }, 'Error getting pending approvals');
      throw new Error('Failed to get pending approvals');
    }
  }

  /**
   * Get approvals with filtering
   */
  async getApprovals(filters: ApprovalFilters = {}): Promise<Approval[]> {
    const { whereClause, queryParams } = this.buildWhereClause(filters);

    const query = `
      SELECT DISTINCT a.*
      FROM approvals a
      LEFT JOIN approval_reviewers ar ON a.id = ar.approval_id
      ${whereClause}
      ORDER BY a.created_at DESC
    `;

    try {
      const result = await db.query(query, queryParams);
      return result.rows.map((row: any) => this.mapRowToApproval(row));
    } catch (error) {
      logger.error({ error, filters }, 'Error getting approvals');
      throw new Error('Failed to get approvals');
    }
  }

  /**
   * Build WHERE clause for filtering approvals
   */
  private buildWhereClause(filters: ApprovalFilters): {
    whereClause: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryParams: any[];
  } {
    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams: any[] = [];
    let paramCount = 0;

    if (filters.narrative_id !== undefined) {
      conditions.push(`a.narrative_id = $${++paramCount}`);
      queryParams.push(filters.narrative_id);
    }

    if (filters.reviewer_id !== undefined) {
      conditions.push(`ar.reviewer_id = $${++paramCount}`);
      queryParams.push(filters.reviewer_id);
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(`a.status = ANY($${++paramCount})`);
      queryParams.push(filters.status);
    }

    if (filters.overdue !== undefined && filters.overdue) {
      conditions.push(`a.due_date < CURRENT_TIMESTAMP`);
      conditions.push(`a.status = 'pending'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, queryParams };
  }

  /**
   * Map database row to Approval
   */
  private mapRowToApproval(row: any): Approval {
    return {
      id: row.id as number,
      narrative_id: row.narrative_id as number,
      narrative_version: row.narrative_version as number,
      reviewer_id: row.reviewer_id as number,
      status: row.status as 'pending' | 'approved' | 'rejected' | 'conditional',
      due_date: new Date(row.due_date as string),
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }
}

export default ApprovalWorkflowService;
