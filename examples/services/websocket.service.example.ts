/**
 * PATTERN: WebSocket Service for Real-time Communication
 * USE WHEN: Implementing real-time features, live updates, collaborative editing
 * KEY CONCEPTS: Socket.io integration, room management, event broadcasting, type-safe events
 */

import { Server, Socket } from 'socket.io';

interface BroadcastEvent {
  room: string;
  event: string;
  data: any;
}

interface UserConnection {
  socketId: string;
  userId: string;
  username: string;
  rooms: Set<string>;
  connectedAt: Date;
}

export class WebSocketService {
  private io: Server;
  private connections: Map<string, UserConnection> = new Map();
  private roomUsers: Map<string, Set<string>> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Setup global Socket.io event handlers
   *
   * Key patterns:
   * - Centralized connection management
   * - User tracking across connections
   * - Room-based communication
   * - Automatic cleanup on disconnect
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New WebSocket connection:', socket.id);

      // Handle user initialization
      socket.on('user:init', (data: { userId: string; username: string }) => {
        this.handleUserInit(socket, data);
      });

      // Handle room joining
      socket.on('room:join', (data: { roomId: string; userId: string }) => {
        this.handleRoomJoin(socket, data);
      });

      // Handle room leaving
      socket.on('room:leave', (data: { roomId: string; userId: string }) => {
        this.handleRoomLeave(socket, data);
      });

      // Handle custom events
      socket.on('entity:update', (data: any) => {
        this.handleEntityUpdate(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Initialize user connection
   *
   * Key patterns:
   * - Connection state management
   * - User presence tracking
   * - Initial state broadcasting
   */
  private handleUserInit(socket: Socket, data: { userId: string; username: string }): void {
    const connection: UserConnection = {
      socketId: socket.id,
      userId: data.userId,
      username: data.username,
      rooms: new Set(),
      connectedAt: new Date(),
    };

    this.connections.set(socket.id, connection);

    // Send initialization confirmation
    socket.emit('user:initialized', {
      userId: data.userId,
      socketId: socket.id,
      timestamp: new Date(),
    });

    console.log(`User ${data.username} (${data.userId}) initialized`);
  }

  /**
   * Handle room joining
   *
   * Key patterns:
   * - Room-based isolation
   * - User presence broadcasting
   * - State synchronization
   */
  private handleRoomJoin(
    socket: Socket,
    data: { roomId: string; userId: string }
  ): void {
    const roomKey = `room:${data.roomId}`;
    const connection = this.connections.get(socket.id);

    if (!connection) {
      socket.emit('error', { message: 'User not initialized' });
      return;
    }

    // Join Socket.io room
    socket.join(roomKey);
    connection.rooms.add(roomKey);

    // Track room users
    if (!this.roomUsers.has(roomKey)) {
      this.roomUsers.set(roomKey, new Set());
    }
    this.roomUsers.get(roomKey)!.add(data.userId);

    // Broadcast user joined to others in room
    socket.to(roomKey).emit('user:joined', {
      userId: data.userId,
      username: connection.username,
      roomId: data.roomId,
      timestamp: new Date(),
    });

    // Send current room state to joining user
    const roomUserList = this.getRoomUsers(roomKey);
    socket.emit('room:state', {
      roomId: data.roomId,
      users: roomUserList,
      timestamp: new Date(),
    });

    console.log(`User ${connection.username} joined room ${data.roomId}`);
  }

  /**
   * Handle room leaving
   *
   * Key patterns:
   * - Clean disconnection handling
   * - State cleanup
   * - Presence updates
   */
  private handleRoomLeave(
    socket: Socket,
    data: { roomId: string; userId: string }
  ): void {
    const roomKey = `room:${data.roomId}`;
    const connection = this.connections.get(socket.id);

    if (!connection) return;

    // Leave Socket.io room
    socket.leave(roomKey);
    connection.rooms.delete(roomKey);

    // Update room users
    const roomUserSet = this.roomUsers.get(roomKey);
    if (roomUserSet) {
      roomUserSet.delete(data.userId);
      if (roomUserSet.size === 0) {
        this.roomUsers.delete(roomKey);
      }
    }

    // Broadcast user left to others in room
    socket.to(roomKey).emit('user:left', {
      userId: data.userId,
      username: connection.username,
      roomId: data.roomId,
      timestamp: new Date(),
    });

    console.log(`User ${connection.username} left room ${data.roomId}`);
  }

  /**
   * Handle entity updates with optimistic broadcasting
   *
   * Key patterns:
   * - Optimistic updates
   * - Selective broadcasting
   * - Event namespacing
   */
  private handleEntityUpdate(socket: Socket, data: any): void {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    const { entityId, changes, roomId } = data;
    const roomKey = `room:${roomId}`;

    // Broadcast update to all users in the room except sender
    socket.to(roomKey).emit('entity:updated', {
      entityId,
      changes,
      updatedBy: {
        userId: connection.userId,
        username: connection.username,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle user disconnection
   *
   * Key patterns:
   * - Graceful cleanup
   * - Cascade room leaving
   * - Connection state removal
   */
  private handleDisconnect(socket: Socket): void {
    const connection = this.connections.get(socket.id);

    if (connection) {
      // Leave all rooms
      connection.rooms.forEach(roomKey => {
        socket.leave(roomKey);

        // Broadcast user disconnection to room members
        socket.to(roomKey).emit('user:disconnected', {
          userId: connection.userId,
          username: connection.username,
          timestamp: new Date(),
        });

        // Clean up room users
        const roomUserSet = this.roomUsers.get(roomKey);
        if (roomUserSet) {
          roomUserSet.delete(connection.userId);
          if (roomUserSet.size === 0) {
            this.roomUsers.delete(roomKey);
          }
        }
      });

      // Remove connection
      this.connections.delete(socket.id);
      console.log(`User ${connection.username} disconnected`);
    }
  }

  /**
   * Broadcast event to specific room
   *
   * Key patterns:
   * - Server-initiated broadcasts
   * - Room isolation
   * - External service integration
   */
  public broadcastToRoom(roomId: string, event: string, data: any): void {
    const roomKey = `room:${roomId}`;
    this.io.to(roomKey).emit(event, {
      ...data,
      timestamp: new Date(),
      source: 'server',
    });
  }

  /**
   * Broadcast to specific user
   *
   * Key patterns:
   * - Targeted messaging
   * - Multi-device support
   * - User lookup
   */
  public broadcastToUser(userId: string, event: string, data: any): void {
    // Find all connections for this user (multi-device support)
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    userConnections.forEach(connection => {
      this.io.to(connection.socketId).emit(event, {
        ...data,
        timestamp: new Date(),
        source: 'server',
      });
    });
  }

  /**
   * Broadcast to all connected clients
   *
   * Key patterns:
   * - System-wide announcements
   * - Global state changes
   */
  public broadcastGlobal(event: string, data: any): void {
    this.io.emit(event, {
      ...data,
      timestamp: new Date(),
      source: 'server',
    });
  }

  /**
   * Get users in a specific room
   *
   * Key patterns:
   * - State queries
   * - User presence listing
   */
  private getRoomUsers(roomKey: string): any[] {
    const userIds = this.roomUsers.get(roomKey) || new Set();
    const users = [];

    userIds.forEach(userId => {
      const connection = Array.from(this.connections.values())
        .find(conn => conn.userId === userId);

      if (connection) {
        users.push({
          userId: connection.userId,
          username: connection.username,
          connectedAt: connection.connectedAt,
        });
      }
    });

    return users;
  }

  /**
   * Get connection statistics
   *
   * Key patterns:
   * - Monitoring and metrics
   * - Health checks
   */
  public getStats(): any {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.roomUsers.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        userId: conn.userId,
        username: conn.username,
        roomCount: conn.rooms.size,
        connectedAt: conn.connectedAt,
      })),
      rooms: Array.from(this.roomUsers.entries()).map(([room, users]) => ({
        room,
        userCount: users.size,
      })),
    };
  }

  /**
   * Emit typed events for better TypeScript support
   *
   * Key patterns:
   * - Type-safe event emission
   * - Event contracts
   */
  public emitTypedEvent<T>(event: BroadcastEvent): void {
    this.io.to(event.room).emit(event.event, event.data);
  }
}

export default WebSocketService;