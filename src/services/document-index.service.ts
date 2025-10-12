import { db } from '../config/database';
import documentParserService from './document-parser.service';
import narrativeVersionsService from './narrative-versions.service';

export interface ProjectSummary {
  narrative_id: number;
  project_id: string;
  title: string;
  type: string;
  status: string;
  health_score: number;
  blockers: Array<{
    milestone_id: string;
    title: string;
    days_overdue: number;
  }>;
  next_milestones: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
  }>;
  approvers: Array<{
    id: string;
    name: string;
    role: string;
    vote: string;
  }>;
  last_indexed_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class DocumentIndexService {
  private useMock = process.env.USE_MOCK_DB !== 'false';
  private mockIndex: Map<number, ProjectSummary> = new Map();

  /**
   * Index a document when it's saved
   */
  async indexDocument(narrative_id: number): Promise<void> {
    try {
      const version = await narrativeVersionsService.getLatest(narrative_id);
      if (!version) {
        console.warn(`[DocumentIndex] No version found for narrative ${narrative_id}`);
        return;
      }

      const parsed = documentParserService.parseDocument(version.content);
      const metadata = parsed.metadata;

      // Extract blockers from milestones
      const blockers = (metadata.milestones || [])
        .filter((m: any) => m.status === 'blocked')
        .map((m: any) => ({
          milestone_id: m.id,
          title: m.title,
          days_overdue: m.days_overdue || 0
        }));

      // Extract next milestones
      const next_milestones = (metadata.milestones || [])
        .filter((m: any) => m.status === 'in_progress' || m.status === 'pending')
        .slice(0, 3)
        .map((m: any) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          progress: m.progress || 0
        }));

      const summary: ProjectSummary = {
        narrative_id,
        project_id: metadata.id || `project-${narrative_id}`,
        title: this.extractTitle(parsed.rawContent),
        type: metadata.type || 'brd',
        status: metadata.status || 'draft',
        health_score: metadata.health_score || 85,
        blockers,
        next_milestones,
        approvers: (metadata.approvers || []).map((a: any) => ({
          id: a.id || a.name,
          name: a.name,
          role: a.role,
          vote: a.vote || a.status || 'pending'
        })),
        last_indexed_at: new Date()
      };

      if (this.useMock) {
        this.mockIndex.set(narrative_id, summary);
        console.log(`[DocumentIndex] Indexed narrative ${narrative_id} (mock)`);
      } else {
        await db.query(
          `INSERT INTO document_index
           (narrative_id, project_id, title, type, status, health_score, blockers, next_milestones, approvers, last_indexed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (narrative_id)
           DO UPDATE SET
             project_id = $2,
             title = $3,
             type = $4,
             status = $5,
             health_score = $6,
             blockers = $7,
             next_milestones = $8,
             approvers = $9,
             last_indexed_at = $10`,
          [
            narrative_id,
            summary.project_id,
            summary.title,
            summary.type,
            summary.status,
            summary.health_score,
            JSON.stringify(summary.blockers),
            JSON.stringify(summary.next_milestones),
            JSON.stringify(summary.approvers),
            summary.last_indexed_at
          ]
        );
        console.log(`[DocumentIndex] Indexed narrative ${narrative_id}`);
      }
    } catch (error) {
      console.error(`[DocumentIndex] Failed to index narrative ${narrative_id}:`, error);
      throw error;
    }
  }

  /**
   * Extract title from markdown content
   */
  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled Document';
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(status: string): Promise<ProjectSummary[]> {
    if (this.useMock) {
      return Array.from(this.mockIndex.values())
        .filter(p => p.status === status)
        .sort((a, b) => b.last_indexed_at.getTime() - a.last_indexed_at.getTime());
    }

    const result = await db.query(
      `SELECT * FROM document_index
       WHERE status = $1
       ORDER BY last_indexed_at DESC`,
      [status]
    );

    return this.mapResults(result.rows);
  }

  /**
   * Get blocked projects
   */
  async getBlockedProjects(): Promise<ProjectSummary[]> {
    if (this.useMock) {
      return Array.from(this.mockIndex.values())
        .filter(p => p.blockers && p.blockers.length > 0)
        .sort((a, b) => b.blockers.length - a.blockers.length);
    }

    const result = await db.query(
      `SELECT * FROM document_index
       WHERE jsonb_array_length(blockers) > 0
       ORDER BY jsonb_array_length(blockers) DESC`
    );

    return this.mapResults(result.rows);
  }

  /**
   * Get my projects (pending approval)
   */
  async getMyProjects(userId: number): Promise<ProjectSummary[]> {
    if (this.useMock) {
      return Array.from(this.mockIndex.values())
        .filter(p => {
          if (!p.approvers) return false;
          return p.approvers.some((a: any) => a.id === `user-${userId}` && !a.vote);
        })
        .sort((a, b) => b.last_indexed_at.getTime() - a.last_indexed_at.getTime());
    }

    const result = await db.query(
      `SELECT * FROM document_index
       WHERE approvers @> $1::jsonb
       ORDER BY last_indexed_at DESC`,
      [JSON.stringify([{ id: `user-${userId}` }])]
    );

    return this.mapResults(result.rows);
  }

  /**
   * Search projects by title
   */
  async searchProjects(query: string): Promise<ProjectSummary[]> {
    if (this.useMock) {
      const lowerQuery = query.toLowerCase();
      return Array.from(this.mockIndex.values())
        .filter(p => p.title.toLowerCase().includes(lowerQuery))
        .sort((a, b) => b.last_indexed_at.getTime() - a.last_indexed_at.getTime());
    }

    const result = await db.query(
      `SELECT * FROM document_index
       WHERE title ILIKE $1
       ORDER BY last_indexed_at DESC`,
      [`%${query}%`]
    );

    return this.mapResults(result.rows);
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<ProjectSummary[]> {
    if (this.useMock) {
      return Array.from(this.mockIndex.values())
        .sort((a, b) => b.last_indexed_at.getTime() - a.last_indexed_at.getTime());
    }

    const result = await db.query(
      `SELECT * FROM document_index
       ORDER BY last_indexed_at DESC`
    );

    return this.mapResults(result.rows);
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_health: { healthy: number; at_risk: number; critical: number };
    blocked_count: number;
  }> {
    const projects = await this.getAllProjects();

    const by_status: Record<string, number> = {};
    const by_health = { healthy: 0, at_risk: 0, critical: 0 };
    let blocked_count = 0;

    projects.forEach(p => {
      // Count by status
      by_status[p.status] = (by_status[p.status] || 0) + 1;

      // Count by health
      if (p.health_score >= 80) {
        by_health.healthy++;
      } else if (p.health_score >= 60) {
        by_health.at_risk++;
      } else {
        by_health.critical++;
      }

      // Count blocked
      if (p.blockers && p.blockers.length > 0) {
        blocked_count++;
      }
    });

    return {
      total: projects.length,
      by_status,
      by_health,
      blocked_count
    };
  }

  /**
   * Rebuild entire index
   */
  async rebuildIndex(): Promise<void> {
    console.log('[DocumentIndex] Rebuilding entire index...');

    if (this.useMock) {
      this.mockIndex.clear();
      // Re-index all mock narratives
      const narrativeIds = [1, 2, 3, 4, 5, 6, 7, 8];
      for (const id of narrativeIds) {
        try {
          await this.indexDocument(id);
        } catch (error) {
          console.error(`[DocumentIndex] Failed to index narrative ${id}:`, error);
        }
      }
    } else {
      await db.query('TRUNCATE TABLE document_index');

      // Get all narrative IDs
      const result = await db.query(
        `SELECT DISTINCT narrative_id FROM narrative_versions`
      );

      for (const row of result.rows) {
        await this.indexDocument(row.narrative_id);
      }
    }

    console.log('[DocumentIndex] Index rebuilt successfully');
  }

  /**
   * Map database rows to ProjectSummary objects
   */
  private mapResults(rows: any[]): ProjectSummary[] {
    return rows.map(row => ({
      ...row,
      blockers: typeof row.blockers === 'string' ? JSON.parse(row.blockers) : row.blockers,
      next_milestones: typeof row.next_milestones === 'string' ? JSON.parse(row.next_milestones) : row.next_milestones,
      approvers: typeof row.approvers === 'string' ? JSON.parse(row.approvers) : row.approvers,
      last_indexed_at: new Date(row.last_indexed_at)
    }));
  }

  /**
   * Load mock data
   */
  loadMockData(data: ProjectSummary[]) {
    this.mockIndex.clear();
    data.forEach(summary => {
      this.mockIndex.set(summary.narrative_id, summary);
    });
    console.log(`[DocumentIndex] Loaded ${data.length} mock projects`);
  }
}

export default new DocumentIndexService();
