#!/usr/bin/env node

/**
 * Conductor CLI
 * Command-line interface for orchestrator control
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const CONDUCTOR_DIR = path.join(process.cwd(), '.conductor');
const STATE_FILE = path.join(CONDUCTOR_DIR, 'state.json');
const DASHBOARD_FILE = path.join(CONDUCTOR_DIR, 'dashboard.md');

const COMMANDS = {
  status: 'Show current phase and progress',
  test: 'Run current phase test suite',
  advance: 'Move to next phase (if tests pass)',
  rollback: 'Return to previous phase',
  deploy: 'Trigger specific sub-agent',
  report: 'Generate progress report',
  dashboard: 'Show dashboard',
  help: 'Show this help message'
};

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;

      case 'test':
        await runTests();
        break;

      case 'advance':
        await advancePhase();
        break;

      case 'rollback':
        await rollbackPhase();
        break;

      case 'deploy':
        await deployAgent(args[0]);
        break;

      case 'report':
        await generateReport();
        break;

      case 'dashboard':
        await showDashboard();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log('');
  console.log('🎭 Project Conductor - Orchestration CLI');
  console.log('');
  console.log('Usage: npm run conductor:<command> [args]');
  console.log('');
  console.log('Commands:');

  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} - ${desc}`);
  }

  console.log('');
  console.log('Examples:');
  console.log('  npm run conductor:status');
  console.log('  npm run conductor:test');
  console.log('  npm run conductor:advance');
  console.log('  npm run conductor:deploy agent-api');
  console.log('');
}

async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      if (typeof value === 'object' && value !== null && '__type' in value && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  } catch (error) {
    throw new Error('Orchestrator not initialized. Please start the orchestrator first.');
  }
}

async function showStatus() {
  const state = await loadState();

  console.log('');
  console.log('🎭 Orchestrator Status');
  console.log('='.repeat(60));
  console.log('');

  const phaseNames = [
    'Initialization',
    'Core Requirements Engine',
    'Traceability Engine',
    'Real-time Collaboration',
    'Quality & Validation',
    'External Integrations'
  ];

  console.log(`Current Phase: ${state.currentPhase} - ${phaseNames[state.currentPhase]}`);
  console.log(`Completed Phases: [${state.completedPhases.join(', ')}]`);
  console.log(`Active Agents: [${state.activeAgents.join(', ')}]`);
  console.log('');

  // Show milestones for current phase
  const currentPhaseMilestones = Object.values(state.milestones)
    .filter(m => m.id.startsWith(`phase-${state.currentPhase}-`));

  if (currentPhaseMilestones.length > 0) {
    console.log('Milestones:');
    for (const milestone of currentPhaseMilestones) {
      const statusEmoji = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌'
      };

      console.log(`  ${statusEmoji[milestone.status]} ${milestone.name}`);
    }
    console.log('');
  }

  // Show task summary
  const tasks = state.tasks || [];
  const completed = tasks.filter(t => t.status === 'completed').length;
  const active = tasks.filter(t => t.status === 'active').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const waiting = tasks.filter(t => t.status === 'waiting').length;

  console.log('Tasks:');
  console.log(`  Completed: ${completed}`);
  console.log(`  Active: ${active}`);
  console.log(`  Waiting: ${waiting}`);
  console.log(`  Failed: ${failed}`);
  console.log('');

  console.log(`Started: ${state.startedAt.toLocaleString()}`);
  console.log(`Last Updated: ${state.lastUpdated.toLocaleString()}`);
  console.log('');
}

async function runTests() {
  const state = await loadState();

  const testCommands = [
    'jest',
    'npm test -- tests/integration/requirements.api.test.ts',
    'npm test -- tests/integration/traceability.api.test.ts',
    'npm test:presence',
    'npm test -- tests/integration/quality.api.test.ts',
    'npm test -- tests/e2e/integrations.test.ts'
  ];

  const testCommand = testCommands[state.currentPhase] || 'npm test';

  console.log('');
  console.log(`🧪 Running tests for Phase ${state.currentPhase}`);
  console.log(`Command: ${testCommand}`);
  console.log('');

  try {
    const { stdout, stderr } = await execAsync(testCommand);
    console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('');
    console.log('✅ Tests passed!');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Tests failed!');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

async function advancePhase() {
  const state = await loadState();

  if (state.currentPhase >= 5) {
    console.log('');
    console.log('🎉 Already at final phase (Phase 5)');
    console.log('');
    return;
  }

  console.log('');
  console.log(`⏩ Advancing from Phase ${state.currentPhase} to Phase ${state.currentPhase + 1}`);
  console.log('');

  // Note: In a real implementation, this would call the orchestrator API
  console.log('⚠️  Manual phase advancement not yet implemented.');
  console.log('Please use auto-advance mode or modify .conductor/state.json directly.');
  console.log('');
}

async function rollbackPhase() {
  const state = await loadState();

  if (state.currentPhase <= 0) {
    console.log('');
    console.log('⚠️  Already at Phase 0 - cannot rollback further');
    console.log('');
    return;
  }

  console.log('');
  console.log(`⏪ Rolling back from Phase ${state.currentPhase} to Phase ${state.currentPhase - 1}`);
  console.log('');

  // Note: In a real implementation, this would call the orchestrator API
  console.log('⚠️  Manual phase rollback not yet implemented.');
  console.log('Please modify .conductor/state.json directly.');
  console.log('');
}

async function deployAgent(agentType) {
  if (!agentType) {
    console.error('');
    console.error('❌ Agent type required');
    console.error('');
    console.error('Available agents:');
    console.error('  - agent-api');
    console.error('  - agent-models');
    console.error('  - agent-test');
    console.error('  - agent-realtime');
    console.error('  - agent-quality');
    console.error('  - agent-integration');
    console.error('');
    process.exit(1);
  }

  const validAgents = [
    'agent-api',
    'agent-models',
    'agent-test',
    'agent-realtime',
    'agent-quality',
    'agent-integration'
  ];

  if (!validAgents.includes(agentType)) {
    console.error('');
    console.error(`❌ Invalid agent type: ${agentType}`);
    console.error('');
    console.error('Available agents:', validAgents.join(', '));
    console.error('');
    process.exit(1);
  }

  console.log('');
  console.log(`🤖 Deploying ${agentType}`);
  console.log('');

  // Note: In a real implementation, this would call the orchestrator API
  console.log('⚠️  Manual agent deployment not yet implemented.');
  console.log('The orchestrator will automatically deploy agents based on pending tasks.');
  console.log('');
}

async function generateReport() {
  const state = await loadState();

  console.log('');
  console.log('📊 Orchestrator Report');
  console.log('='.repeat(60));
  console.log('');

  console.log(`Generated: ${new Date().toLocaleString()}`);
  console.log('');

  console.log('Current Status:');
  console.log(`  Phase: ${state.currentPhase}`);
  console.log(`  Completed Phases: ${state.completedPhases.length}/6`);
  console.log(`  Active Agents: ${state.activeAgents.length}`);
  console.log('');

  // Agent metrics
  console.log('Agent Metrics:');
  console.log('');

  for (const [agentType, metrics] of Object.entries(state.metrics || {})) {
    const successRate = (metrics.successRate * 100).toFixed(1);
    const avgTime = (metrics.averageCompletionTime / 1000).toFixed(1);

    console.log(`  ${agentType}:`);
    console.log(`    Completed: ${metrics.tasksCompleted}`);
    console.log(`    Failed: ${metrics.tasksFailed}`);
    console.log(`    Success Rate: ${successRate}%`);
    console.log(`    Avg. Time: ${avgTime}s`);
    console.log('');
  }

  // Recent errors
  if (state.errors && state.errors.length > 0) {
    console.log('Recent Errors:');
    console.log('');

    for (const error of state.errors.slice(-5)) {
      console.log(`  [${error.severity}] Phase ${error.phase}: ${error.error}`);
    }
    console.log('');
  }

  console.log(`Uptime: ${((Date.now() - new Date(state.startedAt).getTime()) / 1000 / 60).toFixed(1)} minutes`);
  console.log('');
}

async function showDashboard() {
  try {
    const dashboard = await fs.readFile(DASHBOARD_FILE, 'utf-8');
    console.log(dashboard);
  } catch (error) {
    console.error('');
    console.error('❌ Dashboard not found');
    console.error('The orchestrator may not have generated a dashboard yet.');
    console.log('');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
