/**
 * LLM Models - Core types for LLM integration
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'mock' | 'openai' | 'anthropic' | 'gemini';

/**
 * Complexity levels for generation
 */
export type ComplexityLevel = 'simple' | 'moderate' | 'complex';

/**
 * Generation options for LLM calls
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  model?: string;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Result from LLM generation
 */
export interface GenerationResult {
  content: string;
  usage: TokenUsage;
  cost: number;
  provider: string;
  model: string;
  generatedAt: Date;
}

/**
 * LLM configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

/**
 * Generation request for BRD/PRD
 */
export interface GenerationRequest {
  idea: string;
  documentType: 'brd' | 'prd';
  complexity?: ComplexityLevel;
  additionalContext?: Record<string, unknown>;
}

/**
 * Generation response with metadata
 */
export interface GenerationResponse<T = unknown> {
  document: T;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number;
    generatedAt: Date;
    sections?: string[];
  };
}

/**
 * Section regeneration request
 */
export interface SectionRegenerationRequest {
  documentId: string;
  documentType: 'brd' | 'prd';
  section: string;
  feedback?: string;
  preserveOtherSections: boolean;
}