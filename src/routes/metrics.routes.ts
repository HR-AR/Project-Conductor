/**
 * Quality Metrics Routes - Express routes for metrics API endpoints
 */

import { Router } from 'express';
import { metricsController } from '../controllers/metrics.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     QualityMetrics:
 *       type: object
 *       properties:
 *         totalRequirements:
 *           type: number
 *           description: Total number of requirements analyzed
 *         averageQualityScore:
 *           type: number
 *           description: Average quality score across all requirements
 *         requirementsByScore:
 *           type: object
 *           properties:
 *             excellent:
 *               type: number
 *               description: Count of requirements with score 90-100
 *             good:
 *               type: number
 *               description: Count of requirements with score 75-89
 *             fair:
 *               type: number
 *               description: Count of requirements with score 60-74
 *             poor:
 *               type: number
 *               description: Count of requirements with score 0-59
 *         issuesByType:
 *           type: object
 *           properties:
 *             weak_word:
 *               type: number
 *             vague_term:
 *               type: number
 *             ambiguous_pronoun:
 *               type: number
 *             missing_specific:
 *               type: number
 *             passive_voice:
 *               type: number
 *         topIssues:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               count:
 *                 type: number
 *               percentage:
 *                 type: number
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/metrics/quality:
 *   get:
 *     summary: Get overall quality metrics
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter results to this date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated list of requirement statuses
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Comma-separated list of requirement priorities
 *       - in: query
 *         name: scoreMin
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum quality score filter
 *       - in: query
 *         name: scoreMax
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Maximum quality score filter
 *       - in: query
 *         name: issueTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of issue types to filter by
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Comma-separated list of user IDs
 *     responses:
 *       200:
 *         description: Quality metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QualityMetrics'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/quality', metricsController.getQualityMetrics.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/trends:
 *   get:
 *     summary: Get quality trends over time
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in trend analysis
 *     responses:
 *       200:
 *         description: Quality trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       averageScore:
 *                         type: number
 *                       totalAnalyzed:
 *                         type: integer
 *                       issueCount:
 *                         type: integer
 *                 period:
 *                   type: object
 *                   properties:
 *                     days:
 *                       type: integer
 *                     from:
 *                       type: string
 *                       format: date
 *                     to:
 *                       type: string
 *                       format: date
 *       400:
 *         description: Invalid days parameter
 *       500:
 *         description: Server error
 */
router.get('/quality/trends', metricsController.getQualityTrends.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/issues:
 *   get:
 *     summary: Get issue type distribution
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue distribution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           percentage:
 *                             type: number
 *                     total:
 *                       type: integer
 *                     summary:
 *                       type: object
 *                       properties:
 *                         mostCommon:
 *                           type: string
 *                         totalIssues:
 *                           type: integer
 *                         uniqueTypes:
 *                           type: integer
 *       500:
 *         description: Server error
 */
router.get('/quality/issues', metricsController.getIssueDistribution.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/low:
 *   get:
 *     summary: Get low quality requirements that need attention
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 60
 *         description: Quality score threshold below which requirements are considered low quality
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Low quality requirements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       requirementId:
 *                         type: string
 *                       overallScore:
 *                         type: number
 *                       issues:
 *                         type: array
 *                         items:
 *                           type: object
 *                       title:
 *                         type: string
 *                       issueCount:
 *                         type: integer
 *                       topIssueTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       priority:
 *                         type: string
 *                         enum: [critical, high, medium]
 *                       daysSinceAnalysis:
 *                         type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     threshold:
 *                       type: integer
 *                     averageScore:
 *                       type: number
 *                     criticalCount:
 *                       type: integer
 *                     highPriorityCount:
 *                       type: integer
 *       400:
 *         description: Invalid threshold parameter
 *       500:
 *         description: Server error
 */
router.get('/quality/low', metricsController.getLowQualityRequirements.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/leaderboard:
 *   get:
 *     summary: Get quality leaderboard (best and worst requirements)
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of items to return for each category
 *     responses:
 *       200:
 *         description: Quality leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     best:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           requirementId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           score:
 *                             type: number
 *                           lastAnalyzed:
 *                             type: string
 *                             format: date-time
 *                     worst:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           requirementId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           score:
 *                             type: number
 *                           issueCount:
 *                             type: integer
 *                           topIssueType:
 *                             type: string
 *                           lastAnalyzed:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid limit parameter
 *       500:
 *         description: Server error
 */
router.get('/quality/leaderboard', metricsController.getQualityLeaderboard.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/dashboard:
 *   get:
 *     summary: Get comprehensive quality dashboard data
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: scoreMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: scoreMax
 *         schema:
 *           type: integer
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quality dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       $ref: '#/components/schemas/QualityMetrics'
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                     leaderboard:
 *                       type: object
 *                     actionItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Server error
 */
router.get('/quality/dashboard', metricsController.getQualityDashboard.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/report:
 *   get:
 *     summary: Get detailed quality report with insights and recommendations
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: scoreMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: scoreMax
 *         schema:
 *           type: integer
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [status, priority, assignee, week, month]
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detailed quality report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       $ref: '#/components/schemas/QualityMetrics'
 *                     trends:
 *                       type: array
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [improvement, warning, trend, achievement]
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           impact:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           recommendation:
 *                             type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           priority:
 *                             type: string
 *                             enum: [high, medium, low]
 *                           estimatedImpact:
 *                             type: string
 *                           actionItems:
 *                             type: array
 *                             items:
 *                               type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     filters:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/quality/report', metricsController.getDetailedQualityReport.bind(metricsController));

/**
 * @swagger
 * /api/v1/metrics/quality/by-score:
 *   get:
 *     summary: Get requirements grouped by quality score ranges
 *     tags: [Quality Metrics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Requirements grouped by quality score retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     excellent:
 *                       type: array
 *                       description: Requirements with score 90-100
 *                     good:
 *                       type: array
 *                       description: Requirements with score 75-89
 *                     fair:
 *                       type: array
 *                       description: Requirements with score 60-74
 *                     poor:
 *                       type: array
 *                       description: Requirements with score 0-59
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         excellent:
 *                           type: integer
 *                         good:
 *                           type: integer
 *                         fair:
 *                           type: integer
 *                         poor:
 *                           type: integer
 *       500:
 *         description: Server error
 */
router.get('/quality/by-score', metricsController.getRequirementsByQuality.bind(metricsController));

export default router;