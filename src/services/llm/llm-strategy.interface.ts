/**
 * LLM Strategy Interface - Common interface for all LLM providers
 */

import { GenerationOptions, GenerationResult } from '../../models/llm/llm.model';

/**
 * Common interface that all LLM providers must implement
 */
export interface LLMStrategy {
  /**
   * Generate text from a prompt
   */
  generateText(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;

  /**
   * Stream text generation (for real-time updates)
   */
  streamText(prompt: string, options?: GenerationOptions): AsyncIterable<string>;

  /**
   * Validate provider configuration
   */
  validateConfig(): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;

  /**
   * Estimate cost for a prompt
   */
  estimateCost(prompt: string, options?: GenerationOptions): number;

  /**
   * Get default model for this provider
   */
  getDefaultModel(): string;
}