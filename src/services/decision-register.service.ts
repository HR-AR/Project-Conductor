/**
 * Decision Register Service - Immutable append-only decision tracking
 * Records all approval decisions with full history
 */

import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  Decision,
  DecisionRegisterEntry,
  VoteRequest,
} from '../models/approval.model';
import logger from '../utils/logger';

export class DecisionRegisterService {
  /**
   * Record a decision (immutable append-only)
   * Once recorded, decisions cannot be modified or deleted
   */
  async recordDecision(
    narrativeId: number,
    narrativeVersion: number,
    vote: VoteRequest,
    client?: PoolClient
  ): Promise<Decision> {
    const query = `
      INSERT INTO decision_register (
        narrative_id,
        narrative_version,
        reviewer_id,
        vote,
        reasoning,
        conditions
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      narrativeId,
      narrativeVersion,
      vote.reviewer_id,
      vote.vote,
      vote.reasoning,
      vote.conditions ? JSON.stringify(vote.conditions) : null,
    ];

    try {
      const result = client
        ? await client.query(query, values)
        : await db.query(query, values);

      const decision = this.mapRowToDecision(result.rows[0]);

      logger.info({
        narrativeId,
        narrativeVersion,
        reviewerId: vote.reviewer_id,
        vote: vote.vote,
      }, 'Decision recorded in immutable register');

      return decision;
    } catch (error) {
      logger.error({ error, narrativeId, narrativeVersion }, 'Error recording decision');
      throw new Error('Failed to record decision');
    }
  }

  /**
   * Get full decision history for a narrative
   * Returns all decisions across all versions
   */
  async getDecisions(narrativeId: number, version?: number): Promise<DecisionRegisterEntry[]> {
    const query = version
      ? `
        SELECT
          d.*,
          u.username as reviewer_name
        FROM decision_register d
        LEFT JOIN users u ON d.reviewer_id = u.id
        WHERE d.narrative_id = $1 AND d.narrative_version = $2
        ORDER BY d.created_at ASC
      `
      : `
        SELECT
          d.*,
          u.username as reviewer_name
        FROM decision_register d
        LEFT JOIN users u ON d.reviewer_id = u.id
        WHERE d.narrative_id = $1
        ORDER BY d.narrative_version DESC, d.created_at ASC
      `;

    const values = version ? [narrativeId, version] : [narrativeId];

    try {
      const result = await db.query(query, values);

      return result.rows.map((row: any) => this.mapRowToDecisionRegisterEntry(row));
    } catch (error) {
      logger.error({ error, narrativeId, version }, 'Error getting decisions');
      throw new Error('Failed to get decisions');
    }
  }

  /**
   * Get decisions for a specific reviewer
   */
  async getDecisionsByReviewer(reviewerId: number): Promise<DecisionRegisterEntry[]> {
    const query = `
      SELECT
        d.*,
        u.username as reviewer_name
      FROM decision_register d
      LEFT JOIN users u ON d.reviewer_id = u.id
      WHERE d.reviewer_id = $1
      ORDER BY d.created_at DESC
    `;

    try {
      const result = await db.query(query, [reviewerId]);

      return result.rows.map((row: any) => this.mapRowToDecisionRegisterEntry(row));
    } catch (error) {
      logger.error({ error, reviewerId }, 'Error getting decisions by reviewer');
      throw new Error('Failed to get decisions by reviewer');
    }
  }

  /**
   * Check if all reviewers have voted for a specific approval
   */
  async checkApprovalStatus(approvalId: number): Promise<{
    all_voted: boolean;
    total_reviewers: number;
    decisions_count: number;
    approved_count: number;
    rejected_count: number;
    conditional_count: number;
  }> {
    const query = `
      SELECT
        COUNT(DISTINCT ar.reviewer_id) as total_reviewers,
        COUNT(DISTINCT d.reviewer_id) as decisions_count,
        COUNT(CASE WHEN d.vote = 'approve' THEN 1 END) as approved_count,
        COUNT(CASE WHEN d.vote = 'reject' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN d.vote = 'conditional' THEN 1 END) as conditional_count
      FROM approvals a
      LEFT JOIN approval_reviewers ar ON a.id = ar.approval_id
      LEFT JOIN decision_register d ON
        d.narrative_id = a.narrative_id AND
        d.narrative_version = a.narrative_version AND
        d.reviewer_id = ar.reviewer_id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    try {
      const result = await db.query(query, [approvalId]);

      if (result.rows.length === 0) {
        throw new Error('Approval not found');
      }

      const row = result.rows[0];
      const totalReviewers = parseInt(row.total_reviewers);
      const decisionsCount = parseInt(row.decisions_count);

      return {
        all_voted: totalReviewers > 0 && totalReviewers === decisionsCount,
        total_reviewers: totalReviewers,
        decisions_count: decisionsCount,
        approved_count: parseInt(row.approved_count),
        rejected_count: parseInt(row.rejected_count),
        conditional_count: parseInt(row.conditional_count),
      };
    } catch (error) {
      logger.error({ error, approvalId }, 'Error checking approval status');
      throw error;
    }
  }

  /**
   * Get decision for specific reviewer and narrative version
   */
  async getDecisionByReviewerAndNarrative(
    narrativeId: number,
    narrativeVersion: number,
    reviewerId: number
  ): Promise<Decision | null> {
    const query = `
      SELECT * FROM decision_register
      WHERE narrative_id = $1
        AND narrative_version = $2
        AND reviewer_id = $3
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await db.query(query, [narrativeId, narrativeVersion, reviewerId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToDecision(result.rows[0]);
    } catch (error) {
      logger.error({ error, narrativeId, narrativeVersion, reviewerId }, 'Error getting decision');
      throw new Error('Failed to get decision');
    }
  }

  /**
   * Get all conditional decisions (for task creation)
   */
  async getConditionalDecisions(narrativeId: number, narrativeVersion: number): Promise<Decision[]> {
    const query = `
      SELECT * FROM decision_register
      WHERE narrative_id = $1
        AND narrative_version = $2
        AND vote = 'conditional'
        AND conditions IS NOT NULL
      ORDER BY created_at ASC
    `;

    try {
      const result = await db.query(query, [narrativeId, narrativeVersion]);

      return result.rows.map((row: any) => this.mapRowToDecision(row));
    } catch (error) {
      logger.error({ error, narrativeId, narrativeVersion }, 'Error getting conditional decisions');
      throw new Error('Failed to get conditional decisions');
    }
  }

  /**
   * Map database row to Decision
   */
  private mapRowToDecision(row: any): Decision {
    return {
      id: row.id as number,
      narrative_id: row.narrative_id as number,
      narrative_version: row.narrative_version as number,
      reviewer_id: row.reviewer_id as number,
      vote: row.vote as 'approve' | 'reject' | 'conditional',
      reasoning: row.reasoning as string,
      conditions: row.conditions ? JSON.parse(row.conditions as string) : undefined,
      created_at: new Date(row.created_at as string),
    };
  }

  /**
   * Map database row to DecisionRegisterEntry
   */
  private mapRowToDecisionRegisterEntry(row: any): DecisionRegisterEntry {
    return {
      decision_id: row.id as number,
      narrative_id: row.narrative_id as number,
      narrative_version: row.narrative_version as number,
      reviewer_id: row.reviewer_id as number,
      reviewer_name: row.reviewer_name as string | undefined,
      vote: row.vote as 'approve' | 'reject' | 'conditional',
      reasoning: row.reasoning as string,
      conditions: row.conditions ? JSON.parse(row.conditions as string) : undefined,
      created_at: new Date(row.created_at as string),
    };
  }
}

export default DecisionRegisterService;
