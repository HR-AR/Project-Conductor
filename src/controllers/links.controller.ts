/**
 * Links Controller - Request handlers for requirement linking endpoints
 */

import { Request, Response } from 'express';
import { linksService } from '../services/links.service';
import {
  CreateLinkRequest,
  UpdateLinkRequest,
  MarkSuspectRequest,
  LinkFilters,
  LINK_TYPES,
  LinkType
} from '../models/link.model';

class LinksController {

  /**
   * Create a new link between requirements
   * POST /api/v1/requirements/:id/links
   */
  async createLink(req: Request, res: Response): Promise<void> {
    try {
      const sourceId = req.params['id'];
      const linkRequest: CreateLinkRequest = req.body;

      // TODO: Get actual user ID from auth middleware
      const createdBy = (req.headers['user-id'] as string) || 'system';

      // Validate required fields
      if (!linkRequest.targetId || !linkRequest.linkType) {
        res.status(400).json({
          success: false,
          error: 'targetId and linkType are required'
        });
        return;
      }

      // Validate link type
      if (!Object.values(LINK_TYPES).includes(linkRequest.linkType)) {
        res.status(400).json({
          success: false,
          error: `Invalid link type. Must be one of: ${Object.values(LINK_TYPES).join(', ')}`
        });
        return;
      }

      if (!sourceId) {
        res.status(400).json({
          success: false,
          error: 'Source requirement ID is required'
        });
        return;
      }

      const link = await linksService.createLink(sourceId, linkRequest, createdBy);

      res.status(201).json({
        success: true,
        data: link
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all links for a requirement
   * GET /api/v1/requirements/:id/links
   */
  async getRequirementLinks(req: Request, res: Response): Promise<void> {
    try {
      const requirementId = req.params['id'];
      if (!requirementId) {
        res.status(400).json({
          success: false,
          error: 'Requirement ID is required'
        });
        return;
      }

      const links = await linksService.getRequirementLinks(requirementId);

      res.json({
        success: true,
        data: links
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get links with filtering
   * GET /api/v1/links
   */
  async getLinks(req: Request, res: Response): Promise<void> {
    try {
      const filters: LinkFilters = {
        linkType: req.query['linkType']
          ? (Array.isArray(req.query['linkType'])
             ? req.query['linkType'] as LinkType[]
             : [req.query['linkType'] as LinkType])
          : undefined,
        sourceId: req.query['sourceId'] as string | undefined,
        targetId: req.query['targetId'] as string | undefined,
        isSuspect: req.query['isSuspect'] !== undefined
          ? req.query['isSuspect'] === 'true'
          : undefined,
        createdBy: req.query['createdBy'] as string | undefined,
        search: req.query['search'] as string
      };

      const links = await linksService.getLinks(filters);

      res.json({
        success: true,
        data: links
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update an existing link
   * PUT /api/v1/links/:linkId
   */
  async updateLink(req: Request, res: Response): Promise<void> {
    try {
      const linkId = req.params['linkId'];
      const updateRequest: UpdateLinkRequest = req.body;

      // TODO: Get actual user ID from auth middleware
      const updatedBy = (req.headers['user-id'] as string) || 'system';

      // Validate link type if provided
      if (updateRequest.linkType && !Object.values(LINK_TYPES).includes(updateRequest.linkType)) {
        res.status(400).json({
          success: false,
          error: `Invalid link type. Must be one of: ${Object.values(LINK_TYPES).join(', ')}`
        });
        return;
      }

      if (!linkId) {
        res.status(400).json({
          success: false,
          error: 'Link ID is required'
        });
        return;
      }

      const link = await linksService.updateLink(linkId, updateRequest, updatedBy);

      res.json({
        success: true,
        data: link
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Mark or unmark a link as suspect
   * PUT /api/v1/links/:linkId/suspect
   */
  async markLinkSuspect(req: Request, res: Response): Promise<void> {
    try {
      const linkId = req.params['linkId'];
      const markRequest: MarkSuspectRequest = req.body;

      // TODO: Get actual user ID from auth middleware
      const markedBy = (req.headers['user-id'] as string) || 'system';

      // Validate required field
      if (markRequest.isSuspect === undefined) {
        res.status(400).json({
          success: false,
          error: 'isSuspect field is required'
        });
        return;
      }

      if (!linkId) {
        res.status(404).json({
          success: false,
          error: 'Link ID is required'
        });
        return;
      }

      const link = await linksService.markLinkSuspect(linkId, markRequest, markedBy);

      res.json({
        success: true,
        data: link
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Delete a link
   * DELETE /api/v1/links/:linkId
   */
  async deleteLink(req: Request, res: Response): Promise<void> {
    try {
      const linkId = req.params['linkId'];
      if (!linkId) {
        res.status(404).json({
          success: false,
          error: 'Link ID is required'
        });
        return;
      }

      const deleted = await linksService.deleteLink(linkId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Link not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Link deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate a potential link
   * POST /api/v1/requirements/:id/links/validate
   */
  async validateLink(req: Request, res: Response): Promise<void> {
    try {
      const sourceId = req.params['id'];
      const { targetId, linkType } = req.body;

      if (!targetId || !linkType) {
        res.status(400).json({
          success: false,
          error: 'targetId and linkType are required'
        });
        return;
      }

      if (!Object.values(LINK_TYPES).includes(linkType)) {
        res.status(400).json({
          success: false,
          error: `Invalid link type. Must be one of: ${Object.values(LINK_TYPES).join(', ')}`
        });
        return;
      }

      if (!sourceId) {
        res.status(400).json({
          success: false,
          error: 'Source requirement ID is required'
        });
        return;
      }

      const validation = await linksService.validateLink(sourceId, targetId, linkType);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get link statistics
   * GET /api/v1/links/statistics
   */
  async getLinkStatistics(_req: Request, res: Response): Promise<void> {
    try {
      // Get all links
      const allLinks = await linksService.getLinks({});

      // Calculate statistics
      const statistics = {
        totalLinks: allLinks.length,
        suspectLinks: allLinks.filter(link => link.isSuspect).length,
        linksByType: Object.values(LINK_TYPES).reduce((acc, type) => {
          acc[type] = allLinks.filter(link => link.linkType === type).length;
          return acc;
        }, {} as Record<LinkType, number>),
        recentLinks: allLinks
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 10)
      };

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const linksController = new LinksController();
export default LinksController;