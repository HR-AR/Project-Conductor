# Backend Audit - Quick Reference Card

**Print this for your desk!**

---

## 🎯 Current State (Nov 1, 2025)

| Metric | Value |
|--------|-------|
| **Health Score** | 6.5/10 |
| **'any' Types** | 253 |
| **Test Coverage** | 13.94% |
| **Critical Bugs** | 0 |
| **Potential Bugs** | 3 |

---

## 🔴 Top 3 Critical Issues

### 1. Database Pool Error
**File**: `database.ts:51-54`
**Issue**: `process.exit(-1)` kills server
**Fix**: 4 hours

### 2. Type Safety
**Count**: 253 'any' types
**Fix**: 24 hours (Week 1-2)

### 3. Test Coverage
**Current**: 13.94%
**Target**: 75%
**Fix**: 32 hours (Week 2-3)

---

## 📋 4-Week Timeline

| Week | Focus | Hours | Outcome |
|------|-------|-------|---------|
| 1 | Critical bugs + types | 40 | 0 bugs, 150 'any' |
| 2 | Testing + types | 40 | 40% coverage, 50 'any' |
| 3 | WebSocket + docs | 40 | 65% coverage, 10 'any' |
| 4 | Production ready | 40 | 75% coverage, 0 'any' |

---

## ✅ Week 1 Checklist

### Day 1-2: Critical Bugs
- [ ] Database pool error (4h)
- [ ] Bulk update transaction (2h)
- [ ] CSV injection (2h)
- [ ] WebSocket memory leak (4h)
- [ ] WebSocket error handling (4h)

### Day 3-4: Type Safety
- [ ] Database query types (2h)
- [ ] Requirement row interface (2h)
- [ ] BRD row interface (2h)
- [ ] PRD row interface (2h)
- [ ] Auth error types (2h)
- [ ] Controller error types (2h)
- [ ] Database indexes (2h)
- [ ] Non-null assertions (2h)

### Day 5: Cleanup
- [ ] Replace console.log (1h)
- [ ] Run tests (1h)
- [ ] Type coverage analysis (2h)
- [ ] Update CHANGELOG (1h)
- [ ] Migration guide (1h)
- [ ] Code review prep (2h)

---

## 🐛 Bug Fix Locations

| Bug | File | Lines |
|-----|------|-------|
| Database pool | `database.ts` | 51-54 |
| Bulk update | `requirements.controller.ts` | 237-244 |
| WebSocket leak | `websocket.service.ts` | Multiple |
| CSV injection | `requirements.controller.ts` | 332-376 |

---

## 📊 Type Safety Hotspots

| File | Count | Priority |
|------|-------|----------|
| auth.service.ts | 11 | HIGH |
| traceability.controller.ts | 5 | HIGH |
| database.ts | 2 | HIGH |
| websocket.service.ts | 10 | MEDIUM |
| sync.model.ts | 13 | LOW |

---

## 🧪 Testing Targets

| API | Current | Week 2 | Week 4 |
|-----|---------|--------|--------|
| Requirements | 30% | 80% | 80% |
| BRD | 5% | 60% | 60% |
| PRD | 5% | 60% | 60% |
| WebSocket | 20% | 40% | 70% |
| Auth | 15% | 80% | 80% |

---

## 💡 Quick Patterns

### Error Handling
```typescript
// ❌ BAD
catch (error: any) {
  logger.error({ error: error.message });
}

// ✅ GOOD
catch (error: unknown) {
  const msg = error instanceof Error
    ? error.message
    : 'Unknown error';
  logger.error({ error: msg });
}
```

### Database Rows
```typescript
// ❌ BAD
const rows: any[] = result.rows;

// ✅ GOOD
interface RequirementRow {
  id: string;
  title: string;
  status: RequirementStatusType;
  // ...
}
const rows: RequirementRow[] = result.rows;
```

### Transactions
```typescript
// ❌ BAD
for (const id of ids) {
  await update(id);
}

// ✅ GOOD
await db.withTransaction(async (client) => {
  for (const id of ids) {
    await updateWithClient(client, id);
  }
});
```

---

## 🎯 Success Metrics

### Week 1 Complete When:
- ✓ 'any' types: 253 → 150
- ✓ Bugs: 3 → 0
- ✓ console.log: 19 → 0
- ✓ Tests pass
- ✓ Docs updated

### Week 4 Complete When:
- ✓ 'any' types: 0
- ✓ Test coverage: 75%
- ✓ Health score: 9/10
- ✓ Production ready

---

## 📞 Quick Commands

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Type coverage
npx type-coverage --detail

# Find 'any' types
grep -rn ": any" src/

# Find console.log
grep -rn "console\." src/

# Find TODOs
grep -rn "TODO\|FIXME" src/
```

---

## 📂 Report Files

- Full audit: `BACKEND_CODE_AUDIT_2025-11-01.md`
- Executive summary: `AUDIT_EXECUTIVE_SUMMARY.md`
- Week 1 checklist: `WEEK_1_CHECKLIST.md`
- This card: `QUICK_REFERENCE_CARD.md`

---

## ⚠️ Remember

1. **Always** test after type changes
2. **Never** merge with compilation errors
3. **Always** update CHANGELOG
4. **Track** progress daily
5. **Ask** for help if blocked

---

## 🚀 Production Readiness

| After | Status | Deploy? |
|-------|--------|---------|
| Week 1 | 70% ready | Only if urgent |
| Week 2 | 80% ready | Yes (recommended) |
| Week 4 | 95% ready | Ideal |

**Minimum**: Week 2 + authentication enabled

---

**Print Date**: November 1, 2025
**Next Review**: After Week 1 completion
