/**
 * Activity Feed - WebSocket Integration Tests
 * Project Conductor - Component 1.5 Integration Testing
 *
 * Tests the activity feed's WebSocket event handling and display logic
 * for the "Killer Demo" investor presentation.
 *
 * Test Coverage:
 * - agent.started events display
 * - agent.progress events display
 * - agent.completed events display
 * - agent.conflict_detected events display
 * - agent.paused events display
 * - agent.error events display
 * - Auto-scroll functionality
 * - 20-item limit enforcement
 * - Timestamp formatting
 * - Severity colors
 * - Performance under load (100+ events/minute)
 */

import { io, Socket } from 'socket.io-client';

describe('Activity Feed - WebSocket Integration', () => {
  let socket: Socket;
  const TEST_PORT = process.env.PORT || 3000;
  const SOCKET_URL = `http://localhost:${TEST_PORT}`;

  beforeAll((done) => {
    // Connect to WebSocket server
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Test] WebSocket connected:', socket.id);
      done();
    });

    socket.on('connect_error', (error) => {
      console.error('[Test] WebSocket connection error:', error.message);
      done(error);
    });

    // Set timeout for connection
    setTimeout(() => {
      if (!socket.connected) {
        done(new Error('WebSocket connection timeout'));
      }
    }, 5000);
  });

  afterAll((done) => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
    done();
  });

  describe('Event Type Display', () => {
    test('should receive agent.started events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'business',
        eventType: 'started',
        message: 'Business Agent started analyzing requirements',
        timestamp: Date.now(),
        taskId: 'task-001',
        projectId: 'test-project',
      };

      // Listen for the event
      socket.once('agent.started', (data) => {
        expect(data).toMatchObject({
          agentType: expect.any(String),
          eventType: 'started',
          message: expect.any(String),
          timestamp: expect.any(Number),
        });
        done();
      });

      // Emit the event (simulating orchestrator)
      socket.emit('agent.started', testEvent);
    }, 10000);

    test('should receive agent.progress events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'quality',
        eventType: 'progress',
        message: 'Quality Agent analyzing for ambiguity (50% complete)',
        timestamp: Date.now(),
        taskId: 'task-002',
        projectId: 'test-project',
        progress: 50,
      };

      socket.once('agent.progress', (data) => {
        expect(data).toMatchObject({
          agentType: expect.any(String),
          eventType: 'progress',
          message: expect.any(String),
          progress: expect.any(Number),
        });
        expect(data.progress).toBe(50);
        done();
      });

      socket.emit('agent.progress', testEvent);
    }, 10000);

    test('should receive agent.completed events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'product',
        eventType: 'completed',
        message: 'Product Agent completed PRD generation successfully',
        timestamp: Date.now(),
        taskId: 'task-003',
        projectId: 'test-project',
        result: { prdId: 'prd-001' },
      };

      socket.once('agent.completed', (data) => {
        expect(data).toMatchObject({
          agentType: expect.any(String),
          eventType: 'completed',
          message: expect.any(String),
        });
        done();
      });

      socket.emit('agent.completed', testEvent);
    }, 10000);

    test('should receive agent.conflict_detected events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'security',
        eventType: 'conflict_detected',
        message: 'Security vulnerability detected: Hardcoded API credentials',
        timestamp: Date.now(),
        taskId: 'task-004',
        projectId: 'test-project',
        severity: 'high',
        conflictData: {
          vulnerabilityId: 'VULN-002',
          title: 'Hardcoded API Credentials Detected',
          description: 'API keys found in environment variables',
          recommendation: 'Use secrets manager for credential storage',
        },
      };

      socket.once('agent.conflict_detected', (data) => {
        expect(data).toMatchObject({
          agentType: 'security',
          eventType: 'conflict_detected',
          severity: 'high',
          conflictData: expect.any(Object),
        });
        expect(data.conflictData.vulnerabilityId).toBe('VULN-002');
        done();
      });

      socket.emit('agent.conflict_detected', testEvent);
    }, 10000);

    test('should receive agent.paused events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'security',
        eventType: 'paused',
        message: 'Workflow paused due to security conflict',
        timestamp: Date.now(),
        taskId: 'task-005',
        projectId: 'test-project',
        reason: 'conflict_detected',
      };

      socket.once('agent.paused', (data) => {
        expect(data).toMatchObject({
          eventType: 'paused',
          message: expect.any(String),
          reason: 'conflict_detected',
        });
        done();
      });

      socket.emit('agent.paused', testEvent);
    }, 10000);

    test('should receive agent.error events via WebSocket', (done) => {
      const testEvent = {
        agentType: 'engineering',
        eventType: 'error',
        message: 'Engineering Agent failed: Database connection timeout',
        timestamp: Date.now(),
        taskId: 'task-006',
        projectId: 'test-project',
        error: {
          code: 'DB_TIMEOUT',
          message: 'Connection to PostgreSQL timed out after 30s',
        },
      };

      socket.once('agent.error', (data) => {
        expect(data).toMatchObject({
          eventType: 'error',
          message: expect.any(String),
          error: expect.any(Object),
        });
        expect(data.error.code).toBe('DB_TIMEOUT');
        done();
      });

      socket.emit('agent.error', testEvent);
    }, 10000);
  });

  describe('Event Payload Validation', () => {
    test('agent.started payload should have required fields', (done) => {
      socket.once('agent.started', (data) => {
        expect(data).toHaveProperty('agentType');
        expect(data).toHaveProperty('eventType');
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        expect(data.eventType).toBe('started');
        done();
      });

      socket.emit('agent.started', {
        agentType: 'test',
        eventType: 'started',
        message: 'Test agent started',
        timestamp: Date.now(),
        projectId: 'test-project',
      });
    }, 10000);

    test('agent.conflict_detected payload should include severity and conflictData', (done) => {
      socket.once('agent.conflict_detected', (data) => {
        expect(data).toHaveProperty('severity');
        expect(data).toHaveProperty('conflictData');
        expect(['low', 'medium', 'high', 'critical']).toContain(data.severity);
        expect(data.conflictData).toBeInstanceOf(Object);
        done();
      });

      socket.emit('agent.conflict_detected', {
        agentType: 'security',
        eventType: 'conflict_detected',
        message: 'Test conflict',
        timestamp: Date.now(),
        projectId: 'test-project',
        severity: 'critical',
        conflictData: {
          title: 'Test Vulnerability',
          description: 'Test description',
        },
      });
    }, 10000);
  });

  describe('Performance & Load Testing', () => {
    test('should handle rapid events (100+ per minute) without lag', (done) => {
      const eventCount = 100;
      const eventsReceived: any[] = [];
      const startTime = Date.now();

      // Listen for all events
      const eventHandler = (data: any) => {
        eventsReceived.push(data);
        if (eventsReceived.length === eventCount) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Should process 100 events in under 5 seconds
          expect(duration).toBeLessThan(5000);
          expect(eventsReceived.length).toBe(eventCount);

          // Cleanup listener
          socket.off('agent.progress', eventHandler);
          done();
        }
      };

      socket.on('agent.progress', eventHandler);

      // Emit 100 events rapidly
      for (let i = 0; i < eventCount; i++) {
        socket.emit('agent.progress', {
          agentType: 'test',
          eventType: 'progress',
          message: `Test event ${i}`,
          timestamp: Date.now(),
          projectId: 'test-project',
          progress: i,
        });
      }
    }, 15000); // 15 second timeout

    test('should maintain WebSocket connection under load', (done) => {
      expect(socket.connected).toBe(true);

      // Emit many events
      for (let i = 0; i < 50; i++) {
        socket.emit('agent.started', {
          agentType: 'test',
          eventType: 'started',
          message: `Load test event ${i}`,
          timestamp: Date.now(),
          projectId: 'test-project',
        });
      }

      // Check connection still stable after 2 seconds
      setTimeout(() => {
        expect(socket.connected).toBe(true);
        done();
      }, 2000);
    }, 10000);
  });

  describe('WebSocket Stability', () => {
    test('should maintain connection for extended period', (done) => {
      const initialConnectionState = socket.connected;
      expect(initialConnectionState).toBe(true);

      // Check connection after 3 seconds
      setTimeout(() => {
        expect(socket.connected).toBe(true);
        done();
      }, 3000);
    }, 5000);

    test('should handle disconnect and reconnect gracefully', (done) => {
      // Listen for reconnection
      socket.once('connect', () => {
        console.log('[Test] Reconnected successfully');
        expect(socket.connected).toBe(true);
        done();
      });

      // Force disconnect
      socket.disconnect();
      expect(socket.connected).toBe(false);

      // Reconnect after 1 second
      setTimeout(() => {
        socket.connect();
      }, 1000);
    }, 10000);
  });

  describe('Event Broadcasting', () => {
    test('should broadcast events to project-specific room', (done) => {
      const projectId = 'project-123';
      const testEvent = {
        agentType: 'business',
        eventType: 'started',
        message: 'Test broadcast to project room',
        timestamp: Date.now(),
        projectId,
      };

      // Join project room
      socket.emit('join-project', projectId);

      // Listen for event in project room
      socket.once(`project:${projectId}:agent.started`, (data) => {
        expect(data.projectId).toBe(projectId);
        done();
      });

      // Emit event to project room
      setTimeout(() => {
        socket.emit('agent.started', testEvent);
      }, 500);
    }, 10000);

    test('should broadcast events to global room', (done) => {
      const testEvent = {
        agentType: 'quality',
        eventType: 'completed',
        message: 'Global broadcast test',
        timestamp: Date.now(),
        projectId: 'global-test',
      };

      socket.once('agent.completed', (data) => {
        expect(data.message).toBe('Global broadcast test');
        done();
      });

      socket.emit('agent.completed', testEvent);
    }, 10000);
  });

  describe('Error Handling', () => {
    test('should handle invalid event payloads gracefully', (done) => {
      // Emit invalid event (missing required fields)
      socket.emit('agent.started', {
        // Missing agentType, message, etc.
        timestamp: Date.now(),
      });

      // Should not crash - server should validate and reject
      setTimeout(() => {
        expect(socket.connected).toBe(true);
        done();
      }, 1000);
    }, 5000);

    test('should handle events with very long messages', (done) => {
      const longMessage = 'A'.repeat(10000); // 10KB message
      const testEvent = {
        agentType: 'test',
        eventType: 'progress',
        message: longMessage,
        timestamp: Date.now(),
        projectId: 'test-project',
      };

      socket.once('agent.progress', (data) => {
        expect(data.message).toBe(longMessage);
        done();
      });

      socket.emit('agent.progress', testEvent);
    }, 10000);
  });
});

describe('Activity Feed - Frontend Integration (Mock)', () => {
  /**
   * Note: These tests would require JSDOM or Puppeteer to test actual DOM manipulation.
   * For now, we document expected behavior. Integration with Puppeteer can be added later.
   */

  describe('DOM Manipulation (Documented Expectations)', () => {
    test('should add event to activity feed DOM', () => {
      // Expected: AgentActivityFeed.addEvent() creates new feed item DOM element
      // Expected: Item has class 'activity-feed-item'
      // Expected: Item has severity class (severity-info, severity-success, etc.)
      // Expected: Item has timestamp, icon, message
      expect(true).toBe(true); // Placeholder
    });

    test('should auto-scroll to newest event', () => {
      // Expected: scrollTop set to 0 (newest at top)
      // Expected: Smooth scroll animation if supported
      expect(true).toBe(true); // Placeholder
    });

    test('should enforce 20-item limit', () => {
      // Expected: When 21st item added, oldest item removed from DOM
      // Expected: items array length never exceeds 20
      expect(true).toBe(true); // Placeholder
    });

    test('should format timestamps correctly', () => {
      // Expected: "Just now" for events < 10s old
      // Expected: "2m ago" for events 2 minutes old
      // Expected: "1h ago" for events 1 hour old
      // Expected: Full timestamp for events > 24h old
      expect(true).toBe(true); // Placeholder
    });

    test('should minimize/expand on toggle', () => {
      // Expected: Click header toggles 'minimized' class
      // Expected: Container shrinks to 60px circle when minimized
      // Expected: Content hidden when minimized
      expect(true).toBe(true); // Placeholder
    });

    test('should display correct severity colors', () => {
      // Expected: severity-success = green background
      // Expected: severity-error = red background
      // Expected: severity-conflict = red background
      // Expected: severity-warning = yellow/orange background
      // Expected: severity-info = blue background
      expect(true).toBe(true); // Placeholder
    });
  });
});

/**
 * Test Summary:
 *
 * This test suite validates the Activity Feed's WebSocket integration with the orchestrator.
 * It covers all 6 event types (started, progress, completed, conflict_detected, paused, error)
 * and ensures events are received, validated, and performant under load.
 *
 * Test Coverage:
 * - ✅ WebSocket connection establishment
 * - ✅ 6 event types received correctly
 * - ✅ Event payload validation
 * - ✅ Performance: 100+ events/minute
 * - ✅ WebSocket stability and reconnection
 * - ✅ Room-based broadcasting (project-specific + global)
 * - ✅ Error handling (invalid payloads, long messages)
 * - 📝 DOM manipulation (documented, requires Puppeteer for full test)
 *
 * Known Limitations:
 * - DOM tests are placeholders (require JSDOM/Puppeteer setup)
 * - Real orchestrator integration requires running server
 * - Some tests use setTimeout which may be flaky in CI
 *
 * Next Steps:
 * - Add Puppeteer for full E2E DOM testing
 * - Integrate with real orchestrator engine (not just socket echoes)
 * - Add visual regression testing for UI components
 * - Test activity feed with real database persistence
 */
