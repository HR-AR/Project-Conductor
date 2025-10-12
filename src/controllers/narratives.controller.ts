import { Request, Response } from 'express';
import narrativeVersionsService from '../services/narrative-versions.service';
import documentParserService from '../services/document-parser.service';
import documentIndexService from '../services/document-index.service';
import { mockNarrativeVersions } from '../mock-data/narratives.mock';
import { mockIndexData } from '../mock-data/index.mock';

// Load mock data
narrativeVersionsService.loadMockData(mockNarrativeVersions);
documentIndexService.loadMockData(mockIndexData);

export class NarrativesController {
  /**
   * GET /api/v1/narratives/:id
   * Get latest version of narrative
   */
  async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = await narrativeVersionsService.getLatest(narrative_id);

      if (!version) {
        res.status(404).json({
          success: false,
          message: 'Narrative not found'
        });
        return;
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/versions
   * List all versions
   */
  async listVersions(req: Request, res: Response): Promise<void> {
    try {
      const narrative_id = parseInt(req.params.id);
      const versions = await narrativeVersionsService.listVersions(narrative_id);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/versions/:ver
   * Get specific version
   */
  async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = parseInt(req.params.ver);
      const doc = await narrativeVersionsService.getVersion(narrative_id, version);

      if (!doc) {
        res.status(404).json({
          success: false,
          message: 'Version not found'
        });
        return;
      }

      res.json({
        success: true,
        data: doc
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v1/narratives/:id/versions
   * Create new version
   */
  async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const narrative_id = parseInt(req.params.id);
      const { content, change_reason } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Content is required'
        });
        return;
      }

      const version = await narrativeVersionsService.create({
        narrative_id,
        content,
        author_id: 1, // TODO: Get from authenticated user
        change_reason
      });

      // Auto-index the document for fast dashboard queries
      try {
        await documentIndexService.indexDocument(narrative_id);
      } catch (indexError) {
        console.error('[NarrativesController] Failed to index document:', indexError);
        // Don't fail the request if indexing fails
      }

      res.status(201).json({
        success: true,
        data: version,
        message: 'Version created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/render
   * Render document with parsed metadata
   */
  async render(req: Request, res: Response): Promise<void> {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = await narrativeVersionsService.getLatest(narrative_id);

      if (!version) {
        res.status(404).json({
          success: false,
          message: 'Narrative not found'
        });
        return;
      }

      const parsed = documentParserService.parseDocument(version.content);

      res.json({
        success: true,
        data: {
          ...version,
          parsed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new NarrativesController();
