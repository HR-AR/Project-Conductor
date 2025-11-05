# Database Optimization Checklist

**Quick Reference for Implementation**
**Generated**: 2025-10-28

---

## Quick Wins (Week 1) - 1.1 Hours Total

### 1. Create Composite Indexes (10 minutes) ✅ P0

```bash
cd /Users/h0r03cw/Desktop/Coding/Project\ Conductor
psql -U conductor -d conductor -f database/optimizations.sql
```

**Verification**:
```sql
-- Check indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('document_index', 'prds', 'activity_log', 'links', 'audit_logs');
```

**Impact**: 70% faster dashboard queries

---

### 2. Fix Links Service N+1 Query (30 minutes) ✅ P0

**File**: `src/services/links.service.ts`

**Add Method**:
```typescript
private async batchGetRequirements(ids: string[]): Promise<Requirement[]> {
  if (ids.length === 0) return [];

  const query = `
    SELECT r.*, u.username, u.first_name, u.last_name
    FROM requirements r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ANY($1)
  `;

  const result = await db.query(query, [ids]);
  return result.rows.map(row => this.mapRowToRequirement(row));
}
```

**Update Method**:
```typescript
async getRequirementLinks(requirementId: string): Promise<RequirementLinks> {
  const [incomingLinks, outgoingLinks] = await Promise.all([
    simpleMockService.getIncomingLinks(requirementId),
    simpleMockService.getOutgoingLinks(requirementId)
  ]);

  // Batch fetch all requirements
  const allLinks = [...incomingLinks, ...outgoingLinks];
  const requirementIds = new Set<string>();
  allLinks.forEach(link => {
    requirementIds.add(link.sourceId);
    requirementIds.add(link.targetId);
  });

  const requirements = await this.batchGetRequirements(Array.from(requirementIds));
  const requirementsMap = new Map(requirements.map(r => [r.id, r]));

  // Populate from map
  const populatedIncoming = incomingLinks.map(link => ({
    ...link,
    sourceRequirement: requirementsMap.get(link.sourceId),
    targetRequirement: requirementsMap.get(link.targetId),
  }));

  const populatedOutgoing = outgoingLinks.map(link => ({
    ...link,
    sourceRequirement: requirementsMap.get(link.sourceId),
    targetRequirement: requirementsMap.get(link.targetId),
  }));

  return {
    requirementId,
    incomingLinks: populatedIncoming,
    outgoingLinks: populatedOutgoing,
    totalLinks: allLinks.length,
    suspectLinks: allLinks.filter(l => l.isSuspect).length,
  };
}
```

**Test**:
```bash
npm test -- links.service
```

**Impact**: 85% reduction in queries (20 queries → 1 query for 10 links)

---

### 3. Add Activity Log Pagination (15 minutes) ✅ P0

**File**: `src/services/activity.service.ts`

**Update Method Signature**:
```typescript
async getProjectActivity(
  projectId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<ActivityLog>>
```

**Update Query**:
```typescript
const offset = (page - 1) * limit;

const countQuery = `
  SELECT COUNT(*) FROM activity_log WHERE project_id = $1
`;

const dataQuery = `
  SELECT id, event_type, agent_type, task_description, status, timestamp
  FROM activity_log
  WHERE project_id = $1
  ORDER BY timestamp DESC
  LIMIT $2 OFFSET $3
`;

const [countResult, dataResult] = await Promise.all([
  db.query(countQuery, [projectId]),
  db.query(dataQuery, [projectId, limit, offset])
]);

const total = parseInt(countResult.rows[0].count);

return {
  data: dataResult.rows,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }
};
```

**Update Controller**:
```typescript
// src/controllers/activity.controller.ts
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 50;
const result = await activityService.getProjectActivity(projectId, page, limit);
```

**Test**:
```bash
curl "http://localhost:3000/api/v1/activity?projectId=123&page=1&limit=50"
```

**Impact**: Prevents 10,000+ row responses (5 MB → 25 KB)

---

### 4. Enable Dashboard Caching (10 minutes) ✅ P0

**File**: `src/routes/dashboard.routes.ts` (or wherever dashboard routes are)

**Add Imports**:
```typescript
import { cacheMiddleware, cacheInvalidationMiddleware } from '../middleware/cache';
import { redisClient } from '../config/redis';
```

**Apply Caching**:
```typescript
// Cache dashboard summary for 60 seconds
router.get(
  '/summary',
  cacheMiddleware(redisClient, { ttl: 60, keyPrefix: 'dashboard' }),
  dashboardController.getSummary
);

router.get(
  '/projects',
  cacheMiddleware(redisClient, { ttl: 120, keyPrefix: 'dashboard' }),
  dashboardController.getProjects
);

// Invalidate dashboard cache on BRD/PRD updates
router.put(
  '/api/v1/brds/:id',
  cacheInvalidationMiddleware(redisClient, {
    keyPrefix: 'dashboard',
    relatedPaths: ['/api/v1/dashboard']
  }),
  brdController.updateBRD
);

router.put(
  '/api/v1/prds/:id',
  cacheInvalidationMiddleware(redisClient, {
    keyPrefix: 'dashboard',
    relatedPaths: ['/api/v1/dashboard']
  }),
  prdController.updatePRD
);
```

**Test**:
```bash
# First request (cache miss)
curl -I http://localhost:3000/api/v1/dashboard/summary
# X-Cache: MISS

# Second request (cache hit)
curl -I http://localhost:3000/api/v1/dashboard/summary
# X-Cache: HIT
```

**Impact**: 90% cache hit rate = 90% fewer dashboard queries

---

## Medium Priority (Week 2) - 3.5 Hours

### 5. Replace SELECT * with Column Lists (2 hours) ⚠️ P1

**Find Files**:
```bash
grep -rn "SELECT \*" src/services/ > /tmp/select-star-list.txt
cat /tmp/select-star-list.txt
```

**Priority Files** (fix these first):
1. `src/services/decision-register.service.ts:192,219`
2. `src/services/brd.service.ts:255`
3. `src/services/activity.service.ts:359,451,462`
4. `src/services/document-index.service.ts:149,169,191,212,231`

**Example Fix**:
```typescript
// BEFORE:
const query = `SELECT * FROM brds WHERE id = $1`;

// AFTER:
const query = `
  SELECT id, title, status, problem_statement, business_impact,
         success_criteria, timeline_start_date, timeline_target_date,
         budget, stakeholders, approvals, version, created_at, updated_at
  FROM brds
  WHERE id = $1
`;
```

**Impact**: 40-50% I/O reduction per query

---

### 6. Fix Comments Service N+1 (30 minutes) ⚠️ P1

**File**: `src/services/comments.service.ts`

**Similar to Links Service Fix**:
```typescript
private async batchGetUsers(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  const query = `
    SELECT id, username, first_name, last_name, role
    FROM users
    WHERE id = ANY($1)
  `;

  const result = await db.query(query, [userIds]);
  return result.rows;
}

async getCommentsByRequirement(requirementId: string): Promise<Comment[]> {
  const allComments = Array.from(this.commentsStorage.values())
    .filter(comment => comment.requirementId === requirementId);

  // Batch fetch users
  const userIds = [...new Set(allComments.map(c => c.userId))];
  const users = await this.batchGetUsers(userIds);
  const userMap = new Map(users.map(u => [u.id, u]));

  // Enrich without queries
  return allComments.map(comment => ({
    ...comment,
    user: userMap.get(comment.userId),
  }));
}
```

**Impact**: 50 comments = 50 queries → 1 query

---

### 7. Optimize Approval Transaction (1 hour) ⚠️ P2

**File**: `src/services/approval-workflow.service.ts:141-200`

**Move Read-Only Operations Outside Transaction**:
```typescript
async recordVote(approvalId: number, vote: VoteRequest): Promise<ApprovalStatusResponse> {
  // 1. Validate outside transaction (read-only)
  const approval = await this.getApprovalById(approvalId);
  if (!approval) throw new Error('Approval not found');

  const reviewer = await this.validateReviewer(approvalId, vote.reviewer_id);
  if (!reviewer) throw new Error('Unauthorized reviewer');

  // 2. Short write transaction
  const decision = await db.withTransaction(async (client: PoolClient) => {
    // Record decision
    const decision = await this.decisionRegisterService.recordDecision(
      approval.narrative_id, approval.narrative_version, vote, client
    );

    // Update reviewer status
    await client.query(updateReviewerQuery, [
      statusMap[vote.vote], approvalId, vote.reviewer_id
    ]);

    return decision;
  });

  // 3. Post-transaction checks (read-only)
  const statusCheck = await this.decisionRegisterService.checkApprovalStatus(approvalId);
  const decisions = await this.decisionRegisterService.getDecisions(
    approval.narrative_id, approval.narrative_version
  );

  return { approval, decision, statusCheck, decisions };
}
```

**Impact**: Transaction time 500ms → 50ms (10x faster)

---

## Advanced (Week 3) - 2 Hours

### 8. Cache Stampede Prevention (1 hour) ⚠️ P2

**File**: `src/middleware/cache.ts`

**Add Lock Mechanism** (see full code in main report section "Cache Improvements > Cache Stampede Prevention")

**Test**:
```bash
# Simulate stampede (100 concurrent requests when cache expires)
ab -n 100 -c 100 http://localhost:3000/api/v1/dashboard/summary
```

**Impact**: Prevents DB overload during cache expiration

---

### 9. User-Aware Cache Keys (30 minutes) ⚠️ P2

**File**: `src/middleware/cache.ts:18-33`

**Update generateCacheKey**:
```typescript
const generateCacheKey = (req: Request, options: CacheOptions): string => {
  const prefix = options.keyPrefix || 'api';
  const path = req.path;
  const userRole = req.user?.role || 'guest';  // Add role to cache key

  const query = { ...req.query };
  if (options.excludeQuery) {
    options.excludeQuery.forEach(param => delete query[param]);
  }

  const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '';

  return `${prefix}:${path}:${userRole}:${queryString}`;
};
```

**Impact**: Prevents cache poisoning across user roles

---

### 10. Tune Connection Pool (30 minutes) ⚠️ P2

**File**: `.env`

**Development**:
```bash
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
```

**Production (single instance)**:
```bash
DB_POOL_MAX=30
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=60000
DB_CONNECTION_TIMEOUT=5000
```

**Production (3 instances)**:
```bash
# PostgreSQL max_connections = 100
# (100 - 3 superuser) / 3 instances = 32 per instance
DB_POOL_MAX=30  # Leave 2 connections as buffer
DB_POOL_MIN=5
```

**Monitor**:
```typescript
// Add to health check endpoint
app.get('/health', (req, res) => {
  const poolStatus = db.getPoolStatus();
  res.json({
    database: {
      connected: true,
      pool: poolStatus,
      utilizationPercent: (poolStatus.totalCount / 30) * 100,
    }
  });
});
```

---

## Testing & Validation

### Performance Benchmarks

**Before Optimization**:
```bash
# Run baseline benchmarks
npm run benchmark:baseline

# Or manually:
ab -n 1000 -c 10 http://localhost:3000/api/v1/dashboard/summary
ab -n 1000 -c 10 http://localhost:3000/api/v1/brds
ab -n 1000 -c 10 http://localhost:3000/api/v1/requirements/REQ-001/links
```

**After Optimization**:
```bash
npm run benchmark:optimized

# Compare results
npm run benchmark:compare
```

**Expected Improvements**:
- Dashboard: 800ms → 100ms (87% faster)
- BRD list: 250ms → 150ms (40% faster)
- Links: 180ms → 45ms (75% faster)

---

### Database Health Check

**Run After Optimization**:
```sql
-- 1. Index usage (should show >100 scans per index after 1 week)
SELECT indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 2. Cache hit ratio (should be >95%)
SELECT
  CASE
    WHEN sum(heap_blks_hit) + sum(heap_blks_read) = 0 THEN 0
    ELSE round(sum(heap_blks_hit)::numeric / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2)
  END AS cache_hit_ratio
FROM pg_statio_user_tables;

-- 3. Slow queries (should show <5% of queries >100ms)
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- 4. Table bloat (should be <20% dead rows)
SELECT tablename, n_live_tup, n_dead_tup,
       round((n_dead_tup::numeric / n_live_tup) * 100, 2) AS bloat_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY bloat_ratio DESC;
```

---

## Rollback Plan

**If Issues Occur**:

1. **Remove Indexes**:
```bash
psql -U conductor -d conductor -c "
DROP INDEX CONCURRENTLY IF EXISTS idx_document_index_status_health;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_index_type_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_prds_brd_status;
"
```

2. **Disable Caching**:
```typescript
// Comment out cache middleware in routes
// router.get('/summary', cacheMiddleware(...), controller.getSummary);
router.get('/summary', controller.getSummary);
```

3. **Revert Code Changes**:
```bash
git checkout main -- src/services/links.service.ts
git checkout main -- src/services/activity.service.ts
```

---

## Success Metrics

**Track These KPIs**:

| Metric | Before | Target | Current |
|--------|--------|--------|---------|
| Dashboard load time | 800ms | <150ms | _____ |
| Cache hit rate | 65% | >85% | _____ |
| DB CPU usage | 50% | <30% | _____ |
| Query count (per request) | 15-20 | 3-5 | _____ |
| P95 response time | 1200ms | <300ms | _____ |
| Concurrent users | 50 | 150+ | _____ |

**Monitoring Dashboard**:
```bash
# Set up Grafana/Prometheus for:
- Query response times (by endpoint)
- Cache hit/miss rates
- Database connection pool usage
- Slow query log alerts (>500ms)
```

---

## Timeline Summary

| Week | Tasks | Time | Priority |
|------|-------|------|----------|
| Week 1 | Indexes, N+1 fix, pagination, caching | 1.1 hrs | P0 |
| Week 2 | SELECT *, comments N+1, transactions | 3.5 hrs | P1 |
| Week 3 | Cache stampede, user-aware keys, pool | 2 hrs | P2 |
| Week 4 | Monitoring, benchmarks, documentation | 4 hrs | P2 |

**Total Effort**: ~10.5 hours
**Expected ROI**: 40-70% performance improvement

---

## Next Steps

1. ✅ Review this checklist with team
2. ✅ Run baseline performance tests
3. ✅ Execute Week 1 optimizations (1.1 hours)
4. ✅ Deploy to staging and test
5. ✅ Measure improvements
6. ✅ Proceed to Week 2 if successful

**Questions?** Refer to main report: `.claude/reports/database-optimization.md`
