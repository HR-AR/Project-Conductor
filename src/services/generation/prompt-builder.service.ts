/**
 * Prompt Builder Service - Constructs prompts for LLM generation
 */

import { BRD } from '../../models/brd.model';
import { PRD } from '../../models/prd.model';
import { ComplexityLevel } from '../../models/llm/llm.model';

/**
 * Service for building structured prompts for BRD/PRD generation
 */
export class PromptBuilderService {
  /**
   * Build prompt for BRD generation from user idea
   */
  buildBRDPrompt(idea: string, complexity: ComplexityLevel = 'moderate'): string {
    const complexityGuidance = this.getComplexityGuidance(complexity);

    return `You are an expert business analyst. Generate a comprehensive Business Requirements Document (BRD) based on this idea:

USER IDEA: ${idea}

COMPLEXITY LEVEL: ${complexity}
${complexityGuidance}

Generate a JSON response with the following structure:
{
  "title": "Clear, concise project title",
  "executiveSummary": "2-3 paragraph overview explaining the initiative, its goals, and expected business value",
  "problemStatement": "Detailed description of the problem this project solves, including current pain points and gaps",
  "businessImpact": "Comprehensive analysis of business impact including: Revenue Impact, Cost Optimization, and Strategic Value. Be specific with metrics and numbers.",
  "successCriteria": ["Array of 3-5 measurable success criteria with specific metrics and timeframes"],
  "stakeholders": [
    {
      "id": "STK-001",
      "name": "Full name",
      "role": "Job title",
      "department": "business|product|engineering|marketing|sales",
      "email": "email@company.com",
      "influence": "high|medium|low",
      "interest": "high|medium|low"
    }
  ],
  "timeline": {
    "startDate": "ISO date string (7 days from now)",
    "targetDate": "ISO date string (90 days from now)"
  },
  "budget": 150000
}

Requirements:
- Make it professional, detailed, and actionable
- Include 4-6 diverse stakeholders across departments
- Success criteria must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Business impact should quantify revenue, cost savings, and strategic value
- Use realistic names, roles, and email addresses
- Provide detailed, comprehensive content (not generic placeholders)

Return ONLY the JSON, no additional text.`;
  }

  /**
   * Build prompt for PRD generation from BRD
   */
  buildPRDPrompt(brd: BRD): string {
    return `You are an expert product manager. Generate a comprehensive Product Requirements Document (PRD) based on this approved Business Requirements Document:

BRD INFORMATION:
Title: ${brd.title}
Problem Statement: ${brd.problemStatement}
Business Impact: ${brd.businessImpact}
Success Criteria: ${brd.successCriteria.join(', ')}

Generate a JSON response with the following structure:
{
  "title": "${brd.title} - Product Requirements",
  "productOverview": "Detailed product description explaining what will be built and why",
  "targetAudience": "Description of primary and secondary users, user segments",
  "userStories": [
    {
      "id": "US-001",
      "persona": "User type/persona",
      "story": "As a [persona], I want to [action] so that I can [benefit]",
      "acceptanceCriteria": ["Specific, testable criteria"],
      "priority": "high|medium|low"
    }
  ],
  "functionalRequirements": [
    {
      "id": "FR-001",
      "category": "Core Features|User Management|Integration|etc",
      "requirement": "Detailed functional requirement",
      "priority": "high|medium|low"
    }
  ],
  "nonFunctionalRequirements": {
    "performance": ["Performance requirements with specific metrics"],
    "security": ["Security requirements and compliance needs"],
    "scalability": ["Scalability requirements"],
    "reliability": ["Reliability and uptime requirements"]
  },
  "technicalRequirements": {
    "frontend": "Technology stack for frontend",
    "backend": "Technology stack for backend",
    "database": "Database technology",
    "infrastructure": "Infrastructure and deployment",
    "monitoring": "Monitoring and observability tools"
  }
}

Requirements:
- Include 5-8 user stories covering different personas
- Include 8-12 functional requirements across categories
- Be specific with technical requirements and metrics
- Make it comprehensive and production-ready
- Align all requirements with the BRD's business objectives

Return ONLY the JSON, no additional text.`;
  }

  /**
   * Build prompt for PRD generation from user idea (direct)
   */
  buildPRDFromIdeaPrompt(idea: string, complexity: ComplexityLevel = 'moderate'): string {
    const complexityGuidance = this.getComplexityGuidance(complexity);

    return `You are an expert product manager. Generate a comprehensive Product Requirements Document (PRD) based on this idea:

USER IDEA: ${idea}

COMPLEXITY LEVEL: ${complexity}
${complexityGuidance}

Generate a detailed PRD with the same JSON structure as described above, including:
- Product overview and target audience
- 5-8 comprehensive user stories
- 8-12 functional requirements
- Non-functional requirements (performance, security, scalability, reliability)
- Technical requirements and stack recommendations

Make it production-ready and comprehensive. Return ONLY the JSON.`;
  }

  /**
   * Build prompt for BRD generation from PRD (reverse engineering)
   */
  buildBRDFromPRDPrompt(prd: PRD): string {
    return `You are an expert business analyst. Based on this Product Requirements Document, reverse-engineer a Business Requirements Document that would have justified this product:

PRD INFORMATION:
Title: ${prd.title}
User Stories: ${prd.userStories.length} stories defined
Features: ${prd.features.length} features planned
Technical Requirements: ${prd.technicalRequirements.length} requirements

Generate a BRD JSON with the same structure as before, inferring:
- The business problem this product solves
- The business impact and value proposition
- Success criteria that align with the product features
- Appropriate stakeholders who would sponsor this product
- Realistic timeline and budget

Make it comprehensive and aligned with the PRD. Return ONLY the JSON.`;
  }

  /**
   * Build prompt for section regeneration
   */
  buildSectionRegenerationPrompt(
    documentType: 'brd' | 'prd',
    section: string,
    currentContent: unknown,
    feedback?: string
  ): string {
    const feedbackGuidance = feedback
      ? `\n\nUSER FEEDBACK: ${feedback}\nPlease incorporate this feedback in the regenerated section.`
      : '';

    return `You are regenerating the "${section}" section of a ${documentType.toUpperCase()}.

CURRENT CONTENT:
${JSON.stringify(currentContent, null, 2)}
${feedbackGuidance}

Generate an improved version of this section. Return ONLY the JSON for this specific section, maintaining the same structure but with enhanced content.`;
  }

  /**
   * Get complexity-specific guidance
   */
  private getComplexityGuidance(complexity: ComplexityLevel): string {
    switch (complexity) {
      case 'simple':
        return 'Focus on core features and basic requirements. Keep it concise but complete.';
      case 'moderate':
        return 'Include comprehensive requirements with good detail. Balance depth with clarity.';
      case 'complex':
        return 'Provide extensive detail, advanced features, and comprehensive analysis. Include edge cases and scalability considerations.';
      default:
        return '';
    }
  }
}