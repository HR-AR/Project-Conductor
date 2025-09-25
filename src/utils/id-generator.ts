/**
 * Unique ID Generator Utility
 * Generates requirement IDs in format: REQ-YYYYMMDD-XXXX
 */

export interface IdGeneratorOptions {
  prefix?: string;
  dateFormat?: 'YYYYMMDD' | 'YYMMDD';
  counterLength?: number;
}

class IdGenerator {
  private static counters = new Map<string, number>();

  /**
   * Generate a unique requirement ID
   * @param options Configuration options for ID generation
   * @returns Generated ID in format REQ-YYYYMMDD-XXXX
   */
  static generateRequirementId(options: IdGeneratorOptions = {}): string {
    const {
      prefix = 'REQ',
      dateFormat = 'YYYYMMDD',
      counterLength = 4
    } = options;

    const now = new Date();
    const dateKey = this.formatDate(now, dateFormat);
    const fullDateKey = `${prefix}-${dateKey}`;

    // Get and increment counter for this date
    const currentCounter = this.counters.get(fullDateKey) || 0;
    const nextCounter = currentCounter + 1;
    this.counters.set(fullDateKey, nextCounter);

    // Format counter with leading zeros
    const counterStr = nextCounter.toString().padStart(counterLength, '0');

    return `${prefix}-${dateKey}-${counterStr}`;
  }

  /**
   * Generate a unique workflow execution ID
   * @param options Configuration options for ID generation
   * @returns Generated ID in format WF-YYYYMMDD-XXXX
   */
  static generateWorkflowId(options: IdGeneratorOptions = {}): string {
    return this.generateRequirementId({
      ...options,
      prefix: 'WF'
    });
  }

  /**
   * Generate a unique user session ID
   * @param options Configuration options for ID generation
   * @returns Generated ID in format SES-YYYYMMDD-XXXX
   */
  static generateSessionId(options: IdGeneratorOptions = {}): string {
    return this.generateRequirementId({
      ...options,
      prefix: 'SES'
    });
  }

  /**
   * Generate a unique audit log ID
   * @param options Configuration options for ID generation
   * @returns Generated ID in format AUD-YYYYMMDD-XXXX
   */
  static generateAuditId(options: IdGeneratorOptions = {}): string {
    return this.generateRequirementId({
      ...options,
      prefix: 'AUD'
    });
  }

  /**
   * Format date according to specified format
   * @private
   */
  private static formatDate(date: Date, format: 'YYYYMMDD' | 'YYMMDD'): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    switch (format) {
      case 'YYYYMMDD':
        return `${year}${month}${day}`;
      case 'YYMMDD':
        return `${year.toString().slice(-2)}${month}${day}`;
      default:
        return `${year}${month}${day}`;
    }
  }

  /**
   * Reset counters (useful for testing)
   */
  static resetCounters(): void {
    this.counters.clear();
  }

  /**
   * Get current counter for a specific date key
   */
  static getCurrentCounter(prefix: string = 'REQ', dateFormat: 'YYYYMMDD' | 'YYMMDD' = 'YYYYMMDD'): number {
    const now = new Date();
    const dateKey = this.formatDate(now, dateFormat);
    const fullDateKey = `${prefix}-${dateKey}`;
    return this.counters.get(fullDateKey) || 0;
  }

  /**
   * Validate ID format
   * @param id The ID to validate
   * @param expectedPrefix Expected prefix (optional)
   * @returns true if valid format
   */
  static validateIdFormat(id: string, expectedPrefix?: string): boolean {
    // Basic pattern: PREFIX-YYYYMMDD-XXXX or PREFIX-YYMMDD-XXXX
    const pattern = expectedPrefix
      ? new RegExp(`^${expectedPrefix}-\\d{6,8}-\\d{4}$`)
      : /^[A-Z]{2,4}-\d{6,8}-\d{4}$/;

    return pattern.test(id);
  }

  /**
   * Parse ID components
   * @param id The ID to parse
   * @returns Parsed components or null if invalid
   */
  static parseId(id: string): { prefix: string; date: string; counter: string } | null {
    const parts = id.split('-');
    if (parts.length !== 3) {
      return null;
    }

    const [prefix, date, counter] = parts;

    // Validate date format (6 or 8 digits)
    if (!date || !/^\d{6}$|^\d{8}$/.test(date)) {
      return null;
    }

    // Validate counter format (4 digits)
    if (!counter || !/^\d{4}$/.test(counter)) {
      return null;
    }

    return { prefix: prefix || '', date, counter };
  }

  /**
   * Generate multiple IDs at once
   * @param count Number of IDs to generate
   * @param options Configuration options
   * @returns Array of generated IDs
   */
  static generateBatch(count: number, options: IdGeneratorOptions = {}): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generateRequirementId(options));
    }
    return ids;
  }
}

// Export convenience functions
export const generateUniqueId = (prefix: string = 'REQ') => IdGenerator.generateRequirementId({ prefix });
export const generateRequirementId = (prefix: string = 'REQ') => IdGenerator.generateRequirementId({ prefix });

export default IdGenerator;