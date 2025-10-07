/**
 * Mock LLM Strategy - For demo and testing without API costs
 */

import { LLMStrategy } from '../llm-strategy.interface';
import { GenerationOptions, GenerationResult } from '../../../models/llm/llm.model';
import logger from '../../../utils/logger';

/**
 * Mock LLM implementation that generates realistic responses without API calls
 */
export class MockLLMStrategy implements LLMStrategy {
  private readonly providerName = 'mock';
  private readonly modelName = 'mock-gpt-4';

  /**
   * Generate text from prompt using predefined templates
   */
  async generateText(prompt: string, options?: GenerationOptions): Promise<GenerationResult> {
    logger.info({ provider: this.providerName }, 'Mock LLM generating text');

    // Simulate API delay
    await this.simulateDelay(500, 1500);

    // Detect what type of generation based on prompt content
    const content = this.generateRealisticContent(prompt);

    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(content);

    return {
      content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      cost: 0, // Mock is free
      provider: this.providerName,
      model: this.modelName,
      generatedAt: new Date(),
    };
  }

  /**
   * Stream text generation with simulated chunks
   */
  async *streamText(prompt: string, options?: GenerationOptions): AsyncIterable<string> {
    const fullContent = await this.generateText(prompt, options);
    const words = fullContent.content.split(' ');

    // Stream word by word
    for (let i = 0; i < words.length; i++) {
      await this.simulateDelay(50, 150);
      yield words[i] + (i < words.length - 1 ? ' ' : '');
    }
  }

  /**
   * Validate configuration (always true for mock)
   */
  validateConfig(): boolean {
    return true;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.modelName;
  }

  /**
   * Estimate cost (always 0 for mock)
   */
  estimateCost(prompt: string, options?: GenerationOptions): number {
    return 0;
  }

  /**
   * Generate realistic content based on prompt analysis
   */
  private generateRealisticContent(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    // Detect BRD generation
    if (lowerPrompt.includes('business requirement') || lowerPrompt.includes('brd')) {
      return this.generateBRDContent(prompt);
    }

    // Detect PRD generation
    if (lowerPrompt.includes('product requirement') || lowerPrompt.includes('prd')) {
      return this.generatePRDContent(prompt);
    }

    // Detect section-specific generation
    if (lowerPrompt.includes('executive summary')) {
      return this.generateExecutiveSummary(prompt);
    }

    if (lowerPrompt.includes('stakeholder')) {
      return this.generateStakeholders(prompt);
    }

    // Default generic response
    return this.generateGenericResponse(prompt);
  }

  /**
   * Generate realistic BRD content
   */
  private generateBRDContent(prompt: string): string {
    const idea = this.extractIdea(prompt);

    return JSON.stringify({
      title: `${idea.projectName} - Business Requirements Document`,
      executiveSummary: `This initiative aims to ${idea.goal} by developing ${idea.solution}. The project addresses ${idea.problem} and is expected to deliver significant business value through ${idea.benefits}. This document outlines the business requirements, stakeholder needs, success criteria, and implementation timeline for the ${idea.projectName} project.`,
      problemStatement: `Current ${idea.domain} solutions lack ${idea.gap}. Users face challenges with ${idea.painPoints}, resulting in ${idea.impact}. This project seeks to address these gaps by providing ${idea.resolution}.`,
      businessImpact: `The ${idea.projectName} initiative is projected to deliver substantial business value across multiple dimensions:

Revenue Impact:
- Increase customer acquisition by 25-40% through improved ${idea.feature1}
- Reduce churn by 15-20% with enhanced ${idea.feature2}
- Enable new revenue streams worth $500K-1M annually

Cost Optimization:
- Reduce operational costs by 30% through automation
- Decrease support tickets by 40% via self-service capabilities
- Save 100+ hours/month in manual processing

Strategic Value:
- Strengthen market position in ${idea.domain}
- Improve customer satisfaction scores by 20+ points
- Create competitive differentiation through ${idea.innovation}`,
      successCriteria: [
        `Launch ${idea.projectName} to 1,000+ users within 3 months`,
        `Achieve 80%+ user satisfaction rating within 6 months`,
        `Reduce ${idea.metric1} by 50% within first quarter`,
        `Generate $250K in revenue within first 6 months`,
        `Maintain 99.9% system uptime and reliability`
      ],
      stakeholders: [
        {
          id: 'STK-001',
          name: 'Sarah Johnson',
          role: 'Chief Product Officer',
          department: 'product',
          email: 'sarah.johnson@company.com',
          influence: 'high',
          interest: 'high'
        },
        {
          id: 'STK-002',
          name: 'Michael Chen',
          role: 'VP of Engineering',
          department: 'engineering',
          email: 'michael.chen@company.com',
          influence: 'high',
          interest: 'high'
        },
        {
          id: 'STK-003',
          name: 'Emily Rodriguez',
          role: 'Head of Business Development',
          department: 'business',
          email: 'emily.rodriguez@company.com',
          influence: 'medium',
          interest: 'high'
        },
        {
          id: 'STK-004',
          name: 'David Kim',
          role: 'Marketing Director',
          department: 'marketing',
          email: 'david.kim@company.com',
          influence: 'medium',
          interest: 'medium'
        }
      ],
      timeline: {
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      budget: 150000
    }, null, 2);
  }

  /**
   * Generate realistic PRD content
   */
  private generatePRDContent(prompt: string): string {
    const idea = this.extractIdea(prompt);

    return JSON.stringify({
      title: `${idea.projectName} - Product Requirements Document`,
      productOverview: `The ${idea.projectName} is designed to ${idea.goal} by providing ${idea.solution}. This product addresses key user needs in ${idea.domain} through innovative features including ${idea.feature1}, ${idea.feature2}, and ${idea.feature3}.`,
      targetAudience: `Primary Users: ${idea.users}
Secondary Users: ${idea.secondaryUsers}
User Segments: ${idea.segments}`,
      userStories: [
        {
          id: 'US-001',
          persona: `${idea.persona1}`,
          story: `As a ${idea.persona1}, I want to ${idea.action1} so that I can ${idea.benefit1}`,
          acceptanceCriteria: [
            `User can ${idea.capability1} within 3 clicks`,
            `System responds in under 2 seconds`,
            `Changes are auto-saved every 30 seconds`
          ],
          priority: 'high'
        },
        {
          id: 'US-002',
          persona: `${idea.persona2}`,
          story: `As a ${idea.persona2}, I want to ${idea.action2} so that I can ${idea.benefit2}`,
          acceptanceCriteria: [
            `Interface shows ${idea.display1} clearly`,
            `Users can ${idea.capability2} easily`,
            `System provides ${idea.feedback1} immediately`
          ],
          priority: 'high'
        },
        {
          id: 'US-003',
          persona: 'Power User',
          story: `As a power user, I want to ${idea.action3} so that I can ${idea.benefit3}`,
          acceptanceCriteria: [
            `Advanced features accessible via ${idea.access1}`,
            `Supports ${idea.capability3}`,
            `Provides detailed ${idea.feedback2}`
          ],
          priority: 'medium'
        }
      ],
      functionalRequirements: [
        {
          id: 'FR-001',
          category: 'Core Features',
          requirement: `System must support ${idea.requirement1}`,
          priority: 'high'
        },
        {
          id: 'FR-002',
          category: 'User Management',
          requirement: `Platform must enable ${idea.requirement2}`,
          priority: 'high'
        },
        {
          id: 'FR-003',
          category: 'Integration',
          requirement: `Solution must integrate with ${idea.integration1}`,
          priority: 'medium'
        }
      ],
      nonFunctionalRequirements: {
        performance: [
          'Page load time < 2 seconds',
          'API response time < 500ms',
          'Support 10,000+ concurrent users'
        ],
        security: [
          'SOC 2 Type II compliance',
          'End-to-end encryption for sensitive data',
          'Multi-factor authentication (MFA)',
          'Role-based access control (RBAC)'
        ],
        scalability: [
          'Horizontal scaling capability',
          'Auto-scaling based on load',
          'Support 100x user growth'
        ],
        reliability: [
          '99.9% uptime SLA',
          'Automated failover',
          'Data backup every 6 hours'
        ]
      },
      technicalRequirements: {
        frontend: 'React 18+ with TypeScript',
        backend: 'Node.js with Express/NestJS',
        database: 'PostgreSQL 15+',
        infrastructure: 'AWS/GCP with Docker/Kubernetes',
        monitoring: 'DataDog/New Relic'
      }
    }, null, 2);
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(prompt: string): string {
    const idea = this.extractIdea(prompt);
    return `This initiative aims to ${idea.goal} by developing ${idea.solution}. The project addresses ${idea.problem} and is expected to deliver significant business value through ${idea.benefits}. Key success factors include strong stakeholder alignment, robust technical architecture, and clear go-to-market strategy.`;
  }

  /**
   * Generate stakeholders list
   */
  private generateStakeholders(prompt: string): string {
    return JSON.stringify([
      {
        id: 'STK-001',
        name: 'Sarah Johnson',
        role: 'Chief Product Officer',
        department: 'product',
        email: 'sarah.johnson@company.com',
        influence: 'high',
        interest: 'high'
      },
      {
        id: 'STK-002',
        name: 'Michael Chen',
        role: 'VP of Engineering',
        department: 'engineering',
        email: 'michael.chen@company.com',
        influence: 'high',
        interest: 'high'
      }
    ], null, 2);
  }

  /**
   * Generate generic response
   */
  private generateGenericResponse(prompt: string): string {
    return `Based on the provided information, I recommend a phased approach focusing on core functionality first, followed by advanced features. Key considerations include user experience, technical feasibility, and business value alignment. The solution should prioritize scalability, security, and maintainability while delivering measurable business outcomes.`;
  }

  /**
   * Extract key information from prompt
   */
  private extractIdea(prompt: string): Record<string, string> {
    // Simple extraction - in real implementation, this would be more sophisticated
    const ideaMatch = prompt.match(/idea[:\s]+([^.\n]+)/i);
    const rawIdea = ideaMatch ? ideaMatch[1].trim() : 'innovative platform solution';

    // Generate contextual values based on the idea
    const projectName = this.capitalize(rawIdea.split(' ').slice(0, 3).join(' '));
    const domain = rawIdea.includes('mobile') ? 'mobile applications' :
                   rawIdea.includes('web') ? 'web platforms' :
                   rawIdea.includes('data') ? 'data analytics' : 'software solutions';

    return {
      projectName,
      domain,
      goal: 'transform user experience and drive business growth',
      solution: rawIdea,
      problem: 'inefficiencies in current workflows and user pain points',
      gap: 'modern features and seamless user experience',
      painPoints: 'complexity, slow performance, and limited functionality',
      impact: 'decreased productivity and user satisfaction',
      resolution: 'an intuitive, high-performance solution',
      benefits: 'improved efficiency, better user engagement, and measurable ROI',
      feature1: 'real-time collaboration',
      feature2: 'intelligent automation',
      feature3: 'advanced analytics',
      metric1: 'processing time',
      innovation: 'AI-powered insights',
      users: 'Business professionals and team leaders',
      secondaryUsers: 'Administrators and power users',
      segments: 'SMB (40%), Enterprise (40%), Individual (20%)',
      persona1: 'Product Manager',
      persona2: 'Team Lead',
      action1: 'quickly access key information',
      action2: 'collaborate with my team in real-time',
      action3: 'customize advanced settings',
      benefit1: 'make faster decisions',
      benefit2: 'improve team productivity',
      benefit3: 'optimize my workflow',
      capability1: 'access dashboard',
      capability2: 'share updates',
      capability3: 'bulk operations',
      display1: 'status indicators',
      feedback1: 'visual confirmation',
      feedback2: 'analytics reports',
      access1: 'keyboard shortcuts',
      requirement1: 'multi-user collaboration with real-time sync',
      requirement2: 'role-based permissions and access control',
      integration1: 'popular third-party tools and APIs',
    };
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(text: string): string {
    return text.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Estimate tokens (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Simulate API delay
   */
  private simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}