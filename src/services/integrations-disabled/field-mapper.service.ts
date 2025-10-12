/**
 * Field Mapper Service
 * Handles field mapping and data transformation between Jira and BRDs
 */

import { Pool } from 'pg';
import {
  FieldMapping,
  SyncDirection,
  JiraEpic,
  BRDSyncData,
  BRD_TO_JIRA_STATUS_MAP,
  JIRA_TO_BRD_STATUS_MAP,
} from '../../models/sync.model';
import { BRD } from '../../models/brd.model';

export class FieldMapperService {
  private pool: Pool;
  private fieldMappingsCache: Map<string, FieldMapping[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get all active field mappings for a direction
   */
  async getFieldMappings(direction: SyncDirection): Promise<FieldMapping[]> {
    const cacheKey = direction;
    const cached = this.fieldMappingsCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const query = `
      SELECT * FROM field_mappings
      WHERE active = true
        AND (direction = $1 OR direction = 'bidirectional')
      ORDER BY required DESC, source_field ASC
    `;

    const result = await this.pool.query(query, [direction]);
    const mappings: FieldMapping[] = result.rows.map(this.mapRowToFieldMapping);

    this.fieldMappingsCache.set(cacheKey, mappings);
    setTimeout(() => this.fieldMappingsCache.delete(cacheKey), this.cacheExpiry);

    return mappings;
  }

  /**
   * Map BRD to Jira Epic format
   */
  async mapBRDToJira(brd: BRD): Promise<Partial<JiraEpic>> {
    const mappings = await this.getFieldMappings(SyncDirection.BRD_TO_JIRA);
    const jiraData: Partial<JiraEpic> = {};

    for (const mapping of mappings) {
      const sourceValue = this.getNestedValue(brd, mapping.sourceField);

      if (sourceValue === undefined && !mapping.defaultValue) {
        continue;
      }

      const value = sourceValue ?? mapping.defaultValue;
      const transformedValue = mapping.transformFunction
        ? await this.applyTransform(mapping.transformFunction, value, 'brd_to_jira')
        : value;

      if (mapping.isCustomField && mapping.jiraFieldId) {
        if (!jiraData.customFields) {
          jiraData.customFields = {};
        }
        jiraData.customFields[mapping.jiraFieldId] = transformedValue;
      } else {
        this.setNestedValue(jiraData, mapping.targetField, transformedValue);
      }
    }

    // Ensure required fields
    if (!jiraData.summary && brd.title) {
      jiraData.summary = brd.title;
    }

    if (!jiraData.description && brd.problemStatement) {
      jiraData.description = this.formatBRDForJira(brd);
    }

    // Map status
    if (brd.status && BRD_TO_JIRA_STATUS_MAP[brd.status]) {
      jiraData.status = BRD_TO_JIRA_STATUS_MAP[brd.status];
    }

    return jiraData;
  }

  /**
   * Map Jira Epic to BRD format
   */
  async mapJiraToBRD(epic: JiraEpic): Promise<Partial<BRDSyncData>> {
    const mappings = await this.getFieldMappings(SyncDirection.JIRA_TO_BRD);
    const brdData: Partial<BRDSyncData> = {};

    for (const mapping of mappings) {
      let sourceValue: any;

      if (mapping.isCustomField && mapping.jiraFieldId && epic.customFields) {
        sourceValue = epic.customFields[mapping.jiraFieldId];
      } else {
        sourceValue = this.getNestedValue(epic, mapping.sourceField);
      }

      if (sourceValue === undefined && !mapping.defaultValue) {
        continue;
      }

      const value = sourceValue ?? mapping.defaultValue;
      const transformedValue = mapping.transformFunction
        ? await this.applyTransform(mapping.transformFunction, value, 'jira_to_brd')
        : value;

      this.setNestedValue(brdData, mapping.targetField, transformedValue);
    }

    // Ensure required fields
    if (!brdData.title && epic.summary) {
      brdData.title = epic.summary;
    }

    if (!brdData.problemStatement && epic.description) {
      brdData.problemStatement = this.parseProblemStatement(epic.description);
    }

    // Map status
    if (epic.status && JIRA_TO_BRD_STATUS_MAP[epic.status]) {
      brdData.status = JIRA_TO_BRD_STATUS_MAP[epic.status];
    }

    // Parse dates
    if (epic.created) {
      brdData.createdAt = new Date(epic.created);
    }
    if (epic.updated) {
      brdData.updatedAt = new Date(epic.updated);
    }

    return brdData;
  }

  /**
   * Format BRD data for Jira description
   */
  private formatBRDForJira(brd: BRD): string {
    const sections: string[] = [];

    sections.push(`h2. Problem Statement`);
    sections.push(brd.problemStatement);

    if (brd.businessImpact) {
      sections.push(`\nh2. Business Impact`);
      sections.push(brd.businessImpact);
    }

    if (brd.successCriteria && brd.successCriteria.length > 0) {
      sections.push(`\nh2. Success Criteria`);
      brd.successCriteria.forEach((criterion, idx) => {
        sections.push(`${idx + 1}. ${criterion}`);
      });
    }

    if (brd.timeline) {
      sections.push(`\nh2. Timeline`);
      sections.push(`Start Date: ${new Date(brd.timeline.startDate).toLocaleDateString()}`);
      sections.push(`Target Date: ${new Date(brd.timeline.targetDate).toLocaleDateString()}`);
    }

    if (brd.budget) {
      sections.push(`\nh2. Budget`);
      sections.push(`$${brd.budget.toLocaleString()}`);
    }

    if (brd.stakeholders && brd.stakeholders.length > 0) {
      sections.push(`\nh2. Stakeholders`);
      brd.stakeholders.forEach(sh => {
        sections.push(`* ${sh.name} (${sh.role}) - ${sh.email}`);
      });
    }

    sections.push(`\n---`);
    sections.push(`_Synced from Project Conductor BRD [${brd.id}]_`);

    return sections.join('\n');
  }

  /**
   * Parse problem statement from Jira description
   */
  private parseProblemStatement(description: string): string {
    // Try to extract the problem statement section
    const problemMatch = description.match(/h2\.\s*Problem Statement\s*([\s\S]*?)(?:\nh2\.|$)/i);

    if (problemMatch && problemMatch[1]) {
      return problemMatch[1].trim();
    }

    // If no section found, return first paragraph
    const firstParagraph = description.split('\n\n')[0];
    return firstParagraph.trim();
  }

  /**
   * Apply transformation function to value
   */
  private async applyTransform(
    functionName: string,
    value: any,
    direction: 'brd_to_jira' | 'jira_to_brd'
  ): Promise<any> {
    switch (functionName) {
      case 'mapBRDStatusToJira':
        return direction === 'brd_to_jira'
          ? BRD_TO_JIRA_STATUS_MAP[value] || value
          : JIRA_TO_BRD_STATUS_MAP[value] || value;

      case 'budgetToStoryPoints':
        // Convert budget to story points (very approximate)
        // $10k = 1 story point, max 100 points
        if (direction === 'brd_to_jira' && typeof value === 'number') {
          return Math.min(Math.round(value / 10000), 100);
        }
        return value;

      case 'storyPointsToBudget':
        // Convert story points back to budget
        if (direction === 'jira_to_brd' && typeof value === 'number') {
          return value * 10000;
        }
        return value;

      case 'userIdToJiraAccountId':
        // Would lookup Jira account ID from user ID
        // For now, return as-is
        return value;

      case 'jiraAccountIdToUserId':
        // Would lookup user ID from Jira account ID
        // For now, return as-is
        return value;

      case 'arrayToCommaSeparated':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value;

      case 'commaSeparatedToArray':
        if (typeof value === 'string') {
          return value.split(',').map(s => s.trim()).filter(Boolean);
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Get nested property value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Set nested property value on object
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();

    if (!lastKey) {
      return;
    }

    let current = obj;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  /**
   * Map database row to FieldMapping
   */
  private mapRowToFieldMapping(row: any): FieldMapping {
    return {
      id: row.id,
      sourceField: row.source_field,
      targetField: row.target_field,
      direction: row.direction as SyncDirection,
      transformFunction: row.transform_function,
      isCustomField: row.is_custom_field,
      jiraFieldId: row.jira_field_id,
      defaultValue: row.default_value,
      required: row.required,
      active: row.active,
    };
  }

  /**
   * Create a new field mapping
   */
  async createFieldMapping(mapping: Omit<FieldMapping, 'id'>): Promise<FieldMapping> {
    const id = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const query = `
      INSERT INTO field_mappings (
        id, source_field, target_field, direction, transform_function,
        is_custom_field, jira_field_id, default_value, required, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      mapping.sourceField,
      mapping.targetField,
      mapping.direction,
      mapping.transformFunction,
      mapping.isCustomField,
      mapping.jiraFieldId,
      mapping.defaultValue ? JSON.stringify(mapping.defaultValue) : null,
      mapping.required,
      mapping.active,
    ];

    const result = await this.pool.query(query, values);

    // Clear cache
    this.fieldMappingsCache.clear();

    return this.mapRowToFieldMapping(result.rows[0]);
  }

  /**
   * Update a field mapping
   */
  async updateFieldMapping(
    id: string,
    updates: Partial<Omit<FieldMapping, 'id'>>
  ): Promise<FieldMapping> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.sourceField !== undefined) {
      setClauses.push(`source_field = $${paramIndex++}`);
      values.push(updates.sourceField);
    }
    if (updates.targetField !== undefined) {
      setClauses.push(`target_field = $${paramIndex++}`);
      values.push(updates.targetField);
    }
    if (updates.direction !== undefined) {
      setClauses.push(`direction = $${paramIndex++}`);
      values.push(updates.direction);
    }
    if (updates.transformFunction !== undefined) {
      setClauses.push(`transform_function = $${paramIndex++}`);
      values.push(updates.transformFunction);
    }
    if (updates.isCustomField !== undefined) {
      setClauses.push(`is_custom_field = $${paramIndex++}`);
      values.push(updates.isCustomField);
    }
    if (updates.jiraFieldId !== undefined) {
      setClauses.push(`jira_field_id = $${paramIndex++}`);
      values.push(updates.jiraFieldId);
    }
    if (updates.defaultValue !== undefined) {
      setClauses.push(`default_value = $${paramIndex++}`);
      values.push(JSON.stringify(updates.defaultValue));
    }
    if (updates.required !== undefined) {
      setClauses.push(`required = $${paramIndex++}`);
      values.push(updates.required);
    }
    if (updates.active !== undefined) {
      setClauses.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE field_mappings
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Field mapping not found: ${id}`);
    }

    // Clear cache
    this.fieldMappingsCache.clear();

    return this.mapRowToFieldMapping(result.rows[0]);
  }

  /**
   * Delete a field mapping
   */
  async deleteFieldMapping(id: string): Promise<void> {
    const query = 'DELETE FROM field_mappings WHERE id = $1';
    await this.pool.query(query, [id]);

    // Clear cache
    this.fieldMappingsCache.clear();
  }

  /**
   * Get all field mappings (for admin purposes)
   */
  async getAllFieldMappings(): Promise<FieldMapping[]> {
    const query = 'SELECT * FROM field_mappings ORDER BY source_field ASC';
    const result = await this.pool.query(query);
    return result.rows.map(this.mapRowToFieldMapping);
  }

  /**
   * Clear field mappings cache
   */
  clearCache(): void {
    this.fieldMappingsCache.clear();
  }
}
