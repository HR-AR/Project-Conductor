/**
 * PATTERN: RESTful CRUD Controller with TypeScript
 * USE WHEN: Building REST APIs with Express and TypeScript
 * KEY CONCEPTS: Error handling, validation, pagination, response formatting
 *
 * Source: Adapted from requirements.controller.ts
 */

import { Request, Response } from 'express';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';

// Define request/response interfaces
interface CreateResourceRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
}

interface ResourceFilters {
  status?: string[];
  priority?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class ResourceController {
  private resourceService: any;

  constructor(resourceService: any) {
    this.resourceService = resourceService;
  }

  /**
   * Create a new resource
   * POST /api/v1/resources
   *
   * Key patterns:
   * - asyncHandler wrapper for async error handling
   * - Input validation from request body
   * - Service layer delegation
   * - Standardized response format
   */
  createResource = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreateResourceRequest = req.body;

      // Extract user context (from auth middleware)
      const userId = this.extractUserId(req);

      // Delegate to service layer
      const resource = await this.resourceService.create(data, userId);

      // Return standardized response
      res.status(201).json({
        success: true,
        data: resource,
        message: 'Resource created successfully',
      });
    }
  );

  /**
   * Get all resources with pagination and filtering
   * GET /api/v1/resources
   *
   * Key patterns:
   * - Query parameter parsing
   * - Pagination implementation
   * - Filter composition
   * - Response with metadata
   */
  getResources = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse pagination parameters with defaults
      const pagination: PaginationParams = {
        page: parseInt(req.query['page'] as string) || 1,
        limit: parseInt(req.query['limit'] as string) || 20,
        sortBy: req.query['sortBy'] as string || 'createdAt',
        sortOrder: (req.query['sortOrder'] as 'ASC' | 'DESC') || 'DESC',
      };

      // Parse filter parameters
      const filters: ResourceFilters = {
        status: this.parseArrayParam(req.query['status']),
        priority: this.parseArrayParam(req.query['priority']),
        search: req.query['search'] as string,
        dateFrom: req.query['dateFrom'] as string,
        dateTo: req.query['dateTo'] as string,
      };

      // Get paginated results from service
      const result = await this.resourceService.findAll(filters, pagination);

      // Return with pagination metadata
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / pagination.limit),
        },
        message: 'Resources retrieved successfully',
      });
    }
  );

  /**
   * Get a single resource by ID
   * GET /api/v1/resources/:id
   *
   * Key patterns:
   * - Route parameter extraction
   * - Not found error handling
   * - Single resource response
   */
  getResourceById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const resource = await this.resourceService.findById(id);

      if (!resource) {
        throw new NotFoundError(`Resource with ID ${id} not found`);
      }

      res.json({
        success: true,
        data: resource,
      });
    }
  );

  /**
   * Update a resource
   * PUT /api/v1/resources/:id
   *
   * Key patterns:
   * - Partial update handling
   * - Validation of update data
   * - Version conflict detection
   */
  updateResource = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;
      const userId = this.extractUserId(req);

      // Check resource exists
      const existing = await this.resourceService.findById(id);
      if (!existing) {
        throw new NotFoundError(`Resource with ID ${id} not found`);
      }

      // Perform update
      const updated = await this.resourceService.update(
        id,
        updateData,
        userId
      );

      res.json({
        success: true,
        data: updated,
        message: 'Resource updated successfully',
      });
    }
  );

  /**
   * Delete a resource
   * DELETE /api/v1/resources/:id
   *
   * Key patterns:
   * - Soft delete vs hard delete
   * - Cascade handling
   * - Delete confirmation
   */
  deleteResource = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const { force } = req.query;

      const result = await this.resourceService.delete(id, !!force);

      if (!result) {
        throw new NotFoundError(`Resource with ID ${id} not found`);
      }

      res.json({
        success: true,
        message: force ? 'Resource permanently deleted' : 'Resource archived',
      });
    }
  );

  /**
   * Bulk operations endpoint
   * POST /api/v1/resources/bulk
   *
   * Key patterns:
   * - Batch processing
   * - Transaction management
   * - Partial success handling
   */
  bulkOperation = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { action, ids, data } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('IDs array is required');
      }

      const results = await this.resourceService.bulkOperation(
        action,
        ids,
        data
      );

      res.json({
        success: true,
        data: results,
        message: `Bulk ${action} completed`,
      });
    }
  );

  // Helper methods

  /**
   * Parse array parameters from query string
   * Handles both single values and comma-separated lists
   */
  private parseArrayParam(param: any): string[] | undefined {
    if (!param) return undefined;
    if (Array.isArray(param)) return param;
    if (typeof param === 'string') {
      return param.includes(',') ? param.split(',') : [param];
    }
    return undefined;
  }

  /**
   * Extract user ID from request
   * In real app, this would come from auth middleware
   */
  private extractUserId(req: Request): string {
    // In production: return req.user?.id
    return req.headers['x-user-id'] as string || 'anonymous';
  }
}