/**
 * Orchestrator Demo
 * Demonstrates the autonomous orchestration system
 */

import { OrchestratorEngine } from '../src/orchestrator/orchestrator-engine';
import { DashboardGenerator } from '../src/orchestrator/dashboard-generator';
import { PhaseNumber } from '../src/models/orchestrator.model';

async function main() {
  console.log('🎭 Project Conductor - Orchestration Demo');
  console.log('==========================================\n');

  // Create orchestrator instance
  const orchestrator = new OrchestratorEngine();
  const dashboardGenerator = new DashboardGenerator();

  // Listen to orchestrator events
  orchestrator.on('started', () => {
    console.log('✅ Orchestrator started\n');
  });

  orchestrator.on('dashboard-update', async () => {
    console.log('📊 Dashboard updated');
    const data = await orchestrator.getDashboardData();
    await dashboardGenerator.generate(data);
  });

  orchestrator.on('error', (error) => {
    console.error('❌ Orchestrator error:', error);
  });

  try {
    // Start orchestrator
    console.log('Starting orchestrator...');
    await orchestrator.start();

    // Wait a bit for initial orchestration
    await sleep(2000);

    // Show initial status
    console.log('\n📋 Initial Status:');
    const initialStatus = await orchestrator.getStatus();
    console.log(JSON.stringify(initialStatus.data, null, 2));

    // Let orchestrator run for 10 seconds
    console.log('\n⏳ Running orchestration for 10 seconds...\n');
    await sleep(10000);

    // Generate report
    console.log('\n📊 Generating report...');
    const report = await orchestrator.generateReport();
    if (report.success) {
      console.log('\nReport:');
      console.log('-------');
      console.log(`Current Phase: ${(report.data as any).currentPhase.name}`);
      console.log(`Overall Progress: ${((report.data as any).overallProgress * 100).toFixed(1)}%`);
      console.log(`Completed Phases: ${(report.data as any).completedPhases.length}/6`);
      console.log('\nAgent Statistics:');

      for (const agent of (report.data as any).agents) {
        console.log(`  ${agent.type}:`);
        console.log(`    Active: ${agent.isActive}`);
        console.log(`    Completed: ${agent.metrics.tasksCompleted}`);
        console.log(`    Failed: ${agent.metrics.tasksFailed}`);
        console.log(`    Success Rate: ${(agent.metrics.successRate * 100).toFixed(1)}%`);
      }
    }

    // Show dashboard
    console.log('\n📈 Dashboard:');
    console.log('-------------');
    const dashboardData = await orchestrator.getDashboardData();
    console.log(`Phase: ${dashboardData.currentPhase.phase} - ${dashboardData.currentPhase.name}`);
    console.log(`Progress: ${(dashboardData.progress.phaseProgress * 100).toFixed(1)}%`);
    console.log(`Active Tasks: ${dashboardData.progress.activeTasks}`);
    console.log(`Completed Tasks: ${dashboardData.progress.completedTasks}`);

    // Stop orchestrator
    console.log('\n🛑 Stopping orchestrator...');
    await orchestrator.stop();

    console.log('\n✅ Demo completed!');
    console.log('\nCheck the following files:');
    console.log('  - .conductor/state.json - Current state');
    console.log('  - .conductor/progress.md - Progress log');
    console.log('  - .conductor/dashboard.md - Dashboard');
    console.log('  - .conductor/errors.log - Error log');
    console.log('  - .conductor/lessons.json - Lessons learned');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
