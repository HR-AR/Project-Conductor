/**
 * Presence Service
 *
 * Manages user presence tracking for real-time collaboration features
 */

import { UserPresence, RequirementPresence } from '../models/presence.model';

export class PresenceService {
  // In-memory storage for user presence
  private presenceStore: Map<string, UserPresence> = new Map();
  private userSocketMap: Map<string, string> = new Map(); // userId -> socketId mapping

  /**
   * Track a user joining the system or a specific requirement
   */
  trackUserJoin(socketId: string, userId: string, username: string, requirementId?: string): UserPresence {
    const presence: UserPresence = {
      userId,
      username,
      requirementId: requirementId || undefined,
      status: 'online',
      isEditing: false,
      lastSeen: new Date(),
      socketId,
    };

    // Store presence by socketId for quick lookups
    this.presenceStore.set(socketId, presence);

    // Update user-socket mapping
    this.userSocketMap.set(userId, socketId);

    return presence;
  }

  /**
   * Track a user leaving a specific requirement (but not disconnecting)
   */
  trackUserLeave(socketId: string): UserPresence | null {
    const presence = this.presenceStore.get(socketId);

    if (presence) {
      // Clear requirement association but keep user online
      presence.requirementId = undefined;
      presence.isEditing = false;
      presence.lastSeen = new Date();

      this.presenceStore.set(socketId, presence);
      return presence;
    }

    return null;
  }

  /**
   * Set editing status for a user
   */
  setEditingStatus(userId: string, requirementId: string, isEditing: boolean): UserPresence | null {
    const socketId = this.userSocketMap.get(userId);

    if (!socketId) {
      return null;
    }

    const presence = this.presenceStore.get(socketId);

    if (presence) {
      presence.isEditing = isEditing;
      presence.requirementId = requirementId;
      presence.lastSeen = new Date();

      this.presenceStore.set(socketId, presence);
      return presence;
    }

    return null;
  }

  /**
   * Get all users currently viewing a specific requirement
   */
  getUsersInRequirement(requirementId: string): RequirementPresence {
    const users: UserPresence[] = [];
    const editingUsers: UserPresence[] = [];

    this.presenceStore.forEach((presence) => {
      if (presence.requirementId === requirementId && presence.status === 'online') {
        users.push({ ...presence });

        if (presence.isEditing) {
          editingUsers.push({ ...presence });
        }
      }
    });

    return {
      requirementId,
      users,
      editingUsers,
      totalUsers: users.length,
    };
  }

  /**
   * Get presence information for a specific user
   */
  getUserPresence(userId: string): UserPresence | null {
    const socketId = this.userSocketMap.get(userId);

    if (!socketId) {
      return null;
    }

    const presence = this.presenceStore.get(socketId);
    return presence ? { ...presence } : null;
  }

  /**
   * Handle user disconnection - clean up presence data
   */
  handleDisconnect(socketId: string): UserPresence | null {
    const presence = this.presenceStore.get(socketId);

    if (presence) {
      // Remove from socket mapping
      this.userSocketMap.delete(presence.userId);

      // Remove from presence store
      this.presenceStore.delete(socketId);

      // Return the presence data that was removed for cleanup notifications
      return presence;
    }

    return null;
  }

  /**
   * Update user status (online, away, offline)
   */
  updateUserStatus(userId: string, status: 'online' | 'offline' | 'away'): UserPresence | null {
    const socketId = this.userSocketMap.get(userId);

    if (!socketId) {
      return null;
    }

    const presence = this.presenceStore.get(socketId);

    if (presence) {
      presence.status = status;
      presence.lastSeen = new Date();

      this.presenceStore.set(socketId, presence);
      return presence;
    }

    return null;
  }

  /**
   * Get all active users across all requirements
   */
  getAllActiveUsers(): UserPresence[] {
    const activeUsers: UserPresence[] = [];

    this.presenceStore.forEach((presence) => {
      if (presence.status === 'online') {
        activeUsers.push({ ...presence });
      }
    });

    return activeUsers;
  }

  /**
   * Clean up stale presence data (users who haven't been seen in a while)
   */
  cleanupStalePresence(timeoutMinutes: number = 15): number {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    let cleanedCount = 0;

    this.presenceStore.forEach((presence, socketId) => {
      if (presence.lastSeen < cutoffTime) {
        this.userSocketMap.delete(presence.userId);
        this.presenceStore.delete(socketId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  /**
   * Get presence statistics
   */
  getPresenceStats(): {
    totalUsers: number;
    onlineUsers: number;
    editingUsers: number;
    requirementsWithUsers: number;
  } {
    let onlineUsers = 0;
    let editingUsers = 0;
    const requirementIds = new Set<string>();

    this.presenceStore.forEach((presence) => {
      if (presence.status === 'online') {
        onlineUsers++;
      }

      if (presence.isEditing) {
        editingUsers++;
      }

      if (presence.requirementId) {
        requirementIds.add(presence.requirementId);
      }
    });

    return {
      totalUsers: this.presenceStore.size,
      onlineUsers,
      editingUsers,
      requirementsWithUsers: requirementIds.size,
    };
  }
}

// Export singleton instance
export const presenceService = new PresenceService();