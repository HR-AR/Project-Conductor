/**
 * Quality Metrics Model - TypeScript interfaces for dashboard and reporting
 */

export interface QualityIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface QualityAnalysisResult {
  requirementId: string;
  overallScore: number;
  issues: QualityIssue[];
  analyzedAt: Date;
  version?: number;
}

export interface QualityMetrics {
  totalRequirements: number;
  averageQualityScore: number;
  requirementsByScore: {
    excellent: number; // 90-100
    good: number; // 75-89
    fair: number; // 60-74
    poor: number; // 0-59
  };
  issuesByType: {
    weak_word: number;
    vague_term: number;
    ambiguous_pronoun: number;
    missing_specific: number;
    passive_voice: number;
    [key: string]: number; // Allow for additional issue types
  };
  topIssues: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  scoreDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  timestamp: Date;
}

export interface QualityTrend {
  date: string;
  averageScore: number;
  totalAnalyzed: number;
  issueCount: number;
}

export interface QualityLeaderboard {
  best: Array<{
    requirementId: string;
    title: string;
    score: number;
    lastAnalyzed: Date;
  }>;
  worst: Array<{
    requirementId: string;
    title: string;
    score: number;
    issueCount: number;
    topIssueType: string;
    lastAnalyzed: Date;
  }>;
}

export interface QualityDashboard {
  summary: QualityMetrics;
  trends: QualityTrend[];
  leaderboard: QualityLeaderboard;
  actionItems: Array<{
    requirementId: string;
    title: string;
    score: number;
    priority: 'high' | 'medium' | 'low';
    topIssues: QualityIssue[];
    recommendedActions: string[];
  }>;
}

export interface QualityFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  priority?: string[];
  scoreMin?: number;
  scoreMax?: number;
  issueTypes?: string[];
  assignedTo?: string[];
}

export interface QualityReportOptions extends QualityFilters {
  groupBy?: 'status' | 'priority' | 'assignee' | 'week' | 'month';
  includeDetails?: boolean;
  limit?: number;
}

export interface QualityInsight {
  type: 'improvement' | 'warning' | 'trend' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
  data?: any;
}

export interface DetailedQualityReport {
  metrics: QualityMetrics;
  trends: QualityTrend[];
  insights: QualityInsight[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
    actionItems: string[];
  }>;
  generatedAt: Date;
  filters: QualityFilters;
}