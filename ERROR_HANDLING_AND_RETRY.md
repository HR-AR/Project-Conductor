# Error Handling and Retry Logic - Project Conductor Orchestrator

## Overview

The Project Conductor orchestrator now includes intelligent retry logic and comprehensive error handling with automatic recovery strategies. This system ensures resilient operation even in the face of transient failures, while properly handling fatal errors and conflicts that require human intervention.

## Architecture

### Components

1. **RetryManager** (`src/services/orchestrator/retry-manager.service.ts`)
   - Executes operations with automatic retry logic
   - Implements exponential backoff, linear, fixed, and Fibonacci strategies
   - Circuit breaker pattern to prevent cascading failures
   - Retry history tracking for debugging

2. **ErrorHandler** (`src/services/orchestrator/error-handler.service.ts`)
   - Classifies errors into types and categories
   - Determines appropriate recovery actions
   - Checkpoint system for state rollback
   - Comprehensive error logging with context

3. **Error Recovery Models** (`src/models/error-recovery.model.ts`)
   - Type definitions for error classification
   - Recovery action enumerations
   - Error classification matrix

### Integration with Orchestrator

The orchestrator engine now:
- Creates checkpoints before executing risky operations
- Wraps agent task execution with retry logic
- Classifies errors and determines recovery strategies
- Handles different error types with appropriate actions
- Tracks retry statistics and circuit breaker states

## Error Classification

### Error Types

The system classifies errors into four main types:

#### 1. Transient Errors
**Characteristics**: Temporary failures that are likely to resolve on their own
**Strategy**: Auto-retry with exponential backoff
**Max Retries**: 5 attempts
**Examples**:
- Network timeout (ETIMEDOUT, ECONNRESET)
- Rate limiting (429 Too Many Requests)
- Service unavailable (503, 502, 504)
- Connection reset

**Configuration**:
```typescript
{
  maxAttempts: 5,
  strategy: BackoffStrategy.EXPONENTIAL,
  baseDelay: 1000,      // 1 second
  maxDelay: 16000,      // 16 seconds
  timeout: 30000        // 30 seconds per attempt
}
```

**Backoff Sequence**: 1s, 2s, 4s, 8s, 16s (with 0-20% jitter)

#### 2. Retriable Errors
**Characteristics**: Errors that might resolve after a delay or with different approach
**Strategy**: Retry with linear backoff or alternative path
**Max Retries**: 3 attempts
**Examples**:
- Resource locked (EBUSY)
- Missing dependency
- Validation errors
- Temporary failures

**Configuration**:
```typescript
{
  maxAttempts: 3,
  strategy: BackoffStrategy.LINEAR,
  baseDelay: 2000,      // 2 seconds
  maxDelay: 10000,      // 10 seconds
  timeout: 60000        // 60 seconds per attempt
}
```

**Backoff Sequence**: 2s, 4s, 6s (with jitter)

#### 3. Fatal Errors
**Characteristics**: Permanent failures that will not resolve with retries
**Strategy**: Fail immediately (no retries)
**Examples**:
- Permission denied (EACCES, 403, 401)
- Invalid configuration
- Resource not found (ENOENT, 404)
- Syntax errors
- Out of memory (ENOMEM)

**Action**: Log error, mark task as failed, notify monitoring systems

#### 4. Conflict Errors
**Characteristics**: Issues requiring human intervention or decision
**Strategy**: Pause workflow and notify
**Examples**:
- Security vulnerabilities (CVE)
- Business rule violations
- Data integrity issues
- Policy violations

**Action**: Pause orchestrator, emit workflow-paused event, log conflict for human review

### Error Categories

Each error is also assigned a specific category for more granular handling:

**Transient Categories**:
- `NETWORK_TIMEOUT`: Network-related timeouts
- `RATE_LIMIT`: API rate limiting
- `CONNECTION_RESET`: Connection failures
- `SERVICE_UNAVAILABLE`: Service temporarily down

**Retriable Categories**:
- `RESOURCE_LOCKED`: Resource currently in use
- `DEPENDENCY_MISSING`: Missing prerequisites
- `TEMPORARY_FAILURE`: Temporary system issues
- `VALIDATION_ERROR`: Input validation failures

**Fatal Categories**:
- `INVALID_CONFIGURATION`: Bad configuration
- `PERMISSION_DENIED`: Access denied
- `RESOURCE_NOT_FOUND`: Missing resources
- `SYNTAX_ERROR`: Code/config syntax errors
- `OUT_OF_MEMORY`: Memory exhaustion

**Conflict Categories**:
- `SECURITY_VULNERABILITY`: Security issues
- `BUSINESS_RULE_VIOLATION`: Business logic conflicts
- `DATA_INTEGRITY_ISSUE`: Data consistency problems
- `POLICY_VIOLATION`: Policy compliance issues

## Error Classification Matrix

The system uses pattern matching to classify errors automatically:

| Pattern | Type | Category | Severity | Recovery Action |
|---------|------|----------|----------|----------------|
| `timeout\|ETIMEDOUT` | Transient | Network Timeout | Low | Retry with Backoff |
| `rate limit\|429` | Transient | Rate Limit | Medium | Retry with Backoff |
| `503\|502\|504` | Transient | Service Unavailable | Medium | Retry with Backoff |
| `locked\|EBUSY` | Retriable | Resource Locked | Medium | Retry with Backoff |
| `dependency\|not found` | Retriable | Dependency Missing | Medium | Retry |
| `validation\|invalid input` | Retriable | Validation Error | Medium | Alternative Path |
| `permission denied\|EACCES\|403` | Fatal | Permission Denied | Critical | Fail Immediately |
| `invalid config\|EINVAL` | Fatal | Invalid Configuration | Critical | Fail Immediately |
| `ENOENT\|404` | Fatal | Resource Not Found | High | Fail Immediately |
| `out of memory\|ENOMEM` | Fatal | Out of Memory | Critical | Circuit Break |
| `security\|vulnerability\|CVE` | Conflict | Security Vulnerability | Critical | Pause Workflow |
| `business rule\|policy` | Conflict | Business Rule Violation | High | Pause Workflow |
| `integrity\|constraint` | Conflict | Data Integrity Issue | High | Pause Workflow |

## Recovery Actions

### 1. RETRY
Simple retry without delay modifications.

**Use Case**: Retriable errors that don't need backoff
**Implementation**: Immediate retry up to max attempts

### 2. RETRY_WITH_BACKOFF
Retry with increasing delays between attempts.

**Use Case**: Transient errors (network, rate limits)
**Implementation**: Exponential or linear backoff with jitter

### 3. FAIL_IMMEDIATELY
No retries, mark as failed immediately.

**Use Case**: Fatal errors (permissions, config)
**Implementation**: Log error, update task status to FAILED

### 4. PAUSE_WORKFLOW
Stop orchestrator and wait for human intervention.

**Use Case**: Conflicts (security, business rules)
**Implementation**:
- Emit `workflow-paused` event
- Log conflict details
- Notify activity service
- Wait for manual resolution

### 5. ROLLBACK
Restore system to last checkpoint.

**Use Case**: Partial failures requiring state restoration
**Implementation**:
- Retrieve last checkpoint
- Restore orchestrator state
- Log rollback action

### 6. ALTERNATIVE_PATH
Try a different approach to accomplish the goal.

**Use Case**: Validation errors, alternative solutions available
**Implementation**: Agent-specific alternative logic

### 7. CIRCUIT_BREAK
Open circuit breaker, stop all operations.

**Use Case**: System-wide failures, out of memory
**Implementation**:
- Open circuit breaker
- Emit `circuit-break` event
- Stop orchestrator
- Require manual reset

### 8. SKIP
Skip the current operation and continue.

**Use Case**: Optional operations, non-critical failures
**Implementation**: Mark as success, continue workflow

## Backoff Strategies

### Exponential Backoff
**Formula**: `delay = baseDelay * 2^(attempt - 1)`
**Sequence**: 1s, 2s, 4s, 8s, 16s
**Use Case**: Network errors, rate limits

### Linear Backoff
**Formula**: `delay = baseDelay * attempt`
**Sequence**: 1s, 2s, 3s, 4s, 5s
**Use Case**: Resource locks, moderate failures

### Fixed Backoff
**Formula**: `delay = baseDelay`
**Sequence**: 1s, 1s, 1s, 1s, 1s
**Use Case**: Predictable retry intervals

### Fibonacci Backoff
**Formula**: `delay = baseDelay * fibonacci(attempt)`
**Sequence**: 1s, 1s, 2s, 3s, 5s, 8s
**Use Case**: Gradual increase with mathematical elegance

### Jitter
All backoff strategies include random jitter (0-20%) to prevent thundering herd problem:
```typescript
const jitter = delay * 0.2 * Math.random();
finalDelay = delay + jitter;
```

## Circuit Breaker Pattern

### Overview
Prevents system from repeatedly trying operations that are likely to fail, allowing time to recover.

### States
1. **Closed**: Normal operation, requests pass through
2. **Open**: Failures exceeded threshold, block all requests
3. **Half-Open**: After timeout, allow test requests

### Configuration
```typescript
{
  threshold: 10,           // Number of failures before opening
  windowMs: 300000,        // 5 minute window
  resetAfter: 300000       // Reset after 5 minutes
}
```

### Behavior

**Failure Tracking**:
- Each failure increments counter
- Counter tracked per agent type (or globally)
- Successful operations decrement counter

**Circuit Opening**:
- When failures >= threshold, circuit opens
- All subsequent requests fail immediately with "Circuit breaker is open"
- No retries attempted while open

**Circuit Reset**:
- After `resetAfter` time, circuit allows requests again
- If request succeeds, circuit closes
- If request fails, circuit stays open

### Example
```typescript
// After 10 failures in API agent
retryManager.getCircuitBreakerState(AgentType.API)
// Returns: { isOpen: true, failureCount: 10, openedAt: Date, threshold: 10 }

// Reset manually
retryManager.resetCircuitBreaker(AgentType.API);
```

## Checkpoint System

### Overview
State snapshots that allow rollback on failure.

### Checkpoint Creation
Checkpoints are created:
1. **Automatically**: Before executing agent tasks
2. **Manually**: On demand via `createCheckpoint()`
3. **Triggered**: Before risky operations

### Checkpoint Contents
```typescript
{
  id: 'checkpoint-1',
  timestamp: Date,
  phase: PhaseNumber,
  state: {
    currentPhase,
    completedPhases,
    milestones,
    tasks,
    metrics,
    // ... full orchestrator state
  },
  agentStates: Map<AgentType, any>,
  metadata: {
    description: 'Before executing task task-123',
    automatic: true,
    triggeredBy: 'agent-api'
  }
}
```

### Checkpoint Limits
- Maximum checkpoints: 10 (configurable)
- When limit reached: Oldest checkpoint is deleted
- Storage: In-memory (can be extended to persistent storage)

### Rollback Process
1. Retrieve checkpoint by ID (or use last checkpoint)
2. Deserialize state
3. Restore orchestrator state
4. Log rollback action
5. Continue execution from restored state

### Example Usage
```typescript
// Create checkpoint
const checkpoint = errorHandler.createCheckpoint(
  state,
  'Before risky operation',
  true,
  'agent-api'
);

// Rollback to checkpoint
const restoredState = await errorHandler.rollback(checkpoint.id);

// Rollback to last checkpoint
const lastCheckpoint = errorHandler.rollbackToLastCheckpoint();
```

## Retry History

### Tracking
Every retry operation is tracked with detailed history:

```typescript
{
  operationId: 'task-123',
  agentType: AgentType.API,
  phase: PhaseNumber.PHASE_1,
  totalAttempts: 3,
  attempts: [
    {
      attemptNumber: 1,
      timestamp: Date,
      delayMs: 0,
      error: 'Connection timeout',
      success: false
    },
    {
      attemptNumber: 2,
      timestamp: Date,
      delayMs: 1000,
      error: 'Connection timeout',
      success: false
    },
    {
      attemptNumber: 3,
      timestamp: Date,
      delayMs: 2000,
      success: true
    }
  ],
  finalSuccess: true,
  totalDuration: 5234,
  createdAt: Date,
  completedAt: Date
}
```

### Querying History
```typescript
// Get specific operation history
const history = retryManager.getRetryHistory('task-123');

// Get all histories
const allHistories = retryManager.getAllRetryHistories();

// Get statistics
const stats = retryManager.getStatistics();
// {
//   totalOperations: 100,
//   successfulOperations: 95,
//   failedOperations: 5,
//   averageRetries: 1.2,
//   averageDuration: 1234,
//   circuitBreakersOpen: 0
// }
```

## Integration Examples

### Basic Usage

```typescript
// Initialize orchestrator (retry and error handling are automatic)
const orchestrator = new OrchestratorEngine();
await orchestrator.start();

// Retry and error handling happens automatically when executing tasks
```

### Manual Retry Operation

```typescript
const retryManager = orchestrator.getRetryManager();

const result = await retryManager.executeWithRetry(
  'custom-operation',
  async () => {
    // Your operation here
    return await someRiskyOperation();
  },
  {
    maxAttempts: 5,
    strategy: BackoffStrategy.EXPONENTIAL,
    baseDelay: 1000,
    maxDelay: 16000,
    retryableErrors: [ErrorType.TRANSIENT, ErrorType.RETRIABLE]
  },
  {
    agentType: AgentType.API,
    phase: PhaseNumber.PHASE_1
  }
);
```

### Custom Error Handling

```typescript
const errorHandler = orchestrator.getErrorHandler();

try {
  // Some operation
} catch (error) {
  const recoveryResult = errorHandler.handleAgentError(error, {
    operationId: 'my-operation',
    agentType: AgentType.API,
    phase: PhaseNumber.PHASE_1
  });

  switch (recoveryResult.action) {
    case RecoveryAction.RETRY:
      // Retry logic
      break;
    case RecoveryAction.PAUSE_WORKFLOW:
      // Pause and notify
      break;
    case RecoveryAction.FAIL_IMMEDIATELY:
      // Log and exit
      break;
  }
}
```

### Creating Custom Checkpoints

```typescript
const errorHandler = orchestrator.getErrorHandler();
const state = orchestrator.getState();

// Create checkpoint before risky operation
const checkpoint = errorHandler.createCheckpoint(
  state,
  'Before database migration',
  false,  // Manual checkpoint
  'admin'
);

try {
  await performRiskyOperation();
} catch (error) {
  // Rollback to checkpoint
  await errorHandler.rollback(checkpoint.id);
}
```

### Monitoring Circuit Breakers

```typescript
const retryManager = orchestrator.getRetryManager();

// Check specific agent
const apiCircuit = retryManager.getCircuitBreakerState(AgentType.API);
if (apiCircuit?.isOpen) {
  console.log('API agent circuit breaker is open');
  console.log(`Failures: ${apiCircuit.failureCount}`);
  console.log(`Opened at: ${apiCircuit.openedAt}`);
}

// Get all circuit breakers
const allCircuits = retryManager.getAllCircuitBreakerStates();
for (const [key, circuit] of allCircuits) {
  if (circuit.isOpen) {
    console.log(`Circuit ${key} is open`);
  }
}

// Reset circuit breaker
retryManager.resetCircuitBreaker(AgentType.API);
```

## Event System

The orchestrator emits events for error handling:

### workflow-paused
Emitted when workflow is paused due to conflict.
```typescript
orchestrator.on('workflow-paused', (data) => {
  console.log('Workflow paused:', data.reason);
  console.log('Task:', data.taskId);
  console.log('Agent:', data.agentType);
  // Notify admins, log to monitoring system, etc.
});
```

### circuit-break
Emitted when circuit breaker is triggered.
```typescript
orchestrator.on('circuit-break', (data) => {
  console.log('Circuit breaker triggered:', data.error);
  console.log('Agent:', data.agentType);
  // Stop processing, alert operations team
});
```

## Statistics and Monitoring

### Retry Statistics
```typescript
const retryStats = orchestrator.getRetryStatistics();
console.log(`Total operations: ${retryStats.totalOperations}`);
console.log(`Success rate: ${retryStats.successfulOperations / retryStats.totalOperations * 100}%`);
console.log(`Average retries: ${retryStats.averageRetries}`);
console.log(`Average duration: ${retryStats.averageDuration}ms`);
console.log(`Open circuit breakers: ${retryStats.circuitBreakersOpen}`);
```

### Checkpoint Statistics
```typescript
const checkpointStats = orchestrator.getCheckpointStatistics();
console.log(`Total checkpoints: ${checkpointStats.totalCheckpoints}`);
console.log(`Oldest: ${checkpointStats.oldestCheckpoint}`);
console.log(`Newest: ${checkpointStats.newestCheckpoint}`);
```

## Best Practices

### 1. Error Classification
- Use specific error messages that match classification patterns
- Include error codes (ETIMEDOUT, EACCES, etc.) when available
- Add context to errors for better classification

### 2. Retry Configuration
- Use exponential backoff for transient errors
- Set reasonable max attempts (3-5)
- Include timeout per attempt
- Add jitter to prevent thundering herd

### 3. Circuit Breakers
- Set threshold based on expected failure rate
- Monitor circuit breaker states
- Reset manually when system recovers
- Use per-agent circuit breakers for isolation

### 4. Checkpoints
- Create checkpoints before risky operations
- Limit checkpoint storage to prevent memory issues
- Clean up old checkpoints periodically
- Consider persistent storage for production

### 5. Monitoring
- Track retry statistics over time
- Alert on high failure rates
- Monitor circuit breaker openings
- Log all recovery actions

### 6. Error Logging
- Include full context in error logs
- Log retry attempts
- Record recovery actions taken
- Maintain error history for debugging

## Testing

### Unit Tests

Run unit tests for retry and error handling:
```bash
npm test tests/unit/orchestrator/retry-manager.test.ts
npm test tests/unit/orchestrator/error-handler.test.ts
```

### Test Coverage

The test suite covers:
- ✅ Error classification (all types and categories)
- ✅ Retry logic (all backoff strategies)
- ✅ Circuit breaker behavior
- ✅ Checkpoint creation and rollback
- ✅ Recovery action determination
- ✅ Statistics tracking
- ✅ Timeout handling
- ✅ Jitter application

### Integration Testing

Test error handling in real orchestrator scenarios:
```typescript
// Test transient error recovery
const task = createTestTask(AgentType.API);
agent.executeTask = jest.fn()
  .mockRejectedValueOnce(new Error('timeout'))
  .mockRejectedValueOnce(new Error('timeout'))
  .mockResolvedValue({ success: true });

await orchestrator.executeAgentTask(agent, task);

// Verify retries occurred
expect(agent.executeTask).toHaveBeenCalledTimes(3);
```

## Troubleshooting

### Issue: Too Many Retries
**Symptom**: Operations taking too long due to excessive retries
**Solution**:
- Reduce maxAttempts
- Increase baseDelay
- Check if errors are properly classified

### Issue: Circuit Breaker Stays Open
**Symptom**: Circuit breaker not resetting automatically
**Solution**:
- Check resetAfter timeout
- Verify system has recovered
- Reset manually if needed

### Issue: Checkpoints Consuming Memory
**Symptom**: Memory usage increasing over time
**Solution**:
- Reduce maxCheckpoints limit
- Clear old checkpoints manually
- Implement persistent storage

### Issue: Fatal Errors Being Retried
**Symptom**: System retrying unrecoverable errors
**Solution**:
- Check error classification patterns
- Update ERROR_CLASSIFICATION_MATRIX
- Use specific error messages

## Future Enhancements

### Planned Features
1. **Persistent Checkpoint Storage**: Save checkpoints to database
2. **Distributed Circuit Breaker**: Share circuit breaker state across instances
3. **Adaptive Retry**: Adjust retry strategy based on success rate
4. **Error Pattern Learning**: ML-based error classification
5. **Recovery Suggestions**: AI-powered recovery recommendations
6. **Custom Recovery Actions**: Plugin system for custom recovery logic
7. **Error Analytics Dashboard**: Visualize error trends and patterns
8. **Automated Rollback**: Automatic state restoration on critical errors

## Conclusion

The intelligent retry logic and error handling system provides:
- ✅ Automatic recovery from transient failures
- ✅ Intelligent error classification
- ✅ Multiple backoff strategies
- ✅ Circuit breaker protection
- ✅ Checkpoint/rollback capability
- ✅ Comprehensive monitoring and statistics
- ✅ Flexible configuration
- ✅ Production-ready reliability

The system significantly improves orchestrator resilience and reduces the need for manual intervention while still properly escalating conflicts and fatal errors that require human attention.
