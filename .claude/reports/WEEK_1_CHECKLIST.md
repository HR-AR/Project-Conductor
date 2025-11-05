# Week 1 Implementation Checklist

**Goal**: Fix critical bugs and high-priority type safety issues
**Time**: 40 hours (5 days @ 8 hours/day)
**Target**: Critical bugs → 0, 'any' types → 150 (40% reduction)

---

## Day 1: Critical Bug Fixes (8 hours)

### Morning (4 hours)

- [ ] **Fix Database Pool Error** (4h)
  - **File**: `src/config/database.ts`
  - **Lines**: 51-54
  - **Changes**:
    ```typescript
    // Replace process.exit(-1) with graceful recovery
    this.pool.on('error', (err) => {
      logger.error({ err }, 'Database pool error detected');
      this.handlePoolError(err);
    });

    // Add recovery method
    private async handlePoolError(error: Error): Promise<void> {
      // 3 retry attempts with 5s delay
      // Only exit if all retries fail
    }
    ```
  - **Test**: Simulate connection failure, verify recovery
  - **Commit**: `fix: graceful database pool error handling`

### Afternoon (4 hours)

- [ ] **Fix Bulk Update Transaction** (2h)
  - **File**: `src/controllers/requirements.controller.ts`
  - **Lines**: 237-244
  - **Changes**:
    ```typescript
    // Wrap in transaction for atomicity
    await db.withTransaction(async (client) => {
      for (const id of ids) {
        await updateRequirementWithClient(client, id, updates);
      }
    });
    ```
  - **Test**: Bulk update with intentional failure mid-way
  - **Commit**: `fix: atomic bulk update with transaction`

- [ ] **Add CSV Injection Prevention** (2h)
  - **File**: `src/controllers/requirements.controller.ts`
  - **Lines**: 332-376
  - **Changes**:
    ```typescript
    private escapeCSVField(field: string): string {
      // Prevent formula injection
      if (field.startsWith('=') || field.startsWith('+') ||
          field.startsWith('-') || field.startsWith('@')) {
        return `'${field}`;
      }
      return field;
    }
    ```
  - **Test**: Export with formula in title field
  - **Commit**: `fix: prevent CSV injection attacks`

---

## Day 2: Bug Fixes + Type Safety Start (8 hours)

### Morning (4 hours)

- [ ] **Fix WebSocket Memory Leak** (4h)
  - **File**: `src/services/websocket.service.ts`
  - **Changes**:
    ```typescript
    private activeListeners = new Map<string, Function[]>();

    addListener(socket: Socket, event: string, handler: Function) {
      socket.on(event, handler);
      // Track listener for cleanup
      if (!this.activeListeners.has(socket.id)) {
        this.activeListeners.set(socket.id, []);
      }
      this.activeListeners.get(socket.id)!.push(handler);
    }

    removeAllListeners(socketId: string) {
      const listeners = this.activeListeners.get(socketId);
      if (listeners) {
        listeners.forEach(handler => {
          // Remove handler
        });
        this.activeListeners.delete(socketId);
      }
    }

    // Call on disconnect
    socket.on('disconnect', () => {
      this.removeAllListeners(socket.id);
    });
    ```
  - **Test**: Connect/disconnect 100 times, check memory usage
  - **Commit**: `fix: prevent WebSocket listener memory leak`

### Afternoon (4 hours)

- [ ] **Add WebSocket Error Handling** (4h)
  - **File**: `src/index.ts`
  - **Lines**: 650 and similar socket event handlers
  - **Changes**: Wrap all socket.on handlers in try-catch
  - **Locations**:
    - Line 650: `requirement:field-change`
    - Line 670: `requirement:watch`
    - Line 680: `requirement:unwatch`
    - All other socket event handlers
  - **Pattern**:
    ```typescript
    socket.on('event', async (data) => {
      try {
        await handler(data);
      } catch (error) {
        logger.error({ error, data, socketId: socket.id }, 'Event handler failed');
        socket.emit('error', { message: 'Operation failed' });
      }
    });
    ```
  - **Commit**: `fix: add error handling to WebSocket events`

---

## Day 3: High-Priority Type Safety (8 hours)

### Morning (4 hours)

- [ ] **Fix Database Query Types** (2h)
  - **File**: `src/config/database.ts`
  - **Lines**: 84, 108
  - **Changes**:
    ```typescript
    // BEFORE
    async query(text: string, params?: any[]): Promise<any>

    // AFTER
    async query<T = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>
    ```
  - **Test**: Verify TypeScript compilation
  - **Commit**: `refactor: improve database query type safety`

- [ ] **Create RequirementRow Interface** (2h)
  - **File**: `src/services/requirements.service.ts`
  - **Lines**: 29-52 (expand RequirementRow interface)
  - **Changes**:
    ```typescript
    interface RequirementRow {
      id: string;
      title: string;
      description: string | null;
      status: RequirementStatusType;
      priority: RequirementPriorityType;
      assigned_to: string | null;
      created_by: string;
      due_date: Date | null;
      estimated_effort: number | null;
      actual_effort: number | null;
      completion_percentage: number;
      tags: string[] | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
      updated_at: Date;
      completed_at: Date | null;
      created_by_username: string;
      created_by_first_name: string | null;
      created_by_last_name: string | null;
      assigned_to_username: string | null;
      assigned_to_first_name: string | null;
      assigned_to_last_name: string | null;
    }
    ```
  - **Use in**: Lines 228, mapRowToRequirement
  - **Commit**: `refactor: add proper RequirementRow interface`

### Afternoon (4 hours)

- [ ] **Create BRD Row Interface** (2h)
  - **File**: `src/services/brd.service.ts`
  - **Changes**: Similar to RequirementRow
  - **Commit**: `refactor: add proper BRDRow interface`

- [ ] **Create PRD Row Interface** (2h)
  - **File**: `src/services/prd.service.ts`
  - **Changes**: Similar to RequirementRow
  - **Commit**: `refactor: add proper PRDRow interface`

---

## Day 4: More Type Safety (8 hours)

### Morning (4 hours)

- [ ] **Fix Error Handling in auth.service.ts** (2h)
  - **File**: `src/services/auth.service.ts`
  - **Lines**: 93, 160, 190, 216, 234, 249, 277, 305, 338, 358, 438
  - **Pattern**:
    ```typescript
    // BEFORE
    catch (error: any) {
      logger.error({ error: error.message }, 'Login failed');
    }

    // AFTER
    catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Login failed');
    }
    ```
  - **Test**: Verify error handling still works
  - **Commit**: `refactor: improve error type safety in auth service`

- [ ] **Fix Error Handling in Controllers** (2h)
  - **Files**:
    - `src/controllers/traceability.controller.ts` (5 instances)
    - `src/controllers/links.controller.ts` (1 instance)
  - **Pattern**: Same as auth.service.ts
  - **Commit**: `refactor: improve error type safety in controllers`

### Afternoon (4 hours)

- [ ] **Add Database Indexes** (2h)
  - **File**: `src/config/database.ts`
  - **After Line**: 240 (after existing index creation)
  - **Changes**:
    ```typescript
    const createRequirementIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
      CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
      CREATE INDEX IF NOT EXISTS idx_requirements_assigned_to ON requirements(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_requirements_created_by ON requirements(created_by);
      CREATE INDEX IF NOT EXISTS idx_requirements_tags ON requirements USING GIN(tags);
    `;
    await this.query(createRequirementIndexesQuery);
    ```
  - **Test**: Query performance improvement
  - **Commit**: `perf: add indexes for common query filters`

- [ ] **Remove Non-Null Assertions** (2h)
  - **File**: `src/services/requirements.service.ts`
  - **Line**: 646
  - **Change**:
    ```typescript
    // BEFORE
    id: row.assigned_to!,

    // AFTER
    if (row.assigned_to && row.assigned_to_username) {
      requirement.assignedToUser = {
        id: row.assigned_to,
        username: row.assigned_to_username,
        // ...
      };
    }
    ```
  - **Find other instances**: Search for `!` operator
  - **Commit**: `refactor: remove unsafe non-null assertions`

---

## Day 5: Cleanup & Documentation (8 hours)

### Morning (4 hours)

- [ ] **Replace console.log with logger** (1h)
  - **Files**:
    - `src/controllers/demo.controller.ts`
    - `src/controllers/narratives.controller.ts`
    - `src/services/document-index.service.ts`
    - `src/utils/permissions.util.ts`
    - `src/controllers/dashboard.controller.ts`
  - **Pattern**:
    ```typescript
    // BEFORE
    console.log('[Service] Message', data);

    // AFTER
    logger.info({ data }, 'Message');
    ```
  - **Commit**: `refactor: replace console.log with proper logger`

- [ ] **Run Full Build & Test** (1h)
  - Commands:
    ```bash
    npm run build          # Verify TypeScript compilation
    npm run lint           # Check linting
    npm test               # Run existing tests
    ```
  - **Fix any issues** that arise
  - **Document** breaking changes (if any)

- [ ] **Type Coverage Analysis** (2h)
  - Install: `npm install -D type-coverage`
  - Run: `npx type-coverage --detail`
  - **Document**:
    - Before: 253 'any' types
    - After: ~150 'any' types (40% reduction)
    - Remaining 'any' locations
  - **Create report**: `TYPE_SAFETY_PROGRESS_WEEK1.md`

### Afternoon (4 hours)

- [ ] **Update CHANGELOG.md** (1h)
  - Add section: `## [2.0.1] - Week 1 Fixes`
  - List all bug fixes
  - List type safety improvements
  - Breaking changes (if any)

- [ ] **Create Migration Guide** (1h)
  - **File**: `.claude/reports/WEEK1_MIGRATION_GUIDE.md`
  - Document:
    - Database index creation (automatic)
    - New error handling patterns
    - Type changes that might affect consumers

- [ ] **Code Review Preparation** (2h)
  - Create PR: `Week 1: Critical Fixes & Type Safety`
  - PR Description:
    - Summary of changes
    - Bug fixes (with before/after)
    - Type safety improvements
    - Testing done
    - Breaking changes
  - Request review from:
    - Senior developer
    - QA lead
  - **Checklist in PR**:
    - [ ] All tests pass
    - [ ] TypeScript compiles
    - [ ] No new console.log
    - [ ] Documentation updated
    - [ ] CHANGELOG updated

---

## Verification Checklist

### Build & Compilation
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes
- [ ] `npx type-coverage` shows improvement

### Tests
- [ ] All existing tests pass
- [ ] New bug fix tests added
- [ ] Manual testing of:
  - [ ] Database connection recovery
  - [ ] Bulk update rollback
  - [ ] CSV export with formulas
  - [ ] WebSocket disconnect cleanup

### Metrics
- [ ] 'any' types: 253 → ~150 (40% reduction)
- [ ] Critical bugs: 3 → 0
- [ ] console.log: 19 → 0
- [ ] TypeScript errors: 0 (maintained)

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Migration guide created
- [ ] Type safety progress documented
- [ ] PR created with full description

---

## Daily Standup Template

Use this for daily progress tracking:

### What did I accomplish yesterday?
- [ ] Task 1
- [ ] Task 2

### What am I working on today?
- [ ] Task 1
- [ ] Task 2

### Any blockers?
- None / [Description]

### Metrics Update
- 'any' types removed: X
- Bugs fixed: X
- Time spent: X hours

---

## Success Criteria

**Week 1 is COMPLETE when**:
- ✓ All 3 critical bugs fixed
- ✓ 4 WebSocket error handlers added
- ✓ CSV injection prevented
- ✓ 100+ 'any' types removed (40% reduction)
- ✓ Database indexes added
- ✓ 5 non-null assertions removed
- ✓ All console.log replaced
- ✓ Tests pass
- ✓ Documentation updated
- ✓ PR created and approved

**Target**: 40 hours total
**Actual**: _____ hours (track this!)

---

## Risk Mitigation

### If behind schedule:
- **Priority 1**: Critical bug fixes (Days 1-2)
- **Priority 2**: Database query types + row interfaces
- **Priority 3**: Error handling types
- **Defer**: Non-null assertions, console.log cleanup

### If tests fail:
- **Rollback** problematic changes
- **Document** in PR
- **Add to Week 2** backlog

### If type changes break compilation:
- **Fix immediately** or rollback
- **Don't merge** until compilation succeeds
- **Document** breaking changes thoroughly

---

## Commit Message Convention

Use this format for all commits:

```
<type>: <subject>

<body>

<footer>
```

**Types**:
- `fix:` Bug fixes
- `refactor:` Code refactoring (no behavior change)
- `perf:` Performance improvements
- `docs:` Documentation only
- `test:` Adding tests

**Examples**:
```
fix: graceful database pool error handling

Replaced process.exit(-1) with retry logic to prevent
complete service outage on transient DB connection errors.

Implements 3 retry attempts with 5-second delays.

Closes #123
```

```
refactor: improve database query type safety

- Changed `any[]` to `unknown[]` for params
- Added generic type parameter to query<T>()
- Updated all query calls to use proper types

No behavior changes.
```

---

## Quick Reference

**Full Audit**: `.claude/reports/BACKEND_CODE_AUDIT_2025-11-01.md`
**Executive Summary**: `.claude/reports/AUDIT_EXECUTIVE_SUMMARY.md`
**This Checklist**: `.claude/reports/WEEK_1_CHECKLIST.md`

**Questions?** Reference specific sections in full audit report.

---

**Checklist Created**: November 1, 2025
**Next Checklist**: Week 2 (after Week 1 completion)
