/**
 * Traceability Service - Matrix generation and coverage analytics
 */

import {
  TraceabilityMatrix,
  LinkAnalytics,
  CircularDependencyPath,
  LINK_TYPES,
  LinkType
} from '../models/link.model';
import { simpleMockService } from './simple-mock.service';

class TraceabilityService {

  /**
   * Generate a complete traceability matrix
   */
  async generateTraceabilityMatrix(): Promise<TraceabilityMatrix> {
    // Get all requirements
    const allRequirements = await simpleMockService.getAllRequirements();
    const allLinks = await simpleMockService.getAllLinks();

    // Transform requirements for matrix
    const requirements = allRequirements.map(req => ({
      id: req.id,
      title: req.title,
      status: req.status,
      priority: req.priority
    }));

    // Transform links for matrix
    const links = allLinks.map(link => ({
      sourceId: link.sourceId,
      targetId: link.targetId,
      linkType: link.linkType,
      isSuspect: link.isSuspect
    }));

    // Find orphaned requirements (no incoming or outgoing links)
    const linkedRequirementIds = new Set<string>();
    allLinks.forEach(link => {
      linkedRequirementIds.add(link.sourceId);
      linkedRequirementIds.add(link.targetId);
    });

    const orphanedRequirements = allRequirements
      .filter(req => !linkedRequirementIds.has(req.id))
      .map(req => req.id);

    // Calculate coverage metrics
    const totalRequirements = allRequirements.length;
    const linkedRequirements = linkedRequirementIds.size;
    const suspectLinks = allLinks.filter(link => link.isSuspect).length;

    const linksByType = Object.values(LINK_TYPES).reduce((acc, type) => {
      acc[type] = allLinks.filter(link => link.linkType === type).length;
      return acc;
    }, {} as Record<LinkType, number>);

    const coveragePercentage = totalRequirements > 0
      ? Math.round((linkedRequirements / totalRequirements) * 100)
      : 0;

    return {
      requirements,
      links,
      orphanedRequirements,
      coverageMetrics: {
        totalRequirements,
        linkedRequirements,
        orphanedRequirements: orphanedRequirements.length,
        suspectLinks,
        coveragePercentage,
        linksByType
      }
    };
  }

  /**
   * Generate comprehensive link analytics
   */
  async generateLinkAnalytics(): Promise<LinkAnalytics> {
    const allRequirements = await simpleMockService.getAllRequirements();
    const allLinks = await simpleMockService.getAllLinks();

    // Calculate basic metrics
    const totalLinks = allLinks.length;
    const suspectLinks = allLinks.filter(link => link.isSuspect).length;

    const linksByType = Object.values(LINK_TYPES).reduce((acc, type) => {
      acc[type] = allLinks.filter(link => link.linkType === type).length;
      return acc;
    }, {} as Record<LinkType, number>);

    // Count requirements with links
    const linkedRequirementIds = new Set<string>();
    allLinks.forEach(link => {
      linkedRequirementIds.add(link.sourceId);
      linkedRequirementIds.add(link.targetId);
    });

    const requirementsWithLinks = linkedRequirementIds.size;
    const orphanedRequirements = allRequirements.length - requirementsWithLinks;
    const averageLinksPerRequirement = requirementsWithLinks > 0
      ? Math.round((totalLinks * 2) / requirementsWithLinks * 100) / 100
      : 0;

    // Detect circular dependencies
    const circularDependencies = await this.detectAllCircularDependencies();

    return {
      totalLinks,
      linksByType,
      suspectLinks,
      requirementsWithLinks,
      orphanedRequirements,
      averageLinksPerRequirement,
      circularDependencies
    };
  }

  /**
   * Get coverage report for specific requirement types or categories
   */
  async getCoverageReport(filters?: {
    status?: string[];
    priority?: string[];
    tags?: string[];
  }): Promise<{
    totalRequirements: number;
    coveredRequirements: number;
    coveragePercentage: number;
    uncoveredRequirements: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
    }>;
  }> {
    let requirements = await simpleMockService.getAllRequirements();

    // Apply filters if provided
    if (filters) {
      if (filters.status) {
        requirements = requirements.filter(req => filters.status!.includes(req.status));
      }
      if (filters.priority) {
        requirements = requirements.filter(req => filters.priority!.includes(req.priority));
      }
      if (filters.tags) {
        requirements = requirements.filter(req =>
          req.tags && req.tags.some((tag: string) => filters.tags!.includes(tag))
        );
      }
    }

    // Get all linked requirement IDs
    const allLinks = await simpleMockService.getAllLinks();
    const linkedRequirementIds = new Set<string>();
    allLinks.forEach(link => {
      linkedRequirementIds.add(link.sourceId);
      linkedRequirementIds.add(link.targetId);
    });

    // Filter requirements by those in our filtered set
    const filteredRequirementIds = new Set(requirements.map(req => req.id));
    const coveredInFilteredSet = Array.from(linkedRequirementIds)
      .filter(id => filteredRequirementIds.has(id));

    const uncoveredRequirements = requirements
      .filter(req => !linkedRequirementIds.has(req.id))
      .map(req => ({
        id: req.id,
        title: req.title,
        status: req.status,
        priority: req.priority
      }));

    const totalRequirements = requirements.length;
    const coveredRequirements = coveredInFilteredSet.length;
    const coveragePercentage = totalRequirements > 0
      ? Math.round((coveredRequirements / totalRequirements) * 100)
      : 0;

    return {
      totalRequirements,
      coveredRequirements,
      coveragePercentage,
      uncoveredRequirements
    };
  }

  /**
   * Get impact analysis for a requirement
   */
  async getImpactAnalysis(requirementId: string): Promise<{
    directlyAffected: string[];
    indirectlyAffected: string[];
    dependsOn: string[];
    totalImpact: number;
  }> {
    const directlyAffected: string[] = [];
    const indirectlyAffected: string[] = [];
    const dependsOn: string[] = [];
    const visited = new Set<string>();

    // Get direct dependencies and dependents
    const outgoingLinks = await simpleMockService.getOutgoingLinks(requirementId);
    const incomingLinks = await simpleMockService.getIncomingLinks(requirementId);

    // Things this requirement depends on
    dependsOn.push(...outgoingLinks
      .filter(link => link.linkType === LINK_TYPES.DEPENDS_ON)
      .map(link => link.targetId)
    );

    // Things directly affected by this requirement
    directlyAffected.push(...incomingLinks
      .filter(link => link.linkType === LINK_TYPES.DEPENDS_ON)
      .map(link => link.sourceId)
    );

    // Find indirectly affected requirements (recursive)
    await this.findIndirectImpacts(directlyAffected, indirectlyAffected, visited);

    return {
      directlyAffected,
      indirectlyAffected,
      dependsOn,
      totalImpact: directlyAffected.length + indirectlyAffected.length
    };
  }

  /**
   * Get traceability paths between two requirements
   */
  async getTraceabilityPath(fromId: string, toId: string): Promise<{
    paths: Array<{
      requirements: string[];
      linkTypes: LinkType[];
      totalHops: number;
    }>;
    shortestPath: {
      requirements: string[];
      linkTypes: LinkType[];
      totalHops: number;
    } | undefined;
  }> {
    const allPaths: Array<{
      requirements: string[];
      linkTypes: LinkType[];
      totalHops: number;
    }> = [];

    await this.findAllPaths(fromId, toId, [], [], allPaths, new Set());

    const shortestPath = allPaths.length > 0
      ? allPaths.reduce((shortest, current) =>
          current.totalHops < shortest.totalHops ? current : shortest
        )
      : undefined;

    return {
      paths: allPaths,
      shortestPath: shortestPath || undefined
    };
  }

  /**
   * Detect all circular dependencies in the system
   */
  private async detectAllCircularDependencies(): Promise<CircularDependencyPath[]> {
    const circularDependencies: CircularDependencyPath[] = [];
    const allLinks = await simpleMockService.getAllLinks();
    const dependencyLinks = allLinks.filter(link =>
      link.linkType === LINK_TYPES.DEPENDS_ON || link.linkType === LINK_TYPES.PARENT_CHILD
    );

    // Group links by source
    const linksBySource = new Map<string, typeof dependencyLinks>();
    dependencyLinks.forEach(link => {
      if (!linksBySource.has(link.sourceId)) {
        linksBySource.set(link.sourceId, []);
      }
      linksBySource.get(link.sourceId)!.push(link);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    const linkTypePath: LinkType[] = [];

    // Perform DFS to detect cycles
    const dfs = async (nodeId: string): Promise<void> => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const outgoingLinks = linksBySource.get(nodeId) || [];

      for (const link of outgoingLinks) {
        linkTypePath.push(link.linkType);

        if (!visited.has(link.targetId)) {
          await dfs(link.targetId);
        } else if (recursionStack.has(link.targetId)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(link.targetId);
          const cyclePath = [...path.slice(cycleStartIndex), link.targetId];
          const cycleLinkTypes = linkTypePath.slice(cycleStartIndex);

          circularDependencies.push({
            path: cyclePath,
            linkTypes: cycleLinkTypes
          });
        }

        linkTypePath.pop();
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    // Check all nodes
    const allRequirements = await simpleMockService.getAllRequirements();
    for (const req of allRequirements) {
      if (!visited.has(req.id)) {
        await dfs(req.id);
      }
    }

    return circularDependencies;
  }

  /**
   * Find indirect impacts recursively
   */
  private async findIndirectImpacts(
    currentLevel: string[],
    indirectlyAffected: string[],
    visited: Set<string>,
    depth: number = 0,
    maxDepth: number = 10
  ): Promise<void> {
    if (depth >= maxDepth || currentLevel.length === 0) {
      return;
    }

    const nextLevel: string[] = [];

    for (const reqId of currentLevel) {
      if (visited.has(reqId)) {
        continue;
      }
      visited.add(reqId);

      const incomingLinks = await simpleMockService.getIncomingLinks(reqId);
      const dependents = incomingLinks
        .filter(link => link.linkType === LINK_TYPES.DEPENDS_ON)
        .map(link => link.sourceId)
        .filter(id => !visited.has(id));

      nextLevel.push(...dependents);
    }

    indirectlyAffected.push(...nextLevel);
    await this.findIndirectImpacts(nextLevel, indirectlyAffected, visited, depth + 1, maxDepth);
  }

  /**
   * Find all paths between two requirements
   */
  private async findAllPaths(
    fromId: string,
    toId: string,
    currentPath: string[],
    currentLinkTypes: LinkType[],
    allPaths: Array<{ requirements: string[]; linkTypes: LinkType[]; totalHops: number }>,
    visited: Set<string>,
    maxDepth: number = 6
  ): Promise<void> {
    if (currentPath.length >= maxDepth) {
      return;
    }

    if (visited.has(fromId)) {
      return;
    }

    const newPath = [...currentPath, fromId];
    visited.add(fromId);

    if (fromId === toId && newPath.length > 1) {
      allPaths.push({
        requirements: newPath,
        linkTypes: [...currentLinkTypes],
        totalHops: newPath.length - 1
      });
      visited.delete(fromId);
      return;
    }

    const outgoingLinks = await simpleMockService.getOutgoingLinks(fromId);

    for (const link of outgoingLinks) {
      await this.findAllPaths(
        link.targetId,
        toId,
        newPath,
        [...currentLinkTypes, link.linkType],
        allPaths,
        new Set(visited),
        maxDepth
      );
    }

    visited.delete(fromId);
  }
}

export const traceabilityService = new TraceabilityService();
export default TraceabilityService;