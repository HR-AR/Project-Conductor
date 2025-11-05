# Full-Stack Optimizer - Quick Reference

## What is this?

A multi-agent orchestration skill that deploys **5 specialized agents in parallel** to comprehensively analyze and improve your entire application - frontend, backend, security, database, and code quality.

## Quick Start

### Option 1: Invoke via Claude (Recommended)

Just say:
```
"Improve the app" or "Optimize functionality" or "Make it perfect"
```

Claude will automatically invoke this skill and deploy all 5 agents.

### Option 2: Manual Commands

```bash
# Deploy agents and generate reports
npm run optimize:analyze

# View reports
npm run optimize:reports
cat .claude/reports/UNIFIED_IMPROVEMENT_PLAN.md

# Implement specific priority
npm run optimize:implement P0  # Critical fixes
npm run optimize:implement P1  # High priority
npm run optimize:implement P2  # Medium priority
npm run optimize:implement P3  # Low priority

# Full cycle (analysis + implementation)
npm run optimize:full
```

## The 5 Agents

1. **🎨 Frontend Performance Analyzer**
   - UI/UX issues
   - Accessibility (WCAG)
   - Performance bottlenecks
   - Bundle size optimization

2. **⚙️ Backend API Optimizer**
   - API efficiency
   - Error handling
   - N+1 queries
   - Code duplication

3. **🔒 Security & Validation Auditor**
   - SQL injection, XSS vulnerabilities
   - Authentication/authorization
   - Input validation
   - OWASP Top 10 compliance

4. **🗄️ Database & Performance Expert**
   - Missing indexes
   - Query optimization
   - Caching strategy
   - Connection pooling

5. **📐 Code Quality & Architecture Reviewer**
   - TypeScript strict mode
   - Linting violations
   - `any` type usage
   - Code organization

## Workflow

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: Parallel Analysis (5-10 min)              │
│ → 5 agents analyze different aspects               │
│ → Each generates a report in .claude/reports/      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 2: Synthesis & Prioritization (2 min)        │
│ → Unified improvement plan created                 │
│ → Issues categorized as P0/P1/P2/P3                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 3: Implementation (Rounds)                    │
│ → P0 Critical (fix immediately)                     │
│ → P1 High Priority (this sprint)                   │
│ → P2 Medium Priority (next sprint)                 │
│ → P3 Low Priority (nice to have)                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Phase 4: Validation & Testing                       │
│ → npm test (all tests pass)                        │
│ → npm run lint (no violations)                     │
│ → npm run build (builds successfully)              │
│ → npm run test:render-ready (deployment ready)     │
└─────────────────────────────────────────────────────┘
```

## Priority Levels

- **P0 (🔴 Critical)**: Security vulnerabilities, broken functionality, data integrity issues
- **P1 (🟠 High)**: Performance problems, poor UX, API errors, accessibility violations
- **P2 (🟡 Medium)**: Code quality, refactoring opportunities, documentation gaps
- **P3 (🟢 Low)**: Minor improvements, polish, nice-to-have features

## Example Output

After running the optimization:

```
✅ All 5 agents completed!

Summary:
- Frontend: 12 issues (2 critical, 5 high, 5 medium)
- Backend: 8 issues (1 critical, 3 high, 4 medium)
- Security: Risk Level: MEDIUM (3 high-risk issues)
- Database: 6 optimization opportunities
- Code Quality: 45 lint violations, 23 'any' types

P0 Critical Issues (3):
1. [Security] SQL injection in requirements search endpoint
2. [Backend] Unhandled promise rejection in BRD controller
3. [Frontend] XSS vulnerability in comment display

P1 High Priority (11):
...
```

## Validation Checklist

After each implementation round:

```bash
# Run all validation
npm test                    # All tests pass
npm run lint               # No lint errors
npm run typecheck          # No type errors
npm run build              # Build succeeds
npm run test:render-ready  # Deployment ready

# Manual checks
curl http://localhost:3000/api/health  # API responsive
# Test critical user flows in browser
```

## When to Use

✅ **Use this skill for:**
- Major releases (pre-launch optimization)
- Post-launch health checks
- Monthly maintenance cycles
- Before important demos
- After significant feature additions
- When technical debt is accumulating

❌ **Don't use for:**
- Quick bug fixes (too heavyweight)
- Single-issue problems (use direct tools)
- Every commit (reserve for milestone checks)

## Time Commitment

- **Analysis Phase**: 5-10 minutes (agents run in parallel)
- **Review & Planning**: 10-15 minutes (reading reports, prioritizing)
- **P0 Implementation**: 30-60 minutes (critical fixes)
- **P1 Implementation**: 1-2 hours (high-priority improvements)
- **Full Cycle (P0-P3)**: 3-5 hours

💡 **Tip**: Start with P0, validate, then move to P1. Don't try to do everything at once.

## Reports Generated

All reports saved to `.claude/reports/`:

```
.claude/reports/
├── frontend-analysis.md          # UI/UX, performance, accessibility
├── backend-analysis.md           # API efficiency, error handling
├── security-audit.md             # Vulnerabilities, OWASP compliance
├── database-optimization.md      # Schema, queries, caching
├── code-quality.md               # TypeScript, linting, architecture
└── UNIFIED_IMPROVEMENT_PLAN.md   # Synthesized + prioritized plan
```

## Continuous Improvement

Track metrics over time:

```bash
# Baseline metrics (first run)
npm run optimize:analyze
cp .claude/reports/UNIFIED_IMPROVEMENT_PLAN.md .claude/metrics/baseline-$(date +%Y%m%d).md

# Compare after implementation
npm run optimize:analyze
diff .claude/metrics/baseline-*.md .claude/reports/UNIFIED_IMPROVEMENT_PLAN.md
```

## Troubleshooting

**Problem**: Agents don't complete
- Check: Network connectivity (for external searches)
- Check: Disk space (for report generation)
- Retry: Claude will resume from last checkpoint

**Problem**: Reports show "No issues found"
- This is good news! Your code is already well-optimized
- Consider: Run on a different module/feature
- Consider: Adjust thresholds in agent prompts

**Problem**: Too many issues to fix
- Start with P0 only (critical fixes)
- Schedule P1 for next sprint
- P2/P3 can be backlog items
- Don't try to fix everything at once

## Integration with Other Skills

Works seamlessly with:
- **deployment-validator**: Auto-runs before Render deployment
- **validation**: Self-correcting loop if tests fail
- **scout**: Finds external examples for complex fixes

## Customization

Edit `.claude/skills/full-stack-optimizer/SKILL.md` to:
- Adjust agent prompts (more/less strict)
- Add new agents (e.g., SEO analyzer, mobile optimizer)
- Change priority thresholds
- Customize report format
- Add domain-specific checks

## Success Stories

> "Reduced API response time by 60% after running database optimizer agent"

> "Security audit found 3 SQL injection vulnerabilities before production launch"

> "Frontend analyzer identified 200KB of duplicate JavaScript across modules"

> "Eliminated 100+ TypeScript 'any' types, caught 15 bugs in process"

## Questions?

Check the full skill documentation:
```bash
cat .claude/skills/full-stack-optimizer/SKILL.md
```

Or ask Claude:
```
"How do I use the full-stack optimizer?"
"What do the optimization reports mean?"
"Help me implement P0 fixes from the optimization"
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-28
**Maintenance**: Review quarterly, update agent prompts as needed
