/**
 * Link Model - TypeScript interfaces for requirement traceability links
 */

export interface LinkTypes {
  PARENT_CHILD: 'parent-child';
  DEPENDS_ON: 'depends-on';
  RELATED_TO: 'related-to';
  IMPLEMENTS: 'implements';
  TESTS: 'tests';
}

export const LINK_TYPES: LinkTypes = {
  PARENT_CHILD: 'parent-child',
  DEPENDS_ON: 'depends-on',
  RELATED_TO: 'related-to',
  IMPLEMENTS: 'implements',
  TESTS: 'tests',
} as const;

export type LinkType = LinkTypes[keyof LinkTypes];

export interface BaseLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
  description?: string | undefined;
  isSuspect: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  suspectReason?: string | undefined;
  suspectMarkedAt?: Date | undefined;
  suspectMarkedBy?: string | undefined;
}

export interface Link extends BaseLink {
  // Additional computed fields for API responses
  sourceRequirement?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | undefined;
  targetRequirement?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  } | undefined;
  createdByUser?: {
    id: string;
    username: string;
    firstName?: string | undefined;
    lastName?: string | undefined;
  } | undefined;
}

export interface CreateLinkRequest {
  targetId: string;
  linkType: LinkType;
  description?: string;
}

export interface UpdateLinkRequest {
  linkType?: LinkType;
  description?: string;
}

export interface MarkSuspectRequest {
  isSuspect: boolean;
  suspectReason?: string;
}

export interface LinkFilters {
  linkType?: LinkType[] | undefined;
  sourceId?: string | undefined;
  targetId?: string | undefined;
  isSuspect?: boolean | undefined;
  createdBy?: string | undefined;
  search?: string | undefined; // searches description
}

export interface RequirementLinks {
  requirementId: string;
  incomingLinks: Link[];
  outgoingLinks: Link[];
  totalLinks: number;
  suspectLinks: number;
}

export interface LinkValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TraceabilityMatrix {
  requirements: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  links: {
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    isSuspect: boolean;
  }[];
  orphanedRequirements: string[];
  coverageMetrics: {
    totalRequirements: number;
    linkedRequirements: number;
    orphanedRequirements: number;
    suspectLinks: number;
    coveragePercentage: number;
    linksByType: Record<LinkType, number>;
  };
}

export interface CircularDependencyPath {
  path: string[];
  linkTypes: LinkType[];
}

export interface LinkAnalytics {
  totalLinks: number;
  linksByType: Record<LinkType, number>;
  suspectLinks: number;
  requirementsWithLinks: number;
  orphanedRequirements: number;
  averageLinksPerRequirement: number;
  circularDependencies: CircularDependencyPath[];
}