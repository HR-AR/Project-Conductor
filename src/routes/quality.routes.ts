/**
 * Quality Routes - API endpoints for quality analysis
 */

import { Router } from 'express';
import { QualityController } from '../controllers/quality.controller';

const router = Router();
const qualityController = new QualityController();

/**
 * @swagger
 * /api/v1/requirements/{id}/analyze:
 *   post:
 *     summary: Analyze quality of a single requirement
 *     tags: [Quality]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *     responses:
 *       200:
 *         description: Quality analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QualityAnalysis'
 *                 message:
 *                   type: string
 *       404:
 *         description: Requirement not found
 */
router.post('/requirements/:id/analyze', qualityController.analyzeRequirement);

/**
 * @swagger
 * /api/v1/requirements/{id}/quality:
 *   get:
 *     summary: Get quality analysis for a specific requirement
 *     tags: [Quality]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requirement ID
 *     responses:
 *       200:
 *         description: Quality analysis retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QualityAnalysis'
 *                 message:
 *                   type: string
 *       404:
 *         description: Requirement not found
 */
router.get('/requirements/:id/quality', qualityController.getRequirementQuality);

/**
 * @swagger
 * /api/v1/quality/analyze-batch:
 *   post:
 *     summary: Analyze multiple requirements in batch
 *     tags: [Quality]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchAnalysisRequest'
 *     responses:
 *       200:
 *         description: Batch analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BatchAnalysisResponse'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 */
router.post('/quality/analyze-batch', qualityController.analyzeBatch);

/**
 * @swagger
 * /api/v1/quality/report:
 *   get:
 *     summary: Get quality report and metrics
 *     tags: [Quality]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report period
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum quality score filter
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Maximum quality score filter
 *       - in: query
 *         name: includeDetails
 *         schema:
 *           type: boolean
 *         description: Include recent analyses in response
 *     responses:
 *       200:
 *         description: Quality report generated
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
 *                     report:
 *                       $ref: '#/components/schemas/QualityReport'
 *                     recentAnalyses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QualityAnalysis'
 *                 message:
 *                   type: string
 */
router.get('/quality/report', qualityController.getQualityReport);

/**
 * @swagger
 * /api/v1/quality/trends:
 *   get:
 *     summary: Get quality trends over time
 *     tags: [Quality]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in trends
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: How to group the trend data
 *     responses:
 *       200:
 *         description: Quality trends retrieved
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
 *                       averageScore:
 *                         type: number
 *                       totalAnalyzed:
 *                         type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 */
router.get('/quality/trends', qualityController.getQualityTrends);

/**
 * @swagger
 * /api/v1/quality/low-quality:
 *   get:
 *     summary: Get requirements with low quality scores
 *     tags: [Quality]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           default: 60
 *         description: Quality score threshold
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Low quality requirements retrieved
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
 *                       title:
 *                         type: string
 *                       qualityScore:
 *                         type: number
 *                       issueCount:
 *                         type: integer
 *                       lastAnalyzed:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 */
router.get('/quality/low-quality', qualityController.getLowQualityRequirements);

/**
 * @swagger
 * /api/v1/quality/reanalyze-all:
 *   post:
 *     summary: Re-analyze all requirements
 *     tags: [Quality]
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force re-analysis even for recently analyzed requirements
 *     responses:
 *       200:
 *         description: Re-analysis completed
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
 *                     totalRequirements:
 *                       type: integer
 *                     analyzedCount:
 *                       type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           requirementId:
 *                             type: string
 *                           qualityScore:
 *                             type: number
 *                           issueCount:
 *                             type: integer
 *                 message:
 *                   type: string
 */
router.post('/quality/reanalyze-all', qualityController.reanalyzeAll);

export default router;