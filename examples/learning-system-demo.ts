/**
 * Self-Learning System Demo
 * Demonstrates the orchestrator's learning capabilities
 */

import { Pool } from 'pg';
import { LearningService } from '../src/services/orchestrator/learning.service';
import { AnalyticsService } from '../src/services/orchestrator/analytics.service';
import { OrchestratorEngineService } from '../src/services/orchestrator/orchestrator-engine.service';
import {
  AgentType,
  TaskType,
} from '../src/models/orchestrator-learning.model';

async function main() {
  console.log('🧠 Project Conductor - Self-Learning System Demo');
  console.log('==================================================\n');

  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'] || 'postgresql://localhost:5432/conductor',
  });

  const learning = new LearningService(pool);
  const analytics = new AnalyticsService(pool);
  const orchestrator = new OrchestratorEngineService({
    enableLearning: true,
    autoOptimize: true,
    minConfidence: 0.7,
  });

  try {
    // ========== DEMO 1: Record Sample Executions ==========
    console.log('📊 Demo 1: Recording Sample Executions');
    console.log('---------------------------------------');

    const sampleExecutions = [
      {
        goal: 'Implement user authentication API',
        agentType: 'Agent-API' as AgentType,
        taskType: 'api_implementation' as TaskType,
        estimatedDurationMs: 180000,
        actualDurationMs: 150000,
        status: 'success' as const,
      },
      {
        goal: 'Implement user authentication API',
        agentType: 'Agent-Database' as AgentType,
        taskType: 'database_migration' as TaskType,
        estimatedDurationMs: 60000,
        actualDurationMs: 45000,
        status: 'success' as const,
      },
      {
        goal: 'Implement user authentication API',
        agentType: 'Agent-Test' as AgentType,
        taskType: 'testing' as TaskType,
        estimatedDurationMs: 120000,
        actualDurationMs: 140000,
        status: 'success' as const,
      },
      // Simulate some failures
      {
        goal: 'Add payment processing',
        agentType: 'Agent-Integration' as AgentType,
        taskType: 'integration' as TaskType,
        estimatedDurationMs: 240000,
        actualDurationMs: 180000,
        status: 'failed' as const,
        errorType: 'connection_error',
        errorMessage: 'Failed to connect to payment gateway',
      },
      {
        goal: 'Add payment processing',
        agentType: 'Agent-API' as AgentType,
        taskType: 'integration' as TaskType,
        estimatedDurationMs: 200000,
        actualDurationMs: 210000,
        status: 'success' as const,
      },
    ];

    for (const exec of sampleExecutions) {
      const record = await learning.recordExecution({
        goal: exec.goal,
        agentType: exec.agentType,
        taskDescription: `${exec.taskType} for ${exec.goal}`,
        taskType: exec.taskType,
        estimatedDurationMs: exec.estimatedDurationMs,
      });

      await learning.updateExecution(record.id!, {
        actualDurationMs: exec.actualDurationMs,
        status: exec.status,
        completedAt: new Date(),
        errorType: exec.errorType,
        errorMessage: exec.errorMessage,
      });

      console.log(`✓ Recorded: ${exec.agentType} - ${exec.taskType} (${exec.status})`);
    }

    console.log(`\n✅ Recorded ${sampleExecutions.length} executions\n`);

    // ========== DEMO 2: Pattern Analysis ==========
    console.log('🔍 Demo 2: Analyzing Patterns');
    console.log('-----------------------------');

    const lessons = await learning.analyzePatterns();
    console.log(`Identified ${lessons.length} patterns:\n`);

    for (const lesson of lessons.slice(0, 5)) {
      console.log(`${getLessonIcon(lesson.lessonType)} ${lesson.lessonType}`);
      console.log(`  Recommendation: ${lesson.recommendation}`);
      console.log(`  Confidence: ${(lesson.confidenceScore * 100).toFixed(1)}%`);
      if (lesson.alternativeAgent) {
        console.log(`  Suggested Agent: ${lesson.alternativeAgent}`);
      }
      console.log();
    }

    // ========== DEMO 3: Get Recommendations ==========
    console.log('💡 Demo 3: Getting Recommendations');
    console.log('----------------------------------');

    const recommendations = await orchestrator.getRecommendations(
      'Implement user authentication API',
      'api_implementation'
    );

    if (recommendations.length > 0) {
      console.log(`Found ${recommendations.length} recommendations:\n`);

      for (const rec of recommendations.slice(0, 3)) {
        console.log(`${getPriorityIcon(rec.priority)} ${rec.priority.toUpperCase()}: ${rec.title}`);
        console.log(`  ${rec.description}`);
        console.log(`  Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);
        if (rec.expectedImprovement) {
          console.log(`  Expected Improvement: ${JSON.stringify(rec.expectedImprovement)}`);
        }
        console.log();
      }
    } else {
      console.log('No recommendations yet (need more historical data)\n');
    }

    // ========== DEMO 4: Agent Performance Metrics ==========
    console.log('📈 Demo 4: Agent Performance Metrics');
    console.log('------------------------------------');

    const agents: AgentType[] = ['Agent-API', 'Agent-Database', 'Agent-Test'];

    for (const agent of agents) {
      const successRate = await orchestrator.getAgentSuccessRate(agent);
      console.log(`${agent}: ${(successRate * 100).toFixed(1)}% success rate`);
    }
    console.log();

    // ========== DEMO 5: Task Duration Prediction ==========
    console.log('🔮 Demo 5: Task Duration Prediction');
    console.log('-----------------------------------');

    const prediction = await learning.getPredictedDuration(
      'Agent-API',
      'api_implementation'
    );

    console.log(`Agent: ${prediction.agentType}`);
    console.log(`Task Type: ${prediction.taskType}`);
    console.log(`Predicted Duration: ${Math.round(prediction.predictedDurationMs / 1000)}s`);
    console.log(
      `Confidence Interval: ${Math.round(prediction.confidenceInterval.min / 1000)}s - ${Math.round(prediction.confidenceInterval.max / 1000)}s`
    );
    console.log(`Success Probability: ${(prediction.successProbability * 100).toFixed(1)}%`);

    if (prediction.riskFactors && prediction.riskFactors.length > 0) {
      console.log(`Risk Factors:`);
      prediction.riskFactors.forEach(risk => console.log(`  - ${risk}`));
    }

    if (prediction.alternativeAgents && prediction.alternativeAgents.length > 0) {
      console.log(`\nAlternative Agents:`);
      prediction.alternativeAgents.forEach(alt => {
        console.log(
          `  - ${alt.agentType}: ${Math.round(alt.predictedDurationMs / 1000)}s (${(alt.successProbability * 100).toFixed(1)}% success)`
        );
      });
    }
    console.log();

    // ========== DEMO 6: Learning Statistics ==========
    console.log('📊 Demo 6: Overall Learning Statistics');
    console.log('--------------------------------------');

    const stats = await orchestrator.getLearningStats();

    console.log(`Total Executions: ${stats.totalExecutions}`);
    console.log(`Total Lessons Learned: ${stats.totalLessons}`);
    console.log(`Average Confidence Score: ${(stats.avgConfidenceScore * 100).toFixed(1)}%`);
    console.log(`Average Effectiveness Score: ${(stats.avgEffectivenessScore * 100).toFixed(1)}%`);
    console.log(`Optimization Potential: ${stats.optimizationPotential}%`);

    if (stats.topPerformingAgents.length > 0) {
      console.log(`\nTop Performing Agents:`);
      stats.topPerformingAgents.forEach((agent, index) => {
        console.log(
          `  ${index + 1}. ${agent.agentType}: ${(agent.successRate * 100).toFixed(1)}% (avg ${Math.round(agent.avgDurationMs / 1000)}s)`
        );
      });
    }

    if (stats.commonFailurePatterns.length > 0) {
      console.log(`\nCommon Failure Patterns:`);
      stats.commonFailurePatterns.forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.pattern} (${pattern.occurrences} times)`);
        if (pattern.recommendedFix) {
          console.log(`     Fix: ${pattern.recommendedFix}`);
        }
      });
    }

    if (stats.recentImprovements.length > 0) {
      console.log(`\nRecent Improvements:`);
      stats.recentImprovements.forEach((improvement, index) => {
        console.log(
          `  ${index + 1}. ${improvement.lessonType}: +${improvement.improvementPercent.toFixed(1)}%`
        );
        console.log(`     ${improvement.description}`);
      });
    }
    console.log();

    // ========== DEMO 7: Intelligent Task Execution ==========
    console.log('🎯 Demo 7: Intelligent Task Execution with Learning');
    console.log('---------------------------------------------------');

    orchestrator.on('recommendation', (rec) => {
      console.log(`💡 Recommendation received: ${rec.description}`);
    });

    orchestrator.on('agent-switched', (event) => {
      console.log(`🔄 Agent switched: ${event.from} → ${event.to}`);
      console.log(`   Reason: ${event.reason}`);
    });

    orchestrator.on('task-started', (event) => {
      console.log(`▶️  Task started: ${event.task.description}`);
      console.log(`   Agent: ${event.task.agentType}`);
      console.log(`   Estimated: ${Math.round((event.task.estimatedDurationMs || 0) / 1000)}s`);
    });

    orchestrator.on('task-completed', (event) => {
      console.log(`✅ Task completed: ${event.task.description}`);
      console.log(`   Actual duration: ${Math.round(event.duration / 1000)}s`);
    });

    orchestrator.on('task-failed', (event) => {
      console.log(`❌ Task failed: ${event.task.description}`);
      console.log(`   Error: ${event.error.message}`);
    });

    const testTask = {
      id: 'test-1',
      description: 'Implement new API endpoint',
      agentType: 'Agent-API' as AgentType,
      taskType: 'api_implementation' as TaskType,
      context: { complexity: 'medium' },
    };

    console.log('\nExecuting test task...\n');

    try {
      const result = await orchestrator.executeTask(
        testTask,
        'Build new feature'
      );

      console.log(`\n✅ Execution result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    } catch (error: any) {
      console.log(`\n❌ Execution failed: ${error.message}`);
    }

    console.log('\n✅ Demo completed successfully!');
    console.log('\nKey Takeaways:');
    console.log('  1. System learns from every execution');
    console.log('  2. Patterns are automatically detected');
    console.log('  3. Recommendations improve over time');
    console.log('  4. Agents are optimally selected based on history');
    console.log('  5. Time estimates become more accurate');
    console.log('  6. System self-improves continuously');
  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await learning.close();
    await orchestrator.close();
  }
}

function getLessonIcon(lessonType: string): string {
  const icons: Record<string, string> = {
    agent_selection: '👤',
    task_ordering: '🔢',
    time_estimation: '⏱️',
    error_prevention: '🛡️',
    parallel_execution: '⚡',
    dependency_optimization: '🔗',
    resource_allocation: '💾',
  };
  return icons[lessonType] || '📝';
}

function getPriorityIcon(priority: string): string {
  const icons: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  };
  return icons[priority] || '⚪';
}

// Run demo
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
