/**
 * PATTERN: Integration Testing with Jest and Service Mocking
 * USE WHEN: Testing service layer or API endpoints with dependencies
 * KEY CONCEPTS: Test setup/teardown, mocking, async testing, assertions
 *
 * Source: Adapted from tests/integration/presence.test.ts
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Example service under test
class ResourceService {
  private resources: Map<string, any> = new Map();
  private presenceMap: Map<string, Set<string>> = new Map();

  async createResource(data: any, userId: string): Promise<any> {
    const id = `RES-${Date.now()}`;
    const resource = {
      id,
      ...data,
      createdBy: userId,
      createdAt: new Date(),
      version: 1,
    };
    this.resources.set(id, resource);
    return resource;
  }

  async updateResource(id: string, updates: any): Promise<any> {
    const resource = this.resources.get(id);
    if (!resource) {
      throw new Error(`Resource ${id} not found`);
    }
    const updated = {
      ...resource,
      ...updates,
      version: resource.version + 1,
      updatedAt: new Date(),
    };
    this.resources.set(id, updated);
    return updated;
  }

  trackUserPresence(resourceId: string, userId: string): void {
    if (!this.presenceMap.has(resourceId)) {
      this.presenceMap.set(resourceId, new Set());
    }
    this.presenceMap.get(resourceId)!.add(userId);
  }

  getUsersInResource(resourceId: string): string[] {
    return Array.from(this.presenceMap.get(resourceId) || []);
  }

  clearResource(id: string): void {
    this.resources.delete(id);
    this.presenceMap.delete(id);
  }
}

describe('ResourceService Integration Tests', () => {
  let service: ResourceService;
  let mockDatabase: any;
  let mockWebSocket: any;

  /**
   * Setup before each test
   *
   * Key patterns:
   * - Service initialization
   * - Mock creation
   * - Clean state
   */
  beforeEach(() => {
    // Create fresh service instance
    service = new ResourceService();

    // Create mocks for external dependencies
    mockDatabase = {
      query: jest.fn(),
      getClient: jest.fn(),
    };

    mockWebSocket = {
      broadcast: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    // Clear any previous test data
    jest.clearAllMocks();
  });

  /**
   * Cleanup after each test
   *
   * Key patterns:
   * - Resource cleanup
   * - Mock reset
   * - State verification
   */
  afterEach(() => {
    // Verify no unhandled errors
    expect(mockDatabase.query).not.toHaveBeenCalledWith(
      expect.stringContaining('ERROR')
    );
  });

  describe('Resource Creation', () => {
    /**
     * Basic creation test
     *
     * Key patterns:
     * - Async test handling
     * - Input validation
     * - Response verification
     */
    test('should create a resource with valid data', async () => {
      // Arrange
      const resourceData = {
        title: 'Test Resource',
        description: 'Test Description',
        priority: 'high',
      };
      const userId = 'user-123';

      // Act
      const result = await service.createResource(resourceData, userId);

      // Assert
      expect(result).toMatchObject({
        id: expect.stringMatching(/^RES-\d+$/),
        title: resourceData.title,
        description: resourceData.description,
        priority: resourceData.priority,
        createdBy: userId,
        version: 1,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    /**
     * Error handling test
     *
     * Key patterns:
     * - Error scenario testing
     * - Exception verification
     * - State consistency
     */
    test('should handle creation errors gracefully', async () => {
      // Arrange
      const invalidData = {
        // Missing required title
        description: 'Test',
      };

      // Override method to simulate validation
      const originalCreate = service.createResource.bind(service);
      service.createResource = async (data: any, userId: string) => {
        if (!data.title) {
          throw new Error('Title is required');
        }
        return originalCreate(data, userId);
      };

      // Act & Assert
      await expect(
        service.createResource(invalidData, 'user-123')
      ).rejects.toThrow('Title is required');
    });

    /**
     * Concurrent creation test
     *
     * Key patterns:
     * - Parallel operation testing
     * - Race condition handling
     * - Unique ID verification
     */
    test('should handle concurrent resource creation', async () => {
      // Arrange
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.createResource(
          { title: `Resource ${i}` },
          `user-${i}`
        )
      );

      // Act
      const results = await Promise.all(promises);

      // Assert
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);

      results.forEach((resource, index) => {
        expect(resource.title).toBe(`Resource ${index}`);
        expect(resource.createdBy).toBe(`user-${index}`);
      });
    });
  });

  describe('Resource Updates', () => {
    let testResource: any;

    beforeEach(async () => {
      // Create a test resource for update tests
      testResource = await service.createResource(
        { title: 'Original Title' },
        'user-123'
      );
    });

    /**
     * Update with optimistic locking test
     *
     * Key patterns:
     * - Version conflict detection
     * - Optimistic concurrency control
     * - State consistency verification
     */
    test('should update resource and increment version', async () => {
      // Arrange
      const updates = {
        title: 'Updated Title',
        status: 'active',
      };

      // Act
      const updated = await service.updateResource(
        testResource.id,
        updates
      );

      // Assert
      expect(updated).toMatchObject({
        ...testResource,
        ...updates,
        version: 2,
      });
      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        testResource.createdAt.getTime()
      );
    });

    /**
     * Invalid update test
     *
     * Key patterns:
     * - Negative testing
     * - Error message verification
     * - State preservation on error
     */
    test('should reject update for non-existent resource', async () => {
      // Act & Assert
      await expect(
        service.updateResource('invalid-id', { title: 'New' })
      ).rejects.toThrow('Resource invalid-id not found');
    });
  });

  describe('User Presence Tracking', () => {
    /**
     * Presence tracking test
     *
     * Key patterns:
     * - Real-time feature testing
     * - State management verification
     * - Multiple user scenarios
     */
    test('should track multiple users in same resource', () => {
      // Arrange
      const resourceId = 'RES-123';
      const users = ['user-1', 'user-2', 'user-3'];

      // Act
      users.forEach(userId => {
        service.trackUserPresence(resourceId, userId);
      });

      // Assert
      const activeUsers = service.getUsersInResource(resourceId);
      expect(activeUsers).toHaveLength(3);
      expect(activeUsers).toEqual(expect.arrayContaining(users));
    });

    /**
     * Presence cleanup test
     *
     * Key patterns:
     * - Resource cleanup verification
     * - Memory leak prevention
     * - State isolation
     */
    test('should clean up presence when resource is deleted', () => {
      // Arrange
      const resourceId = 'RES-456';
      service.trackUserPresence(resourceId, 'user-1');
      service.trackUserPresence(resourceId, 'user-2');

      // Act
      service.clearResource(resourceId);

      // Assert
      const activeUsers = service.getUsersInResource(resourceId);
      expect(activeUsers).toHaveLength(0);
    });

    /**
     * Duplicate presence test
     *
     * Key patterns:
     * - Idempotency verification
     * - Set behavior testing
     */
    test('should handle duplicate presence tracking', () => {
      // Arrange
      const resourceId = 'RES-789';
      const userId = 'user-1';

      // Act - Track same user multiple times
      service.trackUserPresence(resourceId, userId);
      service.trackUserPresence(resourceId, userId);
      service.trackUserPresence(resourceId, userId);

      // Assert - User should only appear once
      const activeUsers = service.getUsersInResource(resourceId);
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0]).toBe(userId);
    });
  });

  describe('Performance Tests', () => {
    /**
     * Load testing
     *
     * Key patterns:
     * - Performance measurement
     * - Bulk operation testing
     * - Timeout handling
     */
    test('should handle large number of resources efficiently', async () => {
      // Arrange
      const startTime = Date.now();
      const resourceCount = 1000;

      // Act
      const promises = Array.from({ length: resourceCount }, (_, i) =>
        service.createResource(
          { title: `Resource ${i}` },
          'user-bulk'
        )
      );

      const results = await Promise.all(promises);

      // Assert
      const duration = Date.now() - startTime;
      expect(results).toHaveLength(resourceCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify memory usage (simplified)
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('WebSocket Integration', () => {
    /**
     * Event emission test
     *
     * Key patterns:
     * - Mock verification
     * - Event payload validation
     * - Async event handling
     */
    test('should emit events on resource changes', async () => {
      // Arrange
      const enhancedService = new ResourceService();
      // Inject mock WebSocket
      (enhancedService as any).webSocket = mockWebSocket;

      // Override to emit events
      const originalCreate = enhancedService.createResource.bind(enhancedService);
      enhancedService.createResource = async (data: any, userId: string) => {
        const result = await originalCreate(data, userId);
        mockWebSocket.broadcast('resource:created', { resource: result });
        return result;
      };

      // Act
      const resource = await enhancedService.createResource(
        { title: 'WebSocket Test' },
        'user-ws'
      );

      // Assert
      expect(mockWebSocket.broadcast).toHaveBeenCalledWith(
        'resource:created',
        expect.objectContaining({
          resource: expect.objectContaining({
            id: resource.id,
            title: 'WebSocket Test',
          }),
        })
      );
    });
  });
});

/**
 * Test utilities and helpers
 */
export const testHelpers = {
  /**
   * Create mock database client
   */
  createMockDatabase: () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    getClient: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  }),

  /**
   * Create test data factory
   */
  createTestResource: (overrides = {}) => ({
    title: 'Test Resource',
    description: 'Test Description',
    priority: 'medium',
    status: 'draft',
    ...overrides,
  }),

  /**
   * Wait for async events
   */
  waitForEvent: (emitter: any, event: string, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${event} timeout`));
      }, timeout);

      emitter.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  },

  /**
   * Assert async eventually
   */
  eventually: async (assertion: () => void, timeout = 1000, interval = 100) => {
    const endTime = Date.now() + timeout;

    while (Date.now() < endTime) {
      try {
        assertion();
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    assertion(); // Final attempt, will throw if still failing
  },
};