import { NarrativeVersion } from '../models/narrative.model';
import { db } from '../config/database';

export class NarrativeVersionsService {
  private useMock = process.env.USE_MOCK_DB !== 'false';
  private mockVersions: NarrativeVersion[] = [];

  /**
   * Create new version
   */
  async create(params: {
    narrative_id: number;
    content: string;
    author_id: number;
    change_reason?: string;
    is_auto_generated?: boolean;
  }): Promise<NarrativeVersion> {
    if (this.useMock) {
      const version = this.mockVersions.filter(v => v.narrative_id === params.narrative_id).length + 1;
      const newVersion: NarrativeVersion = {
        id: this.mockVersions.length + 1,
        narrative_id: params.narrative_id,
        version,
        content: params.content,
        author_id: params.author_id,
        change_reason: params.change_reason,
        is_auto_generated: params.is_auto_generated || false,
        created_at: new Date()
      };
      this.mockVersions.push(newVersion);
      return newVersion;
    }

    const result = await db.query(
      `INSERT INTO narrative_versions
       (narrative_id, version, content, author_id, change_reason, is_auto_generated)
       VALUES ($1,
         (SELECT COALESCE(MAX(version), 0) + 1 FROM narrative_versions WHERE narrative_id = $1),
         $2, $3, $4, $5)
       RETURNING *`,
      [params.narrative_id, params.content, params.author_id, params.change_reason, params.is_auto_generated || false]
    );

    return result.rows[0];
  }

  /**
   * Get latest version
   */
  async getLatest(narrative_id: number): Promise<NarrativeVersion | undefined> {
    if (this.useMock) {
      const versions = this.mockVersions
        .filter(v => v.narrative_id === narrative_id)
        .sort((a, b) => b.version - a.version);
      return versions[0];
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [narrative_id]
    );

    return result.rows[0];
  }

  /**
   * Get specific version
   */
  async getVersion(narrative_id: number, version: number): Promise<NarrativeVersion | undefined> {
    if (this.useMock) {
      return this.mockVersions.find(
        v => v.narrative_id === narrative_id && v.version === version
      );
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1 AND version = $2`,
      [narrative_id, version]
    );

    return result.rows[0];
  }

  /**
   * List all versions
   */
  async listVersions(narrative_id: number): Promise<NarrativeVersion[]> {
    if (this.useMock) {
      return this.mockVersions
        .filter(v => v.narrative_id === narrative_id)
        .sort((a, b) => b.version - a.version);
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1
       ORDER BY version DESC`,
      [narrative_id]
    );

    return result.rows;
  }

  /**
   * Load mock data
   */
  loadMockData(versions: NarrativeVersion[]) {
    this.mockVersions = versions;
  }
}

export default new NarrativeVersionsService();
