/**
 * Generation Controller - Request handlers for AI generation API
 */

import { Request, Response } from 'express';
import { BRDGeneratorService } from '../services/generation/brd-generator.service';
import { PRDGeneratorService } from '../services/generation/prd-generator.service';
import { getLLMFactory } from '../services/llm/llm-factory.service';
import { ComplexityLevel, LLMProvider } from '../models/llm/llm.model';
import { asyncHandler, BadRequestError } from '../middleware/error-handler';

export class GenerationController {
  private brdGenerator: BRDGeneratorService;
  private prdGenerator: PRDGeneratorService;
  private llmFactory = getLLMFactory();

  constructor() {
    this.brdGenerator = new BRDGeneratorService();
    this.prdGenerator = new PRDGeneratorService();
  }

  /**
   * Generate BRD from user idea
   * POST /api/v1/generation/brd-from-idea
   */
  generateBRDFromIdea = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { idea, complexity } = req.body;
      const createdBy = this.resolveUserId(req);

      if (!idea || idea.trim().length < 10) {
        throw new BadRequestError('Idea must be at least 10 characters long');
      }

      const result = await this.brdGenerator.generateFromIdea(
        idea,
        createdBy,
        (complexity as ComplexityLevel) || 'moderate'
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'BRD generated successfully',
      });
    }
  );

  /**
   * Generate PRD from approved BRD
   * POST /api/v1/generation/prd-from-brd/:brdId
   */
  generatePRDFromBRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { brdId } = req.params;
      const createdBy = this.resolveUserId(req);

      if (!brdId) {
        throw new BadRequestError('BRD ID is required');
      }

      const result = await this.prdGenerator.generateFromBRD(brdId, createdBy);

      res.status(201).json({
        success: true,
        data: result,
        message: 'PRD generated from BRD successfully',
      });
    }
  );

  /**
   * Generate PRD from user idea (direct)
   * POST /api/v1/generation/prd-from-idea
   */
  generatePRDFromIdea = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { idea, complexity } = req.body;
      const createdBy = this.resolveUserId(req);

      if (!idea || idea.trim().length < 10) {
        throw new BadRequestError('Idea must be at least 10 characters long');
      }

      const result = await this.prdGenerator.generateFromIdea(
        idea,
        createdBy,
        (complexity as ComplexityLevel) || 'moderate'
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'PRD generated successfully',
      });
    }
  );

  /**
   * Generate BRD from PRD (reverse engineering)
   * POST /api/v1/generation/brd-from-prd/:prdId
   */
  generateBRDFromPRD = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { prdId } = req.params;
      const createdBy = this.resolveUserId(req);

      if (!prdId) {
        throw new BadRequestError('PRD ID is required');
      }

      const result = await this.brdGenerator.generateFromPRD(prdId, createdBy);

      res.status(201).json({
        success: true,
        data: result,
        message: 'BRD generated from PRD successfully',
      });
    }
  );

  /**
   * Regenerate specific section
   * POST /api/v1/generation/regenerate-section
   */
  regenerateSection = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { documentId, documentType, section, feedback } = req.body;

      if (!documentId || !documentType || !section) {
        throw new BadRequestError('documentId, documentType, and section are required');
      }

      let result;
      if (documentType === 'brd') {
        result = await this.brdGenerator.regenerateSection(documentId, section, feedback);
      } else if (documentType === 'prd') {
        result = await this.prdGenerator.regenerateSection(documentId, section, feedback);
      } else {
        throw new BadRequestError('documentType must be "brd" or "prd"');
      }

      res.json({
        success: true,
        data: result,
        message: `${documentType.toUpperCase()} section regenerated successfully`,
      });
    }
  );

  /**
   * Configure LLM provider
   * POST /api/v1/generation/configure
   */
  configureLLM = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { provider, model, temperature } = req.body;

      if (!provider) {
        throw new BadRequestError('Provider is required');
      }

      const validProviders: LLMProvider[] = ['mock', 'openai', 'anthropic', 'gemini'];
      if (!validProviders.includes(provider as LLMProvider)) {
        throw new BadRequestError(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
      }

      this.llmFactory.switchProvider(provider as LLMProvider, {
        provider: provider as LLMProvider,
        model,
        temperature,
      });

      res.json({
        success: true,
        data: {
          provider: this.llmFactory.getCurrentProvider(),
          config: this.llmFactory.getConfig(),
        },
        message: 'LLM provider configured successfully',
      });
    }
  );

  /**
   * Get available providers
   * GET /api/v1/generation/providers
   */
  getProviders = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const providers = this.llmFactory.getAvailableProviders();
      const currentProvider = this.llmFactory.getCurrentProvider();

      res.json({
        success: true,
        data: {
          current: currentProvider,
          available: providers,
        },
        message: 'Providers retrieved successfully',
      });
    }
  );

  /**
   * Get generation status (placeholder for future async jobs)
   * GET /api/v1/generation/status/:jobId
   */
  getGenerationStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { jobId } = req.params;

      // Placeholder - in future, check Redis or database for job status
      res.json({
        success: true,
        data: {
          jobId,
          status: 'completed',
          message: 'Job tracking not yet implemented',
        },
        message: 'Status retrieved successfully',
      });
    }
  );

  /**
   * Resolve user identifier from request
   */
  private resolveUserId(req: Request): string {
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    if (headerUserId) {
      return headerUserId;
    }

    // Use mock user for demo
    const useMock = process.env['USE_MOCK_DB'] !== 'false';
    if (useMock) {
      return 'mock-user';
    }

    const defaultUserId = process.env['SYSTEM_USER_ID'];
    if (defaultUserId) {
      return defaultUserId;
    }

    throw new BadRequestError('x-user-id header is required');
  }
}

export default GenerationController;