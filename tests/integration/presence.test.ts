/**
 * Integration Tests for Presence Service
 *
 * Tests the real-time user presence tracking functionality
 */

import { presenceService, PresenceService } from '../../src/services/presence.service';

describe('PresenceService Integration Tests', () => {
  let service: PresenceService;

  beforeEach(() => {
    // Reset the service for each test
    service = new PresenceService();
  });

  describe('User Presence Tracking', () => {
    test('should track user joining a requirement', () => {
      const socketId = 'socket123';
      const userId = 'user456';
      const username = 'john.doe';
      const requirementId = 'req789';

      const presence = service.trackUserJoin(socketId, userId, username, requirementId);

      expect(presence).toMatchObject({
        userId,
        username,
        requirementId,
        status: 'online',
        isEditing: false,
        socketId,
      });
      expect(presence.lastSeen).toBeInstanceOf(Date);
    });

    test('should track multiple users in same requirement', () => {
      // Add first user
      service.trackUserJoin('socket1', 'user1', 'alice', 'req123');

      // Add second user
      service.trackUserJoin('socket2', 'user2', 'bob', 'req123');

      const requirementPresence = service.getUsersInRequirement('req123');

      expect(requirementPresence.totalUsers).toBe(2);
      expect(requirementPresence.users).toHaveLength(2);
      expect(requirementPresence.editingUsers).toHaveLength(0);
    });

    test('should handle editing status changes', () => {
      const socketId = 'socket123';
      const userId = 'user456';
      const requirementId = 'req789';

      // Join requirement first
      service.trackUserJoin(socketId, userId, 'john.doe', requirementId);

      // Start editing
      const editingPresence = service.setEditingStatus(userId, requirementId, true);
      expect(editingPresence?.isEditing).toBe(true);

      // Check requirement presence
      const reqPresence = service.getUsersInRequirement(requirementId);
      expect(reqPresence.editingUsers).toHaveLength(1);

      // Stop editing
      const stoppedPresence = service.setEditingStatus(userId, requirementId, false);
      expect(stoppedPresence?.isEditing).toBe(false);
    });

    test('should handle user disconnection cleanup', () => {
      const socketId = 'socket123';
      const userId = 'user456';
      const requirementId = 'req789';

      // Join requirement
      service.trackUserJoin(socketId, userId, 'john.doe', requirementId);

      // Verify user is present
      let reqPresence = service.getUsersInRequirement(requirementId);
      expect(reqPresence.totalUsers).toBe(1);

      // Disconnect user
      const disconnectedPresence = service.handleDisconnect(socketId);
      expect(disconnectedPresence).toBeTruthy();
      expect(disconnectedPresence?.userId).toBe(userId);

      // Verify user is removed
      reqPresence = service.getUsersInRequirement(requirementId);
      expect(reqPresence.totalUsers).toBe(0);
    });

    test('should track user leaving requirement but staying online', () => {
      const socketId = 'socket123';
      const userId = 'user456';
      const requirementId = 'req789';

      // Join requirement
      service.trackUserJoin(socketId, userId, 'john.doe', requirementId);

      // Verify user is in requirement
      let reqPresence = service.getUsersInRequirement(requirementId);
      expect(reqPresence.totalUsers).toBe(1);

      // Leave requirement
      const leftPresence = service.trackUserLeave(socketId);
      expect(leftPresence?.requirementId).toBeUndefined();
      expect(leftPresence?.isEditing).toBe(false);

      // Verify user is no longer in requirement
      reqPresence = service.getUsersInRequirement(requirementId);
      expect(reqPresence.totalUsers).toBe(0);

      // But user should still be retrievable by userId
      const userPresence = service.getUserPresence(userId);
      expect(userPresence?.status).toBe('online');
    });

    test('should update user status', () => {
      const socketId = 'socket123';
      const userId = 'user456';

      // Join first
      service.trackUserJoin(socketId, userId, 'john.doe');

      // Update status to away
      const awayPresence = service.updateUserStatus(userId, 'away');
      expect(awayPresence?.status).toBe('away');

      // Update status to offline
      const offlinePresence = service.updateUserStatus(userId, 'offline');
      expect(offlinePresence?.status).toBe('offline');
    });
  });

  describe('Presence Statistics', () => {
    test('should provide accurate presence statistics', () => {
      // Add multiple users
      service.trackUserJoin('socket1', 'user1', 'alice', 'req1');
      service.trackUserJoin('socket2', 'user2', 'bob', 'req1');
      service.trackUserJoin('socket3', 'user3', 'charlie', 'req2');

      // Set one user to editing
      service.setEditingStatus('user1', 'req1', true);

      // Set one user to away
      service.updateUserStatus('user3', 'away');

      const stats = service.getPresenceStats();

      expect(stats.totalUsers).toBe(3);
      expect(stats.onlineUsers).toBe(2); // alice and bob are online, charlie is away
      expect(stats.editingUsers).toBe(1); // only alice is editing
      expect(stats.requirementsWithUsers).toBe(2); // req1 and req2 have users
    });

    test('should return all active users', () => {
      service.trackUserJoin('socket1', 'user1', 'alice', 'req1');
      service.trackUserJoin('socket2', 'user2', 'bob', 'req1');
      service.updateUserStatus('user2', 'offline');

      const activeUsers = service.getAllActiveUsers();

      expect(activeUsers).toHaveLength(1); // only alice is online
      expect(activeUsers[0].username).toBe('alice');
    });
  });

  describe('Stale Presence Cleanup', () => {
    test('should clean up stale presence data', () => {
      // Add a user
      service.trackUserJoin('socket1', 'user1', 'alice', 'req1');

      // Mock old timestamp (more than 15 minutes ago)
      const oldDate = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
      const presence = service.getUserPresence('user1');
      if (presence) {
        presence.lastSeen = oldDate;
      }

      // Run cleanup with 15 minute timeout
      const cleanedCount = service.cleanupStalePresence(15);

      expect(cleanedCount).toBe(1);

      // User should be removed
      const userPresence = service.getUserPresence('user1');
      expect(userPresence).toBeNull();
    });
  });
});

describe('Presence Service Integration with Socket Events', () => {
  test('should handle typical user session flow', () => {
    const service = new PresenceService();

    // User connects and initializes
    const presence1 = service.trackUserJoin('socket1', 'user1', 'alice');
    expect(presence1.status).toBe('online');

    // User joins a requirement
    const presence2 = service.trackUserJoin('socket1', 'user1', 'alice', 'req123');
    expect(presence2.requirementId).toBe('req123');

    // User starts editing
    const presence3 = service.setEditingStatus('user1', 'req123', true);
    expect(presence3?.isEditing).toBe(true);

    // Check requirement has editing user
    const reqPresence = service.getUsersInRequirement('req123');
    expect(reqPresence.editingUsers).toHaveLength(1);

    // User stops editing
    service.setEditingStatus('user1', 'req123', false);

    // User disconnects
    const disconnected = service.handleDisconnect('socket1');
    expect(disconnected?.userId).toBe('user1');

    // Requirement should be empty
    const finalReqPresence = service.getUsersInRequirement('req123');
    expect(finalReqPresence.totalUsers).toBe(0);
  });
});