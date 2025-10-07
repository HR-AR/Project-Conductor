/**
 * BRD Generator Service - AI-powered BRD generation
 */

import { getLLMFactory } from '../llm/llm-factory.service';
import { PromptBuilderService } from './prompt-builder.service';
import { BRDService } from '../brd.service';
import { PRDService } from '../prd.service';
import { simpleMockService } from '../simple-mock.service';
import { BRD, CreateBRDRequest } from '../../models/brd.model';
import { ComplexityLevel, GenerationResponse } from '../../models/llm/llm.model';
import logger from '../../utils/logger';

/**
 * Service for generating BRDs using AI
 */
export class BRDGeneratorService {
  private llmFactory = getLLMFactory();
  private promptBuilder = new PromptBuilderService();
  private brdService: BRDService;
  private prdService: PRDService;

  constructor(brdService?: BRDService, prdService?: PRDService) {
    // Use mock service if USE_MOCK_DB is enabled
    const useMock = process.env['USE_MOCK_DB'] !== 'false';

    this.brdService = brdService || (useMock ? (simpleMockService as unknown as BRDService) : new BRDService());
    this.prdService = prdService || (useMock ? (simpleMockService as unknown as PRDService) : new PRDService());
  }

  /**
   * Generate BRD from user idea
   */
  async generateFromIdea(
    idea: string,
    createdBy: string,
    complexity: ComplexityLevel = 'moderate'
  ): Promise<GenerationResponse<BRD>> {
    logger.info({ idea, complexity }, 'Generating BRD from idea');

    try {
      // Build prompt
      const prompt = this.promptBuilder.buildBRDPrompt(idea, complexity);

      // Get LLM strategy and generate
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse JSON response
      const generatedData = JSON.parse(result.content);

      // Create BRD request from generated data
      const createRequest: CreateBRDRequest = {
        title: generatedData.title,
        problemStatement: generatedData.problemStatement,
        businessImpact: generatedData.businessImpact,
        successCriteria: generatedData.successCriteria,
        timeline: {
          startDate: generatedData.timeline.startDate,
          targetDate: generatedData.timeline.targetDate,
        },
        budget: generatedData.budget,
        stakeholders: generatedData.stakeholders.map((s: Record<string, string>) => ({
          name: s.name,
          email: s.email,
          role: s.role,
          department: s.department as 'business' | 'product' | 'engineering' | 'marketing' | 'sales',
          isOwner: s.influence === 'high',
        })),
      };

      // In mock mode, create BRD object directly without persisting
      const useMock = process.env['USE_MOCK_DB'] !== 'false';
      const brd: BRD = useMock ? {
        id: `BRD-${Date.now()}`,
        title: createRequest.title,
        problemStatement: createRequest.problemStatement,
        businessImpact: createRequest.businessImpact,
        successCriteria: createRequest.successCriteria,
        timeline: {
          startDate: new Date(createRequest.timeline.startDate),
          targetDate: new Date(createRequest.timeline.targetDate),
        },
        budget: createRequest.budget,
        stakeholders: createRequest.stakeholders.map((s, i) => ({
          id: `SH-${i + 1}`,
          ...s,
        })),
        status: 'draft' as const,
        version: 1,
        approvals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
      } : await this.brdService.createBRD(createRequest, createdBy);

      logger.info({ brdId: brd.id }, 'BRD generated successfully');

      return {
        document: brd,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokensUsed: result.usage.totalTokens,
          cost: result.cost,
          generatedAt: result.generatedAt,
          sections: ['executiveSummary', 'problemStatement', 'businessImpact', 'successCriteria', 'stakeholders', 'timeline'],
        },
      };
    } catch (error) {
      logger.error({ error, idea }, 'Failed to generate BRD from idea');
      throw new Error(`Failed to generate BRD: ${(error as Error).message}`);
    }
  }

  /**
   * Generate BRD from existing PRD (reverse engineering)
   */
  async generateFromPRD(
    prdId: string,
    createdBy: string
  ): Promise<GenerationResponse<BRD>> {
    logger.info({ prdId }, 'Generating BRD from PRD');

    try {
      // Get existing PRD
      const prd = await this.prdService.getPRDById(prdId);
      if (!prd) {
        throw new Error('PRD not found');
      }

      // Build prompt
      const prompt = this.promptBuilder.buildBRDFromPRDPrompt(prd);

      // Get LLM strategy and generate
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse and create BRD
      const generatedData = JSON.parse(result.content);

      const createRequest: CreateBRDRequest = {
        title: generatedData.title,
        problemStatement: generatedData.problemStatement,
        businessImpact: generatedData.businessImpact,
        successCriteria: generatedData.successCriteria,
        timeline: {
          startDate: generatedData.timeline.startDate,
          targetDate: generatedData.timeline.targetDate,
        },
        budget: generatedData.budget,
        stakeholders: generatedData.stakeholders.map((s: Record<string, string>) => ({
          name: s.name,
          email: s.email,
          role: s.role,
          department: s.department as 'business' | 'product' | 'engineering' | 'marketing' | 'sales',
          isOwner: s.influence === 'high',
        })),
      };

      const brd = await this.brdService.createBRD(createRequest, createdBy);

      logger.info({ brdId: brd.id, prdId }, 'BRD generated from PRD successfully');

      return {
        document: brd,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokensUsed: result.usage.totalTokens,
          cost: result.cost,
          generatedAt: result.generatedAt,
        },
      };
    } catch (error) {
      logger.error({ error, prdId }, 'Failed to generate BRD from PRD');
      throw new Error(`Failed to generate BRD from PRD: ${(error as Error).message}`);
    }
  }

  /**
   * Regenerate a specific section of BRD
   */
  async regenerateSection(
    brdId: string,
    section: string,
    feedback?: string
  ): Promise<BRD> {
    logger.info({ brdId, section, feedback }, 'Regenerating BRD section');

    try {
      // Get existing BRD
      const brd = await this.brdService.getBRDById(brdId);
      if (!brd) {
        throw new Error('BRD not found');
      }

      // Get current section content
      const currentContent = (brd as unknown as Record<string, unknown>)[section];

      // Build prompt for section regeneration
      const prompt = this.promptBuilder.buildSectionRegenerationPrompt(
        'brd',
        section,
        currentContent,
        feedback
      );

      // Generate new content
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse new section content
      const newSectionContent = JSON.parse(result.content);

      // Update BRD with new section
      const updateData: Record<string, unknown> = {};
      updateData[section] = newSectionContent;

      const updatedBRD = await this.brdService.updateBRD(brdId, updateData);

      logger.info({ brdId, section }, 'BRD section regenerated successfully');

      return updatedBRD;
    } catch (error) {
      logger.error({ error, brdId, section }, 'Failed to regenerate BRD section');
      throw new Error(`Failed to regenerate section: ${(error as Error).message}`);
    }
  }

  /**
   * Enhance existing BRD with AI suggestions
   */
  async enhanceBRD(
    brdId: string,
    enhancements: string[]
  ): Promise<BRD> {
    logger.info({ brdId, enhancements }, 'Enhancing BRD');

    try {
      // Get existing BRD
      const brd = await this.brdService.getBRDById(brdId);
      if (!brd) {
        throw new Error('BRD not found');
      }

      // Build enhancement prompt
      const prompt = `You are enhancing an existing BRD with the following improvements:
${enhancements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Current BRD:
${JSON.stringify(brd, null, 2)}

Provide the enhanced BRD as JSON with the improvements incorporated.`;

      // Generate enhanced version
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse and update
      const enhancedData = JSON.parse(result.content);

      const updatedBRD = await this.brdService.updateBRD(brdId, enhancedData);

      logger.info({ brdId }, 'BRD enhanced successfully');

      return updatedBRD;
    } catch (error) {
      logger.error({ error, brdId }, 'Failed to enhance BRD');
      throw new Error(`Failed to enhance BRD: ${(error as Error).message}`);
    }
  }
}