# Error Handling Flow Diagram

## Visual Flow of Error Handling System

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR ENGINE                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 1. Create Checkpoint (Before Risky Operation)        │     │
│  │    → Save current orchestrator state                 │     │
│  │    → Store agent states                              │     │
│  │    → Record timestamp                                │     │
│  └──────────────────────────────────────────────────────┘     │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ 2. Execute Task with Retry Manager                   │     │
│  │    → Wrap agent.executeTask() with retry logic      │     │
│  │    → Configure retry strategy                        │     │
│  │    → Set max attempts and backoff                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                            ↓                                    │
│                    ┌──────────────┐                            │
│                    │ Execute Task │                            │
│                    └──────────────┘                            │
│                            ↓                                    │
│              ┌─────────────┴─────────────┐                     │
│              │                           │                     │
│         SUCCESS ✓                  ERROR ✗                     │
│              │                           │                     │
└──────────────┼───────────────────────────┼─────────────────────┘
               │                           │
               ↓                           ↓
    ┌──────────────────┐      ┌────────────────────────────┐
    │ Handle Success   │      │ ERROR HANDLER SERVICE      │
    │ - Update task    │      │                            │
    │ - Log success    │      │ 1. Classify Error          │
    │ - Check          │      │    ↓                       │
    │   milestone      │      │ 2. Determine Recovery      │
    │ - Continue       │      │    ↓                       │
    │   workflow       │      │ 3. Execute Action          │
    └──────────────────┘      └────────────────────────────┘
                                         ↓
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ↓                          ↓                          ↓
    ┌─────────────────┐       ┌──────────────────┐     ┌───────────────────┐
    │  TRANSIENT      │       │   RETRIABLE      │     │    FATAL          │
    │  - Timeout      │       │   - Locked       │     │    - Permission   │
    │  - Rate Limit   │       │   - Missing Dep  │     │      Denied       │
    │  - 503          │       │   - Validation   │     │    - Not Found    │
    └─────────────────┘       └──────────────────┘     │    - Invalid      │
              ↓                          ↓              │      Config       │
    ┌─────────────────┐       ┌──────────────────┐     └───────────────────┘
    │ RETRY MANAGER   │       │ RETRY MANAGER    │              ↓
    │ Max: 5 attempts │       │ Max: 3 attempts  │     ┌───────────────────┐
    │ Backoff:        │       │ Backoff:         │     │ FAIL IMMEDIATELY  │
    │ Exponential     │       │ Linear           │     │ - Log error       │
    │ 1→2→4→8→16s     │       │ 2→4→6s           │     │ - Mark failed     │
    └─────────────────┘       └──────────────────┘     │ - Notify          │
              ↓                          ↓              └───────────────────┘
              │                          │
              ↓                          ↓
    ┌─────────────────────────────────────────┐
    │     Attempt 1 (Initial)                 │
    │              ↓                           │
    │         FAILS? → Wait (Backoff)         │
    │              ↓                           │
    │     Attempt 2 (Retry 1)                 │
    │              ↓                           │
    │         FAILS? → Wait (Backoff)         │
    │              ↓                           │
    │     Attempt 3 (Retry 2)                 │
    │              ↓                           │
    │     ... up to max attempts              │
    └─────────────────────────────────────────┘
              ↓
    ┌─────────────────┐
    │ Check Circuit   │
    │ Breaker         │
    └─────────────────┘
              ↓
        ┌─────┴─────┐
        │           │
    OPEN ✗      CLOSED ✓
        │           │
        ↓           ↓
   ┌────────┐   ┌──────┐
   │ BLOCK  │   │ALLOW │
   │REQUEST │   │RETRY │
   └────────┘   └──────┘
                    ↓
              ┌─────┴─────┐
              │           │
          SUCCESS ✓   FAIL ✗
              │           │
              ↓           ↓
        ┌──────────┐ ┌──────────┐
        │Decrement │ │Increment │
        │ Failure  │ │ Failure  │
        │ Count    │ │ Count    │
        └──────────┘ └──────────┘
                         ↓
                 ┌───────────────┐
                 │ >= Threshold? │
                 └───────────────┘
                         ↓
                    ┌────┴────┐
                    │         │
                  YES ✗     NO ✓
                    │         │
                    ↓         ↓
              ┌──────────┐ Continue
              │  OPEN    │
              │ CIRCUIT  │
              └──────────┘
```

## Conflict Error Flow

```
┌─────────────────────────────────────────────────────────┐
│                   CONFLICT DETECTED                     │
│  - Security Vulnerability (CVE)                         │
│  - Business Rule Violation                              │
│  - Data Integrity Issue                                 │
│  - Policy Violation                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              ERROR HANDLER CLASSIFICATION               │
│  Type: CONFLICT                                         │
│  Category: SECURITY_VULNERABILITY                       │
│  Severity: CRITICAL                                     │
│  Recovery Action: PAUSE_WORKFLOW                        │
│  Requires Human Intervention: YES                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              ORCHESTRATOR ACTIONS                       │
│  1. Mark task as FAILED                                 │
│  2. Log conflict details                                │
│  3. Emit 'workflow-paused' event                        │
│  4. Notify ActivityService                              │
│  5. Log conflict for human review                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              ACTIVITY SERVICE LOGS                      │
│  - logAgentConflictDetected()                           │
│    • Conflict type                                      │
│    • Severity                                           │
│    • Affected items                                     │
│    • Recommended actions                                │
│  - logAgentPaused()                                     │
│    • Reason                                             │
│    • Required action                                    │
│    • Action URL                                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│              WORKFLOW PAUSED                            │
│  Orchestrator STOPPED                                   │
│  Waiting for HUMAN RESOLUTION                           │
└─────────────────────────────────────────────────────────┘
                        ↓
            ┌───────────────────┐
            │  Human Reviews:   │
            │  1. Analyze issue │
            │  2. Make decision │
            │  3. Take action   │
            └───────────────────┘
                        ↓
            ┌───────────────────┐
            │  Resume or Abort  │
            └───────────────────┘
```

## Retry with Backoff Visualization

### Exponential Backoff (Transient Errors)

```
Attempt:  1      2        3          4            5
          │      │        │          │            │
Time:     0s     1s       3s         7s           15s
          │      │        │          │            │
          ↓      ↓        ↓          ↓            ↓
        [FAIL] [FAIL]  [FAIL]     [FAIL]      [SUCCESS]
          │      │        │          │            │
Wait:    1s     2s       4s         8s           ─
          │      │        │          │            │
Delay:   1.0s   2.1s     4.3s       8.2s         ─
         (base)  (2x)     (4x)       (8x)
         +jitter +jitter  +jitter    +jitter

Total Duration: ~15.6s
Retries Used: 4
Final Result: SUCCESS ✓
```

### Linear Backoff (Retriable Errors)

```
Attempt:  1      2        3
          │      │        │
Time:     0s     2s       6s
          │      │        │
          ↓      ↓        ↓
        [FAIL] [FAIL]  [SUCCESS]
          │      │        │
Wait:    2s     4s       ─
          │      │        │
Delay:   2.1s   4.2s     ─
         (1x)   (2x)
         +jitter +jitter

Total Duration: ~6.3s
Retries Used: 2
Final Result: SUCCESS ✓
```

## Circuit Breaker State Machine

```
                    ┌─────────────┐
                    │   CLOSED    │
                    │  (Normal)   │
                    └─────────────┘
                          │
                          │ failures++
                          ↓
              ┌───────────────────────┐
              │ failures >= threshold? │
              └───────────────────────┘
                    │           │
               YES  │           │  NO
                    ↓           ↓
            ┌──────────┐   Continue
            │   OPEN   │   Operations
            │ (Block)  │
            └──────────┘
                 │
                 │ wait 5 minutes
                 ↓
         ┌──────────────┐
         │  HALF-OPEN   │
         │ (Test Mode)  │
         └──────────────┘
                 │
                 ↓
         ┌──────────────┐
         │ Test Request │
         └──────────────┘
                 │
         ┌───────┴───────┐
         │               │
    SUCCESS ✓       FAIL ✗
         │               │
         ↓               ↓
   ┌─────────┐    ┌─────────┐
   │ CLOSED  │    │  OPEN   │
   │ Reset   │    │ Again   │
   └─────────┘    └─────────┘
```

## Checkpoint and Rollback Flow

```
┌─────────────────────────────────────────────────────────┐
│              BEFORE RISKY OPERATION                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│           CREATE CHECKPOINT                             │
│  ID: checkpoint-1                                       │
│  Timestamp: 2025-10-12T10:30:00Z                        │
│  Phase: PHASE_1                                         │
│  State:                                                 │
│    - Current phase                                      │
│    - Completed phases                                   │
│    - Active agents                                      │
│    - Milestones                                         │
│    - Tasks                                              │
│    - Metrics                                            │
│  Agent States: Map<AgentType, State>                    │
│  Metadata:                                              │
│    - Description                                        │
│    - Automatic: true                                    │
│    - Triggered by: agent-api                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│           EXECUTE RISKY OPERATION                       │
└─────────────────────────────────────────────────────────┘
                        ↓
              ┌─────────┴─────────┐
              │                   │
        SUCCESS ✓             ERROR ✗
              │                   │
              ↓                   ↓
    ┌──────────────┐    ┌──────────────────┐
    │  Continue    │    │  ERROR HANDLER   │
    │  Workflow    │    │  Determines:     │
    │              │    │  ROLLBACK needed │
    │  Checkpoint  │    └──────────────────┘
    │  kept for    │              ↓
    │  future use  │    ┌──────────────────┐
    └──────────────┘    │  ROLLBACK TO     │
                        │  CHECKPOINT      │
                        └──────────────────┘
                                  ↓
                        ┌──────────────────┐
                        │ 1. Retrieve      │
                        │    checkpoint-1  │
                        │ 2. Deserialize   │
                        │    state         │
                        │ 3. Restore       │
                        │    orchestrator  │
                        │ 4. Log rollback  │
                        │ 5. Continue from │
                        │    safe state    │
                        └──────────────────┘
```

## Error Classification Decision Tree

```
                        ERROR OCCURS
                             │
                             ↓
              ┌──────────────────────────┐
              │ Match error message      │
              │ against patterns         │
              └──────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ↓                    ↓                    ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pattern:   │     │  Pattern:   │     │  Pattern:   │
│  timeout    │     │  permission │     │  security   │
│  ETIMEDOUT  │     │  EACCES     │     │  CVE        │
│  503        │     │  401/403    │     │  exploit    │
└─────────────┘     └─────────────┘     └─────────────┘
        ↓                    ↓                    ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ TRANSIENT   │     │   FATAL     │     │  CONFLICT   │
│ Network     │     │ Permission  │     │ Security    │
│ Timeout     │     │ Denied      │     │ Vulnerability│
│             │     │             │     │             │
│ Severity:   │     │ Severity:   │     │ Severity:   │
│   LOW       │     │   CRITICAL  │     │   CRITICAL  │
│             │     │             │     │             │
│ Retryable:  │     │ Retryable:  │     │ Retryable:  │
│   YES ✓     │     │   NO ✗      │     │   NO ✗      │
│             │     │             │     │             │
│ Action:     │     │ Action:     │     │ Action:     │
│ RETRY_WITH_ │     │ FAIL_       │     │ PAUSE_      │
│ BACKOFF     │     │ IMMEDIATELY │     │ WORKFLOW    │
└─────────────┘     └─────────────┘     └─────────────┘
        ↓                    ↓                    ↓
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Retry 5x    │     │ Log & Fail  │     │ Pause &     │
│ 1→2→4→8→16s │     │ Immediately │     │ Notify      │
│ Exponential │     │             │     │ Human       │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Statistics Tracking Flow

```
┌─────────────────────────────────────────────────────────┐
│              RETRY MANAGER TRACKING                     │
│                                                         │
│  For each operation:                                    │
│  ┌───────────────────────────────────────────┐         │
│  │ RetryHistory:                             │         │
│  │  - operationId                            │         │
│  │  - agentType                              │         │
│  │  - phase                                  │         │
│  │  - totalAttempts                          │         │
│  │  - attempts: [                            │         │
│  │      { attemptNumber, timestamp,          │         │
│  │        delayMs, error, success }          │         │
│  │    ]                                      │         │
│  │  - finalSuccess                           │         │
│  │  - totalDuration                          │         │
│  │  - createdAt                              │         │
│  │  - completedAt                            │         │
│  └───────────────────────────────────────────┘         │
│                                                         │
│  Aggregated Statistics:                                │
│  ┌───────────────────────────────────────────┐         │
│  │  - totalOperations: 100                   │         │
│  │  - successfulOperations: 95               │         │
│  │  - failedOperations: 5                    │         │
│  │  - averageRetries: 1.2                    │         │
│  │  - averageDuration: 1234ms                │         │
│  │  - circuitBreakersOpen: 0                 │         │
│  └───────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              ERROR HANDLER TRACKING                     │
│                                                         │
│  For each checkpoint:                                   │
│  ┌───────────────────────────────────────────┐         │
│  │ Checkpoint:                               │         │
│  │  - id                                     │         │
│  │  - timestamp                              │         │
│  │  - phase                                  │         │
│  │  - state (serialized)                     │         │
│  │  - agentStates                            │         │
│  │  - metadata                               │         │
│  └───────────────────────────────────────────┘         │
│                                                         │
│  Statistics:                                            │
│  ┌───────────────────────────────────────────┐         │
│  │  - totalCheckpoints: 5                    │         │
│  │  - oldestCheckpoint: 2025-10-12T10:00Z    │         │
│  │  - newestCheckpoint: 2025-10-12T10:30Z    │         │
│  └───────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Key Takeaways

### Error Classification
✅ **Automatic**: Pattern-based matching
✅ **Comprehensive**: 40+ predefined patterns
✅ **Extensible**: Easy to add new patterns
✅ **Intelligent**: Appropriate recovery per type

### Retry Logic
✅ **Configurable**: Multiple backoff strategies
✅ **Smart**: Different max attempts per error type
✅ **Protected**: Circuit breaker prevents abuse
✅ **Visible**: Full retry history tracking

### Recovery Actions
✅ **Automatic**: Retries for transient/retriable
✅ **Immediate**: Fast fail for fatal errors
✅ **Human-in-loop**: Pause for conflicts
✅ **Safe**: Checkpoint/rollback for data integrity

### Monitoring
✅ **Statistics**: Comprehensive metrics
✅ **History**: Detailed attempt logs
✅ **Events**: Real-time notifications
✅ **Visibility**: Full observability
