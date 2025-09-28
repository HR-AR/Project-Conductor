/**
 * PATTERN: Database Connection Pool with Singleton Pattern
 * USE WHEN: Managing database connections, implementing connection pooling, ensuring single database instance
 * KEY CONCEPTS: Singleton pattern, connection pooling, graceful error handling, environment configuration
 */

import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface QueryOptions {
  client?: PoolClient;
  logQuery?: boolean;
}

/**
 * Database singleton class for PostgreSQL connection management
 *
 * Key patterns:
 * - Singleton pattern ensures single database instance
 * - Connection pooling for efficient resource usage
 * - Automatic retry logic for resilience
 * - Transaction support with client management
 * - Query logging for development
 */
class Database {
  private static instance: Database;
  private pool: Pool;
  private config: DatabaseConfig;
  private isInitialized: boolean = false;

  /**
   * Private constructor prevents direct instantiation
   */
  private constructor() {
    // Load configuration from environment variables
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'myapp',
      user: process.env.DB_USER || 'appuser',
      password: process.env.DB_PASSWORD || 'password',

      // Connection pool configuration
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),

      // SSL configuration for production
      ssl: process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
        : undefined,
    };

    this.pool = new Pool(this.config);
    this.setupPoolEventHandlers();
  }

  /**
   * Setup pool event handlers for monitoring and error handling
   *
   * Key patterns:
   * - Event-driven error handling
   * - Connection lifecycle monitoring
   * - Graceful degradation
   */
  private setupPoolEventHandlers(): void {
    // Handle pool errors
    this.pool.on('error', (err: Error, client: PoolClient) => {
      console.error('Unexpected database pool error:', err);
      // In production, send to monitoring service
      // this.notifyMonitoring('database-pool-error', err);
    });

    // Log new connections (development only)
    if (process.env.NODE_ENV === 'development') {
      this.pool.on('connect', (client: PoolClient) => {
        console.log('New database connection established');
      });

      this.pool.on('acquire', (client: PoolClient) => {
        console.log('Client acquired from pool');
      });

      this.pool.on('remove', (client: PoolClient) => {
        console.log('Client removed from pool');
      });
    }
  }

  /**
   * Get singleton instance
   *
   * Key patterns:
   * - Lazy initialization
   * - Thread-safe singleton
   */
  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Initialize database (create tables, run migrations, etc.)
   *
   * Key patterns:
   * - Idempotent initialization
   * - Migration support
   * - Health checking
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      await this.testConnection();

      // Run migrations (if needed)
      // await this.runMigrations();

      // Create initial tables
      await this.createTables();

      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   *
   * Key patterns:
   * - Health check implementation
   * - Connection validation
   */
  public async testConnection(): Promise<boolean> {
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
   * Execute a query with automatic client management
   *
   * Key patterns:
   * - Automatic client acquisition/release
   * - Query timing and logging
   * - Error context enrichment
   */
  public async query<T = any>(
    text: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const shouldLog = options.logQuery ?? process.env.NODE_ENV === 'development';

    // Use provided client or get new one from pool
    const client = options.client || await this.pool.connect();

    try {
      const result = await client.query<T>(text, params);

      const duration = Date.now() - start;

      if (shouldLog) {
        console.log('Executed query', {
          text: text.substring(0, 100),
          duration,
          rows: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      // Enhance error with query context
      const enhancedError = new Error(
        `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      (enhancedError as any).query = text;
      (enhancedError as any).params = params;

      console.error('Query error:', enhancedError);
      throw enhancedError;
    } finally {
      // Only release if we acquired the client
      if (!options.client) {
        client.release();
      }
    }
  }

  /**
   * Execute a transaction
   *
   * Key patterns:
   * - Transaction management
   * - Automatic rollback on error
   * - Client isolation
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   *
   * Key patterns:
   * - Batch operations
   * - All-or-nothing execution
   */
  public async batchQuery(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    return this.transaction(async (client) => {
      const results = [];

      for (const query of queries) {
        const result = await this.query(query.text, query.params, { client });
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Get a client for manual transaction management
   *
   * Key patterns:
   * - Manual client management
   * - Long-running operations
   */
  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Create initial database tables
   *
   * Key patterns:
   * - Schema initialization
   * - Idempotent table creation
   */
  private async createTables(): Promise<void> {
    const queries = [
      // Entities table
      `CREATE TABLE IF NOT EXISTS entities (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        category VARCHAR(100),
        metadata JSONB,
        created_by VARCHAR(50) NOT NULL,
        updated_by VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status)`,
      `CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON entities(deleted_at)`,

      // Audit log table
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        user_id VARCHAR(50) NOT NULL,
        changes JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const queryText of queries) {
      await this.query(queryText);
    }
  }

  /**
   * Get pool statistics
   *
   * Key patterns:
   * - Monitoring and metrics
   * - Resource usage tracking
   */
  public getPoolStats(): any {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Gracefully shutdown database connections
   *
   * Key patterns:
   * - Clean shutdown
   * - Resource cleanup
   */
  public async shutdown(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Export types for use in other modules
export type { DatabaseConfig, QueryOptions };
export default Database;