# Multi-Agent Coordination Plan
## Doc-Anchored Orchestration - Phase 1 Demo Build

**Date**: 2025-10-08
**Strategy**: Demo First, Production Later
**Approach**: 5 Parallel Agents + 1 Coordinator

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   COORDINATOR (You)                      │
│  - Reviews agent outputs                                 │
│  - Resolves conflicts                                    │
│  - Integrates code                                       │
│  - Runs tests                                            │
└─────────────────────────────────────────────────────────┘
                          ↓
    ┌─────────────────────┼─────────────────────┐
    ↓                     ↓                     ↓
┌─────────┐         ┌─────────┐         ┌─────────┐
│ AGENT 1 │         │ AGENT 2 │         │ AGENT 3 │
│ Backend │         │Frontend │         │ Backend │
│ Parser  │         │ Editor  │         │Approvals│
└─────────┘         └─────────┘         └─────────┘
    ↓                     ↓                     ↓
┌─────────┐         ┌─────────┐
│ AGENT 4 │         │ AGENT 5 │
│ Widgets │         │Dashboard│
└─────────┘         └─────────┘
```

---

## Phase 1: Demo Build (Week 1-2)
**Goal**: Working demo showing doc-anchored approach with mock data

### Agent 1: Document Parser & Versioning Service
**Role**: Backend - Core narrative engine
**Deliverables**:
1. `src/services/document-parser.service.ts` - Parse Markdown + YAML frontmatter
2. `src/services/narrative-versions.service.ts` - Version control for documents
3. `src/controllers/narratives.controller.ts` - API endpoints
4. Database migration for `narratives` and `narrative_versions` tables
5. Mock data: 3 sample BRDs with version history

**API Endpoints**:
```typescript
POST   /api/v1/narratives              // Create new narrative
GET    /api/v1/narratives/:id          // Get latest version
GET    /api/v1/narratives/:id/versions // List all versions
GET    /api/v1/narratives/:id/versions/:ver // Get specific version
POST   /api/v1/narratives/:id/versions // Create new version
GET    /api/v1/narratives/:id/render   // Render with widgets
```

**Success Criteria**:
- [ ] Can parse YAML frontmatter + Markdown content
- [ ] Each save creates new version (immutable history)
- [ ] Can retrieve any version by number
- [ ] Mock mode works without PostgreSQL

**Dependencies**: None (can start immediately)

---

### Agent 2: Markdown Editor UI Component
**Role**: Frontend - Rich text editing experience
**Deliverables**:
1. Enhanced `module-2-brd.html` with Markdown editor
2. Live preview pane (split view)
3. Version selector dropdown
4. Syntax highlighting for YAML frontmatter
5. Syntax highlighting for widget tags `{{widget}}`

**UI Components**:
```html
<div class="narrative-editor">
  <!-- Top bar -->
  <div class="editor-toolbar">
    <select id="versionSelector">
      <option value="3" selected>v3 (Current)</option>
      <option value="2">v2 (Previous)</option>
      <option value="1">v1 (Original)</option>
    </select>
    <button id="saveBtn">Save Draft</button>
    <button id="finalizeBtn">Finalize for Review</button>
  </div>

  <!-- Split panes -->
  <div class="editor-container">
    <div class="edit-pane">
      <textarea id="markdown-editor"></textarea>
    </div>
    <div class="preview-pane">
      <div id="rendered-preview"></div>
    </div>
  </div>
</div>
```

**Features**:
- Auto-save every 30 seconds
- Live preview updates on keystroke (debounced 500ms)
- Markdown toolbar (bold, italic, headers, lists)
- YAML syntax validation
- Widget placeholder rendering

**Success Criteria**:
- [ ] Can edit Markdown with YAML frontmatter
- [ ] Live preview renders correctly
- [ ] Can switch between versions
- [ ] Auto-save works
- [ ] Widget tags show placeholders

**Dependencies**: Agent 1 (needs API endpoints)

---

### Agent 3: Decision Register & Approval Workflow
**Role**: Backend - Immutable approval tracking
**Deliverables**:
1. `src/services/decision-register.service.ts` - Immutable approval log
2. `src/services/approval-workflow.service.ts` - Manage review process
3. `src/controllers/approvals.controller.ts` - API endpoints
4. Database migration for `decision_register` and `approvals` tables
5. Mock data: Sample approval history (approved, rejected, conditional)

**API Endpoints**:
```typescript
POST   /api/v1/approvals/initiate      // Start review process
POST   /api/v1/approvals/:id/vote      // Record reviewer vote
GET    /api/v1/approvals/pending       // Get pending reviews for user
GET    /api/v1/approvals/:narrativeId/decisions // Decision register
GET    /api/v1/approvals/:narrativeId/status    // Current approval status
```

**Approval States**:
- `draft` → `in_review` → `approved` | `rejected` | `conditional`

**Success Criteria**:
- [ ] Can initiate review for a narrative version
- [ ] Reviewers can vote (approve/reject/conditional)
- [ ] Decision register is immutable (append-only)
- [ ] Conditional approvals create follow-up tasks
- [ ] All reviewers voting triggers status change

**Dependencies**: Agent 1 (needs narratives)

---

### Agent 4: Widget System & Live Rendering
**Role**: Full-stack - Embedded live data in documents
**Deliverables**:
1. `src/services/widget-registry.service.ts` - Widget rendering engine
2. `src/services/widget-renderers/` - Individual widget implementations
   - `project-status.widget.ts`
   - `blocker-alert.widget.ts`
   - `approval-status.widget.ts`
3. Frontend: Widget rendering JavaScript
4. CSS for widget styling
5. Mock data providers for widgets

**Widget Syntax**:
```markdown
{{widget type="project-status" project-id="42"}}
{{widget type="blocker-alert" milestone-id="43"}}
{{widget type="approval-status" narrative-id="5"}}
```

**Rendered Output Example**:
```html
<div class="widget widget-project-status">
  <div class="status-badge status-at-risk">
    🟡 At Risk
  </div>
  <div class="progress-bar">
    <div class="fill" style="width: 65%"></div>
    <span>65% complete</span>
  </div>
  <div class="blockers">
    ⚠️ 1 active blocker: API team delayed (2 days)
    <button onclick="escalateBlocker(1)">Escalate</button>
  </div>
</div>
```

**Success Criteria**:
- [ ] Can parse `{{widget}}` tags from Markdown
- [ ] Each widget type renders with mock data
- [ ] Widgets update in real-time via WebSocket
- [ ] Error handling (widget fails gracefully)
- [ ] Caching (don't re-fetch on every render)

**Dependencies**: Agent 1 (needs parser integration)

---

### Agent 5: Dashboard Integration & Index Queries
**Role**: Full-stack - Fast queries + document links
**Deliverables**:
1. `src/services/document-index.service.ts` - Index metadata for fast queries
2. Enhanced `module-1-present.html` (Dashboard)
3. Database migration for `document_index` table
4. API endpoints for dashboard queries
5. Real-time updates via WebSocket

**API Endpoints**:
```typescript
GET    /api/v1/dashboard/projects        // List all projects
GET    /api/v1/dashboard/projects?status=blocked // Filter by status
GET    /api/v1/dashboard/my-approvals    // Pending my review
POST   /api/v1/index/rebuild             // Re-index all documents
```

**Dashboard Features**:
```html
<div class="dashboard">
  <div class="stats-row">
    <div class="stat">
      <strong>12</strong> Active Projects
    </div>
    <div class="stat">
      <strong>3</strong> Blocked
    </div>
    <div class="stat">
      <strong>5</strong> Pending Approval
    </div>
  </div>

  <div class="project-list">
    <div class="project-card" data-health="65">
      <div class="project-header">
        <h3>Mobile App Redesign</h3>
        <span class="badge badge-at-risk">🟡 At Risk</span>
      </div>
      <div class="project-meta">
        Phase: PRD → Engineering Design | Progress: 65%
      </div>
      <div class="project-blocker">
        ⚠️ API team dependency (2 days overdue)
      </div>
      <div class="project-actions">
        <a href="/narratives/42">View Full Document →</a>
      </div>
    </div>
  </div>
</div>
```

**Indexing Logic**:
```typescript
// When document is saved
async function onDocumentSaved(narrative_id: number) {
  const doc = await narrativeService.getLatest(narrative_id);
  const parsed = await documentParser.parse(doc.content);

  // Extract metadata for fast queries
  await db.query(`
    INSERT INTO document_index (narrative_id, status, health_score, ...)
    VALUES ($1, $2, $3, ...)
    ON CONFLICT (narrative_id) DO UPDATE SET ...
  `, [narrative_id, parsed.metadata.status, parsed.metadata.health_score]);
}
```

**Success Criteria**:
- [ ] Dashboard loads < 500ms (query index, not parse docs)
- [ ] Can filter by status, health, blocker
- [ ] Each project card links to full narrative
- [ ] Real-time updates (new blockers appear instantly)
- [ ] Index auto-updates when documents change

**Dependencies**: Agent 1 (needs parsed metadata), Agent 4 (widget data)

---

## Coordination & Integration

### Week 1: Parallel Development
**Day 1-2**:
- Deploy all 5 agents simultaneously
- Each agent works independently on their deliverables
- Coordinator reviews progress daily

**Day 3-4**:
- Agents deliver first drafts
- Coordinator runs integration tests
- Identify conflicts (e.g., API contract mismatches)
- Agents iterate based on feedback

**Day 5**:
- Full integration: Backend + Frontend connected
- Mock data flows through entire system
- End-to-end test: Create BRD → Edit → Save → View versions

### Week 2: Demo Polish
**Day 6-7**:
- Bug fixes from integration testing
- UX polish (animations, error messages)
- Add sample data (3 projects with full history)

**Day 8-9**:
- Demo walkthrough preparation
- Documentation updates
- Performance optimization

**Day 10**:
- **Demo Day**: Present working prototype
- Collect feedback
- Plan Phase 2 (production hardening)

---

## Agent Instructions Template

Each agent receives a detailed prompt with:

1. **Context**: Full vision, architecture docs, constraints
2. **Deliverables**: Specific files/APIs to create
3. **Mock Data**: Sample data structures to use
4. **Success Criteria**: How to know when done
5. **Dependencies**: What to wait for from other agents
6. **Coding Standards**: From CLAUDE.md
7. **Testing Requirements**: Unit tests, integration tests
8. **Handoff Format**: How to package deliverables

---

## Agent 1 Detailed Prompt

```
AGENT 1: Document Parser & Versioning Service

CONTEXT:
You are building the core narrative engine for Project Conductor, a doc-anchored
orchestration platform. Read CRITICAL_ANALYSIS_AND_INTEGRATION.md for full context.

TASK:
Implement the backend services and APIs for parsing Markdown documents with YAML
frontmatter and managing version history.

DELIVERABLES:
1. src/services/document-parser.service.ts
   - parseDocument(markdown: string): ParsedDocument
   - extractMetadata(markdown: string): Metadata
   - extractWidgets(markdown: string): Widget[]
   - extractCrossReferences(markdown: string): Reference[]

2. src/services/narrative-versions.service.ts
   - create(narrative_id, content, author_id): Version
   - getLatest(narrative_id): Version
   - getVersion(narrative_id, version): Version
   - listVersions(narrative_id): Version[]
   - compareVersions(narrative_id, v1, v2): Diff

3. src/controllers/narratives.controller.ts
   - POST /api/v1/narratives
   - GET /api/v1/narratives/:id
   - GET /api/v1/narratives/:id/versions
   - POST /api/v1/narratives/:id/versions
   - GET /api/v1/narratives/:id/versions/:ver

4. Database migration (migrations/XXX-create-narratives.sql)
   - narratives table
   - narrative_versions table

5. Mock data (src/mock-data/narratives.mock.ts)
   - 3 sample BRDs with version history
   - Include YAML frontmatter + Markdown content

TECHNICAL REQUIREMENTS:
- Use TypeScript strict mode
- Use 'gray-matter' library for YAML frontmatter parsing
- Use 'marked' library for Markdown parsing
- Follow controller/service pattern from existing code
- Support USE_MOCK_DB mode (check existing patterns)
- Add comprehensive error handling
- Include JSDoc comments

MOCK DATA STRUCTURE:
```yaml
---
id: project-42
type: brd
status: approved
created_at: 2025-01-10T10:00:00Z
approved_at: 2025-01-15T14:30:00Z
approvers:
  - id: user-1
    name: Sarah Chen
    role: CEO
    vote: approved
    conditions:
      - Reduce budget to $60k
health_score: 85
milestones:
  - id: milestone-42
    title: Home Screen Redesign
    status: in_progress
    progress: 80
---

# Mobile App Redesign (BRD)

## Executive Summary
[Content here...]
```

SUCCESS CRITERIA:
- [ ] Can parse YAML + Markdown correctly
- [ ] Version creation is immutable (can't edit old versions)
- [ ] API responds with proper error codes (400, 404, 500)
- [ ] Mock mode works without database
- [ ] Unit tests pass (80%+ coverage)

DEPENDENCIES:
None - you can start immediately

TESTING:
Write tests in tests/unit/services/document-parser.test.ts
Write tests in tests/integration/narratives.api.test.ts

HANDOFF:
Submit:
1. All source files
2. Migration SQL
3. Mock data file
4. Test files
5. README.md with API examples
```

---

## Dependencies Graph

```
AGENT 1 (Parser)
    ↓
    ├─→ AGENT 2 (Editor UI) - needs API endpoints
    ├─→ AGENT 4 (Widgets) - needs parser integration
    └─→ AGENT 5 (Dashboard) - needs metadata extraction

AGENT 3 (Approvals)
    ↓
    └─→ AGENT 2 (Editor UI) - needs approval UI

AGENT 4 (Widgets)
    ↓
    └─→ AGENT 5 (Dashboard) - needs widget data

All agents → COORDINATOR → Integration testing
```

**Critical Path**: Agent 1 must complete first (or at least API contracts defined)

---

## Communication Protocol

### Daily Standups
Each agent reports:
1. What I completed yesterday
2. What I'm working on today
3. Blockers/dependencies

### Handoff Format
Each agent submits:
```
/deliverables/agent-X/
├── src/
│   ├── controllers/
│   ├── services/
│   └── models/
├── tests/
├── migrations/
├── mock-data/
├── README.md (API docs, usage examples)
└── INTEGRATION_NOTES.md (known issues, next steps)
```

### Conflict Resolution
If two agents have conflicting approaches:
1. Pause work
2. Report to coordinator
3. Coordinator decides resolution
4. Both agents update

---

## Phase 2: Production Hardening (Week 3-4)

After demo is working, deploy agents for:

**Agent 6: Security Hardening**
- Fix XSS vulnerabilities
- Implement authentication (JWT)
- Add RBAC (role-based access control)
- Content Security Policy headers

**Agent 7: Performance Optimization**
- Database indexing
- Redis caching layer
- Lazy widget loading
- Response time optimization

**Agent 8: Testing & QA**
- E2E test suite
- Load testing (100+ concurrent users)
- Security penetration testing
- Browser compatibility testing

**Agent 9: Documentation**
- API documentation (OpenAPI spec)
- User guide (how to use narratives)
- Developer guide (how to extend)
- Deployment guide (production setup)

**Agent 10: DevOps & Deployment**
- Docker Compose production config
- CI/CD pipeline (GitHub Actions)
- Monitoring setup (health checks, logs)
- Backup/restore procedures

---

## Success Metrics

### Demo Success (Week 2)
- [ ] Can create BRD with AI Generator
- [ ] Can edit in Markdown editor
- [ ] Version history works (v1, v2, v3)
- [ ] Approval workflow functional (vote, decision register)
- [ ] Widgets render with mock data
- [ ] Dashboard shows projects with links to narratives
- [ ] Real-time updates work (WebSocket)
- [ ] Demo runs in < 10 minutes

### Production Success (Week 4)
- [ ] Pass security audit (no critical vulnerabilities)
- [ ] Dashboard loads < 500ms
- [ ] Document rendering < 1 second
- [ ] Supports 100+ concurrent users
- [ ] 80%+ test coverage
- [ ] Full documentation
- [ ] Deployed to staging environment

---

## Risk Mitigation

**Risk**: Agents produce incompatible code
**Mitigation**: Define API contracts upfront, daily integration tests

**Risk**: Agent 1 blocks others
**Mitigation**: Agent 1 delivers API contracts by Day 2, others use mocks

**Risk**: Scope creep (agents add extra features)
**Mitigation**: Strict deliverables list, coordinator reviews daily

**Risk**: Integration fails at end
**Mitigation**: Incremental integration starting Day 3

---

## Next Steps (Right Now)

1. ✅ Create this coordination plan
2. 🔨 Deploy Agent 1 (Document Parser) - HIGHEST PRIORITY
3. 🔨 Deploy Agent 2 (Editor UI) - Can start with mocks
4. 🔨 Deploy Agent 3 (Approvals) - Independent from Agent 1
5. 🔨 Deploy Agent 4 (Widgets) - Needs Agent 1 contracts
6. 🔨 Deploy Agent 5 (Dashboard) - Needs Agent 1 contracts

**Deployment Strategy**: Launch Agents 1, 2, 3 today. Launch Agents 4, 5 tomorrow (after Agent 1 contracts defined).

---

Ready to deploy agents? 🚀
