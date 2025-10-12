/**
 * WebSocket Service - Real-time collaboration and broadcasting
 */

import { Server } from 'socket.io';
import { Requirement } from '../models/requirement.model';
import { Link } from '../models/link.model';
import logger from '../utils/logger';
import {
  WS_EVENTS,
  BRDCreatedEventData,
  BRDUpdatedEventData,
  BRDApprovedEventData,
  BRDRejectedEventData,
  BRDStatusChangedEventData,
  BRDFullyApprovedEventData,
  PRDCreatedEventData,
  PRDGeneratedEventData,
  PRDUpdatedEventData,
  PRDAlignedEventData,
  PRDLockedEventData,
  PRDFeatureAddedEventData,
  PRDStoryAddedEventData,
  PRDStatusChangedEventData,
  DesignSubmittedEventData,
  DesignUpdatedEventData,
  DesignApprovedEventData,
  DesignRejectedEventData,
  DesignConflictDetectedEventData,
  DesignStatusChangedEventData,
  ConflictCreatedEventData,
  ConflictCommentAddedEventData,
  ConflictOptionAddedEventData,
  ConflictVotedEventData,
  ConflictResolvedEventData,
  ConflictStatusChangedEventData,
  ChangeLoggedEventData,
  ChangeApprovedEventData,
  ChangeRejectedEventData,
  JoinProjectEventData,
  LeaveProjectEventData,
  AgentStartedEventData,
  AgentProgressEventData,
  AgentCompletedEventData,
  AgentConflictDetectedEventData,
  AgentPausedEventData,
  AgentErrorEventData
} from '../models/websocket-events.model';

export interface WebSocketEventData {
  requirement?: Requirement;
  link?: Link;
  requirementId?: string;
  linkId?: string;
  userId?: string | undefined;
  timestamp: Date;
  changeType: 'created' | 'updated' | 'deleted';
}

export interface CommentEventData {
  requirementId: string;
  commentId: string;
  content: string;
  parentCommentId?: string;
  userId: string;
  username?: string;
  timestamp: Date;
  action: 'created' | 'updated' | 'deleted';
}

export interface UserPresenceData {
  requirementId: string;
  userId: string;
  username: string;
  action: 'joined' | 'left';
  timestamp: Date;
}

export class WebSocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Broadcast requirement updates to all clients in the requirement room
   */
  broadcastRequirementUpdate(
    requirementId: string,
    requirement: Requirement,
    changeType: 'created' | 'updated' | 'deleted',
    userId?: string
  ): void {
    const eventData: WebSocketEventData = {
      requirement,
      requirementId,
      userId,
      timestamp: new Date(),
      changeType
    };

    const roomName = `requirement:${requirementId}`;
    this.io.to(roomName).emit('requirement:updated', eventData);

    // Also broadcast to general updates room
    this.io.to('general-updates').emit('requirement:updated', eventData);

    logger.debug({ requirementId, title: requirement.title, changeType, room: roomName }, 'Broadcasting requirement update');
  }

  /**
   * Broadcast link changes to affected requirement rooms
   */
  broadcastLinkUpdate(
    link: Link,
    changeType: 'created' | 'updated' | 'deleted',
    userId?: string
  ): void {
    const eventData: WebSocketEventData = {
      link,
      linkId: link.id,
      userId,
      timestamp: new Date(),
      changeType
    };

    // Broadcast to both source and target requirement rooms
    const sourceRoom = `requirement:${link.sourceId}`;
    const targetRoom = `requirement:${link.targetId}`;

    this.io.to(sourceRoom).emit('link:updated', eventData);
    this.io.to(targetRoom).emit('link:updated', eventData);
    this.io.to('general-updates').emit('link:updated', eventData);

    logger.debug({ linkId: link.id, linkType: link.linkType, changeType, sourceRoom, targetRoom }, 'Broadcasting link update');
  }

  /**
   * Broadcast comment events to requirement room
   */
  broadcastCommentEvent(eventName: string, commentData: CommentEventData): void {
    const roomName = `requirement:${commentData.requirementId}`;
    this.io.to(roomName).emit(eventName, commentData);

    logger.debug({
      eventName,
      room: roomName,
      requirementId: commentData.requirementId,
      commentId: commentData.commentId,
      userId: commentData.userId,
      action: commentData.action
    }, 'Broadcasting comment event');
  }

  /**
   * @deprecated Use broadcastCommentEvent instead
   * Broadcast comment additions to requirement room
   */
  broadcastCommentAdded(commentData: CommentEventData): void {
    this.broadcastCommentEvent('comment:added', commentData);
  }

  /**
   * Handle user joining a requirement room
   */
  handleUserJoinRequirement(
    socket: any,
    requirementId: string,
    userData: { userId: string; username: string }
  ): void {
    const roomName = `requirement:${requirementId}`;
    socket.join(roomName);

    const presenceData: UserPresenceData = {
      requirementId,
      userId: userData.userId,
      username: userData.username,
      action: 'joined',
      timestamp: new Date()
    };

    // Notify other users in the room about the new participant
    socket.to(roomName).emit('user:joined', presenceData);

    logger.info({ username: userData.username, userId: userData.userId, requirementId }, 'User joined requirement room');
  }

  /**
   * Handle user leaving a requirement room
   */
  handleUserLeaveRequirement(
    socket: any,
    requirementId: string,
    userData: { userId: string; username: string }
  ): void {
    const roomName = `requirement:${requirementId}`;
    socket.leave(roomName);

    const presenceData: UserPresenceData = {
      requirementId,
      userId: userData.userId,
      username: userData.username,
      action: 'left',
      timestamp: new Date()
    };

    // Notify other users in the room about the departure
    socket.to(roomName).emit('user:left', presenceData);

    logger.info({ username: userData.username, userId: userData.userId, requirementId }, 'User left requirement room');
  }

  /**
   * Handle user joining general updates room
   */
  handleUserJoinGeneralUpdates(socket: any, userData: { userId: string; username: string }): void {
    socket.join('general-updates');
    logger.info({ username: userData.username, userId: userData.userId }, 'User joined general updates');
  }

  /**
   * Handle user disconnection - cleanup rooms
   */
  handleUserDisconnect(socket: any, userData?: { userId: string; username: string }): void {
    if (userData) {
      // Get all rooms the socket was in and notify about departure
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (typeof room === 'string' && room.startsWith('requirement:')) {
          const requirementId = room.replace('requirement:', '');
          const presenceData: UserPresenceData = {
            requirementId,
            userId: userData.userId,
            username: userData.username,
            action: 'left',
            timestamp: new Date()
          };
          socket.to(room).emit('user:left', presenceData);
        }
      }
      logger.info({ username: userData.username, userId: userData.userId }, 'User disconnected from all rooms');
    } else {
      logger.info({ socketId: socket.id }, 'Anonymous user disconnected');
    }
  }

  /**
   * Get the number of users in a requirement room
   */
  async getRoomUserCount(requirementId: string): Promise<number> {
    const roomName = `requirement:${requirementId}`;
    const sockets = await this.io.in(roomName).fetchSockets();
    return sockets.length;
  }

  /**
   * Get list of users currently in a requirement room
   */
  async getRoomUsers(requirementId: string): Promise<Array<{ socketId: string; userId?: string; username?: string }>> {
    const roomName = `requirement:${requirementId}`;
    const sockets = await this.io.in(roomName).fetchSockets();

    return sockets.map(socket => ({
      socketId: socket.id,
      userId: (socket as any).userData?.userId,
      username: (socket as any).userData?.username
    }));
  }

  /**
   * Broadcast review updates to all clients in the requirement room
   */
  broadcastReviewUpdate(
    review: any,
    changeType: 'created' | 'updated' | 'deleted',
    userId?: string
  ): void {
    const eventData = {
      review,
      reviewId: review.id,
      requirementId: review.requirementId,
      userId,
      timestamp: new Date(),
      changeType
    };

    const roomName = `requirement:${review.requirementId}`;
    this.io.to(roomName).emit('review:updated', eventData);
    this.io.to('general-updates').emit('review:updated', eventData);

    logger.debug({
      reviewId: review.id,
      requirementId: review.requirementId,
      changeType,
      room: roomName
    }, 'Broadcasting review update');
  }

  /**
   * Broadcast a custom event to a specific requirement room
   */
  broadcastToRequirement(requirementId: string, eventName: string, data: any): void {
    const roomName = `requirement:${requirementId}`;
    this.io.to(roomName).emit(eventName, data);
    logger.debug({ eventName, room: roomName }, 'Broadcasting custom event to requirement');
  }

  /**
   * Broadcast a system notification to all connected users
   */
  broadcastSystemNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system:notification', {
      message,
      type,
      timestamp: new Date()
    });
    logger.info({ message, type }, 'Broadcasting system notification');
  }

  // ========== BRD Events ==========

  /**
   * Emit BRD created event
   */
  emitBRDCreated(projectId: string, data: BRDCreatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_CREATED, data);
    logger.debug({ projectId, brdId: data.brdId }, 'Broadcasting BRD created');
  }

  /**
   * Emit BRD updated event
   */
  emitBRDUpdated(projectId: string, data: BRDUpdatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_UPDATED, data);
    logger.debug({ projectId, brdId: data.brdId }, 'Broadcasting BRD updated');
  }

  /**
   * Emit BRD approved event
   */
  emitBRDApproved(projectId: string, data: BRDApprovedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_APPROVED, data);
    logger.debug({ projectId, brdId: data.brdId, stakeholder: data.stakeholder }, 'Broadcasting BRD approved');
  }

  /**
   * Emit BRD rejected event
   */
  emitBRDRejected(projectId: string, data: BRDRejectedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_REJECTED, data);
    logger.debug({ projectId, brdId: data.brdId, stakeholder: data.stakeholder }, 'Broadcasting BRD rejected');
  }

  /**
   * Emit BRD status changed event
   */
  emitBRDStatusChanged(projectId: string, data: BRDStatusChangedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_STATUS_CHANGED, data);
    logger.debug({ projectId, brdId: data.brdId, newStatus: data.newStatus }, 'Broadcasting BRD status changed');
  }

  /**
   * Emit BRD fully approved event
   */
  emitBRDFullyApproved(projectId: string, data: BRDFullyApprovedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.BRD_FULLY_APPROVED, data);
    logger.debug({ projectId, brdId: data.brdId }, 'Broadcasting BRD fully approved');
  }

  // ========== PRD Events ==========

  /**
   * Emit PRD created event
   */
  emitPRDCreated(projectId: string, data: PRDCreatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_CREATED, data);
    logger.debug({ projectId, prdId: data.prdId }, 'Broadcasting PRD created');
  }

  /**
   * Emit PRD generated event
   */
  emitPRDGenerated(projectId: string, data: PRDGeneratedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_GENERATED, data);
    logger.debug({ projectId, prdId: data.prdId, brdId: data.brdId }, 'Broadcasting PRD generated');
  }

  /**
   * Emit PRD updated event
   */
  emitPRDUpdated(projectId: string, data: PRDUpdatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_UPDATED, data);
    logger.debug({ projectId, prdId: data.prdId }, 'Broadcasting PRD updated');
  }

  /**
   * Emit PRD aligned event
   */
  emitPRDAligned(projectId: string, data: PRDAlignedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_ALIGNED, data);
    logger.debug({ projectId, prdId: data.prdId, featureId: data.featureId }, 'Broadcasting PRD aligned');
  }

  /**
   * Emit PRD locked event
   */
  emitPRDLocked(projectId: string, data: PRDLockedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_LOCKED, data);
    logger.debug({ projectId, prdId: data.prdId }, 'Broadcasting PRD locked');
  }

  /**
   * Emit PRD feature added event
   */
  emitPRDFeatureAdded(projectId: string, data: PRDFeatureAddedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_FEATURE_ADDED, data);
    logger.debug({ projectId, prdId: data.prdId, featureId: data.featureId }, 'Broadcasting PRD feature added');
  }

  /**
   * Emit PRD story added event
   */
  emitPRDStoryAdded(projectId: string, data: PRDStoryAddedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_STORY_ADDED, data);
    logger.debug({ projectId, prdId: data.prdId, storyId: data.storyId }, 'Broadcasting PRD story added');
  }

  /**
   * Emit PRD status changed event
   */
  emitPRDStatusChanged(projectId: string, data: PRDStatusChangedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.PRD_STATUS_CHANGED, data);
    logger.debug({ projectId, prdId: data.prdId, newStatus: data.newStatus }, 'Broadcasting PRD status changed');
  }

  // ========== Engineering Design Events ==========

  /**
   * Emit design submitted event
   */
  emitDesignSubmitted(projectId: string, data: DesignSubmittedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_SUBMITTED, data);
    logger.debug({ projectId, designId: data.designId, team: data.team }, 'Broadcasting design submitted');
  }

  /**
   * Emit design updated event
   */
  emitDesignUpdated(projectId: string, data: DesignUpdatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_UPDATED, data);
    logger.debug({ projectId, designId: data.designId, team: data.team }, 'Broadcasting design updated');
  }

  /**
   * Emit design approved event
   */
  emitDesignApproved(projectId: string, data: DesignApprovedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_APPROVED, data);
    logger.debug({ projectId, designId: data.designId, team: data.team }, 'Broadcasting design approved');
  }

  /**
   * Emit design rejected event
   */
  emitDesignRejected(projectId: string, data: DesignRejectedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_REJECTED, data);
    logger.debug({ projectId, designId: data.designId, team: data.team }, 'Broadcasting design rejected');
  }

  /**
   * Emit design conflict detected event
   */
  emitDesignConflictDetected(projectId: string, data: DesignConflictDetectedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_CONFLICT_DETECTED, data);
    logger.debug({ projectId, designId: data.designId, conflictType: data.conflictType }, 'Broadcasting design conflict detected');
  }

  /**
   * Emit design status changed event
   */
  emitDesignStatusChanged(projectId: string, data: DesignStatusChangedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.DESIGN_STATUS_CHANGED, data);
    logger.debug({ projectId, designId: data.designId, newStatus: data.newStatus }, 'Broadcasting design status changed');
  }

  // ========== Conflict Events ==========

  /**
   * Emit conflict created event
   */
  emitConflictCreated(projectId: string, data: ConflictCreatedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_CREATED, data);
    logger.debug({ projectId, conflictId: data.conflictId, type: data.type }, 'Broadcasting conflict created');
  }

  /**
   * Emit conflict comment added event
   */
  emitConflictCommentAdded(projectId: string, data: ConflictCommentAddedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_COMMENT_ADDED, data);
    logger.debug({ projectId, conflictId: data.conflictId, commentId: data.commentId }, 'Broadcasting conflict comment added');
  }

  /**
   * Emit conflict option added event
   */
  emitConflictOptionAdded(projectId: string, data: ConflictOptionAddedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_OPTION_ADDED, data);
    logger.debug({ projectId, conflictId: data.conflictId, optionId: data.optionId }, 'Broadcasting conflict option added');
  }

  /**
   * Emit conflict voted event
   */
  emitConflictVoted(projectId: string, data: ConflictVotedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_VOTED, data);
    logger.debug({ projectId, conflictId: data.conflictId, optionId: data.optionId }, 'Broadcasting conflict vote');
  }

  /**
   * Emit conflict resolved event
   */
  emitConflictResolved(projectId: string, data: ConflictResolvedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_RESOLVED, data);
    logger.debug({ projectId, conflictId: data.conflictId, resolution: data.resolution }, 'Broadcasting conflict resolved');
  }

  /**
   * Emit conflict status changed event
   */
  emitConflictStatusChanged(projectId: string, data: ConflictStatusChangedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CONFLICT_STATUS_CHANGED, data);
    logger.debug({ projectId, conflictId: data.conflictId, newStatus: data.newStatus }, 'Broadcasting conflict status changed');
  }

  // ========== Change Log Events ==========

  /**
   * Emit change logged event
   */
  emitChangeLogged(projectId: string, data: ChangeLoggedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CHANGE_LOGGED, data);
    logger.debug({ projectId, changeId: data.changeId, phase: data.phase }, 'Broadcasting change logged');
  }

  /**
   * Emit change approved event
   */
  emitChangeApproved(projectId: string, data: ChangeApprovedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CHANGE_APPROVED, data);
    logger.debug({ projectId, changeId: data.changeId }, 'Broadcasting change approved');
  }

  /**
   * Emit change rejected event
   */
  emitChangeRejected(projectId: string, data: ChangeRejectedEventData): void {
    this.io.to(`project:${projectId}`).emit(WS_EVENTS.CHANGE_REJECTED, data);
    logger.debug({ projectId, changeId: data.changeId }, 'Broadcasting change rejected');
  }

  // ========== Room Management ==========

  /**
   * Handle user joining a project room
   */
  joinProjectRoom(socket: any, projectId: string, userId: string, username: string): void {
    const roomName = `project:${projectId}`;
    socket.join(roomName);

    const joinData: JoinProjectEventData = {
      projectId,
      userId,
      username,
      timestamp: new Date()
    };

    // Notify other users in the project room
    socket.to(roomName).emit(WS_EVENTS.USER_JOINED, joinData);

    logger.info({ username, userId, projectId, room: roomName }, 'User joined project room');
  }

  /**
   * Handle user leaving a project room
   */
  leaveProjectRoom(socket: any, projectId: string, userId: string, username: string): void {
    const roomName = `project:${projectId}`;
    socket.leave(roomName);

    const leaveData: LeaveProjectEventData = {
      projectId,
      userId,
      username,
      timestamp: new Date()
    };

    // Notify other users in the project room
    socket.to(roomName).emit(WS_EVENTS.USER_LEFT, leaveData);

    logger.info({ username, userId, projectId, room: roomName }, 'User left project room');
  }

  // ========== Agent Activity Events ==========

  /**
   * Emit agent started event
   */
  emitAgentStarted(data: AgentStartedEventData): void {
    // Broadcast to all connected clients
    this.io.emit(WS_EVENTS.AGENT_STARTED, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_STARTED, data);
    }

    logger.debug({
      agentType: data.agentType,
      taskId: data.taskId,
      projectId: data.projectId
    }, 'Broadcasting agent started');
  }

  /**
   * Emit agent progress event
   */
  emitAgentProgress(data: AgentProgressEventData): void {
    // Broadcast to all connected clients
    this.io.emit(WS_EVENTS.AGENT_PROGRESS, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_PROGRESS, data);
    }

    logger.debug({
      agentType: data.agentType,
      taskId: data.taskId,
      progress: data.progress,
      projectId: data.projectId
    }, 'Broadcasting agent progress');
  }

  /**
   * Emit agent completed event
   */
  emitAgentCompleted(data: AgentCompletedEventData): void {
    // Broadcast to all connected clients
    this.io.emit(WS_EVENTS.AGENT_COMPLETED, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_COMPLETED, data);
    }

    logger.debug({
      agentType: data.agentType,
      taskId: data.taskId,
      success: data.result.success,
      duration: data.duration,
      projectId: data.projectId
    }, 'Broadcasting agent completed');
  }

  /**
   * Emit agent conflict detected event
   */
  emitAgentConflictDetected(data: AgentConflictDetectedEventData): void {
    // Broadcast to all connected clients (high priority)
    this.io.emit(WS_EVENTS.AGENT_CONFLICT_DETECTED, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_CONFLICT_DETECTED, data);
    }

    logger.warn({
      agentType: data.agentType,
      taskId: data.taskId,
      conflictType: data.conflictType,
      severity: data.severity,
      projectId: data.projectId
    }, 'Broadcasting agent conflict detected');
  }

  /**
   * Emit agent paused event
   */
  emitAgentPaused(data: AgentPausedEventData): void {
    // Broadcast to all connected clients
    this.io.emit(WS_EVENTS.AGENT_PAUSED, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_PAUSED, data);
    }

    logger.info({
      agentType: data.agentType,
      taskId: data.taskId,
      reason: data.reason,
      pauseType: data.pauseType,
      projectId: data.projectId
    }, 'Broadcasting agent paused');
  }

  /**
   * Emit agent error event
   */
  emitAgentError(data: AgentErrorEventData): void {
    // Broadcast to all connected clients (high priority)
    this.io.emit(WS_EVENTS.AGENT_ERROR, data);

    // Also broadcast to project room if projectId exists
    if (data.projectId) {
      this.io.to(`project:${data.projectId}`).emit(WS_EVENTS.AGENT_ERROR, data);
    }

    logger.error({
      agentType: data.agentType,
      taskId: data.taskId,
      error: data.error,
      errorType: data.errorType,
      canRetry: data.canRetry,
      projectId: data.projectId
    }, 'Broadcasting agent error');
  }
}

export default WebSocketService;