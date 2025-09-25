/**
 * Simple Mock Service for Testing
 */

import { generateUniqueId } from '../utils/id-generator';
import { BaseLink, LinkFilters } from '../models/link.model';

class SimpleMockService {
  private requirements: Map<string, any> = new Map();
  private versions: Map<string, any[]> = new Map();
  private links: Map<string, BaseLink> = new Map();

  async createRequirement(data: any): Promise<any> {
    const id = await generateUniqueId('REQ');
    const requirement = {
      id,
      ...data,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.requirements.set(id, requirement);
    return requirement;
  }

  async getRequirementById(id: string): Promise<any> {
    return this.requirements.get(id) || null;
  }

  async updateRequirement(id: string, data: any): Promise<any> {
    const existing = this.requirements.get(id);
    if (!existing) return null;

    // Save version
    if (!this.versions.has(id)) {
      this.versions.set(id, []);
    }
    this.versions.get(id)!.push({ ...existing });

    const updated = {
      ...existing,
      ...data,
      id,
      version: existing.version + 1,
      updated_at: new Date().toISOString()
    };
    this.requirements.set(id, updated);
    return updated;
  }

  async deleteRequirement(id: string): Promise<boolean> {
    const requirement = this.requirements.get(id);
    if (!requirement) return false;
    requirement.status = 'archived';
    return true;
  }

  async listRequirements(options: any): Promise<any> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const all = Array.from(this.requirements.values());
    const paginated = all.slice(offset, offset + limit);

    return {
      data: paginated,
      total: all.length,
      page,
      limit
    };
  }

  async getRequirementVersions(id: string): Promise<any[]> {
    return this.versions.get(id) || [];
  }

  async getSummary(): Promise<any> {
    const all = Array.from(this.requirements.values());
    return {
      total: all.length,
      by_status: {
        draft: all.filter(r => r.status === 'draft').length,
        in_review: all.filter(r => r.status === 'in_review').length,
        approved: all.filter(r => r.status === 'approved').length,
        in_progress: all.filter(r => r.status === 'in_progress').length,
        completed: all.filter(r => r.status === 'completed').length,
        archived: all.filter(r => r.status === 'archived').length
      }
    };
  }

  // Alias for compatibility with RequirementsService
  async getRequirements(filters: any, pagination: any): Promise<any> {
    const result = await this.listRequirements({ ...filters, ...pagination });
    return {
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit)
      }
    };
  }

  // Link management methods
  async createLink(link: BaseLink): Promise<BaseLink> {
    this.links.set(link.id, { ...link });
    return link;
  }

  async getLinkById(id: string): Promise<BaseLink | null> {
    return this.links.get(id) || null;
  }

  async updateLink(id: string, data: Partial<BaseLink>): Promise<BaseLink | null> {
    const existing = this.links.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.links.set(id, updated);
    return updated;
  }

  async deleteLink(id: string): Promise<boolean> {
    return this.links.delete(id);
  }

  async getLinks(filters: LinkFilters = {}): Promise<BaseLink[]> {
    let links = Array.from(this.links.values());

    // Apply filters
    if (filters.linkType && filters.linkType.length > 0) {
      links = links.filter(link => filters.linkType!.includes(link.linkType));
    }

    if (filters.sourceId) {
      links = links.filter(link => link.sourceId === filters.sourceId);
    }

    if (filters.targetId) {
      links = links.filter(link => link.targetId === filters.targetId);
    }

    if (filters.isSuspect !== undefined) {
      links = links.filter(link => link.isSuspect === filters.isSuspect);
    }

    if (filters.createdBy) {
      links = links.filter(link => link.createdBy === filters.createdBy);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      links = links.filter(link =>
        link.description?.toLowerCase().includes(searchTerm)
      );
    }

    return links;
  }

  async getIncomingLinks(requirementId: string): Promise<BaseLink[]> {
    return Array.from(this.links.values()).filter(link => link.targetId === requirementId);
  }

  async getOutgoingLinks(requirementId: string): Promise<BaseLink[]> {
    return Array.from(this.links.values()).filter(link => link.sourceId === requirementId);
  }

  async getAllRequirements(): Promise<any[]> {
    return Array.from(this.requirements.values());
  }

  async getAllLinks(): Promise<BaseLink[]> {
    return Array.from(this.links.values());
  }
}

export const simpleMockService = new SimpleMockService();
export default SimpleMockService;