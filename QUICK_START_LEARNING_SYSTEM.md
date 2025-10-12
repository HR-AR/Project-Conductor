# Quick Start: Self-Learning System

## 🚀 Get Started in 5 Minutes

### Step 1: Database Setup (1 minute)

```bash
# Navigate to project directory
cd /Users/h0r03cw/Desktop/Coding/Project\ Conductor

# Run the migration
psql conductor < migrations/015_add_orchestrator_execution_history.sql

# Verify tables created
psql conductor -c "\dt orchestrator_*"
```

Expected output:
```
                          List of relations
 Schema |              Name                  | Type  |  Owner
--------+------------------------------------+-------+---------
 public | orchestrator_agent_performance     | table | ...
 public | orchestrator_execution_history     | table | ...
 public | orchestrator_lessons               | table | ...
 public | orchestrator_workflow_patterns     | table | ...
```

### Step 2: Run the Demo (2 minutes)

```bash
# Install dependencies (if not already done)
npm install

# Set database URL
export DATABASE_URL=postgresql://localhost:5432/conductor

# Run the demo
npm run ts-node examples/learning-system-demo.ts
```

Expected output:
```
🧠 Project Conductor - Self-Learning System Demo
==================================================

📊 Demo 1: Recording Sample Executions
---------------------------------------
✓ Recorded: Agent-API - api_implementation (success)
✓ Recorded: Agent-Database - database_migration (success)
...
```

### Step 3: Use in Your Code (2 minutes)

Create a file `test-learning.ts`:

```typescript
import { OrchestratorEngineService } from './src/services/orchestrator/orchestrator-engine.service';

async function main() {
  // Create orchestrator with learning enabled
  const orchestrator = new OrchestratorEngineService({
    enableLearning: true,
    autoOptimize: true,
    minConfidence: 0.7,
  });

  // Listen to events
  orchestrator.on('recommendation', (rec) => {
    console.log('💡 Recommendation:', rec.description);
  });

  orchestrator.on('agent-switched', (event) => {
    console.log(`🔄 Switched from ${event.from} to ${event.to}`);
  });

  // Execute a task
  const result = await orchestrator.executeTask(
    {
      id: 'task-1',
      description: 'Create user API endpoint',
      agentType: 'Agent-API',
      taskType: 'api_implementation',
    },
    'Implement user management'
  );

  console.log('Result:', result);

  // Get learning statistics
  const stats = await orchestrator.getLearningStats();
  console.log('Learning Stats:', stats);

  await orchestrator.close();
}

main();
```

Run it:
```bash
npm run ts-node test-learning.ts
```

## 📖 Common Usage Patterns

### Pattern 1: Record Manual Execution

```typescript
import { LearningService } from './src/services/orchestrator/learning.service';

const learning = new LearningService();

// Start execution
const execution = await learning.recordExecution({
  goal: 'Build authentication',
  agentType: 'Agent-API',
  taskDescription: 'Implement login endpoint',
  taskType: 'api_implementation',
  estimatedDurationMs: 120000,
});

// Do the work...
const startTime = Date.now();
try {
  // ... your task execution code ...
  const duration = Date.now() - startTime;

  // Record success
  await learning.updateExecution(execution.id!, {
    actualDurationMs: duration,
    status: 'success',
    completedAt: new Date(),
  });
} catch (error) {
  const duration = Date.now() - startTime;

  // Record failure
  await learning.updateExecution(execution.id!, {
    actualDurationMs: duration,
    status: 'failed',
    completedAt: new Date(),
    errorType: error.name,
    errorMessage: error.message,
  });
}
```

### Pattern 2: Get Recommendations

```typescript
const recommendations = await learning.getRecommendations({
  goal: 'Build authentication',
  taskType: 'api_implementation',
  limit: 5,
});

for (const rec of recommendations) {
  console.log(`${rec.priority}: ${rec.title}`);
  console.log(`  ${rec.description}`);
  console.log(`  Confidence: ${(rec.confidenceScore * 100).toFixed(1)}%`);

  if (rec.confidenceScore > 0.8) {
    console.log('  ✅ High confidence - recommend applying');
  }
}
```

### Pattern 3: Get Agent Performance

```typescript
import { AnalyticsService } from './src/services/orchestrator/analytics.service';

const analytics = new AnalyticsService();

// Get success rate
const successRate = await analytics.getAgentSuccessRate('Agent-API');
console.log(`Agent-API success rate: ${(successRate * 100).toFixed(1)}%`);

// Get average duration
const avgDuration = await analytics.getAverageTaskDuration('api_implementation');
console.log(`Average API implementation time: ${Math.round(avgDuration / 1000)}s`);

// Get failure patterns
const failures = await analytics.getCommonFailurePatterns();
for (const failure of failures) {
  console.log(`❌ ${failure.pattern}`);
  console.log(`   Occurrences: ${failure.occurrences}`);
  console.log(`   Fix: ${failure.recommendedFix}`);
}
```

### Pattern 4: Predict Task Duration

```typescript
const prediction = await learning.getPredictedDuration(
  'Agent-API',
  'api_implementation'
);

console.log('Predicted duration:', Math.round(prediction.predictedDurationMs / 1000), 's');
console.log('Confidence interval:',
  Math.round(prediction.confidenceInterval.min / 1000), 's -',
  Math.round(prediction.confidenceInterval.max / 1000), 's'
);
console.log('Success probability:', (prediction.successProbability * 100).toFixed(1), '%');

if (prediction.riskFactors && prediction.riskFactors.length > 0) {
  console.log('⚠️ Risk factors:');
  prediction.riskFactors.forEach(risk => console.log('  -', risk));
}
```

## 🎯 What to Expect

### After 10 Executions

- ✅ Time estimates within 20% accuracy
- ✅ Basic agent selection patterns identified
- ✅ Common errors detected
- ⏳ Task ordering patterns emerging

### After 50 Executions

- ✅ Time estimates within 15% accuracy
- ✅ Strong agent selection confidence (>80%)
- ✅ Optimal task sequences identified
- ✅ Parallelization opportunities found
- ✅ Error prevention lessons active

### After 100 Executions

- ✅ Time estimates within 10% accuracy
- ✅ Very high agent selection confidence (>90%)
- ✅ Multiple workflow patterns recognized
- ✅ Resource optimization recommendations
- ✅ Continuous self-improvement active

## 🔍 Monitoring Learning Progress

### Check Learning Statistics

```typescript
const stats = await orchestrator.getLearningStats();

console.log('Total Executions:', stats.totalExecutions);
console.log('Total Lessons:', stats.totalLessons);
console.log('Avg Confidence:', (stats.avgConfidenceScore * 100).toFixed(1), '%');
console.log('Optimization Potential:', stats.optimizationPotential, '%');

// Low optimization potential = system is well-optimized
if (stats.optimizationPotential < 20) {
  console.log('✅ System is well-optimized!');
} else if (stats.optimizationPotential > 50) {
  console.log('⚠️ High optimization potential - needs more training');
}
```

### Query the Database

```sql
-- Check execution count
SELECT COUNT(*) FROM orchestrator_execution_history;

-- Check learned lessons
SELECT lesson_type, COUNT(*), AVG(confidence_score)
FROM orchestrator_lessons
GROUP BY lesson_type;

-- Check agent performance
SELECT agent_type, task_type, success_rate, avg_duration_ms
FROM orchestrator_agent_performance
ORDER BY success_rate DESC;

-- Check recent executions
SELECT agent_type, task_type, status, actual_duration_ms
FROM orchestrator_execution_history
ORDER BY started_at DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Issue: "Table does not exist"

**Solution**: Run the migration:
```bash
psql conductor < migrations/015_add_orchestrator_execution_history.sql
```

### Issue: "No recommendations returned"

**Cause**: Not enough historical data

**Solution**: Execute more tasks to build history. Need at least 5 similar executions.

### Issue: "Low confidence scores"

**Cause**: High variance in execution patterns

**Solution**:
1. Check for external factors affecting performance
2. Run more executions to get better statistics
3. Lower `minConfidence` threshold temporarily

### Issue: "Inaccurate time predictions"

**Cause**: Insufficient data or high variability

**Solution**:
1. Use p95 duration instead of average
2. Gather more data points
3. Check for outliers in execution history

## 📚 Next Steps

1. **Read Full Documentation**: `/SELF_LEARNING_SYSTEM.md`
2. **Review Sample Lessons**: `/examples/sample-lessons.json`
3. **Check Performance Metrics**: `/examples/performance-metrics.md`
4. **Explore Demo Script**: `/examples/learning-system-demo.ts`

## 🎓 Learning Resources

### Architecture
- See architecture diagram in `SELF_LEARNING_SYSTEM.md`
- Review service structure in `src/services/orchestrator/README.md`

### Algorithms
- Agent selection algorithm explained in docs
- Task ordering algorithm explained in docs
- Time estimation algorithm explained in docs

### API Reference
- Complete API docs in `SELF_LEARNING_SYSTEM.md`
- TypeScript interfaces in `src/models/orchestrator-learning.model.ts`

## 🤝 Getting Help

### Check These First

1. **Documentation**: `SELF_LEARNING_SYSTEM.md`
2. **Implementation Summary**: `IMPLEMENTATION_SUMMARY_SELF_LEARNING.md`
3. **Demo Output**: Run `learning-system-demo.ts`
4. **Database Logs**: Check PostgreSQL logs

### Common Questions

**Q: How many executions before it's useful?**
A: Pattern detection starts at 5 executions, useful at 10, very effective at 50+

**Q: Can I disable learning temporarily?**
A: Yes, set `enableLearning: false` in config

**Q: Does it work with mock database?**
A: No, requires PostgreSQL for pattern analysis queries

**Q: Can I import existing data?**
A: Yes, use `recordExecution()` to bulk import historical data

**Q: How much database space needed?**
A: ~15MB per 1000 executions, plus indexes

## ✅ Verification Checklist

- [ ] Database migration completed successfully
- [ ] Demo runs without errors
- [ ] Can record executions
- [ ] Can retrieve recommendations
- [ ] Learning statistics show data
- [ ] Database tables populated

If all checked, you're ready to go! 🎉

## 🚀 Production Deployment

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/conductor

# Optional (with defaults)
LEARNING_ENABLED=true
AUTO_OPTIMIZE=true
MIN_CONFIDENCE_THRESHOLD=0.6
LOOKBACK_DAYS=30
MIN_SAMPLE_SIZE=5
```

### Monitoring

Set up alerts for:
- Low confidence scores (<0.5)
- High optimization potential (>60%)
- Execution failures
- Database connection errors

### Backup

Regular backups of:
- `orchestrator_execution_history`
- `orchestrator_lessons`
- `orchestrator_agent_performance`

## 🎉 Success!

Your self-learning system is now ready to optimize your orchestrator workflows!

The system will:
- ✅ Learn from every execution
- ✅ Improve time estimates
- ✅ Select optimal agents
- ✅ Prevent common errors
- ✅ Identify optimization opportunities
- ✅ Continuously self-improve

Happy orchestrating! 🎭
