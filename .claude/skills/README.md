# Project Conductor Skills

Deep research-driven skills for finding the best design patterns and validating code quality.

## 🎯 Overview

Three specialized skills that leverage AI-powered research agents to provide comprehensive, evidence-based recommendations:

1. **frontend-design-optimizer** - Find the best UI/UX patterns
2. **backend-design-optimizer** - Find the best backend architectures
3. **validation-expert** - Comprehensive quality validation

## 🤖 Research Agents Used

These skills utilize two powerful research agents:

- **codex-deep-research**: For comprehensive technical research on programming concepts, architectural patterns, and technology ecosystems
- **gemini-research-analyst**: For PhD-level research on Gemini AI capabilities and modern AI-powered development tools

## 📚 Available Skills

### 1. Frontend Design Optimizer

**Purpose**: Find the best UI/UX design patterns through deep research.

**When to use**:
- "What's the best UI pattern for..."
- "How should I design the frontend for..."
- "Improve the UX of..."
- "Modern design patterns for..."

**What it does**:
1. Analyzes your current tech stack and requirements
2. Launches codex-deep-research to find top 3-5 proven design patterns
3. Checks gemini-research-analyst for AI-powered design tools
4. Compares patterns with decision matrix (UX, accessibility, performance, maintainability)
5. Provides implementation plan with code examples
6. Includes accessibility checklist (WCAG AA minimum)
7. Links to production examples

**Example**:
```
User: "What's the best way to design a real-time dashboard with live metrics?"

Claude: [Invokes frontend-design-optimizer skill]
→ Researches dashboard patterns (cards, charts, widgets)
→ Evaluates real-time update strategies (WebSocket, polling, SSE)
→ Compares accessibility approaches
→ Provides top recommendation with code examples
→ Links to production dashboards using this pattern
```

**Validation criteria**:
- ✅ At least 3 patterns researched
- ✅ Production examples included
- ✅ WCAG AA accessibility compliance
- ✅ Performance benchmarks
- ✅ Mobile responsive
- ✅ Complete code examples

---

### 2. Backend Design Optimizer

**Purpose**: Find the best backend architecture and database design through deep research.

**When to use**:
- "What's the best database for..."
- "How should I architect the backend for..."
- "Best API design for..."
- "Scalability patterns for..."
- "Microservices vs monolith for..."

**What it does**:
1. Analyzes current stack, scale, and constraints
2. Launches codex-deep-research to investigate architectural patterns
3. Checks gemini-research-analyst for AI-powered backend tools
4. Compares architectures with decision matrix (scalability, performance, cost, complexity)
5. Provides database schema design with indexing strategy
6. Includes caching, security, and monitoring strategies
7. Estimates costs and provides migration path

**Example**:
```
User: "What's the best database and API design for a real-time collaboration platform with 10k concurrent users?"

Claude: [Invokes backend-design-optimizer skill]
→ Researches database options (PostgreSQL, MongoDB, Cassandra)
→ Evaluates API patterns (REST, GraphQL, gRPC)
→ Compares caching strategies (Redis, CDN)
→ Analyzes scalability approaches (horizontal, sharding)
→ Provides architecture diagram and cost breakdown
→ Links to similar systems at scale
```

**Validation criteria**:
- ✅ At least 3 architectures evaluated
- ✅ Database schema optimized for access patterns
- ✅ Performance benchmarks from similar systems
- ✅ Cost projections included
- ✅ Security best practices
- ✅ Scalability path defined
- ✅ Real-world case studies cited

---

### 3. Validation Expert

**Purpose**: Comprehensive validation for Project Conductor using research-backed best practices.

**When to use**:
- Before deployment to staging/production
- After major feature implementation
- When user mentions: "validate", "check", "review", "test"
- Before creating a pull request
- When quality issues are suspected

**What it does**:
1. Runs immediate health checks (build, lint, tests)
2. Launches codex-deep-research to find industry validation standards
3. Checks gemini-research-analyst for AI-powered validation tools
4. Executes comprehensive validation suite:
   - Code quality (TypeScript strict, ESLint, anti-patterns)
   - API design (REST conventions, validation, rate limiting)
   - Database (query optimization, indexing, integrity)
   - Security (OWASP Top 10, SQL injection, XSS, secrets)
   - Performance (response times, caching, memory leaks)
   - Testing (coverage >75%, unit/integration/E2E)
   - Deployment (Render-specific checks, static files, env vars)
5. Generates comprehensive validation report
6. Provides specific recommendations with fixes

**Example**:
```
User: "Is Project Conductor ready for production deployment?"

Claude: [Invokes validation-expert skill]
→ Runs build, lint, tests
→ Researches Node.js + Express.js production best practices
→ Validates against OWASP Top 10
→ Checks database query performance
→ Validates Render deployment configuration
→ Generates detailed report with pass/fail/warning for each category
→ Provides prioritized fix list
```

**Validation categories**:
1. **Code Quality** - TypeScript strict, no 'any', proper error handling
2. **API Design** - REST conventions, validation, rate limiting
3. **Database** - Query optimization, indexing, connection pooling
4. **Security** - SQL injection, XSS, secrets, authentication
5. **Performance** - Response times <200ms, cache hit rate >80%
6. **Testing** - Coverage >75%, unit/integration/E2E tests
7. **Deployment** - Static files, env vars, build process

**Validation commands**:
```bash
# Run comprehensive validation
npm run validate:comprehensive

# Run security audit
npm run validate:security

# Run all validations (comprehensive + security + deployment)
npm run validate:all

# Individual checks
npm run build          # TypeScript compilation
npm run lint           # ESLint
npm test               # Test suite
npm run typecheck      # TypeScript strict
npm run test:render-ready  # Deployment validation
```

**Success criteria**:
- ✅ All tests pass with >75% coverage
- ✅ TypeScript compilation succeeds (strict mode)
- ✅ No critical security vulnerabilities
- ✅ API response times <200ms (p95)
- ✅ Database queries <50ms (p95)
- ✅ No hardcoded secrets
- ✅ All /public files tracked in git
- ✅ Production build succeeds

---

## 🚀 How to Use Skills

### Auto-Invocation

Skills are automatically invoked when Claude detects relevant trigger phrases:

```
User: "What's the best UI for a dashboard?"
→ Auto-invokes: frontend-design-optimizer

User: "Best database for 10k users?"
→ Auto-invokes: backend-design-optimizer

User: "Validate the code before deployment"
→ Auto-invokes: validation-expert
```

### Manual Invocation

You can explicitly request a skill:

```
User: "Use the frontend-design-optimizer skill to find the best pattern for a user profile page"

User: "Run the validation-expert skill to check if we're production ready"
```

### Skill Workflow

Each skill follows this workflow:

1. **Context Analysis** - Understand current state (tech stack, requirements, constraints)
2. **Deep Research** - Launch research agents to find best practices
3. **Pattern Comparison** - Compare options with decision matrix
4. **Recommendation** - Provide top choice with justification
5. **Implementation** - Code examples, diagrams, step-by-step plan
6. **Validation** - Checklist to verify quality

---

## 📊 Validation Scripts

The validation-expert skill includes three comprehensive scripts:

### 1. Comprehensive Validation
```bash
npm run validate:comprehensive
```

**Checks**:
- TypeScript compilation (strict mode)
- Type checking (no 'any', proper types)
- ESLint (code quality)
- 'any' type count (<10 target)
- console.log usage (<5 target)
- Hardcoded secrets
- Test suite execution
- Test coverage (>75% target)
- TODO/FIXME comments

**Output**:
```
📊 Project Conductor Comprehensive Validation
==============================================

1️⃣  TypeScript Compilation...
✅ TypeScript compilation passed

2️⃣  TypeScript Strict Checks...
✅ Type checking passed

3️⃣  ESLint...
✅ Linting passed

[... more checks ...]

==============================================
📊 Validation Summary
==============================================
Errors: 0
Warnings: 2

✅ All validations passed!
```

### 2. Security Audit
```bash
npm run validate:security
```

**Checks**:
- npm audit (known vulnerabilities)
- Hardcoded secrets in code
- Gitleaks scan (if installed)
- Environment variables
- .env file gitignored
- SQL injection vulnerabilities
- XSS vulnerabilities
- eval() usage (code injection risk)
- HTTPS enforcement (production)
- Rate limiting implementation

**Output**:
```
🔒 Project Conductor Security Audit
====================================

1️⃣  Checking npm dependencies for vulnerabilities...
✅ No moderate or higher vulnerabilities found

2️⃣  Scanning for exposed secrets...
✅ No hardcoded secrets found

[... more checks ...]

====================================
🔒 Security Audit Summary
====================================
Critical Issues: 0
Warnings: 1

✅ Security audit passed!
```

### 3. All Validations
```bash
npm run validate:all
```

**Runs**:
1. Comprehensive validation
2. Security audit
3. Render deployment validation

**Use before**:
- Production deployment
- Creating pull request
- Major releases

---

## 🎓 Best Practices

### When to Use Each Skill

**Frontend Design Optimizer**:
- ✅ Starting a new UI component
- ✅ Refactoring existing UI
- ✅ Accessibility improvements needed
- ✅ Performance optimization
- ✅ Modern pattern research
- ❌ Simple text changes
- ❌ Bug fixes (use validation-expert)

**Backend Design Optimizer**:
- ✅ Designing new API endpoints
- ✅ Database schema design
- ✅ Scalability planning
- ✅ Performance optimization
- ✅ Architecture decisions
- ❌ Simple CRUD operations
- ❌ Bug fixes (use validation-expert)

**Validation Expert**:
- ✅ Before every deployment
- ✅ After major features
- ✅ Before pull requests
- ✅ When quality issues suspected
- ✅ Regular quality checks
- ❌ During active development (too slow)
- ❌ For small cosmetic changes

### Skill Combination Patterns

**Pattern 1: New Feature Flow**
```
1. Backend Design Optimizer → Design API architecture
2. Frontend Design Optimizer → Design UI components
3. [Implement the feature]
4. Validation Expert → Validate before deployment
```

**Pattern 2: Performance Optimization**
```
1. Validation Expert → Identify performance issues
2. Backend Design Optimizer → Research caching/scaling patterns
3. Frontend Design Optimizer → Research UI optimization patterns
4. [Implement optimizations]
5. Validation Expert → Verify improvements
```

**Pattern 3: Production Readiness**
```
1. Validation Expert → Full validation report
2. Fix critical issues
3. Backend Design Optimizer → Review architecture (if needed)
4. Frontend Design Optimizer → Review UX (if needed)
5. Validation Expert → Final validation
6. Deploy ✅
```

---

## 🔧 Configuration

### Research Agent Settings

Skills use two research agents with different strengths:

**codex-deep-research**:
- Best for: Technical patterns, architecture, code examples
- Strength: Comprehensive synthesis, real-world case studies
- Use when: Need production-proven patterns

**gemini-research-analyst**:
- Best for: Gemini AI tools, Google Cloud services, cutting-edge AI
- Strength: PhD-level analysis, latest AI developments
- Use when: Want AI-powered development tools

### Customization

Edit skill files to customize behavior:

```bash
# Frontend skill
.claude/skills/frontend-design-optimizer/SKILL.md

# Backend skill
.claude/skills/backend-design-optimizer/SKILL.md

# Validation skill
.claude/skills/validation-expert/SKILL.md
```

**Common customizations**:
- Add project-specific patterns
- Adjust validation thresholds
- Add custom validation checks
- Include team coding standards

---

## 📈 Success Metrics

Track skill effectiveness:

**Frontend Design Optimizer**:
- Accessibility score: Target WCAG AA (90+)
- Lighthouse performance: Target 90+
- Time to implement: Compare before/after
- User feedback: Better UX outcomes

**Backend Design Optimizer**:
- API response time: Target <200ms (p95)
- Database query time: Target <50ms (p95)
- Scalability: Successfully handle target load
- Cost efficiency: Meet budget targets

**Validation Expert**:
- Test coverage: Maintain >75%
- Security vulnerabilities: 0 critical
- Deployment success rate: 100% (first try)
- Production incidents: Reduce by 80%

---

## 🐛 Troubleshooting

### Skill Not Auto-Invoking

**Problem**: Skill doesn't trigger automatically

**Solutions**:
1. Use explicit request: "Use the [skill-name] skill..."
2. Check trigger phrases match skill description
3. Manually invoke with clear context

### Research Agent Timeout

**Problem**: Research takes too long

**Solutions**:
1. Narrow the scope of the request
2. Provide more specific context
3. Ask for quick overview first, then deep dive

### Validation Fails

**Problem**: Validation script fails

**Solutions**:
1. Check script permissions: `chmod +x scripts/*.sh`
2. Install missing dependencies: `npm install`
3. Fix reported issues one category at a time
4. Run individual validations: `npm run validate:comprehensive`

### Path Issues (Render Deployment)

**Problem**: 404 errors on Render

**Solutions**:
1. Run: `npm run test:render-ready`
2. Check files in `/public` are tracked in git
3. Verify no explicit routes override static middleware
4. Review validation-expert recommendations

---

## 📚 References

**Skills Documentation**:
- [Frontend Design Optimizer](frontend-design-optimizer/SKILL.md)
- [Backend Design Optimizer](backend-design-optimizer/SKILL.md)
- [Validation Expert](validation-expert/SKILL.md)

**Validation Scripts**:
- [scripts/comprehensive-validation.sh](../../scripts/comprehensive-validation.sh)
- [scripts/security-audit.sh](../../scripts/security-audit.sh)
- [scripts/pre-render-validation.sh](../../scripts/pre-render-validation.sh)

**Official Claude Code Skills**:
- [Agent Skills Overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
- [Creating Custom Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/creating-skills)

---

## 🎯 Quick Start

**First time setup**:
```bash
# Make scripts executable
chmod +x scripts/comprehensive-validation.sh
chmod +x scripts/security-audit.sh

# Install dependencies (if needed)
npm install
```

**Try the skills**:
```bash
# 1. Ask for frontend help
"What's the best UI pattern for displaying real-time notifications?"

# 2. Ask for backend help
"What's the best way to handle file uploads with 100MB files?"

# 3. Run validation
npm run validate:all
```

**Expected workflow**:
1. Ask question with trigger phrase
2. Skill auto-invokes
3. Research agents investigate
4. Receive comprehensive answer with:
   - Top 3-5 options compared
   - Recommendation with justification
   - Code examples
   - Production examples
   - Implementation plan

---

## ✨ Features

**What makes these skills special**:

1. **Research-Backed** - Every recommendation is based on deep research, not guesses
2. **Production-Proven** - Only suggests patterns used successfully at scale
3. **Comprehensive** - Covers all aspects: UX, accessibility, performance, security
4. **Actionable** - Provides code examples and step-by-step implementation
5. **Validated** - Includes validation criteria and success metrics
6. **Cost-Aware** - Backend skill includes cost projections
7. **Accessibility-First** - Frontend skill prioritizes WCAG compliance
8. **Security-Focused** - Validation skill includes OWASP Top 10 checks

**Unique capabilities**:
- Decision matrices for comparing options
- Real-world case studies and links
- Migration paths from current to recommended
- Performance benchmarks
- Cost estimations
- Accessibility checklists
- Security audit automation

---

## 📝 Contributing

To improve these skills:

1. **Add patterns**: Edit skill SKILL.md files with common patterns
2. **Update validation**: Add checks to validation scripts
3. **Share learnings**: Document what works in skill files
4. **Adjust thresholds**: Tune validation thresholds based on team standards

**Skill improvement loop**:
```
Use skill → Note what worked/didn't → Update SKILL.md → Test → Share with team
```

---

## 🎉 Summary

You now have three powerful research-driven skills:

✅ **frontend-design-optimizer** - Best UI/UX patterns with accessibility
✅ **backend-design-optimizer** - Best architecture with scalability
✅ **validation-expert** - Comprehensive quality validation

**Next steps**:
1. Try asking design questions and see skills auto-invoke
2. Run `npm run validate:all` before your next deployment
3. Customize skills for your team's specific needs

**Need help?**
- Check skill SKILL.md files for detailed instructions
- Run validation scripts manually to see what they check
- Ask Claude to explain any part of the skills

Happy coding! 🚀
