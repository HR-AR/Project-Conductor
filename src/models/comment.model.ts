/**
 * Comment Model - TypeScript interfaces for commenting and threading system
 */

export interface BaseComment {
  id: string;
  requirementId: string;
  userId: string;
  content: string;
  parentCommentId?: string | undefined; // For threading - null for root comments
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date | undefined; // Set when comment is edited
  isDeleted: boolean; // Soft delete flag
}

export interface Comment extends BaseComment {
  // Additional computed fields for API responses
  author?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  replies?: Comment[]; // Child comments for threading
  replyCount?: number; // Number of direct replies
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string; // For replies
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentFilters {
  requirementId?: string | undefined;
  userId?: string | undefined;
  includeDeleted?: boolean | undefined; // Default false
  parentCommentId?: string | undefined; // Filter for replies to specific comment
  isRootOnly?: boolean | undefined; // Show only root level comments (no replies)
  search?: string | undefined; // Search in comment content
}

export interface CommentThread {
  id: string;
  rootComment: Comment;
  replies: Comment[];
  totalReplies: number;
  lastReplyAt?: Date | undefined;
}

export interface CommentSummary {
  totalComments: number;
  totalRootComments: number;
  totalReplies: number;
  activeUsers: string[];
  lastActivity?: Date | undefined;
}

// WebSocket event types for real-time updates
export interface CommentEventData {
  requirementId: string;
  comment: Comment;
  action: 'created' | 'updated' | 'deleted';
  userId: string;
}

export const COMMENT_EVENTS = {
  CREATED: 'comment:created',
  UPDATED: 'comment:updated',
  DELETED: 'comment:deleted',
  THREAD_UPDATED: 'comment:thread_updated',
} as const;

export type CommentEventType = typeof COMMENT_EVENTS[keyof typeof COMMENT_EVENTS];