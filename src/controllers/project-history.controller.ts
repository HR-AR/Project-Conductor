/**
 * Project History Controller
 * Handles HTTP requests for project tracking and history
 */

import { Request, Response } from 'express';
import { ProjectHistoryService } from '../services/project-history.service';
import { ProjectFilters } from '../models/project.model';
import { asyncHandler } from '../middleware/error-handler';

const projectHistoryService = new ProjectHistoryService();

/**
 * GET /api/v1/projects
 * Get all projects with optional filters
 */
export const getProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const filters: ProjectFilters = {
    scope: req.query['scope'] ? (Array.isArray(req.query['scope']) ? req.query['scope'] as any[] : [req.query['scope'] as any]) : undefined,
    status: req.query['status'] ? (Array.isArray(req.query['status']) ? req.query['status'] as any[] : [req.query['status'] as any]) : undefined,
    createdBy: req.query['createdBy'] as string | undefined,
    stakeholderEmail: req.query['stakeholderEmail'] as string | undefined,
    minBudget: req.query['minBudget'] ? Number(req.query['minBudget']) : undefined,
    maxBudget: req.query['maxBudget'] ? Number(req.query['maxBudget']) : undefined,
    startDateFrom: req.query['startDateFrom'] as string | undefined,
    startDateTo: req.query['startDateTo'] as string | undefined,
    tags: req.query['tags'] ? (Array.isArray(req.query['tags']) ? req.query['tags'] as string[] : [req.query['tags'] as string]) : undefined,
    search: req.query['search'] as string | undefined,
  };

  const projects = await projectHistoryService.getProjects(filters);

  res.json({
    success: true,
    data: projects,
    message: `Found ${projects.length} projects`,
  });
});

/**
 * GET /api/v1/projects/summary
 * Get project summary statistics
 */
export const getProjectSummary = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const summary = await projectHistoryService.getProjectSummary();

  res.json({
    success: true,
    data: summary,
    message: 'Project summary retrieved successfully',
  });
});

/**
 * GET /api/v1/projects/:id
 * Get single project by ID
 */
export const getProjectById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const project = await projectHistoryService.getProjectById(id);

  if (!project) {
    res.status(404).json({
      success: false,
      message: `Project ${id} not found`,
    });
    return;
  }

  res.json({
    success: true,
    data: project,
    message: 'Project retrieved successfully',
  });
});

/**
 * GET /api/v1/projects/:id/details
 * Get project with full traceability details
 */
export const getProjectDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const details = await projectHistoryService.getProjectDetails(id);

  if (!details) {
    res.status(404).json({
      success: false,
      message: `Project ${id} not found`,
    });
    return;
  }

  res.json({
    success: true,
    data: details,
    message: 'Project details retrieved successfully',
  });
});

/**
 * GET /api/v1/projects/:id/timeline
 * Get project timeline events
 */
export const getProjectTimeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const timeline = await projectHistoryService.getProjectTimeline(id);

  res.json({
    success: true,
    data: timeline,
    message: `Found ${timeline.length} timeline events`,
  });
});

/**
 * GET /api/v1/projects/:id/similar
 * Get similar projects
 */
export const getSimilarProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const result = await projectHistoryService.getSimilarProjects(id);

  if (!result) {
    res.status(404).json({
      success: false,
      message: `Project ${id} not found`,
    });
    return;
  }

  res.json({
    success: true,
    data: result,
    message: `Found ${result.similarProjects.length} similar projects`,
  });
});

/**
 * GET /api/v1/projects/:id1/compare/:id2
 * Compare two projects
 */
export const compareProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id1, id2 } = req.params;
  const comparison = await projectHistoryService.compareProjects(id1, id2);

  if (!comparison) {
    res.status(404).json({
      success: false,
      message: 'One or both projects not found',
    });
    return;
  }

  res.json({
    success: true,
    data: comparison,
    message: 'Projects compared successfully',
  });
});

/**
 * POST /api/v1/projects
 * Create a new project
 */
export const createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const createdBy = req.body['createdBy'] || 'system';
  const project = await projectHistoryService.createProject(req.body, createdBy);

  res.status(201).json({
    success: true,
    data: project,
    message: 'Project created successfully',
  });
});

/**
 * PUT /api/v1/projects/:id
 * Update an existing project
 */
export const updateProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const project = await projectHistoryService.updateProject(id, req.body);

  if (!project) {
    res.status(404).json({
      success: false,
      message: `Project ${id} not found`,
    });
    return;
  }

  res.json({
    success: true,
    data: project,
    message: 'Project updated successfully',
  });
});