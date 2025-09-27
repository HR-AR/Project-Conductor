/**
 * Quality Service - NLP-based ambiguity detection and quality analysis
 */

import {
  QualityAnalysis,
  QualityIssue,
  QualityIssueType,
  QualityIssueSeverity,
  BatchAnalysisRequest,
  BatchAnalysisResponse,
} from '../models/quality.model';
import { Requirement } from '../models/requirement.model';

export class QualityService {
  // Detection patterns for different issue types
  private readonly weakWords = [
    'could', 'should', 'would', 'might', 'may', 'maybe',
    'possibly', 'probably', 'perhaps', 'potentially', 'hopefully'
  ];

  private readonly vagueterms = [
    'appropriate', 'adequate', 'sufficient', 'reasonable', 'timely',
    'fast', 'slow', 'user-friendly', 'intuitive', 'flexible',
    'robust', 'scalable', 'efficient', 'optimal', 'better',
    'improved', 'enhanced', 'good', 'bad', 'nice', 'clean'
  ];

  private readonly ambiguousPronouns = [
    'it', 'this', 'that', 'they', 'them', 'these', 'those'
  ];

  private readonly missingSpecifics = [
    'some', 'many', 'few', 'several', 'various', 'multiple',
    'numerous', 'certain', 'different', 'other'
  ];

  // Common passive voice patterns (is/are/was/were + past participle)
  private readonly passiveVoicePatterns = [
    /\b(is|are|was|were)\s+\w*ed\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?\w*en\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?shown\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?done\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?made\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?given\b/gi,
    /\b(is|are|was|were)\s+(being\s+)?taken\b/gi,
  ];

  /**
   * Analyze a requirement for quality issues and ambiguity
   */
  public analyzeRequirement(requirement: Requirement): QualityAnalysis {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // Combine title and description for analysis
    const text = `${requirement.title} ${requirement.description || ''}`.toLowerCase();
    const originalText = `${requirement.title} ${requirement.description || ''}`;

    // Detect weak words
    this.detectWeakWords(text, originalText, issues);

    // Detect vague terms
    this.detectVagueTerms(text, originalText, issues);

    // Detect ambiguous pronouns
    this.detectAmbiguousPronouns(text, originalText, issues);

    // Detect missing specifics
    this.detectMissingSpecifics(text, originalText, issues);

    // Detect passive voice
    this.detectPassiveVoice(originalText, issues);

    // Generate improvement suggestions
    suggestions.push(...this.generateSuggestions(issues));

    // Calculate quality score (0-100)
    const qualityScore = this.calculateQualityScore(issues, text.length);

    return {
      requirementId: requirement.id,
      qualityScore,
      issues,
      suggestions,
      analyzedAt: new Date(),
    };
  }

  /**
   * Detect weak words that indicate uncertainty
   */
  private detectWeakWords(_text: string, originalText: string, issues: QualityIssue[]): void {
    this.weakWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      let match;

      while ((match = regex.exec(originalText)) !== null) {
        issues.push({
          type: 'weak_word',
          severity: this.getWeakWordSeverity(word),
          text: match[0],
          position: match.index,
          suggestion: this.getWeakWordSuggestion(word),
        });
      }
    });
  }

  /**
   * Detect vague terms that lack specificity
   */
  private detectVagueTerms(_text: string, originalText: string, issues: QualityIssue[]): void {
    this.vagueterms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;

      while ((match = regex.exec(originalText)) !== null) {
        issues.push({
          type: 'vague_term',
          severity: this.getVagueTermSeverity(term),
          text: match[0],
          position: match.index,
          suggestion: this.getVagueTermSuggestion(term),
        });
      }
    });
  }

  /**
   * Detect ambiguous pronouns without clear antecedents
   */
  private detectAmbiguousPronouns(_text: string, originalText: string, issues: QualityIssue[]): void {
    const sentences = originalText.split(/[.!?]+/);

    sentences.forEach((sentence, sentenceIndex) => {
      this.ambiguousPronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        let match;

        while ((match = regex.exec(sentence)) !== null) {
          // Simple heuristic: if pronoun appears at sentence start or without clear noun before it
          const beforePronoun = sentence.substring(0, match.index).trim();
          if (beforePronoun.length < 10 || this.lacksClearAntecedent(beforePronoun)) {
            const globalPosition = this.calculateGlobalPosition(originalText, sentenceIndex, match.index);

            issues.push({
              type: 'ambiguous_pronoun',
              severity: 'medium',
              text: match[0],
              position: globalPosition,
              suggestion: `Replace "${match[0]}" with a specific noun or phrase`,
            });
          }
        }
      });
    });
  }

  /**
   * Detect missing specific quantities or measures
   */
  private detectMissingSpecifics(_text: string, originalText: string, issues: QualityIssue[]): void {
    this.missingSpecifics.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      let match;

      while ((match = regex.exec(originalText)) !== null) {
        issues.push({
          type: 'missing_specific',
          severity: 'medium',
          text: match[0],
          position: match.index,
          suggestion: this.getMissingSpecificSuggestion(word),
        });
      }
    });
  }

  /**
   * Detect passive voice constructions
   */
  private detectPassiveVoice(originalText: string, issues: QualityIssue[]): void {
    this.passiveVoicePatterns.forEach(pattern => {
      let match;

      while ((match = pattern.exec(originalText)) !== null) {
        issues.push({
          type: 'passive_voice',
          severity: 'low',
          text: match[0],
          position: match.index,
          suggestion: 'Consider using active voice for clearer requirements',
        });
      }
    });
  }

  /**
   * Calculate quality score based on issues found
   */
  private calculateQualityScore(issues: QualityIssue[], textLength: number): number {
    let score = 100;
    const textLengthFactor = Math.max(1, textLength / 100); // Normalize by text length

    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 15 / textLengthFactor;
          break;
        case 'medium':
          score -= 8 / textLengthFactor;
          break;
        case 'low':
          score -= 3 / textLengthFactor;
          break;
      }
    });

    // Ensure score doesn't go below 0
    return Math.max(0, Math.round(score));
  }

  /**
   * Generate improvement suggestions based on issues found
   */
  private generateSuggestions(issues: QualityIssue[]): string[] {
    const suggestions: string[] = [];
    const issueTypes = [...new Set(issues.map(issue => issue.type))];

    if (issueTypes.includes('weak_word')) {
      suggestions.push('Replace weak words with definitive statements or specific requirements');
    }

    if (issueTypes.includes('vague_term')) {
      suggestions.push('Define vague terms with specific, measurable criteria');
    }

    if (issueTypes.includes('ambiguous_pronoun')) {
      suggestions.push('Replace pronouns with specific nouns to eliminate ambiguity');
    }

    if (issueTypes.includes('missing_specific')) {
      suggestions.push('Provide specific quantities, numbers, or measurable criteria');
    }

    if (issueTypes.includes('passive_voice')) {
      suggestions.push('Use active voice to clearly identify who performs each action');
    }

    // Add general suggestions based on issue count
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high').length;
    if (highSeverityIssues > 3) {
      suggestions.push('Consider breaking this requirement into smaller, more specific requirements');
    }

    return suggestions;
  }

  /**
   * Analyze multiple requirements in batch
   */
  public async analyzeBatch(request: BatchAnalysisRequest, getRequirement: (id: string) => Promise<Requirement | null>): Promise<BatchAnalysisResponse> {
    const analyses: QualityAnalysis[] = [];

    for (const requirementId of request.requirementIds) {
      const requirement = await getRequirement(requirementId);
      if (requirement) {
        const analysis = this.analyzeRequirement(requirement);

        // Apply minimum score threshold if specified
        if (!request.options?.minScoreThreshold ||
            analysis.qualityScore >= request.options.minScoreThreshold) {
          analyses.push(analysis);
        }
      }
    }

    // Generate summary
    const totalIssues = analyses.reduce((sum, analysis) => sum + analysis.issues.length, 0);
    const averageScore = analyses.length > 0
      ? analyses.reduce((sum, analysis) => sum + analysis.qualityScore, 0) / analyses.length
      : 0;

    const issueBreakdown: Record<QualityIssueType, number> = {
      weak_word: 0,
      vague_term: 0,
      ambiguous_pronoun: 0,
      missing_specific: 0,
      passive_voice: 0,
    };

    analyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        issueBreakdown[issue.type]++;
      });
    });

    return {
      analyses,
      summary: {
        totalAnalyzed: analyses.length,
        averageScore: Math.round(averageScore),
        totalIssues,
        issueBreakdown,
      },
    };
  }

  // Helper methods for severity and suggestion generation
  private getWeakWordSeverity(word: string): QualityIssueSeverity {
    const highSeverityWords = ['might', 'maybe', 'probably', 'perhaps'];
    return highSeverityWords.includes(word.toLowerCase()) ? 'high' : 'medium';
  }

  private getWeakWordSuggestion(word: string): string {
    const suggestions: Record<string, string> = {
      'could': 'Use "will" or "shall" for definitive requirements',
      'should': 'Use "shall" or "must" for mandatory requirements',
      'would': 'Use "will" for definitive future actions',
      'might': 'Use "may" only for optional features, otherwise use "will"',
      'maybe': 'Remove uncertainty - state definitively what will happen',
      'probably': 'Remove uncertainty - specify exact conditions',
      'perhaps': 'Remove uncertainty - be definitive about requirements',
    };
    return suggestions[word.toLowerCase()] || 'Replace with definitive language';
  }

  private getVagueTermSeverity(term: string): QualityIssueSeverity {
    const highSeverityTerms = ['appropriate', 'adequate', 'reasonable', 'sufficient'];
    const lowSeverityTerms = ['good', 'bad', 'nice', 'clean'];

    if (highSeverityTerms.includes(term.toLowerCase())) return 'high';
    if (lowSeverityTerms.includes(term.toLowerCase())) return 'low';
    return 'medium';
  }

  private getVagueTermSuggestion(term: string): string {
    const suggestions: Record<string, string> = {
      'appropriate': 'Define specific criteria for what is considered appropriate',
      'adequate': 'Specify exact performance requirements or thresholds',
      'sufficient': 'Define measurable criteria for sufficiency',
      'reasonable': 'Specify exact time limits, costs, or other measurable criteria',
      'timely': 'Specify exact time requirements (e.g., "within 2 seconds")',
      'fast': 'Define specific performance metrics (e.g., "< 500ms response time")',
      'user-friendly': 'Define specific usability criteria and success metrics',
      'intuitive': 'Define specific user experience requirements and metrics',
    };
    return suggestions[term.toLowerCase()] || 'Define with specific, measurable criteria';
  }

  private getMissingSpecificSuggestion(word: string): string {
    const suggestions: Record<string, string> = {
      'some': 'Specify exact quantity (e.g., "at least 3", "between 5-10")',
      'many': 'Define specific number or percentage',
      'few': 'Specify exact quantity (e.g., "no more than 3")',
      'several': 'Define specific number (e.g., "3-5 items")',
      'various': 'List specific types or categories',
      'multiple': 'Specify exact number or range',
    };
    return suggestions[word.toLowerCase()] || 'Replace with specific quantities or measures';
  }

  private lacksClearAntecedent(beforeText: string): boolean {
    // Simple heuristic: check if there's a noun in the preceding text
    const words = beforeText.split(/\s+/);
    const lastFewWords = words.slice(-5); // Check last 5 words

    // Look for common nouns that could serve as antecedents
    const nounPattern = /^(system|user|application|interface|component|module|feature|function|data|process|service|page|screen|button|field|form|report|document|file)s?$/i;
    return !lastFewWords.some(word => nounPattern.test(word));
  }

  private calculateGlobalPosition(originalText: string, sentenceIndex: number, localPosition: number): number {
    const sentences = originalText.split(/[.!?]+/);
    let globalPosition = 0;

    for (let i = 0; i < sentenceIndex; i++) {
      const sentence = sentences[i];
      if (sentence) {
        globalPosition += sentence.length + 1; // +1 for the sentence delimiter
      }
    }

    return globalPosition + localPosition;
  }
}