/**
 * Database Configuration and Connection Utility
 */

import { Pool, PoolConfig, PoolClient } from 'pg';

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
      max: parseInt(process.env['DB_POOL_MAX'] || '20'),
      idleTimeoutMillis: parseInt(process.env['DB_IDLE_TIMEOUT'] || '30000'),
      connectionTimeoutMillis: parseInt(process.env['DB_CONNECTION_TIMEOUT'] || '2000'),
      ssl: process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(this.config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    // Handle pool connect events
    this.pool.on('connect', () => {
      console.log('Database connection established');
    });

    // Handle pool remove events
    this.pool.on('remove', () => {
      console.log('Database connection removed');
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
  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    const client = await this.pool.connect();

    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      if (process.env['NODE_ENV'] === 'development') {
        console.log('Executed query', { text, duration, rows: result.rowCount });
      }

      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
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
      console.error('Transaction error:', error);
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
      console.error('Transaction callback error:', error);
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
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
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
    console.log('Database pool closed');
  }

  /**
   * Initialize database (run migrations, etc.)
   */
  async initialize(): Promise<void> {
    try {
      // Test connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.warn('Database connection not available - running without database');
        return;
      }

      // Check if requirements_versions table exists, create if not
      await this.createRequirementVersionsTable();

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed - continuing without database:', error);
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
      console.log('Requirements versions table created/verified successfully');
    } catch (error) {
      console.error('Failed to create requirements_versions table:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();
export default Database;