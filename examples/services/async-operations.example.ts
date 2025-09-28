/**
 * PATTERN: Async Service Operations with Database Transactions
 * USE WHEN: Building service layer with complex database operations
 * KEY CONCEPTS: Connection pooling, transactions, error handling, versioning
 *
 * Source: Adapted from requirements.service.ts
 */

import { PoolClient } from 'pg';

// Database interface (simplified)
interface Database {
  query(text: string, params?: any[]): Promise<any>;
  getClient(): Promise<PoolClient>;
}

// Domain interfaces
interface Resource {
  id: string;
  title: string;
  description?: string;
  status: string;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateResourceData {
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ResourceService {
  private db: Database;
  private idGenerator: any;
  private webSocketService?: any;

  constructor(db: Database, idGenerator: any, webSocketService?: any) {
    this.db = db;
    this.idGenerator = idGenerator;
    this.webSocketService = webSocketService;
  }

  /**
   * Create a resource with automatic versioning
   *
   * Key patterns:
   * - ID generation
   * - Transaction usage
   * - Version tracking
   * - Event broadcasting
   */
  async createResource(
    data: CreateResourceData,
    userId: string
  ): Promise<Resource> {
    // Start a database transaction
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Generate unique ID
      const resourceId = this.idGenerator.generate('RES');

      // Insert main resource
      const insertQuery = `
        INSERT INTO resources (
          id, title, description, status, version,
          created_by, created_at, updated_at, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
        RETURNING *
      `;

      const values = [
        resourceId,
        data.title,
        data.description || null,
        'draft',
        1,
        userId,
        data.metadata || null,
      ];

      const result = await client.query(insertQuery, values);
      const resource = result.rows[0];

      // Create initial version record
      await this.createVersion(client, resource, userId, 'Initial creation');

      // Create audit log entry
      await this.createAuditLog(client, {
        resourceId,
        userId,
        action: 'CREATE',
        changes: data,
      });

      // Commit transaction
      await client.query('COMMIT');

      // Broadcast real-time event
      if (this.webSocketService) {
        this.webSocketService.broadcast('resource:created', {
          resource,
          userId,
        });
      }

      return resource;
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Always release the client
      client.release();
    }
  }

  /**
   * Update a resource with optimistic locking
   *
   * Key patterns:
   * - Optimistic concurrency control
   * - Partial updates
   * - Change tracking
   * - Version incrementing
   */
  async updateResource(
    id: string,
    updates: Partial<Resource>,
    userId: string,
    expectedVersion?: number
  ): Promise<Resource> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Lock the row for update
      const lockQuery = `
        SELECT * FROM resources
        WHERE id = $1
        FOR UPDATE
      `;

      const existing = await client.query(lockQuery, [id]);

      if (existing.rows.length === 0) {
        throw new Error(`Resource ${id} not found`);
      }

      const current = existing.rows[0];

      // Check version for optimistic locking
      if (expectedVersion && current.version !== expectedVersion) {
        throw new Error(
          `Version conflict: expected ${expectedVersion}, got ${current.version}`
        );
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'version') {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add version increment and updated_at
      updateFields.push(`version = version + 1`);
      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`updated_by = $${paramCount}`);
      updateValues.push(userId);
      paramCount++;

      // Add ID for WHERE clause
      updateValues.push(id);

      const updateQuery = `
        UPDATE resources
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updated = result.rows[0];

      // Track changes in version history
      await this.createVersion(
        client,
        updated,
        userId,
        `Updated: ${Object.keys(updates).join(', ')}`
      );

      // Create audit log
      await this.createAuditLog(client, {
        resourceId: id,
        userId,
        action: 'UPDATE',
        changes: updates,
        previousValues: this.extractChangedFields(current, updates),
      });

      await client.query('COMMIT');

      // Broadcast update event
      if (this.webSocketService) {
        this.webSocketService.broadcast('resource:updated', {
          resource: updated,
          userId,
          changes: updates,
        });
      }

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get paginated resources with filtering
   *
   * Key patterns:
   * - Dynamic query building
   * - Parameterized queries
   * - Count query for pagination
   * - JOIN operations
   */
  async getResources(
    filters: any,
    pagination: any
  ): Promise<PaginatedResponse<Resource>> {
    // Build WHERE clause dynamically
    const whereConditions: string[] = ['1=1'];
    const queryParams: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      whereConditions.push(`status = ANY($${paramCount})`);
      queryParams.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      whereConditions.push(`(
        title ILIKE $${paramCount} OR
        description ILIKE $${paramCount}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.dateFrom) {
      whereConditions.push(`created_at >= $${paramCount}`);
      queryParams.push(filters.dateFrom);
      paramCount++;
    }

    if (filters.dateTo) {
      whereConditions.push(`created_at <= $${paramCount}`);
      queryParams.push(filters.dateTo);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resources
      WHERE ${whereClause}
    `;

    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const offset = (pagination.page - 1) * pagination.limit;
    queryParams.push(pagination.limit);
    queryParams.push(offset);

    const dataQuery = `
      SELECT
        r.*,
        u.username as created_by_username,
        u.email as created_by_email
      FROM resources r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE ${whereClause}
      ORDER BY ${pagination.sortBy || 'created_at'} ${pagination.sortOrder || 'DESC'}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const dataResult = await this.db.query(dataQuery, queryParams);

    return {
      data: dataResult.rows,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Bulk update with transaction
   *
   * Key patterns:
   * - Batch processing
   * - Transaction for atomicity
   * - Error collection
   * - Partial success handling
   */
  async bulkUpdate(
    ids: string[],
    updates: Partial<Resource>,
    userId: string
  ): Promise<{ success: string[]; failed: string[] }> {
    const client = await this.db.getClient();
    const success: string[] = [];
    const failed: string[] = [];

    try {
      await client.query('BEGIN');

      for (const id of ids) {
        try {
          // Update each resource
          const updateQuery = `
            UPDATE resources
            SET
              title = COALESCE($2, title),
              status = COALESCE($3, status),
              version = version + 1,
              updated_at = NOW(),
              updated_by = $4
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id
          `;

          const result = await client.query(updateQuery, [
            id,
            updates.title,
            updates.status,
            userId,
          ]);

          if (result.rows.length > 0) {
            success.push(id);

            // Create audit log for each successful update
            await this.createAuditLog(client, {
              resourceId: id,
              userId,
              action: 'BULK_UPDATE',
              changes: updates,
            });
          } else {
            failed.push(id);
          }
        } catch (error) {
          console.error(`Failed to update ${id}:`, error);
          failed.push(id);
        }
      }

      // Commit if at least one succeeded
      if (success.length > 0) {
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

      return { success, failed };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods

  private async createVersion(
    client: PoolClient,
    resource: Resource,
    userId: string,
    description: string
  ): Promise<void> {
    const query = `
      INSERT INTO resource_versions (
        resource_id, version, data, created_by, description, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await client.query(query, [
      resource.id,
      resource.version,
      JSON.stringify(resource),
      userId,
      description,
    ]);
  }

  private async createAuditLog(
    client: PoolClient,
    data: any
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        resource_id, user_id, action, changes, previous_values, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `;

    await client.query(query, [
      data.resourceId,
      data.userId,
      data.action,
      JSON.stringify(data.changes),
      JSON.stringify(data.previousValues || {}),
    ]);
  }

  private extractChangedFields(
    current: any,
    updates: any
  ): Record<string, any> {
    const changed: Record<string, any> = {};

    Object.keys(updates).forEach(key => {
      if (current[key] !== updates[key]) {
        changed[key] = current[key];
      }
    });

    return changed;
  }
}