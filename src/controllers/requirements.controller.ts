/**
 * Requirements Controller - Request handlers for requirements API
 */

import { Request, Response } from 'express';
import { RequirementsService } from '../services/requirements.service';
import {
  CreateRequirementRequest,
  UpdateRequirementRequest,
  RequirementFilters,
  PaginationParams,
} from '../models/requirement.model';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler';
import logger from '../utils/logger';

export class RequirementsController {
  private requirementsService: RequirementsService;

  constructor() {
    this.requirementsService = new RequirementsService();
    logger.info('Requirements Controller initialized with PostgreSQL');
  }

  /**
   * Create a new requirement
   * POST /api/v1/requirements
   */
  createRequirement = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data: CreateRequirementRequest = req.body;

      const createdBy = this.resolveRequestUserId(req);

      const requirement = await this.requirementsService.createRequirement(data, createdBy);

      res.status(201).json({
        success: true,
        data: requirement,
        message: 'Requirement created successfully',
      });
    }
  );

  /**
   * Get all requirements with pagination and filtering
   * GET /api/v1/requirements
   */
  getRequirements = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse pagination parameters
      const pagination: PaginationParams = {
        page: parseInt(req.query['page'] as string) || 1,
        limit: parseInt(req.query['limit'] as string) || 20,
        sortBy: req.query['sortBy'] as string | undefined,
        sortOrder: (req.query['sortOrder'] as 'ASC' | 'DESC') || 'DESC',
      };

      // Parse filter parameters
      const filters: RequirementFilters = {
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as any : undefined,
        priority: req.query['priority'] ? this.parseArrayParam(req.query['priority']) as any : undefined,
        assignedTo: req.query['assignedTo'] ? this.parseArrayParam(req.query['assignedTo']) : undefined,
        createdBy: req.query['createdBy'] ? this.parseArrayParam(req.query['createdBy']) : undefined,
        tags: req.query['tags'] ? this.parseArrayParam(req.query['tags']) : undefined,
        dueDateFrom: req.query['dueDateFrom'] as string | undefined,
        dueDateTo: req.query['dueDateTo'] as string | undefined,
        search: req.query['search'] as string | undefined,
      };

      const result = await this.requirementsService.getRequirements(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Requirements retrieved successfully',
      });
    }
  );

  /**
   * Get a single requirement by ID
   * GET /api/v1/requirements/:id
   */
  getRequirementById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      try {
        const requirement = await this.requirementsService.getRequirementById(id as string);

        if (!requirement) {
          throw new NotFoundError('Requirement not found');
        }

        res.json({
          success: true,
          data: requirement,
          message: 'Requirement retrieved successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Requirement not found') {
          throw new NotFoundError('Requirement not found');
        }
        throw error;
      }
    }
  );

  /**
   * Update a requirement
   * PUT /api/v1/requirements/:id
   */
  updateRequirement = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const data: UpdateRequirementRequest = req.body;
      const updatedBy = this.resolveRequestUserId(req);
      const changeReason = req.headers['x-change-reason'] as string | undefined;

      try {
        const requirement = await this.requirementsService.updateRequirement(
          id,
          data,
          updatedBy,
          changeReason
        );

        res.json({
          success: true,
          data: requirement,
          message: 'Requirement updated successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Requirement not found') {
          throw new NotFoundError('Requirement not found');
        }
        throw error;
      }
    }
  );

  /**
   * Delete (archive) a requirement
   * DELETE /api/v1/requirements/:id
   */
  deleteRequirement = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const deletedBy = this.resolveRequestUserId(req);

      try {
        await this.requirementsService.deleteRequirement(id as string, deletedBy);

        res.json({
          success: true,
          message: 'Requirement archived successfully',
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          throw new NotFoundError('Requirement not found or already archived');
        }
        throw error;
      }
    }
  );

  /**
   * Get requirement version history
   * GET /api/v1/requirements/:id/versions
   */
  getRequirementVersions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const versions = await this.requirementsService.getRequirementVersions(id as string);

      res.json({
        success: true,
        data: versions,
        message: 'Requirement versions retrieved successfully',
      });
    }
  );

  /**
   * Get requirements summary statistics
   * GET /api/v1/requirements/summary
   */
  getRequirementsSummary = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse filter parameters for summary
      const filters: RequirementFilters = {
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as any : undefined,
        priority: req.query['priority'] ? this.parseArrayParam(req.query['priority']) as any : undefined,
        assignedTo: req.query['assignedTo'] ? this.parseArrayParam(req.query['assignedTo']) : undefined,
        createdBy: req.query['createdBy'] ? this.parseArrayParam(req.query['createdBy']) : undefined,
        tags: req.query['tags'] ? this.parseArrayParam(req.query['tags']) : undefined,
        dueDateFrom: req.query['dueDateFrom'] as string | undefined,
        dueDateTo: req.query['dueDateTo'] as string | undefined,
      };

      const summary = await this.requirementsService.getRequirementsSummary(filters);

      res.json({
        success: true,
        data: summary,
        message: 'Requirements summary retrieved successfully',
      });
    }
  );

  /**
   * Bulk update requirements
   * PUT /api/v1/requirements/bulk
   */
  bulkUpdateRequirements = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { ids, updates } = req.body;
      const updatedBy = this.resolveRequestUserId(req);
      const changeReason = (req.headers['x-change-reason'] as string) || 'Bulk update';

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'IDs array is required and cannot be empty',
            statusCode: 400,
          },
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const id of ids) {
        try {
          const requirement = await this.requirementsService.updateRequirement(
            id,
            updates,
            updatedBy,
            changeReason
          );
          results.push({ id, success: true, data: requirement });
        } catch (error) {
          errors.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.json({
        success: errors.length === 0,
        data: {
          successful: results,
          failed: errors,
          totalProcessed: ids.length,
          successCount: results.length,
          errorCount: errors.length,
        },
        message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      });
    }
  );

  /**
   * Export requirements to CSV
   * GET /api/v1/requirements/export
   */
  exportRequirements = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Parse filter parameters
      const filters: RequirementFilters = {
        status: req.query['status'] ? this.parseArrayParam(req.query['status']) as any : undefined,
        priority: req.query['priority'] ? this.parseArrayParam(req.query['priority']) as any : undefined,
        assignedTo: req.query['assignedTo'] ? this.parseArrayParam(req.query['assignedTo']) : undefined,
        createdBy: req.query['createdBy'] ? this.parseArrayParam(req.query['createdBy']) : undefined,
        tags: req.query['tags'] ? this.parseArrayParam(req.query['tags']) : undefined,
        dueDateFrom: req.query['dueDateFrom'] as string | undefined,
        dueDateTo: req.query['dueDateTo'] as string | undefined,
        search: req.query['search'] as string | undefined,
      };

      // Get all requirements (with high limit for export)
      const result = await this.requirementsService.getRequirements(filters, {
        page: 1,
        limit: 10000, // High limit for export
      });

      // Generate CSV content
      const csvContent = this.generateCSV(result.data);

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=requirements-${new Date().toISOString().split('T')[0]}.csv`);

      res.send(csvContent);
    }
  );

  /**
   * Helper method to parse array parameters from query string
   */
  private parseArrayParam(param: any): string[] | undefined {
    if (!param) return undefined;
    return Array.isArray(param) ? param : [param];
  }

  /**
   * Resolve user identifier from request headers or fallback configuration.
   */
  private resolveRequestUserId(req: Request): string {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    if (headerUserId) {
      return headerUserId;
    }

    const defaultUserId = process.env['SYSTEM_USER_ID'];
    if (defaultUserId) {
      return defaultUserId;
    }

    throw new BadRequestError('x-user-id header is required (or configure SYSTEM_USER_ID for service-originated requests)');
  }

  /**
   * Helper method to generate CSV content
   */
  private generateCSV(requirements: any[]): string {
    if (requirements.length === 0) {
      return 'No data available';
    }

    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Assigned To',
      'Created By',
      'Due Date',
      'Estimated Effort',
      'Actual Effort',
      'Completion %',
      'Tags',
      'Created At',
      'Updated At'
    ];

    const csvRows = [headers.join(',')];

    requirements.forEach(req => {
      const row = [
        `"${req.id}"`,
        `"${req.title.replace(/"/g, '""')}"`,
        `"${(req.description || '').replace(/"/g, '""')}"`,
        `"${req.status}"`,
        `"${req.priority}"`,
        `"${req.assignedToUser?.username || ''}"`,
        `"${req.createdByUser?.username || ''}"`,
        `"${req.dueDate ? new Date(req.dueDate).toISOString().split('T')[0] : ''}"`,
        `"${req.estimatedEffort || ''}"`,
        `"${req.actualEffort || ''}"`,
        `"${req.completionPercentage}"`,
        `"${(req.tags || []).join('; ')}"`,
        `"${new Date(req.createdAt).toISOString()}"`,
        `"${new Date(req.updatedAt).toISOString()}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

export default RequirementsController;
