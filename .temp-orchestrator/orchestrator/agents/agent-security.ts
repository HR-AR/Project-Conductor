/**
 * Agent Security
 * Autonomous agent for security vulnerability detection and conflict generation
 *
 * This agent scans engineering design documents for security vulnerabilities and
 * triggers workflow pauses when critical issues are detected. It's a key component
 * of the "Killer Demo" story showing intelligent orchestration.
 */

import { BaseAgent } from './base-agent';
import {
  AgentType,
  AgentTask,
  AgentTaskResult,
  PhaseNumber
} from '../../models/orchestrator.model';

/**
 * Security vulnerability definition
 */
interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  pattern: RegExp;
  recommendation: string;
  category: 'crypto' | 'authentication' | 'injection' | 'validation' | 'configuration' | 'data-exposure';
  affectedModule: string;
  requiresHumanInput: boolean;
}

/**
 * Security scan result
 */
interface SecurityScanResult {
  hasVulnerabilities: boolean;
  vulnerabilities: SecurityVulnerability[];
  scannedContent: string;
  scanDuration: number;
}

export class AgentSecurity extends BaseAgent {
  // Hardcoded vulnerability patterns for demo purposes
  private readonly vulnerabilityPatterns: Omit<SecurityVulnerability, 'affectedModule'>[] = [
    {
      id: 'VULN-001',
      severity: 'high',
      title: 'Deprecated Crypto Library',
      description: 'Use of deprecated crypto library (crypto-js < 4.0) that has known security vulnerabilities',
      pattern: /crypto[-_]?js\s*[<<=]\s*[0-3]\.\d+|deprecated\s+crypto|old\s+crypto\s+library/i,
      recommendation: 'Upgrade to crypto-js 4.0+ or use Node.js built-in crypto module for better security',
      category: 'crypto',
      requiresHumanInput: true
    },
    {
      id: 'VULN-002',
      severity: 'critical',
      title: 'Hardcoded API Credentials',
      description: 'Hardcoded API credentials in environment variables without proper secret management',
      pattern: /\.env\s+files?|store\s+(api\s*keys?|credentials?|secrets?|passwords?)\s+in\s+\.env|hardcoded\s+(api\s*keys?|credentials?|secrets?|passwords?)/i,
      recommendation: 'Use a secret management service like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault for storing sensitive credentials',
      category: 'authentication',
      requiresHumanInput: true
    },
    {
      id: 'VULN-003',
      severity: 'critical',
      title: 'SQL Injection Vulnerability',
      description: 'SQL injection vulnerability in user input handling - direct string concatenation in SQL queries',
      pattern: /sql\s+injection|string\s+concatenation\s+(in|for)\s+sql|raw\s+sql\s+queries?|unsafe\s+sql/i,
      recommendation: 'Use parameterized queries or prepared statements for all database operations. Never concatenate user input into SQL queries',
      category: 'injection',
      requiresHumanInput: true
    },
    {
      id: 'VULN-004',
      severity: 'high',
      title: 'Missing Input Validation',
      description: 'Missing input validation on public endpoints exposes application to malicious input',
      pattern: /missing\s+validation|no\s+input\s+validation|without\s+validation|unvalidated\s+input/i,
      recommendation: 'Implement comprehensive input validation using libraries like Joi, express-validator, or Zod. Validate all user inputs at API boundaries',
      category: 'validation',
      requiresHumanInput: true
    },
    {
      id: 'VULN-005',
      severity: 'medium',
      title: 'Weak Password Policy',
      description: 'Weak password policy that does not enforce sufficient complexity requirements',
      pattern: /weak\s+password|simple\s+password\s+policy|no\s+password\s+requirements?/i,
      recommendation: 'Enforce strong password policy: minimum 12 characters, mix of uppercase, lowercase, numbers, and special characters',
      category: 'authentication',
      requiresHumanInput: false
    },
    {
      id: 'VULN-006',
      severity: 'high',
      title: 'Insecure Direct Object Reference',
      description: 'Insecure direct object reference (IDOR) allows unauthorized access to resources',
      pattern: /idor|insecure\s+direct\s+object|unauthorized\s+access\s+to\s+resources?/i,
      recommendation: 'Implement proper authorization checks for all resource access. Verify user permissions before granting access',
      category: 'authentication',
      requiresHumanInput: true
    },
    {
      id: 'VULN-007',
      severity: 'critical',
      title: 'Cross-Site Scripting (XSS)',
      description: 'Cross-site scripting vulnerability allows injection of malicious scripts',
      pattern: /xss|cross[-\s]site\s+scripting|unescaped\s+html|dangerouslySetInnerHTML/i,
      recommendation: 'Sanitize all user input before rendering. Use Content Security Policy (CSP) headers and escape HTML entities',
      category: 'injection',
      requiresHumanInput: true
    },
    {
      id: 'VULN-008',
      severity: 'high',
      title: 'Sensitive Data Exposure',
      description: 'Sensitive data exposed in logs, error messages, or API responses',
      pattern: /logging\s+(passwords?|secrets?|tokens?|credentials?)|exposing\s+sensitive|sensitive\s+data\s+in\s+(logs?|errors?)/i,
      recommendation: 'Never log sensitive data. Implement data masking and use generic error messages for public APIs',
      category: 'data-exposure',
      requiresHumanInput: true
    },
    {
      id: 'VULN-009',
      severity: 'medium',
      title: 'Insecure Deserialization',
      description: 'Insecure deserialization can lead to remote code execution',
      pattern: /insecure\s+deserialization|unsafe\s+deserialization|eval\s*\(|JSON\.parse\s+untrusted/i,
      recommendation: 'Validate and sanitize all serialized data before deserialization. Use safe parsing methods and type checking',
      category: 'injection',
      requiresHumanInput: true
    },
    {
      id: 'VULN-010',
      severity: 'medium',
      title: 'Insufficient Logging',
      description: 'Insufficient security logging and monitoring prevents detection of attacks',
      pattern: /no\s+logging|insufficient\s+logging|missing\s+audit\s+trail/i,
      recommendation: 'Implement comprehensive security logging for authentication, authorization, and sensitive operations',
      category: 'configuration',
      requiresHumanInput: false
    }
  ];

  constructor() {
    super(
      AgentType.SECURITY,
      'Security Agent',
      'Detects security vulnerabilities in engineering designs and triggers conflict resolution workflows'
    );
  }

  protected async performTask(task: AgentTask): Promise<AgentTaskResult> {
    this.validateTask(task);

    const filesCreated: string[] = [];
    const filesModified: string[] = [];

    this.log('info', `Performing Security task: ${task.milestone}`);
    this.log('info', `Scanning for security vulnerabilities in engineering design...`);

    // Simulate scanning engineering design document
    const scanResult = await this.scanForVulnerabilities(task);

    if (scanResult.hasVulnerabilities) {
      this.log('warn', `Security scan detected ${scanResult.vulnerabilities.length} vulnerability(ies)`);

      // Return CONFLICT status to trigger workflow pause
      return this.createResult(false, {
        output: `Security vulnerabilities detected: ${scanResult.vulnerabilities.length} issue(s) found`,
        error: 'SECURITY_CONFLICT',
        metadata: {
          scanResult,
          conflictType: 'security_vulnerability',
          requiresResolution: true,
          vulnerabilities: scanResult.vulnerabilities.map(v => ({
            id: v.id,
            severity: v.severity,
            title: v.title,
            description: v.description,
            recommendation: v.recommendation,
            category: v.category,
            affectedModule: v.affectedModule,
            requiresHumanInput: v.requiresHumanInput
          }))
        }
      });
    }

    this.log('info', 'Security scan completed - no vulnerabilities detected');

    return this.createResult(true, {
      output: `Security scan completed successfully - no vulnerabilities detected`,
      filesCreated,
      filesModified,
      metadata: {
        scanResult,
        scannedAt: new Date().toISOString(),
        vulnerabilitiesDetected: 0
      }
    });
  }

  /**
   * Scan engineering design content for security vulnerabilities
   */
  private async scanForVulnerabilities(task: AgentTask): Promise<SecurityScanResult> {
    const startTime = Date.now();

    // Simulate reading engineering design document
    // In real implementation, this would read from database or file system
    const engineeringDesignContent = this.getMockEngineeringDesign(task);

    const detectedVulnerabilities: SecurityVulnerability[] = [];

    // Scan content against each vulnerability pattern
    for (const pattern of this.vulnerabilityPatterns) {
      if (pattern.pattern.test(engineeringDesignContent)) {
        detectedVulnerabilities.push({
          ...pattern,
          affectedModule: this.extractAffectedModule(task, engineeringDesignContent)
        });

        this.log('warn', `Detected: ${pattern.title} (${pattern.severity})`);
      }
    }

    // Simulate realistic scanning delay
    await this.sleep(800);

    const scanDuration = Date.now() - startTime;

    return {
      hasVulnerabilities: detectedVulnerabilities.length > 0,
      vulnerabilities: detectedVulnerabilities,
      scannedContent: engineeringDesignContent,
      scanDuration
    };
  }

  /**
   * Get mock engineering design content
   * In real implementation, this would read from database or file system
   */
  private getMockEngineeringDesign(task: AgentTask): string {
    // Mock engineering design content with intentional vulnerability
    // This ensures the demo reliably triggers a conflict
    return `
# Engineering Design Document

## Authentication System

### API Key Storage
We will store API keys in .env files for configuration. This provides easy access
for developers and allows environment-specific configuration.

### Database Access
User authentication will be handled through parameterized queries to prevent
SQL injection attacks.

### Password Policy
Implement standard password requirements with minimum 8 characters.

### Input Validation
All public endpoints will have comprehensive input validation using express-validator.

### Logging
Implement security event logging for all authentication attempts.

### Session Management
Use JWT tokens with secure httpOnly cookies.
    `.trim();
  }

  /**
   * Extract affected module from task or content
   */
  private extractAffectedModule(task: AgentTask, content: string): string {
    // Try to extract module from task description
    if (task.description.toLowerCase().includes('authentication')) {
      return 'authentication';
    }
    if (task.description.toLowerCase().includes('api')) {
      return 'api';
    }
    if (task.description.toLowerCase().includes('database')) {
      return 'database';
    }

    // Try to extract from content
    if (content.toLowerCase().includes('authentication')) {
      return 'authentication';
    }
    if (content.toLowerCase().includes('api')) {
      return 'api';
    }

    return 'engineering-design';
  }

  /**
   * Get agent capabilities for a specific phase
   */
  getCapabilities(phase: PhaseNumber): string[] {
    const capabilities: Record<PhaseNumber, string[]> = {
      [PhaseNumber.PHASE_0]: [],
      [PhaseNumber.PHASE_1]: [],
      [PhaseNumber.PHASE_2]: [],
      [PhaseNumber.PHASE_3]: [
        'Basic security validation',
        'Comment content scanning'
      ],
      [PhaseNumber.PHASE_4]: [
        'Security vulnerability detection',
        'Engineering design security analysis',
        'Cryptographic weakness detection',
        'Authentication flaw detection',
        'SQL injection vulnerability detection',
        'Input validation gap analysis',
        'Configuration security review',
        'Data exposure risk assessment',
        'Conflict generation for security issues',
        'Workflow pause triggering',
        'Security recommendation generation'
      ],
      [PhaseNumber.PHASE_5]: [
        'Integration security validation',
        'External system security compliance',
        'API security verification'
      ]
    };

    return capabilities[phase] || [];
  }

  /**
   * Check if agent can handle a specific task
   */
  canHandleTask(task: AgentTask): boolean {
    return (
      task.agentType === AgentType.SECURITY &&
      (task.description.toLowerCase().includes('security') ||
        task.description.toLowerCase().includes('vulnerability') ||
        task.description.toLowerCase().includes('scan') ||
        task.description.toLowerCase().includes('engineering design'))
    );
  }

  /**
   * Estimate task duration in milliseconds
   */
  estimateTaskDuration(task: AgentTask): number {
    // Security scanning requires analysis time
    const baseTime = 30000; // 30 seconds
    const phaseMultipliers: Record<PhaseNumber, number> = {
      [PhaseNumber.PHASE_0]: 0.2,
      [PhaseNumber.PHASE_1]: 0.3,
      [PhaseNumber.PHASE_2]: 0.4,
      [PhaseNumber.PHASE_3]: 0.6,
      [PhaseNumber.PHASE_4]: 2.0, // Main phase for security scanning
      [PhaseNumber.PHASE_5]: 0.8
    };

    return baseTime * (phaseMultipliers[task.phase] || 1.0);
  }

  /**
   * Get agent dependencies
   * Security agent depends on Models and API agents
   */
  override getDependencies(): AgentType[] {
    return [AgentType.MODELS, AgentType.API];
  }

  /**
   * Check if agent is ready to execute
   * Security scanning requires engineering design to be complete
   */
  override async isReady(): Promise<boolean> {
    // In real implementation, check if engineering design document exists
    return true;
  }
}
