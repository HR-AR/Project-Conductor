/**
 * Goal-Based Planning System - Example Execution Plans
 * Demonstrates 3 common goal patterns with complete execution plans
 */

import { GoalParserService } from '../src/services/orchestrator/goal-parser.service';
import { PlanGeneratorService } from '../src/services/orchestrator/plan-generator.service';
import { ExecutionOptimizerService } from '../src/services/orchestrator/execution-optimizer.service';
import {
  ExecutionPlan,
  OptimizationStrategy,
  PlanComparison
} from '../src/models/orchestrator-planning.model';

/**
 * Example 1: Build a RESTful API for User Management
 */
async function example1_BuildAPIForUserManagement() {
  console.log('\n========================================');
  console.log('Example 1: Build API for User Management');
  console.log('========================================\n');

  const goalParser = new GoalParserService();
  const planGenerator = new PlanGeneratorService(goalParser);
  const optimizer = new ExecutionOptimizerService();

  // Step 1: Parse goal
  const goal = 'Build a RESTful API for user management';
  console.log('Goal:', goal);

  const parsedGoal = goalParser.parseGoal(goal);
  console.log('\nParsed Goal:');
  console.log('- Intent:', parsedGoal.intent);
  console.log('- Entities:', parsedGoal.entities.map(e => `${e.type}: ${e.name}`).join(', '));
  console.log('- Capabilities:', parsedGoal.capabilities.join(', '));
  console.log('- Suggested Agents:', parsedGoal.suggestedAgents.join(', '));
  console.log('- Complexity:', parsedGoal.estimatedComplexity);
  console.log('- Confidence:', (parsedGoal.confidence * 100).toFixed(0) + '%');

  // Step 2: Generate plan
  const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);
  console.log('\nGenerated Plan:');
  console.log('- Plan ID:', plan.id);
  console.log('- Total Tasks:', plan.tasks.length);
  console.log('- Estimated Duration:', plan.estimatedDuration, 'minutes');
  console.log('- Milestones:', plan.milestones.length);
  console.log('- Parallelization Opportunities:', plan.parallelizationOpportunities.length);
  console.log('- Overall Risk:', plan.riskAssessment.overallRisk);

  // Step 3: Show tasks
  console.log('\nTasks:');
  for (const task of plan.tasks) {
    console.log(
      `  ${task.priority === 'critical' ? '🔴' : task.priority === 'high' ? '🟡' : '🟢'} ${task.name}`
    );
    console.log(`     Agent: ${task.agentType} | Duration: ${task.estimatedDuration} min`);
    console.log(`     Dependencies: ${task.dependencies.length > 0 ? task.dependencies.length : 'None'}`);
  }

  // Step 4: Show dependency layers
  console.log('\nDependency Layers:');
  for (let i = 0; i < plan.dependencies.layers.length; i++) {
    const layer = plan.dependencies.layers[i];
    const layerTasks = plan.tasks.filter(t => layer.includes(t.id));
    console.log(`  Layer ${i}: ${layerTasks.map(t => t.name).join(', ')}`);
  }

  // Step 5: Optimize plan
  const optimizedPlan = optimizer.optimizePlan(plan, {
    strategy: 'balanced',
    parameters: { maxParallelTasks: 4, riskTolerance: 'medium' }
  });

  console.log('\nOptimized Plan:');
  console.log(
    '- Estimated Duration:',
    optimizedPlan.estimatedDuration,
    'minutes',
    `(${Math.round(((plan.estimatedDuration - optimizedPlan.estimatedDuration) / plan.estimatedDuration) * 100)}% faster)`
  );

  // Step 6: Show execution order
  const executionOrder = optimizer.getExecutionOrder(optimizedPlan, 4);
  console.log('\nExecution Order (4 parallel tasks max):');
  for (let i = 0; i < executionOrder.length; i++) {
    const group = executionOrder[i];
    console.log(`  Group ${i + 1}: ${group.map(t => t.name).join(', ')}`);
  }

  // Step 7: Show parallelization opportunities
  console.log('\nParallelization Opportunities:');
  for (const opp of optimizedPlan.parallelizationOpportunities) {
    const oppTasks = optimizedPlan.tasks.filter(t => opp.tasks.includes(t.id));
    console.log(`  - ${oppTasks.map(t => t.name).join(', ')}`);
    console.log(`    Time Saved: ${opp.estimatedTimeSaved} min | Risk: ${opp.riskLevel}`);
    console.log(`    Reason: ${opp.reason}`);
  }

  // Step 8: Validate plan
  const validation = planGenerator.validatePlan(optimizedPlan);
  console.log('\nPlan Validation:');
  console.log('- Valid:', validation.isValid ? '✅' : '❌');
  console.log('- Errors:', validation.errors.length);
  console.log('- Warnings:', validation.warnings.length);
  console.log('- Suggestions:', validation.suggestions.length);

  if (validation.suggestions.length > 0) {
    console.log('\nSuggestions:');
    validation.suggestions.forEach(s => console.log('  -', s));
  }

  return optimizedPlan;
}

/**
 * Example 2: Add Authentication System
 */
async function example2_AddAuthentication() {
  console.log('\n========================================');
  console.log('Example 2: Add Authentication System');
  console.log('========================================\n');

  const goalParser = new GoalParserService();
  const planGenerator = new PlanGeneratorService(goalParser);
  const optimizer = new ExecutionOptimizerService();

  // Step 1: Parse goal
  const goal = 'Add authentication';
  console.log('Goal:', goal);

  const parsedGoal = goalParser.parseGoal(goal);
  console.log('\nParsed Goal:');
  console.log('- Intent:', parsedGoal.intent);
  console.log('- Capabilities:', parsedGoal.capabilities.join(', '));
  console.log('- Suggested Agents:', parsedGoal.suggestedAgents.join(', '));
  console.log('- Complexity:', parsedGoal.estimatedComplexity);

  // Step 2: Generate plan
  const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);
  console.log('\nGenerated Plan:');
  console.log('- Total Tasks:', plan.tasks.length);
  console.log('- Estimated Duration:', plan.estimatedDuration, 'minutes');
  console.log('- Overall Risk:', plan.riskAssessment.overallRisk);

  // Step 3: Show risk assessment
  console.log('\nRisk Assessment:');
  for (const risk of plan.riskAssessment.risks) {
    console.log(`  - ${risk.type.toUpperCase()}`);
    console.log(`    Description: ${risk.description}`);
    console.log(`    Mitigation: ${risk.mitigation}`);
    console.log(
      `    Score: ${(risk.probability * risk.impact * 100).toFixed(0)}% (prob: ${(risk.probability * 100).toFixed(0)}%, impact: ${(risk.impact * 100).toFixed(0)}%)`
    );
  }

  // Step 4: Compare optimization strategies
  console.log('\nComparing Optimization Strategies:');

  const strategies: OptimizationStrategy[] = [
    {
      strategy: 'minimize_duration',
      parameters: { maxParallelTasks: 8 }
    },
    {
      strategy: 'minimize_risk',
      parameters: { riskTolerance: 'low' }
    },
    {
      strategy: 'balanced',
      parameters: { maxParallelTasks: 4, riskTolerance: 'medium' }
    }
  ];

  const plans: ExecutionPlan[] = strategies.map(strategy =>
    optimizer.optimizePlan(plan, strategy)
  );

  const comparison: PlanComparison = optimizer.comparePlans(plans);

  console.log('\nStrategy Comparison:');
  for (let i = 0; i < plans.length; i++) {
    console.log(
      `  ${i + 1}. ${strategies[i].strategy}: ${comparison.comparison.duration[i]} min, ${comparison.comparison.risk[i]} risk, ${comparison.comparison.parallelization[i].toFixed(0)}% parallel`
    );
  }

  console.log('\nRecommendation:');
  console.log('- Best Strategy:', comparison.recommendation.bestPlanId);
  console.log('- Reason:', comparison.recommendation.reason);
  if (comparison.recommendation.tradeoffs.length > 0) {
    console.log('- Tradeoffs:');
    comparison.recommendation.tradeoffs.forEach(t => console.log('  -', t));
  }

  const bestPlan = plans.find(p => p.id === comparison.recommendation.bestPlanId)!;

  // Step 5: Show critical path
  console.log('\nCritical Path:');
  const criticalTasks = bestPlan.tasks.filter(t =>
    bestPlan.dependencies.criticalPath.includes(t.id)
  );
  for (const task of criticalTasks) {
    console.log(`  - ${task.name} (${task.estimatedDuration} min)`);
  }
  const criticalPathDuration = criticalTasks.reduce(
    (sum, t) => sum + t.estimatedDuration,
    0
  );
  console.log(`  Total Critical Path Duration: ${criticalPathDuration} minutes`);

  return bestPlan;
}

/**
 * Example 3: Integrate with Slack
 */
async function example3_IntegrateWithSlack() {
  console.log('\n========================================');
  console.log('Example 3: Integrate with Slack');
  console.log('========================================\n');

  const goalParser = new GoalParserService();
  const planGenerator = new PlanGeneratorService(goalParser);
  const optimizer = new ExecutionOptimizerService();

  // Step 1: Parse goal
  const goal = 'Integrate with Slack';
  console.log('Goal:', goal);

  const parsedGoal = goalParser.parseGoal(goal);
  console.log('\nParsed Goal:');
  console.log('- Intent:', parsedGoal.intent);
  console.log('- Entities:', parsedGoal.entities.map(e => `${e.type}: ${e.name}`).join(', '));
  console.log('- Capabilities:', parsedGoal.capabilities.join(', '));
  console.log('- Complexity:', parsedGoal.estimatedComplexity);
  console.log('- Metadata:');
  console.log('  - Is Integration:', parsedGoal.metadata.isIntegration);
  console.log('  - Requires Testing:', parsedGoal.metadata.requiresTesting);

  // Step 2: Generate plan
  const plan = planGenerator.generatePlanFromParsedGoal(parsedGoal);
  console.log('\nGenerated Plan:');
  console.log('- Total Tasks:', plan.tasks.length);
  console.log('- Estimated Duration:', plan.estimatedDuration, 'minutes');

  // Step 3: Show tasks by phase
  console.log('\nTasks by Phase:');
  const phases = new Map<string, typeof plan.tasks>();
  for (const task of plan.tasks) {
    const phase = task.metadata.phase || 'general';
    if (!phases.has(phase)) {
      phases.set(phase, []);
    }
    phases.get(phase)!.push(task);
  }

  for (const [phase, tasks] of phases.entries()) {
    console.log(`\n  ${phase.toUpperCase()} Phase:`);
    for (const task of tasks) {
      console.log(`    - ${task.name}`);
      console.log(`      Agent: ${task.agentType} | Duration: ${task.estimatedDuration} min`);
      console.log(`      Outputs: ${task.outputs.join(', ')}`);
    }
  }

  // Step 4: Optimize for maximum parallelization
  const optimizedPlan = optimizer.optimizePlan(plan, {
    strategy: 'maximize_parallelization',
    parameters: { maxParallelTasks: 6 }
  });

  console.log('\nOptimized for Maximum Parallelization:');
  console.log('- Original Duration:', plan.estimatedDuration, 'minutes');
  console.log('- Optimized Duration:', optimizedPlan.estimatedDuration, 'minutes');
  console.log(
    '- Time Saved:',
    plan.estimatedDuration - optimizedPlan.estimatedDuration,
    'minutes',
    `(${Math.round(((plan.estimatedDuration - optimizedPlan.estimatedDuration) / plan.estimatedDuration) * 100)}%)`
  );

  // Step 5: Show execution order with 6 parallel tasks
  const executionOrder = optimizer.getExecutionOrder(optimizedPlan, 6);
  console.log('\nExecution Order (6 parallel tasks max):');
  for (let i = 0; i < executionOrder.length; i++) {
    const group = executionOrder[i];
    const groupDuration = Math.max(...group.map(t => t.estimatedDuration));
    console.log(
      `  Group ${i + 1} (${groupDuration} min): ${group.map(t => t.name).join(', ')}`
    );
  }

  // Step 6: Show milestones
  console.log('\nMilestones:');
  for (const milestone of optimizedPlan.milestones) {
    console.log(`  - ${milestone.name}`);
    console.log(`    Tasks: ${milestone.tasks.length}`);
    console.log(`    Blocking: ${milestone.isBlocking ? 'Yes' : 'No'}`);
    console.log(
      `    Estimated Completion: ${milestone.estimatedCompletion.toLocaleString()}`
    );
  }

  // Step 7: Show acceptance criteria for all tasks
  console.log('\nAcceptance Criteria:');
  for (const task of optimizedPlan.tasks) {
    console.log(`\n  ${task.name}:`);
    task.acceptanceCriteria.forEach(criterion => console.log(`    - ${criterion}`));
  }

  return optimizedPlan;
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('===========================================');
  console.log('Goal-Based Planning System - Example Plans');
  console.log('===========================================');

  try {
    // Example 1
    const plan1 = await example1_BuildAPIForUserManagement();
    console.log('\n✅ Example 1 completed successfully\n');

    // Example 2
    const plan2 = await example2_AddAuthentication();
    console.log('\n✅ Example 2 completed successfully\n');

    // Example 3
    const plan3 = await example3_IntegrateWithSlack();
    console.log('\n✅ Example 3 completed successfully\n');

    // Summary
    console.log('\n========================================');
    console.log('Summary');
    console.log('========================================\n');
    console.log('Example 1: Build API for User Management');
    console.log(`  - Tasks: ${plan1.tasks.length}`);
    console.log(`  - Duration: ${plan1.estimatedDuration} minutes`);
    console.log(`  - Risk: ${plan1.riskAssessment.overallRisk}`);

    console.log('\nExample 2: Add Authentication');
    console.log(`  - Tasks: ${plan2.tasks.length}`);
    console.log(`  - Duration: ${plan2.estimatedDuration} minutes`);
    console.log(`  - Risk: ${plan2.riskAssessment.overallRisk}`);

    console.log('\nExample 3: Integrate with Slack');
    console.log(`  - Tasks: ${plan3.tasks.length}`);
    console.log(`  - Duration: ${plan3.estimatedDuration} minutes`);
    console.log(`  - Risk: ${plan3.riskAssessment.overallRisk}`);

    console.log('\n========================================');
    console.log('✅ All examples completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Export functions for individual use
export {
  example1_BuildAPIForUserManagement,
  example2_AddAuthentication,
  example3_IntegrateWithSlack,
  runAllExamples
};

// Run if called directly
if (require.main === module) {
  runAllExamples();
}
