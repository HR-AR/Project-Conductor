# Error Classification Matrix

## Quick Reference Guide

This document provides a comprehensive reference for how the Project Conductor orchestrator classifies and handles different types of errors.

## Error Type Summary

| Error Type | Retryable | Max Retries | Backoff Strategy | Human Intervention |
|------------|-----------|-------------|------------------|-------------------|
| **Transient** | ✅ Yes | 5 | Exponential | ❌ No |
| **Retriable** | ✅ Yes | 3 | Linear | ❌ No |
| **Fatal** | ❌ No | 0 | N/A | ✅ Yes |
| **Conflict** | ❌ No | 0 | N/A | ✅ Yes |

## Detailed Classification Matrix

### Transient Errors (Auto-Retry)

| Error Pattern | Category | Severity | Max Attempts | Backoff | Action |
|---------------|----------|----------|--------------|---------|--------|
| `timeout` | Network Timeout | Low | 5 | 1s→16s | Retry with Backoff |
| `timed out` | Network Timeout | Low | 5 | 1s→16s | Retry with Backoff |
| `ETIMEDOUT` | Network Timeout | Low | 5 | 1s→16s | Retry with Backoff |
| `ECONNRESET` | Connection Reset | Medium | 5 | 1s→16s | Retry with Backoff |
| `rate limit` | Rate Limit | Medium | 5 | 1s→16s | Retry with Backoff |
| `too many requests` | Rate Limit | Medium | 5 | 1s→16s | Retry with Backoff |
| `429` | Rate Limit | Medium | 5 | 1s→16s | Retry with Backoff |
| `connection reset` | Connection Reset | Medium | 5 | 1s→16s | Retry with Backoff |
| `ECONNREFUSED` | Connection Reset | Medium | 5 | 1s→16s | Retry with Backoff |
| `ENOTFOUND` | Connection Reset | Medium | 5 | 1s→16s | Retry with Backoff |
| `service unavailable` | Service Unavailable | Medium | 5 | 1s→16s | Retry with Backoff |
| `503` | Service Unavailable | Medium | 5 | 1s→16s | Retry with Backoff |
| `502` | Service Unavailable | Medium | 5 | 1s→16s | Retry with Backoff |
| `504` | Service Unavailable | Medium | 5 | 1s→16s | Retry with Backoff |

**Backoff Sequence**: 1s, 2s, 4s, 8s, 16s (exponential with 0-20% jitter)

---

### Retriable Errors (Retry with Delay)

| Error Pattern | Category | Severity | Max Attempts | Backoff | Action |
|---------------|----------|----------|--------------|---------|--------|
| `locked` | Resource Locked | Medium | 3 | 2s→6s | Retry with Backoff |
| `EBUSY` | Resource Locked | Medium | 3 | 2s→6s | Retry with Backoff |
| `resource busy` | Resource Locked | Medium | 3 | 2s→6s | Retry with Backoff |
| `dependency` | Dependency Missing | Medium | 3 | 2s→6s | Retry |
| `prerequisite` | Dependency Missing | Medium | 3 | 2s→6s | Retry |
| `not found` | Dependency Missing | Medium | 3 | 2s→6s | Retry |
| `validation failed` | Validation Error | Medium | 3 | 2s→6s | Alternative Path |
| `invalid input` | Validation Error | Medium | 3 | 2s→6s | Alternative Path |
| `temporary failure` | Temporary Failure | Low | 3 | 2s→6s | Retry |
| `try again` | Temporary Failure | Low | 3 | 2s→6s | Retry |

**Backoff Sequence**: 2s, 4s, 6s (linear with 0-20% jitter)

---

### Fatal Errors (No Retry - Fail Immediately)

| Error Pattern | Category | Severity | Action |
|---------------|----------|----------|--------|
| `permission denied` | Permission Denied | Critical | Fail Immediately |
| `EACCES` | Permission Denied | Critical | Fail Immediately |
| `unauthorized` | Permission Denied | Critical | Fail Immediately |
| `403` | Permission Denied | Critical | Fail Immediately |
| `401` | Permission Denied | Critical | Fail Immediately |
| `invalid config` | Invalid Configuration | Critical | Fail Immediately |
| `configuration error` | Invalid Configuration | Critical | Fail Immediately |
| `EINVAL` | Invalid Configuration | Critical | Fail Immediately |
| `not found` | Resource Not Found | High | Fail Immediately |
| `ENOENT` | Resource Not Found | High | Fail Immediately |
| `404` | Resource Not Found | High | Fail Immediately |
| `syntax error` | Syntax Error | High | Fail Immediately |
| `parse error` | Syntax Error | High | Fail Immediately |
| `malformed` | Syntax Error | High | Fail Immediately |
| `out of memory` | Out of Memory | Critical | Circuit Break |
| `ENOMEM` | Out of Memory | Critical | Circuit Break |
| `heap` | Out of Memory | Critical | Circuit Break |
| `memory limit` | Out of Memory | Critical | Circuit Break |

**Action**: Log error with full context, mark task as failed, notify monitoring systems

---

### Conflict Errors (Pause Workflow - Human Intervention Required)

| Error Pattern | Category | Severity | Action |
|---------------|----------|----------|--------|
| `security` | Security Vulnerability | Critical | Pause Workflow |
| `vulnerability` | Security Vulnerability | Critical | Pause Workflow |
| `CVE` | Security Vulnerability | Critical | Pause Workflow |
| `exploit` | Security Vulnerability | Critical | Pause Workflow |
| `business rule` | Business Rule Violation | High | Pause Workflow |
| `policy` | Policy Violation | High | Pause Workflow |
| `compliance` | Policy Violation | High | Pause Workflow |
| `integrity` | Data Integrity Issue | High | Pause Workflow |
| `constraint` | Data Integrity Issue | High | Pause Workflow |
| `conflict` | Data Integrity Issue | High | Pause Workflow |

**Action**: Pause orchestrator, emit workflow-paused event, log conflict details, notify admins

---

## Recovery Action Details

### 1. Retry with Backoff
- **Used For**: Transient and retriable errors
- **Behavior**: Automatically retry with increasing delays
- **Max Attempts**: 3-5 depending on error type
- **Strategies**:
  - Exponential: 1s, 2s, 4s, 8s, 16s
  - Linear: 2s, 4s, 6s
  - Fibonacci: 1s, 1s, 2s, 3s, 5s, 8s
  - Fixed: 1s, 1s, 1s, 1s, 1s
- **Jitter**: 0-20% random variation to prevent thundering herd

### 2. Retry (No Backoff)
- **Used For**: Simple retriable errors
- **Behavior**: Immediate retry
- **Max Attempts**: 3

### 3. Alternative Path
- **Used For**: Validation errors
- **Behavior**: Try different approach to accomplish goal
- **Max Attempts**: Depends on alternatives available

### 4. Fail Immediately
- **Used For**: Fatal errors
- **Behavior**: No retries, mark as failed
- **Logging**: Full error context logged

### 5. Pause Workflow
- **Used For**: Conflicts requiring human decision
- **Behavior**: Stop orchestrator, emit event, wait for manual resolution
- **Notification**: Activity service + workflow-paused event

### 6. Rollback
- **Used For**: Partial failures requiring state restoration
- **Behavior**: Restore to last checkpoint
- **Checkpoint**: Must have been created before operation

### 7. Circuit Break
- **Used For**: System-wide failures (out of memory)
- **Behavior**: Open circuit breaker, stop all operations
- **Reset**: Manual reset required or automatic after timeout

### 8. Skip
- **Used For**: Optional operations
- **Behavior**: Skip operation, continue workflow

---

## Circuit Breaker Thresholds

| Error Type | Threshold | Window | Reset After |
|------------|-----------|--------|-------------|
| Transient | 10 failures | 5 minutes | 5 minutes |
| Retriable | 5 failures | 5 minutes | 5 minutes |
| Fatal | N/A | N/A | N/A |
| Conflict | N/A | N/A | N/A |

---

## Severity Levels

### Critical
- **Definition**: System-critical failures requiring immediate attention
- **Examples**: Out of memory, security vulnerabilities, permission denied
- **Action**: Alert operations team, consider emergency response

### High
- **Definition**: Significant failures affecting functionality
- **Examples**: Resource not found, syntax errors, business rule violations
- **Action**: Log for investigation, notify relevant teams

### Medium
- **Definition**: Recoverable failures that may impact performance
- **Examples**: Rate limits, resource locks, validation errors
- **Action**: Monitor retry success rate, adjust configuration if needed

### Low
- **Definition**: Temporary issues that typically self-resolve
- **Examples**: Network timeouts, temporary failures
- **Action**: Log for patterns, generally auto-recovers

---

## Decision Tree

```
Error Occurs
    |
    ├─ Is it a security/policy/integrity issue?
    |       ├─ YES → CONFLICT → Pause Workflow → Human Intervention
    |       └─ NO → Continue
    |
    ├─ Is it a permission/config/not-found error?
    |       ├─ YES → FATAL → Fail Immediately → Log & Notify
    |       └─ NO → Continue
    |
    ├─ Is it a timeout/rate-limit/service-down error?
    |       ├─ YES → TRANSIENT → Retry 5x (1s→16s exponential)
    |       └─ NO → Continue
    |
    └─ Is it a lock/dependency/validation error?
            ├─ YES → RETRIABLE → Retry 3x (2s→6s linear)
            └─ NO → RETRIABLE (unknown) → Retry 3x
```

---

## Monitoring Checklist

### Key Metrics to Track

- [ ] **Retry Success Rate**: % of operations that succeed after retries
- [ ] **Average Retry Count**: Average number of retries per operation
- [ ] **Circuit Breaker Opens**: Number of times circuit breaker has opened
- [ ] **Fatal Error Rate**: % of operations that fail with fatal errors
- [ ] **Conflict Rate**: % of operations that pause workflow
- [ ] **Average Recovery Time**: Time to recover from errors
- [ ] **Checkpoint Usage**: Number of rollbacks performed

### Alert Conditions

- [ ] Circuit breaker opened
- [ ] Fatal error rate > 5%
- [ ] Conflict detected (immediate alert)
- [ ] Average retry count > 2
- [ ] Any out-of-memory errors
- [ ] Security vulnerability detected

---

## Example Error Messages

### Transient (Will Retry)
```
❯ Connection timeout after 5000ms
  ├─ Type: Transient
  ├─ Category: Network Timeout
  ├─ Severity: Low
  ├─ Action: Retry with exponential backoff
  └─ Max Attempts: 5
```

### Fatal (Will Not Retry)
```
❌ Permission denied: EACCES
  ├─ Type: Fatal
  ├─ Category: Permission Denied
  ├─ Severity: Critical
  ├─ Action: Fail immediately
  └─ Recommendation: Check file/directory permissions
```

### Conflict (Needs Human)
```
⚠️  Security vulnerability CVE-2023-1234 detected
  ├─ Type: Conflict
  ├─ Category: Security Vulnerability
  ├─ Severity: Critical
  ├─ Action: Pause workflow
  └─ Next Step: Review vulnerability and approve/reject
```

---

## Configuration Examples

### Conservative (Production)
```typescript
{
  maxAttempts: 3,
  strategy: BackoffStrategy.EXPONENTIAL,
  baseDelay: 2000,
  maxDelay: 30000,
  circuitBreakerThreshold: 5
}
```

### Aggressive (Development)
```typescript
{
  maxAttempts: 5,
  strategy: BackoffStrategy.FIXED,
  baseDelay: 500,
  maxDelay: 5000,
  circuitBreakerThreshold: 10
}
```

### Minimal (Testing)
```typescript
{
  maxAttempts: 2,
  strategy: BackoffStrategy.FIXED,
  baseDelay: 100,
  maxDelay: 1000,
  circuitBreakerThreshold: 3
}
```

---

## Quick Command Reference

```bash
# Run retry manager tests
npm test tests/unit/orchestrator/retry-manager.test.ts

# Run error handler tests
npm test tests/unit/orchestrator/error-handler.test.ts

# Check retry statistics
curl http://localhost:3000/api/v1/orchestrator/retry-stats

# Check circuit breaker status
curl http://localhost:3000/api/v1/orchestrator/circuit-breakers

# Reset circuit breaker
curl -X POST http://localhost:3000/api/v1/orchestrator/circuit-breakers/reset

# Get checkpoint list
curl http://localhost:3000/api/v1/orchestrator/checkpoints
```

---

## Additional Resources

- **Full Documentation**: [ERROR_HANDLING_AND_RETRY.md](./ERROR_HANDLING_AND_RETRY.md)
- **Implementation**:
  - `src/models/error-recovery.model.ts`
  - `src/services/orchestrator/retry-manager.service.ts`
  - `src/services/orchestrator/error-handler.service.ts`
- **Tests**:
  - `tests/unit/orchestrator/retry-manager.test.ts`
  - `tests/unit/orchestrator/error-handler.test.ts`
