/**
 * PATTERN: Parameterized Database Queries with PostgreSQL
 * USE WHEN: Executing database operations safely and efficiently
 * KEY CONCEPTS: SQL injection prevention, connection pooling, query building
 *
 * Source: Adapted from database operations across services
 */

import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Database connection pool configuration
 *
 * Key patterns:
 * - Singleton pattern for connection pool
 * - Environment-based configuration
 * - Connection retry logic
 */
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30s
      connectionTimeoutMillis: 2000, // Timeout new connections after 2s
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Execute a simple query
   *
   * Key patterns:
   * - Parameterized queries to prevent SQL injection
   * - Error handling
   * - Result type safety
   */
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(text, params);
    } catch (error) {
      console.error('Database query error:', { text, params, error });
      throw error;
    }
  }

  /**
   * Get a client for transaction use
   *
   * Key patterns:
   * - Client checkout for transactions
   * - Ensures client is released
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Query builder helper class
 *
 * Key patterns:
 * - Dynamic query construction
 * - Safe parameter binding
 * - Fluent interface
 */
class QueryBuilder {
  private tableName: string;
  private selectFields: string[] = ['*'];
  private whereConditions: string[] = [];
  private joinClauses: string[] = [];
  private orderByClause?: string;
  private limitValue?: number;
  private offsetValue?: number;
  private params: any[] = [];
  private paramCount = 1;

  constructor(table: string) {
    this.tableName = table;
  }

  /**
   * Select specific fields
   */
  select(...fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Add WHERE condition
   *
   * Key patterns:
   * - Parameter placeholder generation
   * - Condition chaining
   */
  where(column: string, operator: string, value: any): this {
    const placeholder = `$${this.paramCount++}`;
    this.whereConditions.push(`${column} ${operator} ${placeholder}`);
    this.params.push(value);
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  whereIn(column: string, values: any[]): this {
    const placeholder = `$${this.paramCount++}`;
    this.whereConditions.push(`${column} = ANY(${placeholder})`);
    this.params.push(values);
    return this;
  }

  /**
   * Add WHERE LIKE condition for search
   */
  whereLike(column: string, pattern: string): this {
    const placeholder = `$${this.paramCount++}`;
    this.whereConditions.push(`${column} ILIKE ${placeholder}`);
    this.params.push(`%${pattern}%`);
    return this;
  }

  /**
   * Add JOIN clause
   */
  join(
    type: 'INNER' | 'LEFT' | 'RIGHT',
    table: string,
    on: string
  ): this {
    this.joinClauses.push(`${type} JOIN ${table} ON ${on}`);
    return this;
  }

  /**
   * Add ORDER BY
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `${column} ${direction}`;
    return this;
  }

  /**
   * Add LIMIT
   */
  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  /**
   * Add OFFSET
   */
  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  /**
   * Build the final query
   */
  build(): { text: string; params: any[] } {
    let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;

    // Add JOINs
    if (this.joinClauses.length > 0) {
      query += ` ${this.joinClauses.join(' ')}`;
    }

    // Add WHERE
    if (this.whereConditions.length > 0) {
      query += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (this.orderByClause) {
      query += ` ORDER BY ${this.orderByClause}`;
    }

    // Add LIMIT
    if (this.limitValue !== undefined) {
      query += ` LIMIT ${this.limitValue}`;
    }

    // Add OFFSET
    if (this.offsetValue !== undefined) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return { text: query, params: this.params };
  }
}

/**
 * Example repository class showing query patterns
 */
export class ResourceRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * Simple SELECT query
   *
   * Key patterns:
   * - Parameterized query
   * - Type safety with generics
   * - Error handling
   */
  async findById(id: string): Promise<any | null> {
    const query = `
      SELECT * FROM resources
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * INSERT with RETURNING
   *
   * Key patterns:
   * - Multiple parameters
   * - RETURNING clause for immediate result
   * - Default values
   */
  async create(data: any): Promise<any> {
    const query = `
      INSERT INTO resources (
        id, title, description, status, priority,
        created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const params = [
      data.id,
      data.title,
      data.description || null,
      data.status || 'draft',
      data.priority || 'medium',
      data.createdBy,
    ];

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * UPDATE with dynamic fields
   *
   * Key patterns:
   * - Dynamic query building
   * - Partial updates
   * - Version incrementing
   */
  async update(id: string, updates: any): Promise<any> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Build dynamic update fields
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add standard update fields
    fields.push('updated_at = NOW()');
    fields.push('version = version + 1');

    // Add ID as last parameter
    params.push(id);

    const query = `
      UPDATE resources
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  /**
   * Complex search with filters
   *
   * Key patterns:
   * - Query builder usage
   * - Multiple filter conditions
   * - Pagination
   */
  async search(filters: any, pagination: any): Promise<any[]> {
    const builder = new QueryBuilder('resources')
      .select('r.*', 'u.username as created_by_name')
      .join('LEFT', 'users u', 'r.created_by = u.id');

    // Apply filters
    if (filters.status) {
      builder.whereIn('r.status', filters.status);
    }

    if (filters.priority) {
      builder.where('r.priority', '=', filters.priority);
    }

    if (filters.search) {
      // Use raw SQL for complex conditions
      const searchQuery = `
        (r.title ILIKE $${builder['paramCount']++} OR
         r.description ILIKE $${builder['paramCount']++})
      `;
      builder['whereConditions'].push(searchQuery);
      builder['params'].push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Apply sorting and pagination
    builder
      .orderBy(pagination.sortBy || 'r.created_at', pagination.sortOrder)
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit);

    const { text, params } = builder.build();
    const result = await this.db.query(text, params);
    return result.rows;
  }

  /**
   * Transaction example
   *
   * Key patterns:
   * - Client checkout
   * - Transaction boundaries
   * - Rollback on error
   * - Client release in finally
   */
  async transferOwnership(
    resourceId: string,
    newOwnerId: string,
    reason: string
  ): Promise<void> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Get current resource with lock
      const lockQuery = `
        SELECT * FROM resources
        WHERE id = $1
        FOR UPDATE
      `;
      const resource = await client.query(lockQuery, [resourceId]);

      if (resource.rows.length === 0) {
        throw new Error('Resource not found');
      }

      const oldOwnerId = resource.rows[0].created_by;

      // Update resource ownership
      const updateQuery = `
        UPDATE resources
        SET created_by = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await client.query(updateQuery, [newOwnerId, resourceId]);

      // Create audit log entry
      const auditQuery = `
        INSERT INTO audit_logs (
          resource_id, action, old_value, new_value,
          reason, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;
      await client.query(auditQuery, [
        resourceId,
        'TRANSFER_OWNERSHIP',
        oldOwnerId,
        newOwnerId,
        reason,
      ]);

      // Send notification
      const notificationQuery = `
        INSERT INTO notifications (
          user_id, type, message, resource_id, created_at
        )
        VALUES
          ($1, $2, $3, $4, NOW()),
          ($5, $6, $7, $8, NOW())
      `;
      await client.query(notificationQuery, [
        oldOwnerId,
        'ownership_transferred_from',
        `Ownership of resource ${resourceId} transferred to another user`,
        resourceId,
        newOwnerId,
        'ownership_transferred_to',
        `You are now the owner of resource ${resourceId}`,
        resourceId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert example
   *
   * Key patterns:
   * - Bulk insert optimization
   * - UNNEST for array parameters
   * - Conflict handling
   */
  async bulkCreate(resources: any[]): Promise<any[]> {
    if (resources.length === 0) {
      return [];
    }

    // Prepare arrays for each column
    const ids = resources.map(r => r.id);
    const titles = resources.map(r => r.title);
    const descriptions = resources.map(r => r.description || null);
    const statuses = resources.map(r => r.status || 'draft');
    const createdBy = resources.map(r => r.createdBy);

    const query = `
      INSERT INTO resources (
        id, title, description, status, created_by,
        created_at, updated_at
      )
      SELECT * FROM UNNEST(
        $1::text[],
        $2::text[],
        $3::text[],
        $4::text[],
        $5::text[]
      ) AS t(id, title, description, status, created_by)
      CROSS JOIN (SELECT NOW() as created_at, NOW() as updated_at) AS times
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

    const result = await this.db.query(query, [
      ids,
      titles,
      descriptions,
      statuses,
      createdBy,
    ]);

    return result.rows;
  }

  /**
   * Aggregation query example
   *
   * Key patterns:
   * - GROUP BY with aggregates
   * - Window functions
   * - CTEs (Common Table Expressions)
   */
  async getStatistics(userId?: string): Promise<any> {
    const query = `
      WITH resource_stats AS (
        SELECT
          status,
          priority,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600)::int as avg_age_hours
        FROM resources
        WHERE deleted_at IS NULL
          ${userId ? 'AND created_by = $1' : ''}
        GROUP BY status, priority
      ),
      user_stats AS (
        SELECT
          created_by,
          COUNT(*) as total_resources,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          RANK() OVER (ORDER BY COUNT(*) DESC) as user_rank
        FROM resources
        WHERE deleted_at IS NULL
        GROUP BY created_by
      )
      SELECT
        (SELECT json_agg(rs.*) FROM resource_stats rs) as by_status_priority,
        (SELECT json_agg(us.*) FROM user_stats us LIMIT 10) as top_users,
        (SELECT COUNT(*) FROM resources WHERE deleted_at IS NULL) as total_count,
        (SELECT COUNT(DISTINCT created_by) FROM resources) as unique_users
    `;

    const params = userId ? [userId] : [];
    const result = await this.db.query(query, params);
    return result.rows[0];
  }
}

/**
 * Migration example
 *
 * Key patterns:
 * - Schema creation
 * - Index creation
 * - Constraints
 * - Triggers
 */
export const migrationExample = `
-- Create enum types
CREATE TYPE resource_status AS ENUM ('draft', 'active', 'completed', 'archived');
CREATE TYPE resource_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create main table
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status resource_status DEFAULT 'draft',
  priority resource_priority DEFAULT 'medium',
  created_by TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
  CONSTRAINT version_positive CHECK (version > 0)
);

-- Create indexes for common queries
CREATE INDEX idx_resources_status ON resources(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_created_by ON resources(created_by);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX idx_resources_search ON resources USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
`;