/**
 * Database Configuration and Connection Utility
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import logger from '../utils/logger';

interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class Database {
  private static instance: Database;
  private pool: Pool;
  private config: DatabaseConfig;

  private constructor() {
    this.config = {
      host: process.env['DB_HOST'] || 'localhost',
      port: parseInt(process.env['DB_PORT'] || '5432'),
      database: process.env['DB_NAME'] || 'conductor',
      user: process.env['DB_USER'] || 'conductor',
      password: process.env['DB_PASSWORD'] || 'conductor',

      // Optimized connection pool settings for production
      max: parseInt(process.env['DB_POOL_MAX'] || '20'), // Maximum 20 connections
      min: parseInt(process.env['DB_POOL_MIN'] || '2'), // Minimum 2 connections always ready
      idleTimeoutMillis: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000'), // 30s idle timeout
      connectionTimeoutMillis: parseInt(process.env['DB_CONNECTION_TIMEOUT'] || '2000'), // 2s connection timeout

      // Query timeout to prevent long-running queries
      query_timeout: parseInt(process.env['DB_QUERY_TIMEOUT'] || '30000'), // 30s query timeout

      // Statement timeout for safety
      statement_timeout: parseInt(process.env['DB_STATEMENT_TIMEOUT'] || '30000'), // 30s statement timeout

      // SSL configuration
      ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,

      // Application name for tracking
      application_name: process.env['DB_APP_NAME'] || 'project-conductor',
    };

    this.pool = new Pool(this.config);

    // Handle pool errors - graceful degradation
    this.pool.on('error', (err: Error & { code?: string }) => {
      logger.error({ error: err.message, code: err.code }, 'Database connection error');

      // Graceful degradation - don't kill server
      if (err.code === 'ECONNREFUSED') {
        logger.warn('Database connection refused - retrying in 5s');
        setTimeout(() => {
          // Attempt reconnection
          this.testConnection();
        }, 5000);
      }

      // Don't exit - let health check endpoint show degraded state
    });

    // Handle pool connect events
    this.pool.on('connect', () => {
      logger.info('Database connection established');
    });

    // Handle pool remove events
    this.pool.on('remove', () => {
      logger.debug('Database connection removed');
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a query with automatic client management
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = unknown>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
    const start = Date.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      if (process.env['NODE_ENV'] === 'development') {
        logger.debug({ text, duration, rows: result.rowCount }, 'Executed query');
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'Database query error');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async transaction<T>(queries: Array<{ text: string; params?: any[] }>): Promise<T[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const results: T[] = [];
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result as T);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Transaction error');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a callback within a transaction
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Transaction callback error');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time');
      logger.info({ currentTime: result.rows[0] }, 'Database connection test successful');
      return true;
    } catch (error) {
      logger.error({ error }, 'Database connection test failed');
      return false;
    }
  }

  /**
   * Get pool status
   */
  getPoolStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  /**
   * Initialize database (run migrations, etc.)
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        logger.warn('Database connection not available - running without database');
        return;
      }

      // Check if requirements_versions table exists, create if not
      await this.createRequirementVersionsTable();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Database initialization failed - continuing without database');
      // Continue without database for testing purposes
    }
  }

  /**
   * Create requirements_versions table for versioning
   */
  private async createRequirementVersionsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS requirements_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status requirement_status NOT NULL,
        priority requirement_priority NOT NULL,
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        estimated_effort INTEGER,
        actual_effort INTEGER,
        completion_percentage INTEGER DEFAULT 0,
        tags TEXT[],
        metadata JSONB,
        changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT requirements_versions_completion_check CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
        CONSTRAINT requirements_versions_unique_version UNIQUE (requirement_id, version_number)
      );
    `;

    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_requirements_versions_requirement_id ON requirements_versions(requirement_id);
      CREATE INDEX IF NOT EXISTS idx_requirements_versions_version_number ON requirements_versions(version_number);
      CREATE INDEX IF NOT EXISTS idx_requirements_versions_changed_by ON requirements_versions(changed_by);
      CREATE INDEX IF NOT EXISTS idx_requirements_versions_created_at ON requirements_versions(created_at);
    `;

    try {
      await this.query(createTableQuery);
      await this.query(createIndexesQuery);
      logger.info('Requirements versions table created/verified successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to create requirements_versions table');
      throw error;
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();
export default Database;