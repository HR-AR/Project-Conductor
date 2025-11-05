/**
 * Database Row Types - Direct mappings from PostgreSQL tables
 * Used to type-safely map database rows to domain models
 */

/**
 * Requirements table row type
 */
export interface RequirementRow {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigned_to?: string | null;
  created_by: string;
  due_date?: string | null;
  estimated_effort?: number | null;
  actual_effort?: number | null;
  completion_percentage: number;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

/**
 * Links table row type
 */
export interface LinkRow {
  id: string;
  source_requirement_id: string;
  target_requirement_id: string;
  link_type: string;
  description?: string | null;
  created_by: string;
  is_suspect: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Comments table row type
 */
export interface CommentRow {
  id: string;
  requirement_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string | null;
}

/**
 * Users table row type
 */
export interface UserRow {
  id: string;
  username: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Approvals table row type
 */
export interface ApprovalRow {
  id: number;
  narrative_id: number;
  narrative_version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Decision Register table row type
 */
export interface DecisionRow {
  id: number;
  narrative_id: number;
  narrative_version: number;
  reviewer_id: number;
  vote: string;
  reasoning: string;
  conditions?: string | null;
  created_at: string;
}

/**
 * BRD table row type
 */
export interface BRDRow {
  id: number;
  title: string;
  description?: string | null;
  business_goal?: string | null;
  success_metrics?: string | null;
  timeline?: string | null;
  budget?: number | null;
  stakeholders?: string[] | null;
  status: string;
  version: number;
  created_by: string;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PRD table row type
 */
export interface PRDRow {
  id: number;
  brd_id: number;
  title: string;
  description?: string | null;
  features?: Record<string, unknown> | null;
  requirements?: Record<string, unknown> | null;
  constraints?: Record<string, unknown> | null;
  success_criteria?: string[] | null;
  status: string;
  version: number;
  created_by: string;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Engineering Design table row type
 */
export interface EngineeringDesignRow {
  id: number;
  prd_id: number;
  title: string;
  architecture?: Record<string, unknown> | null;
  database_design?: Record<string, unknown> | null;
  api_spec?: Record<string, unknown> | null;
  technical_decisions?: Record<string, unknown> | null;
  status: string;
  version: number;
  created_by: string;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Activities/Change Log table row type
 */
export interface ActivityRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, unknown> | null;
  user_id: string;
  created_at: string;
}

/**
 * Quality Issues table row type
 */
export interface QualityIssueRow {
  id: string;
  requirement_id: string;
  issue_type: string;
  severity: string;
  description: string;
  created_by: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Query result type that wraps database rows
 */
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/**
 * Generic database query parameters
 */
export type QueryParams = (string | number | boolean | null | undefined)[];

/**
 * Type guard function to ensure we safely access database row properties
 */
export function asString(value: unknown): string {
  return String(value);
}

export function asNumber(value: unknown): number {
  return Number(value);
}

export function asBoolean(value: unknown): boolean {
  return Boolean(value);
}

export function asDate(value: unknown): Date {
  if (typeof value === 'string') {
    return new Date(value);
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date(String(value));
}

export function asRecord<T extends Record<string, unknown>>(value: unknown): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return undefined;
}

export function asArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value as string[];
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as string[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}
