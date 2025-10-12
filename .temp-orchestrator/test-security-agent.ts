/**
 * Test Security Agent
 * Simple test to verify AgentSecurity detects vulnerabilities
 */

import { AgentSecurity } from './orchestrator/agents/agent-security';
import { AgentType, AgentTask, AgentStatus, PhaseNumber } from './models/orchestrator.model';

async function testSecurityAgent() {
  console.log('=== Testing Security Agent ===\n');

  // Create Security Agent instance
  const securityAgent = new AgentSecurity();

  console.log(`Agent Type: ${securityAgent.getType()}`);
  console.log(`Agent Name: ${securityAgent.getName()}`);
  console.log(`Agent Description: ${securityAgent.getDescription()}\n`);

  // Test capabilities
  console.log('Phase 4 Capabilities:');
  const capabilities = securityAgent.getCapabilities(PhaseNumber.PHASE_4);
  capabilities.forEach(cap => console.log(`  - ${cap}`));
  console.log();

  // Create a mock task (engineering design with vulnerability)
  const mockTask: AgentTask = {
    id: 'TASK-SEC-001',
    agentType: AgentType.SECURITY,
    phase: PhaseNumber.PHASE_4,
    milestone: 'engineering-design-security-scan',
    description: 'Scan engineering design for security vulnerabilities',
    priority: 1,
    createdAt: new Date(),
    status: AgentStatus.WAITING
  };

  console.log('Task Details:');
  console.log(`  ID: ${mockTask.id}`);
  console.log(`  Description: ${mockTask.description}`);
  console.log(`  Phase: ${mockTask.phase}`);
  console.log();

  // Check if agent can handle the task
  const canHandle = securityAgent.canHandleTask(mockTask);
  console.log(`Can handle task: ${canHandle}\n`);

  // Estimate task duration
  const estimatedDuration = securityAgent.estimateTaskDuration(mockTask);
  console.log(`Estimated duration: ${estimatedDuration}ms (${estimatedDuration / 1000}s)\n`);

  // Execute the task
  console.log('Executing security scan...\n');
  const startTime = Date.now();

  try {
    const result = await securityAgent.executeTask(mockTask);
    const duration = Date.now() - startTime;

    console.log('=== Scan Results ===');
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Output: ${result.output}`);

    if (result.error) {
      console.log(`\nError: ${result.error}`);
    }

    if (result.metadata) {
      console.log('\nMetadata:');
      console.log(JSON.stringify(result.metadata, null, 2));
    }

    if (!result.success && result.metadata?.conflictType === 'security_vulnerability') {
      console.log('\n🔴 CONFLICT DETECTED - Workflow should pause');
      const vulnerabilities = result.metadata.vulnerabilities as any[];
      console.log(`\nVulnerabilities Found: ${vulnerabilities.length}`);
      vulnerabilities.forEach((vuln, index) => {
        console.log(`\n${index + 1}. ${vuln.title} [${vuln.severity.toUpperCase()}]`);
        console.log(`   ID: ${vuln.id}`);
        console.log(`   Category: ${vuln.category}`);
        console.log(`   Description: ${vuln.description}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
        console.log(`   Requires Human Input: ${vuln.requiresHumanInput}`);
      });
    } else {
      console.log('\n✅ No vulnerabilities detected - Workflow can continue');
    }

  } catch (error) {
    console.error('Error executing task:', error);
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testSecurityAgent().catch(console.error);
