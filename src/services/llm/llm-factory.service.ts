/**
 * LLM Factory Service - Creates and manages LLM strategy instances
 */

import { LLMStrategy } from './llm-strategy.interface';
import { LLMProvider, LLMConfig } from '../../models/llm/llm.model';
import { MockLLMStrategy } from './providers/mock-strategy';
import logger from '../../utils/logger';

/**
 * Factory for creating LLM strategy instances
 * Supports multiple providers with automatic fallback
 */
export class LLMFactory {
  private static instance: LLMFactory;
  private currentStrategy: LLMStrategy | null = null;
  private currentProvider: LLMProvider;
  private config: LLMConfig;

  private constructor() {
    // Initialize with environment-based provider or default to mock
    this.currentProvider = (process.env['LLM_PROVIDER'] as LLMProvider) || 'mock';
    this.config = this.loadConfigFromEnv();
    this.currentStrategy = this.createStrategy(this.currentProvider);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  /**
   * Get current LLM strategy
   */
  getStrategy(): LLMStrategy {
    if (!this.currentStrategy) {
      throw new Error('LLM strategy not initialized');
    }
    return this.currentStrategy;
  }

  /**
   * Switch to a different provider
   */
  switchProvider(provider: LLMProvider, config?: Partial<LLMConfig>): LLMStrategy {
    logger.info({ from: this.currentProvider, to: provider }, 'Switching LLM provider');

    this.currentProvider = provider;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.currentStrategy = this.createStrategy(provider);
    return this.currentStrategy;
  }

  /**
   * Get current provider name
   */
  getCurrentProvider(): LLMProvider {
    return this.currentProvider;
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
    // Recreate strategy with new config
    this.currentStrategy = this.createStrategy(this.currentProvider);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): { provider: LLMProvider; available: boolean; reason?: string }[] {
    return [
      { provider: 'mock', available: true },
      {
        provider: 'openai',
        available: !!process.env['OPENAI_API_KEY'],
        reason: !process.env['OPENAI_API_KEY'] ? 'API key not configured' : undefined,
      },
      {
        provider: 'anthropic',
        available: !!process.env['ANTHROPIC_API_KEY'],
        reason: !process.env['ANTHROPIC_API_KEY'] ? 'API key not configured' : undefined,
      },
      {
        provider: 'gemini',
        available: !!process.env['GOOGLE_API_KEY'],
        reason: !process.env['GOOGLE_API_KEY'] ? 'API key not configured' : undefined,
      },
    ];
  }

  /**
   * Create strategy instance for given provider
   */
  private createStrategy(provider: LLMProvider): LLMStrategy {
    switch (provider) {
      case 'mock':
        return new MockLLMStrategy();

      case 'openai':
        // Future: return new OpenAIStrategy(this.config);
        logger.warn('OpenAI provider not yet implemented, falling back to mock');
        return new MockLLMStrategy();

      case 'anthropic':
        // Future: return new AnthropicStrategy(this.config);
        logger.warn('Anthropic provider not yet implemented, falling back to mock');
        return new MockLLMStrategy();

      case 'gemini':
        // Future: return new GeminiStrategy(this.config);
        logger.warn('Gemini provider not yet implemented, falling back to mock');
        return new MockLLMStrategy();

      default:
        logger.warn({ provider }, 'Unknown provider, using mock');
        return new MockLLMStrategy();
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfigFromEnv(): LLMConfig {
    return {
      provider: (process.env['LLM_PROVIDER'] as LLMProvider) || 'mock',
      model: process.env['LLM_MODEL'],
      temperature: process.env['LLM_TEMPERATURE']
        ? parseFloat(process.env['LLM_TEMPERATURE'])
        : 0.7,
      maxTokens: process.env['LLM_MAX_TOKENS']
        ? parseInt(process.env['LLM_MAX_TOKENS'])
        : 4096,
      apiKey: this.getApiKeyForProvider(
        (process.env['LLM_PROVIDER'] as LLMProvider) || 'mock'
      ),
    };
  }

  /**
   * Get API key for specific provider
   */
  private getApiKeyForProvider(provider: LLMProvider): string | undefined {
    switch (provider) {
      case 'openai':
        return process.env['OPENAI_API_KEY'];
      case 'anthropic':
        return process.env['ANTHROPIC_API_KEY'];
      case 'gemini':
        return process.env['GOOGLE_API_KEY'];
      default:
        return undefined;
    }
  }
}

// Export singleton instance getter
export const getLLMFactory = (): LLMFactory => LLMFactory.getInstance();