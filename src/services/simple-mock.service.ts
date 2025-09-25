/**
 * Simple Mock Service for Testing
 */

import { generateUniqueId } from '../utils/id-generator';

class SimpleMockService {
  private requirements: Map<string, any> = new Map();
  private versions: Map<string, any[]> = new Map();

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
}

export const simpleMockService = new SimpleMockService();
export default SimpleMockService;