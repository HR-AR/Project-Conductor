/**
 * WebSocket Service - Real-time collaboration and broadcasting
 */

import { Server } from 'socket.io';
import { Requirement } from '../models/requirement.model';
import { Link } from '../models/link.model';

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

    console.log(`Broadcasting requirement ${changeType} to room: ${roomName}`, {
      requirementId,
      title: requirement.title,
      changeType
    });
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

    console.log(`Broadcasting link ${changeType} to rooms: ${sourceRoom}, ${targetRoom}`, {
      linkId: link.id,
      linkType: link.linkType,
      changeType
    });
  }

  /**
   * Broadcast comment events to requirement room
   */
  broadcastCommentEvent(eventName: string, commentData: CommentEventData): void {
    const roomName = `requirement:${commentData.requirementId}`;
    this.io.to(roomName).emit(eventName, commentData);

    console.log(`Broadcasting ${eventName} to room: ${roomName}`, {
      requirementId: commentData.requirementId,
      commentId: commentData.commentId,
      userId: commentData.userId,
      action: commentData.action
    });
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

    console.log(`User ${userData.username} (${userData.userId}) joined requirement room: ${requirementId}`);
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

    console.log(`User ${userData.username} (${userData.userId}) left requirement room: ${requirementId}`);
  }

  /**
   * Handle user joining general updates room
   */
  handleUserJoinGeneralUpdates(socket: any, userData: { userId: string; username: string }): void {
    socket.join('general-updates');
    console.log(`User ${userData.username} (${userData.userId}) joined general updates`);
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
      console.log(`User ${userData.username} (${userData.userId}) disconnected from all rooms`);
    } else {
      console.log(`Anonymous user disconnected from socket: ${socket.id}`);
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

    console.log(`Broadcasting review ${changeType} to room: ${roomName}`, {
      reviewId: review.id,
      requirementId: review.requirementId,
      changeType
    });
  }

  /**
   * Broadcast a custom event to a specific requirement room
   */
  broadcastToRequirement(requirementId: string, eventName: string, data: any): void {
    const roomName = `requirement:${requirementId}`;
    this.io.to(roomName).emit(eventName, data);
    console.log(`Broadcasting custom event ${eventName} to room: ${roomName}`);
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
    console.log(`Broadcasting system notification: ${message} (${type})`);
  }
}

export default WebSocketService;