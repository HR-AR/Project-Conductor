/**
 * Project Conductor - Main Entry Point
 *
 * A workflow orchestration and automation system designed to manage
 * and coordinate complex multi-step processes.
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import middleware
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  corsHandler,
} from './middleware/error-handler';

// Import routes
import requirementsRoutes from './routes/requirements.routes';

// Import database
import { db } from './config/database';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['*'],
    methods: ['GET', 'POST'],
  },
});

// Global middleware
app.use(corsHandler);
app.use(requestLogger);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api/v1/requirements', requirementsRoutes);

// Basic health check endpoint
app.get('/health', async (_req, res) => {
  try {
    // Test database connection
    const dbStatus = await db.testConnection();

    res.json({
      status: 'ok',
      service: 'project-conductor',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'connected' : 'disconnected',
      environment: process.env['NODE_ENV'] || 'development',
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

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Project Conductor - Workflow Orchestration System',
    version: '1.0.0',
    description: 'A comprehensive requirements management and workflow orchestration API',
    endpoints: {
      health: '/health',
      requirements: '/api/v1/requirements',
      documentation: '/api/v1/requirements (for API documentation)',
    },
    features: [
      'Requirements CRUD operations',
      'Version history tracking',
      'Advanced filtering and search',
      'Bulk operations',
      'CSV export',
      'Real-time updates via WebSocket',
      'Comprehensive audit logging',
    ],
  });
});

// API documentation endpoint
app.get('/api/v1', (_req, res) => {
  res.json({
    name: 'Project Conductor API',
    version: '1.0.0',
    description: 'RESTful API for requirements management and workflow orchestration',
    endpoints: {
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
    },
    authentication: 'Currently disabled for demo purposes',
    rateLimit: '100 requests per 15 minutes (default), 20 requests per 15 minutes (write operations)',
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join requirement rooms for real-time updates
  socket.on('join-requirement', (requirementId: string) => {
    socket.join(`requirement:${requirementId}`);
    console.log(`Client ${socket.id} joined requirement room: ${requirementId}`);
  });

  socket.on('leave-requirement', (requirementId: string) => {
    socket.leave(`requirement:${requirementId}`);
    console.log(`Client ${socket.id} left requirement room: ${requirementId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules (for real-time updates)
export { io };

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env['PORT'] || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await db.initialize();
    console.log('Database initialized successfully');

    // Only start the server if this file is run directly (not imported for testing)
    if (require.main === module) {
      server.listen(PORT, () => {
        console.log(`Project Conductor server running on port ${PORT}`);
        console.log(`Health check available at: http://localhost:${PORT}/health`);
        console.log(`API documentation available at: http://localhost:${PORT}/api/v1`);
        console.log(`Requirements API available at: http://localhost:${PORT}/api/v1/requirements`);
        console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;