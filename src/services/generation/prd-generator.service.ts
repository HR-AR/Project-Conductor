/**
 * PRD Generator Service - AI-powered PRD generation
 */

import { getLLMFactory } from '../llm/llm-factory.service';
import { PromptBuilderService } from './prompt-builder.service';
import { BRDService } from '../brd.service';
import { PRDService } from '../prd.service';
import { simpleMockService } from '../simple-mock.service';
import { PRD, CreatePRDRequest } from '../../models/prd.model';
import { ComplexityLevel, GenerationResponse } from '../../models/llm/llm.model';
import { generateUniqueId } from '../../utils/id-generator';
import logger from '../../utils/logger';

/**
 * Service for generating PRDs using AI
 */
export class PRDGeneratorService {
  private llmFactory = getLLMFactory();
  private promptBuilder = new PromptBuilderService();
  private brdService: BRDService;
  private prdService: PRDService;

  constructor(brdService?: BRDService, prdService?: PRDService) {
    const useMock = process.env['USE_MOCK_DB'] !== 'false';
    this.brdService = brdService || (useMock ? (simpleMockService as unknown as BRDService) : new BRDService());
    this.prdService = prdService || (useMock ? (simpleMockService as unknown as PRDService) : new PRDService());
  }

  /**
   * Generate PRD from approved BRD (main flow)
   */
  async generateFromBRD(
    brdId: string,
    createdBy: string
  ): Promise<GenerationResponse<PRD>> {
    logger.info({ brdId }, 'Generating PRD from BRD');

    try {
      // Get existing BRD
      const brd = await this.brdService.getBRDById(brdId);
      if (!brd) {
        throw new Error('BRD not found');
      }

      // Build prompt
      const prompt = this.promptBuilder.buildPRDPrompt(brd);

      // Get LLM strategy and generate
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse JSON response
      const generatedData = JSON.parse(result.content);

      // Create PRD request from generated data
      const createRequest: CreatePRDRequest = {
        brdId: brd.id,
        title: generatedData.title,
        userStories: generatedData.userStories.map((us: Record<string, unknown>) => ({
          id: us.id as string || generateUniqueId('US').toString(),
          featureId: us.featureId as string || '',
          asA: us.persona as string || us.asA as string,
          iWant: us.story as string || us.iWant as string,
          soThat: us.acceptanceCriteria as string[] || us.soThat as string,
          acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria as string[] : [],
        })),
        features: generatedData.functionalRequirements?.slice(0, 5).map((fr: Record<string, string>, index: number) => ({
          id: `FEAT-${String(index + 1).padStart(3, '0')}`,
          title: fr.category || fr.requirement,
          description: fr.requirement,
          priority: (fr.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
          acceptanceCriteria: [fr.requirement],
        })) || [],
        technicalRequirements: Array.isArray(generatedData.technicalRequirements?.frontend)
          ? [
              `Frontend: ${generatedData.technicalRequirements.frontend}`,
              `Backend: ${generatedData.technicalRequirements.backend}`,
              `Database: ${generatedData.technicalRequirements.database}`,
            ]
          : typeof generatedData.technicalRequirements === 'object'
          ? Object.values(generatedData.technicalRequirements).map(String)
          : [],
        dependencies: generatedData.dependencies || [],
      };

      // Save PRD using existing service
      const prd = await this.prdService.createPRD(createRequest, createdBy);

      logger.info({ prdId: prd.id, brdId }, 'PRD generated from BRD successfully');

      return {
        document: prd,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokensUsed: result.usage.totalTokens,
          cost: result.cost,
          generatedAt: result.generatedAt,
          sections: ['productOverview', 'targetAudience', 'userStories', 'features', 'technicalRequirements'],
        },
      };
    } catch (error) {
      logger.error({ error, brdId }, 'Failed to generate PRD from BRD');
      throw new Error(`Failed to generate PRD: ${(error as Error).message}`);
    }
  }

  /**
   * Generate PRD from user idea (direct)
   */
  async generateFromIdea(
    idea: string,
    createdBy: string,
    complexity: ComplexityLevel = 'moderate'
  ): Promise<GenerationResponse<PRD>> {
    logger.info({ idea, complexity }, 'Generating PRD from idea');

    try {
      // Build prompt
      const prompt = this.promptBuilder.buildPRDFromIdeaPrompt(idea, complexity);

      // Get LLM strategy and generate
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse JSON response
      const generatedData = JSON.parse(result.content);

      // Create a temporary BRD ID (or use 'GENERATED' as placeholder)
      const tempBrdId = 'BRD-GENERATED';

      // Create PRD request from generated data
      const createRequest: CreatePRDRequest = {
        brdId: tempBrdId,
        title: generatedData.title,
        userStories: generatedData.userStories.map((us: Record<string, unknown>) => ({
          id: us.id as string || generateUniqueId('US').toString(),
          featureId: us.featureId as string || '',
          asA: us.persona as string || us.asA as string,
          iWant: us.story as string || us.iWant as string,
          soThat: us.acceptanceCriteria as string[] || us.soThat as string,
          acceptanceCriteria: Array.isArray(us.acceptanceCriteria) ? us.acceptanceCriteria as string[] : [],
        })),
        features: generatedData.functionalRequirements?.slice(0, 5).map((fr: Record<string, string>, index: number) => ({
          id: `FEAT-${String(index + 1).padStart(3, '0')}`,
          title: fr.category || fr.requirement,
          description: fr.requirement,
          priority: (fr.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
          acceptanceCriteria: [fr.requirement],
        })) || [],
        technicalRequirements: Array.isArray(generatedData.technicalRequirements?.frontend)
          ? [
              `Frontend: ${generatedData.technicalRequirements.frontend}`,
              `Backend: ${generatedData.technicalRequirements.backend}`,
              `Database: ${generatedData.technicalRequirements.database}`,
            ]
          : typeof generatedData.technicalRequirements === 'object'
          ? Object.values(generatedData.technicalRequirements).map(String)
          : [],
        dependencies: generatedData.dependencies || [],
      };

      // Save PRD using existing service
      const prd = await this.prdService.createPRD(createRequest, createdBy);

      logger.info({ prdId: prd.id }, 'PRD generated from idea successfully');

      return {
        document: prd,
        metadata: {
          provider: result.provider,
          model: result.model,
          tokensUsed: result.usage.totalTokens,
          cost: result.cost,
          generatedAt: result.generatedAt,
        },
      };
    } catch (error) {
      logger.error({ error, idea }, 'Failed to generate PRD from idea');
      throw new Error(`Failed to generate PRD: ${(error as Error).message}`);
    }
  }

  /**
   * Regenerate specific section
   */
  async regenerateSection(
    prdId: string,
    section: string,
    feedback?: string
  ): Promise<PRD> {
    logger.info({ prdId, section, feedback }, 'Regenerating PRD section');

    try {
      // Get existing PRD
      const prd = await this.prdService.getPRDById(prdId);
      if (!prd) {
        throw new Error('PRD not found');
      }

      // Get current section content
      const currentContent = (prd as unknown as Record<string, unknown>)[section];

      // Build prompt for section regeneration
      const prompt = this.promptBuilder.buildSectionRegenerationPrompt(
        'prd',
        section,
        currentContent,
        feedback
      );

      // Generate new content
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse new section content
      const newSectionContent = JSON.parse(result.content);

      // Update PRD with new section
      const updateData: Record<string, unknown> = {};
      updateData[section] = newSectionContent;

      const updatedPRD = await this.prdService.updatePRD(prdId, updateData);

      logger.info({ prdId, section }, 'PRD section regenerated successfully');

      return updatedPRD;
    } catch (error) {
      logger.error({ error, prdId, section }, 'Failed to regenerate PRD section');
      throw new Error(`Failed to regenerate section: ${(error as Error).message}`);
    }
  }

  /**
   * Enhance existing PRD
   */
  async enhancePRD(
    prdId: string,
    enhancements: string[]
  ): Promise<PRD> {
    logger.info({ prdId, enhancements }, 'Enhancing PRD');

    try {
      // Get existing PRD
      const prd = await this.prdService.getPRDById(prdId);
      if (!prd) {
        throw new Error('PRD not found');
      }

      // Build enhancement prompt
      const prompt = `You are enhancing an existing PRD with the following improvements:
${enhancements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Current PRD:
${JSON.stringify(prd, null, 2)}

Provide the enhanced PRD as JSON with the improvements incorporated.`;

      // Generate enhanced version
      const strategy = this.llmFactory.getStrategy();
      const result = await strategy.generateText(prompt);

      // Parse and update
      const enhancedData = JSON.parse(result.content);

      const updatedPRD = await this.prdService.updatePRD(prdId, enhancedData);

      logger.info({ prdId }, 'PRD enhanced successfully');

      return updatedPRD;
    } catch (error) {
      logger.error({ error, prdId }, 'Failed to enhance PRD');
      throw new Error(`Failed to enhance PRD: ${(error as Error).message}`);
    }
  }
}