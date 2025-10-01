/**
 * Links Service - Core linking logic with bidirectional operations and validation
 */

import {
  Link,
  BaseLink,
  CreateLinkRequest,
  UpdateLinkRequest,
  MarkSuspectRequest,
  LinkFilters,
  RequirementLinks,
  LinkValidationResult,
  LinkType,
  LINK_TYPES
} from '../models/link.model';
import { simpleMockService } from './simple-mock.service';
import { generateUniqueId } from '../utils/id-generator';
import WebSocketService from './websocket.service';

class LinksService {
  private webSocketService?: WebSocketService | undefined;

  constructor(webSocketService?: WebSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Create a bidirectional link between two requirements
   */
  async createLink(sourceId: string, linkRequest: CreateLinkRequest, createdBy: string): Promise<Link> {
    // Validate the link
    const validation = await this.validateLink(sourceId, linkRequest.targetId, linkRequest.linkType);
    if (!validation.isValid) {
      throw new Error(`Invalid link: ${validation.errors.join(', ')}`);
    }

    // Check if requirements exist
    const sourceExists = await simpleMockService.getRequirementById(sourceId);
    const targetExists = await simpleMockService.getRequirementById(linkRequest.targetId);

    if (!sourceExists) {
      throw new Error(`Source requirement ${sourceId} not found`);
    }
    if (!targetExists) {
      throw new Error(`Target requirement ${linkRequest.targetId} not found`);
    }

    // Create forward link
    const linkId = await generateUniqueId('LNK');
    const forwardLink: BaseLink = {
      id: linkId,
      sourceId: sourceId,
      targetId: linkRequest.targetId,
      linkType: linkRequest.linkType,
      description: linkRequest.description,
      isSuspect: false,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create backward link if needed
    const backwardLinkType = this.getReverseLinkType(linkRequest.linkType);
    let backwardLink: BaseLink | null = null;

    if (backwardLinkType) {
      const backwardLinkId = await generateUniqueId('LNK');
      backwardLink = {
        id: backwardLinkId,
        sourceId: linkRequest.targetId,
        targetId: sourceId,
        linkType: backwardLinkType,
        description: `Auto-generated reverse of: ${linkRequest.description || linkRequest.linkType}`,
        isSuspect: false,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Store both links
    await simpleMockService.createLink(forwardLink);
    if (backwardLink) {
      await simpleMockService.createLink(backwardLink);
    }

    // Return the forward link with populated fields
    const populatedLink = await this.populateLink(forwardLink);

    // Emit WebSocket event for link creation
    if (this.webSocketService) {
      this.webSocketService.broadcastLinkUpdate(populatedLink, 'created', createdBy);
    }

    return populatedLink;
  }

  /**
   * Get all links for a specific requirement
   */
  async getRequirementLinks(requirementId: string): Promise<RequirementLinks> {
    const incomingLinks = await simpleMockService.getIncomingLinks(requirementId);
    const outgoingLinks = await simpleMockService.getOutgoingLinks(requirementId);

    const populatedIncoming = await Promise.all(
      incomingLinks.map(link => this.populateLink(link))
    );
    const populatedOutgoing = await Promise.all(
      outgoingLinks.map(link => this.populateLink(link))
    );

    const totalLinks = incomingLinks.length + outgoingLinks.length;
    const suspectLinks = [...incomingLinks, ...outgoingLinks].filter(link => link.isSuspect).length;

    return {
      requirementId,
      incomingLinks: populatedIncoming,
      outgoingLinks: populatedOutgoing,
      totalLinks,
      suspectLinks,
    };
  }

  /**
   * Update an existing link
   */
  async updateLink(linkId: string, updateRequest: UpdateLinkRequest, _updatedBy: string): Promise<Link> {
    const existingLink = await simpleMockService.getLinkById(linkId);
    if (!existingLink) {
      throw new Error(`Link ${linkId} not found`);
    }

    // If changing link type, validate the new relationship
    if (updateRequest.linkType && updateRequest.linkType !== existingLink.linkType) {
      const validation = await this.validateLink(
        existingLink.sourceId,
        existingLink.targetId,
        updateRequest.linkType
      );
      if (!validation.isValid) {
        throw new Error(`Invalid link type change: ${validation.errors.join(', ')}`);
      }
    }

    const updatedLink = {
      ...existingLink,
      ...updateRequest,
      updatedAt: new Date(),
    };

    await simpleMockService.updateLink(linkId, updatedLink);
    const populatedLink = await this.populateLink(updatedLink);

    // Emit WebSocket event for link update
    if (this.webSocketService) {
      this.webSocketService.broadcastLinkUpdate(populatedLink, 'updated', _updatedBy);
    }

    return populatedLink;
  }

  /**
   * Mark or unmark a link as suspect
   */
  async markLinkSuspect(linkId: string, markRequest: MarkSuspectRequest, markedBy: string): Promise<Link> {
    const existingLink = await simpleMockService.getLinkById(linkId);
    if (!existingLink) {
      throw new Error(`Link ${linkId} not found`);
    }

    const updatedLink = {
      ...existingLink,
      isSuspect: markRequest.isSuspect,
      suspectReason: markRequest.isSuspect ? markRequest.suspectReason : undefined,
      suspectMarkedAt: markRequest.isSuspect ? new Date() : undefined,
      suspectMarkedBy: markRequest.isSuspect ? markedBy : undefined,
      updatedAt: new Date(),
    };

    await simpleMockService.updateLink(linkId, updatedLink);
    const populatedLink = await this.populateLink(updatedLink);

    // Emit WebSocket event for link suspect status change
    if (this.webSocketService) {
      this.webSocketService.broadcastLinkUpdate(populatedLink, 'updated', markedBy);
    }

    return populatedLink;
  }

  /**
   * Delete a link and its reverse link if it exists
   */
  async deleteLink(linkId: string, deletedBy?: string): Promise<boolean> {
    const link = await simpleMockService.getLinkById(linkId);
    if (!link) {
      return false;
    }

    // Populate the link before deletion for WebSocket broadcast
    const populatedLink = await this.populateLink(link);

    // Find and delete reverse link if it exists
    const reverseLinkType = this.getReverseLinkType(link.linkType);
    if (reverseLinkType) {
      const reverseLinks = await simpleMockService.getLinks({
        sourceId: link.targetId,
        targetId: link.sourceId,
        linkType: [reverseLinkType]
      });

      for (const reverseLink of reverseLinks) {
        await simpleMockService.deleteLink(reverseLink.id);
      }
    }

    // Delete the original link
    const deleted = await simpleMockService.deleteLink(linkId);

    // Emit WebSocket event for link deletion
    if (deleted && this.webSocketService) {
      this.webSocketService.broadcastLinkUpdate(populatedLink, 'deleted', deletedBy);
    }

    return deleted;
  }

  /**
   * Get links with filtering
   */
  async getLinks(filters: LinkFilters): Promise<Link[]> {
    const links = await simpleMockService.getLinks(filters);
    return Promise.all(links.map(link => this.populateLink(link)));
  }

  /**
   * Validate a potential link
   */
  async validateLink(sourceId: string, targetId: string, linkType: LinkType): Promise<LinkValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for self-reference
    if (sourceId === targetId) {
      errors.push('A requirement cannot link to itself');
    }

    // Check if requirements exist
    const sourceExists = await simpleMockService.getRequirementById(sourceId);
    const targetExists = await simpleMockService.getRequirementById(targetId);

    if (!sourceExists) {
      errors.push(`Source requirement ${sourceId} does not exist`);
    }
    if (!targetExists) {
      errors.push(`Target requirement ${targetId} does not exist`);
    }

    // Check for duplicate links
    const existingLinks = await simpleMockService.getLinks({
      sourceId,
      targetId,
      linkType: [linkType]
    });

    if (existingLinks.length > 0) {
      errors.push(`Link of type ${linkType} already exists between these requirements`);
    }

    // Check for circular dependencies for dependency-type links
    if (linkType === LINK_TYPES.DEPENDS_ON || linkType === LINK_TYPES.PARENT_CHILD) {
      const circularPath = await this.detectCircularDependency(sourceId, targetId, linkType);
      if (circularPath.length > 0) {
        errors.push(`Creating this link would cause a circular dependency: ${circularPath.join(' -> ')}`);
      }
    }

    // Business rule validations
    // TODO: Add requirement type field to model before implementing this validation
    // if (linkType === LINK_TYPES.IMPLEMENTS && sourceExists && targetExists) {
    //   // Warn if implementing a non-functional requirement
    //   if (sourceExists.type === 'functional' && targetExists.type === 'non-functional') {
    //     warnings.push('Implementing a non-functional requirement with a functional one - verify this is intended');
    //   }
    // }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Mark links as suspect when a requirement changes
   */
  async markRelatedLinksAsSuspect(requirementId: string, changeReason: string, changedBy: string): Promise<void> {
    const allLinks = [
      ...(await simpleMockService.getIncomingLinks(requirementId)),
      ...(await simpleMockService.getOutgoingLinks(requirementId))
    ];

    for (const link of allLinks) {
      if (!link.isSuspect) {
        await this.markLinkSuspect(
          link.id,
          {
            isSuspect: true,
            suspectReason: `Related requirement changed: ${changeReason}`
          },
          changedBy
        );
      }
    }
  }

  /**
   * Detect circular dependencies
   */
  private async detectCircularDependency(
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    visited: Set<string> = new Set(),
    path: string[] = []
  ): Promise<string[]> {
    // Add the target to the path
    path.push(targetId);

    // If we've reached back to the source, we have a circle
    if (targetId === sourceId && path.length > 1) {
      return path;
    }

    // If we've visited this node, stop (but not a circle back to source)
    if (visited.has(targetId)) {
      return [];
    }

    visited.add(targetId);

    // Get all outgoing dependency links from the target
    const outgoingLinks = await simpleMockService.getOutgoingLinks(targetId);
    const dependencyLinks = outgoingLinks.filter(link =>
      link.linkType === linkType
    );

    for (const link of dependencyLinks) {
      const circularPath = await this.detectCircularDependency(
        sourceId,
        link.targetId,
        linkType,
        new Set(visited),
        [...path]
      );

      if (circularPath.length > 0) {
        return circularPath;
      }
    }

    return [];
  }

  /**
   * Get the reverse link type for bidirectional relationships
   */
  private getReverseLinkType(linkType: LinkType): LinkType | null {
    const reverseMap: Record<LinkType, LinkType | null> = {
      [LINK_TYPES.PARENT_CHILD]: null, // Parent-child is directional
      [LINK_TYPES.DEPENDS_ON]: null,   // Dependencies are directional
      [LINK_TYPES.RELATED_TO]: LINK_TYPES.RELATED_TO, // Related-to is bidirectional
      [LINK_TYPES.IMPLEMENTS]: null,   // Implementation is directional
      [LINK_TYPES.TESTS]: null,        // Tests relationship is directional
    };

    return reverseMap[linkType];
  }

  /**
   * Populate a link with requirement details
   */
  private async populateLink(baseLink: BaseLink): Promise<Link> {
    const sourceReq = await simpleMockService.getRequirementById(baseLink.sourceId);
    const targetReq = await simpleMockService.getRequirementById(baseLink.targetId);

    const link: Link = {
      ...baseLink,
      sourceRequirement: sourceReq ? {
        id: sourceReq.id,
        title: sourceReq.title,
        status: sourceReq.status,
        priority: sourceReq.priority
      } : undefined,
      targetRequirement: targetReq ? {
        id: targetReq.id,
        title: targetReq.title,
        status: targetReq.status,
        priority: targetReq.priority
      } : undefined,
      // TODO: Populate user details when user service is available
      createdByUser: {
        id: baseLink.createdBy,
        username: baseLink.createdBy
      }
    };

    return link;
  }
}

export const linksService = new LinksService();
export { LinksService };
export default LinksService;