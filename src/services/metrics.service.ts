/**
 * Quality Metrics Service - Aggregates and analyzes quality data
 */

import {
  QualityMetrics,
  QualityTrend,
  QualityLeaderboard,
  QualityDashboard,
  QualityFilters,
  QualityReportOptions,
  QualityAnalysisResult,
  QualityIssue,
  QualityInsight,
  DetailedQualityReport
} from '../models/metrics.model';

export class MetricsService {
  private mockQualityData: Map<string, QualityAnalysisResult> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize mock quality analysis data for requirements
   */
  private initializeMockData(): void {
    // Generate mock quality analysis results
    const issueTypes = ['weak_word', 'vague_term', 'ambiguous_pronoun', 'missing_specific', 'passive_voice'];
    const severities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

    // Create mock data for various requirement IDs
    for (let i = 1; i <= 50; i++) {
      const reqId = `REQ-${String(i).padStart(4, '0')}`;

      // Generate random quality score
      const score = Math.floor(Math.random() * 100);

      // Generate random issues based on score (lower score = more issues)
      const issueCount = score > 80 ? Math.floor(Math.random() * 3) :
                        score > 60 ? Math.floor(Math.random() * 5) + 1 :
                        Math.floor(Math.random() * 8) + 2;

      const issues: QualityIssue[] = [];
      for (let j = 0; j < issueCount; j++) {
        const type = issueTypes[Math.floor(Math.random() * issueTypes.length)] || 'weak_word';
        issues.push({
          type,
          description: `${type.replace('_', ' ')} detected in requirement text`,
          severity: severities[Math.floor(Math.random() * severities.length)] || 'low',
          suggestion: `Consider revising to improve clarity and specificity`
        });
      }

      this.mockQualityData.set(reqId, {
        requirementId: reqId,
        overallScore: score,
        issues,
        analyzedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)), // Random date within last 30 days
        version: 1
      });
    }
  }

  /**
   * Calculate comprehensive quality metrics
   */
  async calculateQualityMetrics(filters?: QualityFilters): Promise<QualityMetrics> {
    const qualityResults = Array.from(this.mockQualityData.values());
    let filteredResults = this.applyFilters(qualityResults, filters);

    if (filteredResults.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate average score
    const averageScore = filteredResults.reduce((sum, result) => sum + result.overallScore, 0) / filteredResults.length;

    // Group by score ranges
    const requirementsByScore = {
      excellent: filteredResults.filter(r => r.overallScore >= 90).length,
      good: filteredResults.filter(r => r.overallScore >= 75 && r.overallScore < 90).length,
      fair: filteredResults.filter(r => r.overallScore >= 60 && r.overallScore < 75).length,
      poor: filteredResults.filter(r => r.overallScore < 60).length,
    };

    // Count issues by type
    const issuesByType: {
      weak_word: number;
      vague_term: number;
      ambiguous_pronoun: number;
      missing_specific: number;
      passive_voice: number;
      [key: string]: number;
    } = {
      weak_word: 0,
      vague_term: 0,
      ambiguous_pronoun: 0,
      missing_specific: 0,
      passive_voice: 0,
    };

    filteredResults.forEach(result => {
      result.issues.forEach(issue => {
        const issueType = issue.type || 'unknown';
        if (issueType in issuesByType) {
          const typedKey = issueType as keyof typeof issuesByType;
          (issuesByType as any)[typedKey]++;
        } else {
          issuesByType[issueType] = 1;
        }
      });
    });

    // Calculate top issues
    const topIssues = Object.entries(issuesByType)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / filteredResults.length) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate score distribution
    const scoreDistribution = [
      { range: '90-100', count: requirementsByScore.excellent, percentage: Math.round((requirementsByScore.excellent / filteredResults.length) * 100) },
      { range: '75-89', count: requirementsByScore.good, percentage: Math.round((requirementsByScore.good / filteredResults.length) * 100) },
      { range: '60-74', count: requirementsByScore.fair, percentage: Math.round((requirementsByScore.fair / filteredResults.length) * 100) },
      { range: '0-59', count: requirementsByScore.poor, percentage: Math.round((requirementsByScore.poor / filteredResults.length) * 100) },
    ];

    return {
      totalRequirements: filteredResults.length,
      averageQualityScore: Math.round(averageScore * 100) / 100,
      requirementsByScore,
      issuesByType,
      topIssues,
      scoreDistribution,
      timestamp: new Date(),
    };
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(days: number = 30): Promise<QualityTrend[]> {
    const trends: QualityTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0];

      // Filter results for this date (mock data - in real app would filter by analyzedAt date)
      const dayResults = Array.from(this.mockQualityData.values())
        .filter(result => {
          const analyzeDate = result.analyzedAt.toISOString().split('T')[0];
          return analyzeDate === dateString;
        });

      if (dayResults.length > 0) {
        const averageScore = dayResults.reduce((sum, result) => sum + result.overallScore, 0) / dayResults.length;
        const issueCount = dayResults.reduce((sum, result) => sum + result.issues.length, 0);

        trends.push({
          date: dateString || '',
          averageScore: Math.round(averageScore * 100) / 100,
          totalAnalyzed: dayResults.length,
          issueCount
        });
      } else {
        // Fill gaps with previous day's data or zero
        const prevTrend = trends[trends.length - 1];
        trends.push({
          date: dateString || '',
          averageScore: prevTrend?.averageScore || 0,
          totalAnalyzed: 0,
          issueCount: 0
        });
      }
    }

    return trends;
  }

  /**
   * Get issue type distribution
   */
  async getIssueDistribution(filters?: QualityFilters): Promise<{ [key: string]: number }> {
    const qualityResults = Array.from(this.mockQualityData.values());
    const filteredResults = this.applyFilters(qualityResults, filters);

    const distribution: { [key: string]: number } = {};

    filteredResults.forEach(result => {
      result.issues.forEach(issue => {
        distribution[issue.type] = (distribution[issue.type] || 0) + 1;
      });
    });

    return distribution;
  }

  /**
   * Get requirements grouped by quality score ranges
   */
  async getRequirementsByQuality(filters?: QualityFilters): Promise<any> {
    const qualityResults = Array.from(this.mockQualityData.values());
    const filteredResults = this.applyFilters(qualityResults, filters);

    return {
      excellent: filteredResults.filter(r => r.overallScore >= 90),
      good: filteredResults.filter(r => r.overallScore >= 75 && r.overallScore < 90),
      fair: filteredResults.filter(r => r.overallScore >= 60 && r.overallScore < 75),
      poor: filteredResults.filter(r => r.overallScore < 60),
    };
  }

  /**
   * Get requirements that need attention (low quality score)
   */
  async getLowQualityRequirements(threshold: number = 60): Promise<QualityAnalysisResult[]> {
    const qualityResults = Array.from(this.mockQualityData.values());
    return qualityResults
      .filter(result => result.overallScore < threshold)
      .sort((a, b) => a.overallScore - b.overallScore);
  }

  /**
   * Get quality leaderboard (best and worst performing requirements)
   */
  async getQualityLeaderboard(limit: number = 10): Promise<QualityLeaderboard> {
    const qualityResults = Array.from(this.mockQualityData.values());

    // Mock requirement titles (in real app, would join with requirements table)
    const getMockTitle = (reqId: string) => `Requirement ${reqId.replace('REQ-', '')}`;

    const best = qualityResults
      .filter(r => r.overallScore >= 75)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
      .map(result => ({
        requirementId: result.requirementId,
        title: getMockTitle(result.requirementId),
        score: result.overallScore,
        lastAnalyzed: result.analyzedAt
      }));

    const worst = qualityResults
      .filter(r => r.overallScore < 75)
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, limit)
      .map(result => {
        const topIssueType = result.issues.length > 0
          ? result.issues[0]!.type
          : 'none';

        return {
          requirementId: result.requirementId,
          title: getMockTitle(result.requirementId),
          score: result.overallScore,
          issueCount: result.issues.length,
          topIssueType,
          lastAnalyzed: result.analyzedAt
        };
      });

    return { best, worst };
  }

  /**
   * Generate comprehensive quality dashboard
   */
  async getQualityDashboard(filters?: QualityFilters): Promise<QualityDashboard> {
    const [metrics, trends, leaderboard] = await Promise.all([
      this.calculateQualityMetrics(filters),
      this.getQualityTrends(30),
      this.getQualityLeaderboard(5)
    ]);

    // Generate action items (requirements needing attention)
    const lowQualityReqs = await this.getLowQualityRequirements(70);
    const actionItems = lowQualityReqs.slice(0, 10).map(result => {
      const getMockTitle = (reqId: string) => `Requirement ${reqId.replace('REQ-', '')}`;

      return {
        requirementId: result.requirementId,
        title: getMockTitle(result.requirementId),
        score: result.overallScore,
        priority: (result.overallScore < 40 ? 'high' : result.overallScore < 60 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        topIssues: result.issues.slice(0, 3),
        recommendedActions: this.generateRecommendations(result.issues)
      };
    });

    return {
      summary: metrics,
      trends,
      leaderboard,
      actionItems
    };
  }

  /**
   * Generate detailed quality report with insights and recommendations
   */
  async getDetailedQualityReport(options: QualityReportOptions = {}): Promise<DetailedQualityReport> {
    const metrics = await this.calculateQualityMetrics(options);
    const trends = await this.getQualityTrends(30);

    // Generate insights based on data
    const insights = await this.generateInsights(metrics, trends);

    // Generate recommendations
    const recommendations = this.generateGlobalRecommendations(metrics);

    return {
      metrics,
      trends,
      insights,
      recommendations,
      generatedAt: new Date(),
      filters: options
    };
  }

  /**
   * Apply filters to quality analysis results
   */
  private applyFilters(results: QualityAnalysisResult[], filters?: QualityFilters): QualityAnalysisResult[] {
    if (!filters) return results;

    let filtered = results;

    if (filters.scoreMin !== undefined) {
      filtered = filtered.filter(r => r.overallScore >= filters.scoreMin!);
    }

    if (filters.scoreMax !== undefined) {
      filtered = filtered.filter(r => r.overallScore <= filters.scoreMax!);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(r => r.analyzedAt >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter(r => r.analyzedAt <= toDate);
    }

    if (filters.issueTypes && filters.issueTypes.length > 0) {
      filtered = filtered.filter(r =>
        r.issues.some(issue => filters.issueTypes!.includes(issue.type))
      );
    }

    return filtered;
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];
    const issueTypes = [...new Set(issues.map(i => i.type))];

    issueTypes.forEach(type => {
      switch (type) {
        case 'weak_word':
          recommendations.push('Replace weak words with specific, measurable terms');
          break;
        case 'vague_term':
          recommendations.push('Define vague terms with precise criteria');
          break;
        case 'ambiguous_pronoun':
          recommendations.push('Replace pronouns with specific nouns');
          break;
        case 'missing_specific':
          recommendations.push('Add specific details and acceptance criteria');
          break;
        case 'passive_voice':
          recommendations.push('Rewrite using active voice for clarity');
          break;
        default:
          recommendations.push('Review and improve requirement clarity');
      }
    });

    return recommendations;
  }

  /**
   * Generate insights based on metrics and trends
   */
  private async generateInsights(metrics: QualityMetrics, trends: QualityTrend[]): Promise<QualityInsight[]> {
    const insights: QualityInsight[] = [];

    // Score trend analysis
    if (trends.length >= 7) {
      const recentAvg = trends.slice(-7).reduce((sum, t) => sum + t.averageScore, 0) / 7;
      const olderAvg = trends.slice(0, 7).reduce((sum, t) => sum + t.averageScore, 0) / 7;

      if (recentAvg > olderAvg + 5) {
        insights.push({
          type: 'trend',
          title: 'Quality Improvement Trend',
          description: `Quality scores have improved by ${Math.round(recentAvg - olderAvg)} points over the past week`,
          impact: 'medium',
          recommendation: 'Continue current practices that are driving quality improvements'
        });
      } else if (recentAvg < olderAvg - 5) {
        insights.push({
          type: 'warning',
          title: 'Quality Decline Detected',
          description: `Quality scores have decreased by ${Math.round(olderAvg - recentAvg)} points over the past week`,
          impact: 'high',
          recommendation: 'Review recent requirements and provide additional training'
        });
      }
    }

    // High percentage of poor quality requirements
    if (metrics.requirementsByScore.poor > metrics.totalRequirements * 0.3) {
      insights.push({
        type: 'warning',
        title: 'High Number of Poor Quality Requirements',
        description: `${metrics.requirementsByScore.poor} requirements (${Math.round((metrics.requirementsByScore.poor / metrics.totalRequirements) * 100)}%) have quality scores below 60`,
        impact: 'high',
        recommendation: 'Implement quality gates and provide requirements writing training'
      });
    }

    // Top issue type analysis
    if (metrics.topIssues.length > 0) {
      const topIssue = metrics.topIssues[0];
      if (topIssue && topIssue.count > metrics.totalRequirements * 0.5) {
        insights.push({
          type: 'improvement',
          title: `Prevalent Issue: ${topIssue.type.replace('_', ' ')}`,
          description: `${topIssue.type.replace('_', ' ')} appears in ${topIssue.count} requirements (${topIssue.percentage}%)`,
          impact: 'medium',
          recommendation: `Focus training and review processes on addressing ${topIssue.type.replace('_', ' ')} issues`
        });
      }
    }

    return insights;
  }

  /**
   * Generate global recommendations based on overall metrics
   */
  private generateGlobalRecommendations(metrics: QualityMetrics): Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
    actionItems: string[];
  }> {
    const recommendations = [];

    // Overall quality assessment
    if (metrics.averageQualityScore < 70) {
      recommendations.push({
        title: 'Implement Quality Gates',
        description: 'Average quality score is below acceptable threshold',
        priority: 'high' as const,
        estimatedImpact: 'Improve overall quality by 15-20 points',
        actionItems: [
          'Establish minimum quality score requirements',
          'Implement automated quality checks',
          'Require peer review for low-scoring requirements',
          'Provide requirements writing training'
        ]
      });
    }

    // Issue-specific recommendations
    const topIssue = metrics.topIssues[0];
    if (topIssue && topIssue.percentage > 40) {
      recommendations.push({
        title: `Address ${topIssue.type.replace('_', ' ')} Issues`,
        description: `Most common issue type affects ${topIssue.percentage}% of requirements`,
        priority: 'medium' as const,
        estimatedImpact: 'Reduce issue frequency by 50%',
        actionItems: [
          `Create guidelines for avoiding ${topIssue.type.replace('_', ' ')}`,
          'Update requirement templates',
          'Add specific review checklist items',
          'Provide targeted training sessions'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get empty metrics object for when no data is available
   */
  private getEmptyMetrics(): QualityMetrics {
    return {
      totalRequirements: 0,
      averageQualityScore: 0,
      requirementsByScore: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
      },
      issuesByType: {
        weak_word: 0,
        vague_term: 0,
        ambiguous_pronoun: 0,
        missing_specific: 0,
        passive_voice: 0,
      },
      topIssues: [],
      scoreDistribution: [],
      timestamp: new Date(),
    };
  }
}

export const metricsService = new MetricsService();
export default MetricsService;