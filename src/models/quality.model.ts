/**
 * Quality Model - TypeScript interfaces for NLP-based quality analysis
 */

export type QualityIssueType =
  | 'weak_word'
  | 'vague_term'
  | 'ambiguous_pronoun'
  | 'missing_specific'
  | 'passive_voice';

export type QualityIssueSeverity = 'low' | 'medium' | 'high';

export interface QualityIssue {
  type: QualityIssueType;
  severity: QualityIssueSeverity;
  text: string;
  position: number;
  suggestion: string;
}

export interface QualityAnalysis {
  requirementId: string;
  qualityScore: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
  analyzedAt: Date;
}

export interface QualityReport {
  totalRequirements: number;
  averageQualityScore: number;
  requirementsAnalyzed: number;
  issueDistribution: Record<QualityIssueType, number>;
  severityDistribution: Record<QualityIssueSeverity, number>;
  topIssues: Array<{
    type: QualityIssueType;
    count: number;
    affectedRequirements: number;
  }>;
  qualityTrends: Array<{
    date: string;
    averageScore: number;
    totalAnalyzed: number;
  }>;
  generatedAt: Date;
}

export interface BatchAnalysisRequest {
  requirementIds: string[];
  options?: {
    includeDetails?: boolean;
    minScoreThreshold?: number;
  };
}

export interface BatchAnalysisResponse {
  analyses: QualityAnalysis[];
  summary: {
    totalAnalyzed: number;
    averageScore: number;
    totalIssues: number;
    issueBreakdown: Record<QualityIssueType, number>;
  };
}