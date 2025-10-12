/**
 * Project Conductor - Main Entry Point
 *
 * A workflow orchestration and automation system designed to manage
 * and coordinate complex multi-step processes.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import logger from './utils/logger';

// Import middleware
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  corsHandler,
} from './middleware/error-handler';
import {
  responseTimeMiddleware,
  performanceMetricsMiddleware,
  requestSizeMonitor,
} from './middleware/performance';
import {
  cacheMiddleware,
  cacheInvalidationMiddleware,
  etagMiddleware,
  cacheControlMiddleware,
} from './middleware/cache';

// Import rate limiting
import { rateLimiters } from './middleware/rate-limiter';
import { redisClient } from './config/redis';

// Import services will be accessed through service factory

// Import routes
import requirementsRoutes from './routes/requirements.routes';
import linksRoutes from './routes/links.routes';
import traceabilityRoutes from './routes/traceability.routes';
import { createCommentsRoutes } from './routes/comments.routes';
import qualityRoutes from './routes/quality.routes';
import reviewRoutes from './routes/review.routes';
import metricsRoutes from './routes/metrics.routes';
// import orchestratorRoutes, { initializeOrchestrator } from './routes/orchestrator.routes'; // Temporarily disabled

// Import enhanced workflow routes
import brdRoutes from './routes/brd.routes';
import prdRoutes from './routes/prd.routes';
import engineeringDesignRoutes from './routes/engineering-design.routes';
import conflictRoutes from './routes/conflict.routes';
import changeLogRoutes from './routes/change-log.routes';

// Import AI generation routes
import generationRoutes from './routes/generation.routes';

// Import project history routes
import projectHistoryRoutes from './routes/project-history.routes';

// Import narratives routes
import narrativesRoutes from './routes/narratives.routes';

// Import approvals routes
import approvalsRoutes from './routes/approvals.routes';

// Import dashboard routes
import dashboardRoutes from './routes/dashboard.routes';

// Import authentication and user routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

// Import integration routes
// import jiraRoutes from './routes/integrations/jira.routes'; // Disabled for demo - Phase 2 feature

// Import database
import { db } from './config/database';

// Import presence service
import { presenceService } from './services/presence.service';

// Import WebSocket service and service factory
import WebSocketService from './services/websocket.service';
import ServiceFactory from './services/service-factory';

// Import widget renderers
import { initializeWidgets } from './services/widget-renderers';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['*'],
    methods: ['GET', 'POST'],
  },
});

// Initialize WebSocket service with Socket.io instance
const webSocketService = new WebSocketService(io);

// Initialize service factory with WebSocket support
ServiceFactory.initialize(webSocketService);

// Get service instances from factory
const requirementsService = ServiceFactory.getRequirementsService();
const linksService = ServiceFactory.getLinksService();
const commentsService = ServiceFactory.getCommentsService();

// Global middleware
app.use(corsHandler);

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for widgets
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding
  crossOriginOpenerPolicy: false, // Allow same-origin iframes
  crossOriginResourcePolicy: false, // Allow resources to be loaded by iframes
  frameguard: false, // Disable X-Frame-Options to allow iframes
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true, // Prevent MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true, // Enable XSS filter
}));

// Performance monitoring
app.use(responseTimeMiddleware);
app.use(performanceMetricsMiddleware);
app.use(requestSizeMonitor);

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Compression middleware for all responses (gzip/brotli)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
}));

// ETag support for caching
app.use(etagMiddleware);

// Static file serving with cache headers
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

// Serve public directory for widget assets
app.use('/public', express.static(publicDir, {
  setHeaders: (res, filePath) => {
    // Set cache for CSS files
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days for CSS
    }
    // Set cache for JavaScript files
    else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days for JS
    }
    // Default cache for other files
    else {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day default
    }
  },
}));

// Serve demo/HTML files from project root
app.use('/demo', express.static(projectRoot, {
  setHeaders: (res, filePath) => {
    // Set MIME type for HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for HTML
    }
    // Set cache for CSS files
    else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days for CSS
    }
    // Set cache for JavaScript files
    else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days for JS
    }
    // Set cache for images
    else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days for images
    }
    // Default cache for other files
    else {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day default
    }
  },
}));

// Health check endpoint (no rate limiting)
app.get('/health', async (_req, res) => {
  try {
    // Test database connection
    const dbStatus = await db.testConnection();

    // Get presence statistics
    const presenceStats = presenceService.getPresenceStats();

    res.json({
      status: 'ok',
      service: 'project-conductor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
      environment: process.env['NODE_ENV'] || 'development',
      presence: presenceStats,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'project-conductor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      environment: process.env['NODE_ENV'] || 'development',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Apply general API rate limiting
app.use('/api', rateLimiters.api(redisClient));

// Redis caching for GET requests (5 minute TTL)
app.use('/api/v1', cacheMiddleware(redisClient, {
  ttl: 300, // 5 minutes
  keyPrefix: 'api',
  excludeQuery: ['timestamp'], // Exclude timestamp from cache key
}));

// Cache invalidation on write operations
app.use('/api/v1', cacheInvalidationMiddleware(redisClient, {
  keyPrefix: 'api',
}));

// Cache control headers for read-heavy endpoints
app.use('/api/v1/requirements/:id', cacheControlMiddleware({
  public: true,
  maxAge: 60, // 1 minute
  staleWhileRevalidate: 300, // 5 minutes
}));

app.use('/api/v1/traceability', cacheControlMiddleware({
  public: true,
  maxAge: 300, // 5 minutes
  staleWhileRevalidate: 600, // 10 minutes
}));

// API routes
app.use('/api/v1/requirements', requirementsRoutes);
app.use('/api/v1', linksRoutes);
app.use('/api/v1', traceabilityRoutes);
app.use('/api/v1', createCommentsRoutes(webSocketService));
app.use('/api/v1', qualityRoutes);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1', metricsRoutes);
// app.use('/api/v1/orchestrator', orchestratorRoutes); // Temporarily disabled

// Enhanced workflow routes
app.use('/api/v1/brd', brdRoutes);
app.use('/api/v1/prd', prdRoutes);
app.use('/api/v1/engineering-design', engineeringDesignRoutes);
app.use('/api/v1/conflicts', conflictRoutes);
app.use('/api/v1/change-log', changeLogRoutes);

// AI generation routes
app.use('/api/v1/generation', generationRoutes);

// Project history routes
app.use('/api/v1/projects', projectHistoryRoutes);

// Narratives routes
app.use('/api/v1/narratives', narrativesRoutes);

// Approvals routes
app.use('/api/v1/approvals', approvalsRoutes);

// Dashboard routes
app.use('/api/v1/dashboard', dashboardRoutes);

// Authentication routes (public)
app.use('/api/v1/auth', authRoutes);

// User management routes (protected)
app.use('/api/v1/users', userRoutes);

// Integration routes
// app.use('/api/v1/integrations/jira', jiraRoutes); // Disabled for demo - Phase 2 feature

// Presence monitoring endpoint
app.get('/api/v1/presence/stats', (_req, res) => {
  try {
    const stats = presenceService.getPresenceStats();
    const allUsers = presenceService.getAllActiveUsers();

    res.json({
      statistics: stats,
      activeUsers: allUsers.map(user => ({
        userId: user.userId,
        username: user.username,
        status: user.status,
        isEditing: user.isEditing,
        requirementId: user.requirementId,
        lastSeen: user.lastSeen,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve presence statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get presence for specific requirement
app.get('/api/v1/presence/requirement/:requirementId', (req, res) => {
  try {
    const { requirementId } = req.params;
    const requirementPresence = presenceService.getUsersInRequirement(requirementId);

    res.json(requirementPresence);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve requirement presence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Root endpoint - Serve unified dashboard
app.get('/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'conductor-unified-dashboard.html'));
});

// Demo index route - serve unified dashboard
app.get('/demo', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'conductor-unified-dashboard.html'));
});

app.get('/demo/', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'conductor-unified-dashboard.html'));
});

// Direct access to dashboard
app.get('/conductor-unified-dashboard.html', (_req, res) => {
  res.sendFile(path.join(projectRoot, 'conductor-unified-dashboard.html'));
});

// Other demo routes are handled by static middleware above at line 121
// Accessing via:
// - /demo/conductor-unified-dashboard.html
// - /demo/live-demo.html
// - /demo/orchestration-demo.html
// - /demo/prd-orchestration-demo.html
// - /demo/PROJECT_CONDUCTOR_DEMO.html

// API documentation endpoint
app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'Project Conductor API',
    version: '1.0.0',
    description: 'RESTful API for requirements management and workflow orchestration',
    endpoints: {
      authentication: {
        'POST /api/v1/auth/register': 'Register a new user',
        'POST /api/v1/auth/login': 'Login with email and password',
        'POST /api/v1/auth/refresh': 'Refresh access token using refresh token',
        'POST /api/v1/auth/logout': 'Logout user',
      },
      users: {
        'GET /api/v1/users': 'Get all users (admin only, with pagination)',
        'GET /api/v1/users/stats': 'Get user statistics (admin only)',
        'GET /api/v1/users/me': 'Get current user profile',
        'PUT /api/v1/users/me/password': 'Change current user password',
        'GET /api/v1/users/:id': 'Get user by ID (owner or admin)',
        'PUT /api/v1/users/:id': 'Update user profile (owner or admin)',
        'DELETE /api/v1/users/:id': 'Delete user (admin only)',
      },
      requirements: {
        'GET /api/v1/requirements': 'List all requirements with pagination and filtering',
        'POST /api/v1/requirements': 'Create a new requirement',
        'GET /api/v1/requirements/:id': 'Get a specific requirement',
        'PUT /api/v1/requirements/:id': 'Update a requirement',
        'DELETE /api/v1/requirements/:id': 'Archive a requirement',
        'GET /api/v1/requirements/:id/versions': 'Get requirement version history',
        'GET /api/v1/requirements/summary': 'Get requirements statistics',
        'GET /api/v1/requirements/export': 'Export requirements to CSV',
        'PUT /api/v1/requirements/bulk': 'Bulk update requirements',
      },
      links: {
        'POST /api/v1/requirements/:id/links': 'Create link from requirement',
        'GET /api/v1/requirements/:id/links': 'Get all links for requirement',
        'POST /api/v1/requirements/:id/links/validate': 'Validate potential link',
        'GET /api/v1/links': 'Get links with filtering',
        'GET /api/v1/links/statistics': 'Get link statistics',
        'PUT /api/v1/links/:linkId': 'Update existing link',
        'PUT /api/v1/links/:linkId/suspect': 'Mark/unmark link as suspect',
        'DELETE /api/v1/links/:linkId': 'Delete link',
      },
      traceability: {
        'GET /api/v1/traceability/matrix': 'Generate complete traceability matrix',
        'GET /api/v1/traceability/analytics': 'Get comprehensive link analytics',
        'GET /api/v1/traceability/coverage': 'Get coverage report with filtering',
        'GET /api/v1/traceability/impact/:id': 'Get impact analysis for requirement',
        'GET /api/v1/traceability/path/:fromId/:toId': 'Get traceability path between requirements',
      },
      comments: {
        'POST /api/v1/requirements/:id/comments': 'Create a new comment on a requirement',
        'GET /api/v1/requirements/:id/comments': 'Get all comments for a requirement',
        'GET /api/v1/requirements/:id/comments/summary': 'Get comments summary for a requirement',
        'GET /api/v1/comments/:id': 'Get a single comment by ID',
        'PUT /api/v1/comments/:id': 'Update a comment',
        'DELETE /api/v1/comments/:id': 'Delete a comment',
        'GET /api/v1/comments/:id/thread': 'Get comment thread (parent + all replies)',
      },
      presence: {
        'GET /api/v1/presence/stats': 'Get overall presence statistics and active users',
        'GET /api/v1/presence/requirement/:requirementId': 'Get presence information for specific requirement',
      },
      websocket: {
        'user:initialize': 'Initialize user presence on connection',
        'join-requirement': 'Join requirement room for real-time updates',
        'leave-requirement': 'Leave requirement room',
        'editing:start': 'Start editing a requirement',
        'editing:stop': 'Stop editing a requirement',
        'status:update': 'Update user status (online/away/offline)',
        'presence:get': 'Get presence list for requirement',
        'comment:created': 'Real-time notification when a comment is created',
        'comment:updated': 'Real-time notification when a comment is updated',
        'comment:deleted': 'Real-time notification when a comment is deleted',
      },
    },
    authentication: 'JWT-based authentication with access and refresh tokens',
    rateLimit: '100 requests per 15 minutes (default), 20 requests per 15 minutes (write operations)',
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  // Initialize user presence on connection
  socket.on('user:initialize', (data: { userId: string; username: string }) => {
    const { userId, username } = data;
    const presence = presenceService.trackUserJoin(socket.id, userId, username);

    // Emit user initialization confirmation
    socket.emit('presence:initialized', presence);

    logger.info({ username, userId, socketId: socket.id }, 'User initialized with socket');
  });

  // Join requirement rooms for real-time updates
  socket.on('join-requirement', (data: { requirementId: string; userId: string; username: string }) => {
    const { requirementId, userId, username } = data;

    socket.join(`requirement:${requirementId}`);

    // Track user joining requirement
    const presence = presenceService.trackUserJoin(socket.id, userId, username, requirementId);

    // Get all users in the requirement
    const requirementPresence = presenceService.getUsersInRequirement(requirementId);

    // Broadcast user joined to other users in the room
    socket.to(`requirement:${requirementId}`).emit('presence:user-joined', {
      user: presence,
      requirementId,
    });

    // Send current presence list to the joining user
    socket.emit('presence:list', requirementPresence);

    logger.info({ socketId: socket.id, username, requirementId }, 'Client joined requirement room');
  });

  // Leave requirement room
  socket.on('leave-requirement', (requirementId: string) => {
    const presence = presenceService.trackUserLeave(socket.id);

    if (presence) {
      // Broadcast user left to other users in the room
      socket.to(`requirement:${requirementId}`).emit('presence:user-left', {
        user: presence,
        requirementId,
      });

      logger.info({ socketId: socket.id, username: presence.username, requirementId }, 'Client left requirement room');
    }

    socket.leave(`requirement:${requirementId}`);
  });

  // Handle editing start
  socket.on('editing:start', (data: { userId: string; requirementId: string }) => {
    const { userId, requirementId } = data;
    const presence = presenceService.setEditingStatus(userId, requirementId, true);

    if (presence) {
      // Broadcast editing start to other users in the room
      socket.to(`requirement:${requirementId}`).emit('presence:editing-start', {
        user: presence,
        requirementId,
      });

      logger.info({ username: presence.username, requirementId }, 'User started editing requirement');
    }
  });

  // Handle editing stop
  socket.on('editing:stop', (data: { userId: string; requirementId: string }) => {
    const { userId, requirementId } = data;
    const presence = presenceService.setEditingStatus(userId, requirementId, false);

    if (presence) {
      // Broadcast editing stop to other users in the room
      socket.to(`requirement:${requirementId}`).emit('presence:editing-stop', {
        user: presence,
        requirementId,
      });

      logger.info({ username: presence.username, requirementId }, 'User stopped editing requirement');
    }
  });

  // Handle status updates (online, away, etc.)
  socket.on('status:update', (data: { userId: string; status: 'online' | 'away' | 'offline' }) => {
    const { userId, status } = data;
    const presence = presenceService.updateUserStatus(userId, status);

    if (presence && presence.requirementId) {
      // Broadcast status change to users in the same requirement room
      socket.to(`requirement:${presence.requirementId}`).emit('presence:status-change', {
        user: presence,
        requirementId: presence.requirementId,
      });
    }
  });

  // Get presence for a specific requirement
  socket.on('presence:get', (requirementId: string) => {
    const requirementPresence = presenceService.getUsersInRequirement(requirementId);
    socket.emit('presence:list', requirementPresence);
  });

  // Handle custom WebSocket events for enhanced collaboration
  socket.on('requirement:comment', (data: { requirementId: string; comment: string; userId: string; username: string }) => {
    const { requirementId, comment, userId, username } = data;

    // Broadcast comment to other users in the requirement room
    socket.to(`requirement:${requirementId}`).emit('requirement:comment-added', {
      requirementId,
      comment,
      userId,
      username,
      timestamp: new Date(),
    });
  });

  // Handle requirement field change notifications for real-time collaboration
  socket.on('requirement:field-change', (data: { requirementId: string; field: string; value: any; userId: string; username: string }) => {
    const { requirementId, field, value, userId, username } = data;

    // Broadcast field change to other users viewing the requirement
    socket.to(`requirement:${requirementId}`).emit('requirement:field-changed', {
      requirementId,
      field,
      value,
      userId,
      username,
      timestamp: new Date(),
    });
  });

  // Handle cursor position updates for collaborative editing
  socket.on('requirement:cursor', (data: { requirementId: string; field: string; position: number; userId: string; username: string }) => {
    const { requirementId, field, position, userId, username } = data;

    // Broadcast cursor position to other editors
    socket.to(`requirement:${requirementId}`).emit('requirement:cursor-updated', {
      requirementId,
      field,
      position,
      userId,
      username,
      timestamp: new Date(),
    });
  });

  // Handle text selection updates for collaborative editing
  socket.on('requirement:selection', (data: { requirementId: string; field: string; start: number; end: number; userId: string; username: string }) => {
    const { requirementId, field, start, end, userId, username } = data;

    // Broadcast text selection to other editors
    socket.to(`requirement:${requirementId}`).emit('requirement:selection-updated', {
      requirementId,
      field,
      start,
      end,
      userId,
      username,
      timestamp: new Date(),
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const presence = presenceService.handleDisconnect(socket.id);

    if (presence) {
      // If user was in a requirement room, notify other users
      if (presence.requirementId) {
        socket.to(`requirement:${presence.requirementId}`).emit('presence:user-left', {
          user: presence,
          requirementId: presence.requirementId,
        });
      }

      logger.info({ socketId: socket.id, username: presence.username }, 'Client disconnected');
    } else {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    }
  });
});

// Export io and services for use in other modules (for real-time updates)
export { io, webSocketService, requirementsService, linksService, commentsService };

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env['PORT'] || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await db.initialize();
    logger.info('Database initialized successfully');

    // Initialize widget renderers
    initializeWidgets();
    logger.info('Widget renderers initialized successfully');

    // Initialize orchestrator (optional - controlled via env variable)
    if (process.env['ENABLE_ORCHESTRATOR'] === 'true') {
      // const orchestrator = initializeOrchestrator(); // Temporarily disabled
      // await orchestrator.start();
      logger.info('Orchestrator temporarily disabled');
    }

    // Set up periodic presence cleanup (every 5 minutes)
    const cleanupInterval = setInterval(() => {
      const cleanedCount = presenceService.cleanupStalePresence(15); // 15 minutes timeout
      if (cleanedCount > 0) {
        logger.info({ cleanedCount }, 'Cleaned up stale presence records');
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Clean up interval on process termination
    const cleanup = () => {
      clearInterval(cleanupInterval);
      logger.info('Server cleanup completed');
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Only start the server if this file is run directly (not imported for testing)
    if (require.main === module) {
      server.listen(PORT, () => {
        logger.info({ port: PORT }, 'Project Conductor server running');
        logger.info({ url: `http://localhost:${PORT}/health` }, 'Health check available');
        logger.info({ url: `http://localhost:${PORT}/demo` }, 'Demo dashboard available');
        logger.info({ url: `http://localhost:${PORT}/api/v1` }, 'API documentation available');
        logger.info({ url: `http://localhost:${PORT}/api/v1/requirements` }, 'Requirements API available');
        logger.info({ environment: process.env['NODE_ENV'] || 'development' }, 'Environment');
        logger.info('Real-time presence tracking enabled');
        logger.info('Static file serving enabled with gzip compression');
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;