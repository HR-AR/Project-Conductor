# Critical Analysis & Integration Plan
## Merging "Orchestration Platform" with "Doc-Anchored" Philosophy

**Date**: 2025-10-08
**Status**: Strategic Integration
**Priority**: CRITICAL - Unified Vision Required

---

## Table of Contents
1. [Critical Analysis of Both Approaches](#critical-analysis-of-both-approaches)
2. [The Unified Vision](#the-unified-vision)
3. [Integrated Architecture](#integrated-architecture)
4. [Production-Ready Roadmap](#production-ready-roadmap)
5. [Demo Workflow Integration](#demo-workflow-integration)
6. [Risk Analysis](#risk-analysis)
7. [Recommendation](#recommendation)

---

## Critical Analysis of Both Approaches

### Approach 1: Orchestration Platform (My Proposal)
**Philosophy**: "Project management as a workflow engine"

**Strengths** ✅:
1. **User-centric**: Solves real pain points (status visibility, onboarding, blockers)
2. **Business value focus**: Clear ROI ($2.4M return on $544K investment)
3. **Role-based views**: Tailored for exec/PM/eng personas
4. **Proactive intelligence**: AI predicts risks, auto-escalates blockers
5. **Modern UX**: Real-time dashboards, chat interface, mobile-responsive

**Weaknesses** ❌:
1. **Document as byproduct**: Treats BRD/PRD as data inputs, not living artifacts
2. **Ephemeral state**: Status lives in dashboard, not in the source document
3. **Missing audit permanence**: Can you prove what was approved 6 months ago?
4. **No narrative coherence**: Metrics scattered across views, not in context
5. **Tool-centric thinking**: Focuses on process automation, not decision documentation

**Critical Flaw**:
> "If the dashboard goes down, you lose visibility. If the document is truth, you always have it."

---

### Approach 2: Doc-Anchored Narrative (Your Research)
**Philosophy**: "The document IS the project"

**Strengths** ✅:
1. **Immutable truth**: Every decision traced to a versioned document
2. **Narrative coherence**: Context preserved in readable prose, not database rows
3. **Audit-first**: Built-in compliance with decision register
4. **Amazon-proven**: Based on actual successful methodology (PR/FAQ, 6-pager)
5. **Portable knowledge**: Documents survive tool migrations

**Weaknesses** ❌:
1. **User experience lag**: Wiki-first UX can feel slow vs modern dashboards
2. **Discoverability**: Hard to answer "show me all blocked projects" from documents
3. **Real-time collaboration**: Document-centric != real-time notifications
4. **Scalability concerns**: 100 projects = 100 documents to read through
5. **Metric integration**: "Live widgets in docs" is technically complex and fragile

**Critical Flaw**:
> "Documents are great for 'why' but terrible for 'what's happening right now?'"

---

### The Fundamental Tension

```
ORCHESTRATION APPROACH              DOC-ANCHORED APPROACH
─────────────────────               ─────────────────────
Dashboard shows status       ←VS→   Document contains status
Notifications push updates   ←VS→   Reader pulls from document
Metrics in database         ←VS→   Metrics embedded in text
Workflow drives document    ←VS→   Document drives workflow
Tool is source of truth     ←VS→   Document is source of truth
```

**The Question**: Can we have BOTH?

**The Answer**: **YES - if we make the document the API.**

---

## The Unified Vision

### Core Principle: "Document as Database"

Instead of choosing between dashboard and document, we make them **two views of the same truth**.

```
┌──────────────────────────────────────────────────────────┐
│              THE NARRATIVE (Source of Truth)              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  # Mobile App Redesign (v3, approved Jan 15)      │  │
│  │                                                     │  │
│  │  ## Why (Business Case)                            │  │
│  │  Increase retention by 20% → $2M annual revenue    │  │
│  │                                                     │  │
│  │  ## What (Deliverables)                            │  │
│  │  - Redesigned home screen [milestone-42]           │  │
│  │  - Push notifications [milestone-43]               │  │
│  │  - User profiles [milestone-44]                    │  │
│  │                                                     │  │
│  │  ## Status [LIVE WIDGET: project-status]           │  │
│  │  🟡 At Risk - API team blocked (2 days overdue)    │  │
│  │  Progress: 65% complete                            │  │
│  │  Next milestone: Design approval (due tomorrow)    │  │
│  │                                                     │  │
│  │  ## Decision History                               │  │
│  │  ✅ Jan 15: Approved by Sarah (CEO)                │  │
│  │     Condition: Reduce budget to $60k               │  │
│  │  ✅ Jan 16: Approved by Mike (CFO) - conditional   │  │
│  │  ❌ Jan 10: Rejected by Legal - v2                 │  │
│  │     Reason: Missing GDPR compliance                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  This document is:                                       │
│  1. Human-readable (narrative format)                    │
│  2. Machine-queryable (structured sections)              │
│  3. Versioned (immutable history)                        │
│  4. Live (embedded real-time widgets)                    │
└──────────────────────────────────────────────────────────┘
                          ↓ ↑
          ┌───────────────┴─┴──────────────┐
          │    BIDIRECTIONAL SYNC           │
          └───────────────┬─┬──────────────┘
                          ↓ ↑
┌──────────────────────────────────────────────────────────┐
│                   THE DASHBOARD (View)                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📊 My Projects                                     │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │                                                     │  │
│  │  📱 Mobile App Redesign          🟡 At Risk       │  │
│  │     [Read Full Narrative] [Latest Version: v3]     │  │
│  │                                                     │  │
│  │     Blocker: API team 2 days overdue               │  │
│  │     Your action: Review design (due tomorrow)      │  │
│  │                                                     │  │
│  │  This data comes from:                             │  │
│  │  - Narrative content (parsed)                      │  │
│  │  - Live widgets (rendered)                         │  │
│  │  - Decision register (queried)                     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Key Insight**: The dashboard is a **projection** of the document, not a separate data source.

---

### How It Works: The Integration Pattern

#### 1. **Document Structure** (Markdown + YAML Frontmatter)

```markdown
---
id: project-42
type: prd
version: 3
status: in_progress
created: 2025-01-10T10:00:00Z
approved: 2025-01-15T14:30:00Z
approvers:
  - id: user-123
    name: Sarah Chen
    role: CEO
    vote: approved
    conditions:
      - Reduce budget to $60k
  - id: user-456
    name: Mike Johnson
    role: CFO
    vote: approved
milestones:
  - id: milestone-42
    title: Redesigned home screen
    status: in_progress
    progress: 80
  - id: milestone-43
    title: Push notifications
    status: blocked
    blocker: API team dependency
health_score: 65
---

# Mobile App Redesign (PRD v3)

## Executive Summary

We're redesigning the mobile app to increase user retention by 20%,
translating to $2M in annual recurring revenue. This project requires
8 weeks of engineering effort and $60k budget.

## Success Metrics

{{widget type="live-metrics" source="analytics.dashboard"}}
<!-- This widget renders real-time data from analytics system -->

Current baseline: 45% 30-day retention
Target: 65% 30-day retention
Launch date: April 30, 2025

## Project Status

{{widget type="project-status" project-id="project-42"}}
<!-- This widget renders:
     - Current phase
     - Progress percentage
     - Active blockers
     - Next milestones
     All pulled from the orchestration engine -->

## Milestones

### 1. Redesigned Home Screen [[milestone-42]]
Status: 🟡 In Progress (80% complete)
Owner: Alex (Design Lead)
Dependencies: None
Timeline: Jan 20 - Feb 5

### 2. Push Notifications [[milestone-43]]
Status: 🔴 Blocked
Owner: Jamie (Backend Lead)
Dependencies: API v2 (external project)
Blocker: API team has not delivered integration endpoint (2 days overdue)

{{widget type="blocker-alert" milestone-id="milestone-43"}}
<!-- Renders escalation UI, contact buttons, etc. -->

## Decision History

### Approval v3 (Jan 15, 2025)
✅ **Approved** by Sarah Chen (CEO)
- Condition: Reduce budget from $75k to $60k
- Reasoning: "Aligns with Q1 cost reduction initiative"

✅ **Approved** by Mike Johnson (CFO)
- No conditions

### Rejection v2 (Jan 10, 2025)
❌ **Rejected** by Jane Doe (Legal)
- Reason: "Section 4 lacks GDPR compliance details for EU users"
- Required changes:
  - [ ] Add data retention policy (30 days max)
  - [ ] Document user consent flow
  - [ ] Include right-to-deletion process

[View Full Decision Register →]

## Technical Architecture

[rest of PRD content...]
```

---

#### 2. **The Parsing Layer** (Document → Data)

```typescript
// src/services/document-parser.service.ts

interface ParsedDocument {
  metadata: DocumentMetadata;
  content: string;
  sections: Section[];
  widgets: EmbeddedWidget[];
  links: CrossReference[];
}

class DocumentParserService {
  /**
   * Parse a narrative document into structured data
   */
  async parseDocument(rawMarkdown: string): Promise<ParsedDocument> {
    // 1. Extract YAML frontmatter
    const { data: metadata, content } = matter(rawMarkdown);

    // 2. Parse Markdown into sections
    const sections = this.parseMarkdownSections(content);

    // 3. Extract embedded widgets
    const widgets = this.extractWidgets(content);
    // Example: {{widget type="project-status" project-id="42"}}

    // 4. Extract cross-references
    const links = this.extractLinks(content);
    // Example: [[milestone-42]], [[decision-123]]

    return {
      metadata,
      content,
      sections,
      widgets,
      links
    };
  }

  /**
   * Render document with live data
   */
  async renderDocument(parsed: ParsedDocument): Promise<string> {
    let rendered = parsed.content;

    // Replace each widget with live-rendered HTML
    for (const widget of parsed.widgets) {
      const liveData = await this.fetchWidgetData(widget);
      const html = await this.renderWidget(widget, liveData);
      rendered = rendered.replace(widget.raw, html);
    }

    return rendered;
  }

  /**
   * Index document for dashboard queries
   */
  async indexDocument(parsed: ParsedDocument): Promise<void> {
    // Store structured data in database for fast queries
    await db.query(`
      INSERT INTO document_index (
        project_id,
        status,
        health_score,
        blockers,
        next_milestones,
        approvers
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      parsed.metadata.id,
      parsed.metadata.status,
      parsed.metadata.health_score,
      JSON.stringify(this.extractBlockers(parsed)),
      JSON.stringify(this.extractUpcomingMilestones(parsed)),
      JSON.stringify(parsed.metadata.approvers)
    ]);
  }
}
```

---

#### 3. **The Rendering Layer** (Data → Views)

```typescript
// src/services/document-renderer.service.ts

class DocumentRendererService {
  /**
   * Render live widget: Project Status
   */
  async renderProjectStatus(projectId: string): Promise<string> {
    // Fetch real-time data from orchestration engine
    const status = await orchestrationService.getProjectStatus(projectId);

    return `
      <div class="widget widget-status">
        <div class="status-badge status-${status.health}">
          ${status.health === 'on_track' ? '🟢' : status.health === 'at_risk' ? '🟡' : '🔴'}
          ${status.label}
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${status.progress}%"></div>
          <span>${status.progress}% complete</span>
        </div>
        ${status.blockers.length > 0 ? `
          <div class="blockers">
            <strong>⚠️ Blockers:</strong>
            ${status.blockers.map(b => `
              <div class="blocker-item">
                ${b.description} (${b.days_overdue} days overdue)
                <button onclick="escalate('${b.id}')">Escalate</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render live widget: Metrics Dashboard
   */
  async renderMetrics(source: string, filters?: object): Promise<string> {
    const data = await metricsService.fetch(source, filters);

    return `
      <div class="widget widget-metrics">
        <canvas id="chart-${data.id}" width="600" height="300"></canvas>
        <script>
          renderChart('chart-${data.id}', ${JSON.stringify(data)});
        </script>
      </div>
    `;
  }
}
```

---

#### 4. **The Sync Layer** (Bidirectional Updates)

```typescript
// When user updates document
async function onDocumentUpdate(projectId: string, newContent: string) {
  // 1. Parse new content
  const parsed = await documentParser.parseDocument(newContent);

  // 2. Detect changes in frontmatter (metadata)
  const changes = diffMetadata(oldMetadata, parsed.metadata);

  // 3. Update orchestration engine
  if (changes.milestones) {
    await orchestrationService.updateMilestones(projectId, changes.milestones);
  }
  if (changes.approvers) {
    await orchestrationService.updateApprovers(projectId, changes.approvers);
  }

  // 4. Re-index for dashboard queries
  await documentParser.indexDocument(parsed);

  // 5. Broadcast update via WebSocket
  webSocketService.broadcast(`project:${projectId}`, {
    type: 'document_updated',
    version: parsed.metadata.version + 1
  });
}

// When orchestration engine updates status
async function onOrchestrationUpdate(projectId: string, update: StatusUpdate) {
  // 1. Load current document
  const doc = await narrativeService.getLatest(projectId);

  // 2. Update frontmatter metadata
  const updated = updateMetadata(doc, {
    status: update.status,
    health_score: update.health_score,
    blockers: update.blockers
  });

  // 3. Save as new version (if metadata changed)
  if (hasChanges(doc, updated)) {
    await narrativeService.saveVersion(projectId, updated, {
      auto_generated: true,
      reason: 'Orchestration engine update'
    });
  }

  // 4. Invalidate cached renders
  await cacheService.invalidate(`document:${projectId}`);
}
```

---

## Integrated Architecture

### The Full System

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACES                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Document    │  │  AI Chat     │      │
│  │  View        │  │  Editor      │  │  Assistant   │      │
│  │  (Module 1)  │  │  (Mod 2-6)   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                 ↓                  ↓               │
└─────────┼─────────────────┼──────────────────┼──────────────┘
          │                 │                  │
          ↓                 ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET /api/v1/narratives/:id                          │  │
│  │  POST /api/v1/narratives/:id/versions                │  │
│  │  GET /api/v1/narratives/:id/render                   │  │
│  │  GET /api/v1/dashboard/projects (query index)        │  │
│  │  POST /api/v1/orchestration/update (from workflow)   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          ↓                                      ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│   NARRATIVE LAYER        │    │  ORCHESTRATION LAYER     │
│  (Document as Source)    │←──→│  (Workflow Engine)       │
│                          │    │                          │
│  • Document Parser       │    │  • Approval Engine       │
│  • Version Control       │    │  • SLA Tracking          │
│  • Widget Renderer       │    │  • Dependency Graph      │
│  • Decision Register     │    │  • Health Score          │
│  • Cross-Reference       │    │  • Blocker Detection     │
└──────────────────────────┘    └──────────────────────────┘
          ↓                                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Documents   │  │  Index       │  │  Events      │      │
│  │  (Markdown)  │  │  (PostgreSQL)│  │  (Audit Log) │      │
│  │              │  │              │  │              │      │
│  │  - Raw text  │  │  - Metadata  │  │  - Decisions │      │
│  │  - Versions  │  │  - Status    │  │  - Changes   │      │
│  │  - Comments  │  │  - Blockers  │  │  - Access    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (Hybrid Approach)

```sql
-- 1. NARRATIVE LAYER (Doc-Anchored)

CREATE TABLE narratives (
    id SERIAL PRIMARY KEY,
    project_id INT UNIQUE,
    type VARCHAR(20),           -- 'brd', 'prd', 'design', etc.
    current_version INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE narrative_versions (
    id SERIAL PRIMARY KEY,
    narrative_id INT REFERENCES narratives(id),
    version INT,
    content TEXT,               -- Markdown + YAML frontmatter
    author_id INT,
    created_at TIMESTAMP,
    change_reason TEXT,
    is_auto_generated BOOLEAN DEFAULT FALSE,

    UNIQUE(narrative_id, version)
);

CREATE TABLE narrative_comments (
    id SERIAL PRIMARY KEY,
    narrative_id INT REFERENCES narratives(id),
    version INT,
    section_id VARCHAR(100),    -- e.g., "section-3-milestones"
    author_id INT,
    content TEXT,
    thread_id INT,              -- For nested comments
    created_at TIMESTAMP
);

CREATE TABLE decision_register (
    id SERIAL PRIMARY KEY,
    narrative_id INT REFERENCES narratives(id),
    version INT,
    reviewer_id INT,
    decision VARCHAR(50),       -- 'approved', 'rejected', 'conditional'
    conditions JSONB,           -- For conditional approvals
    reasoning TEXT,
    created_at TIMESTAMP,

    -- Immutable: No UPDATE allowed, only INSERT
    CHECK (created_at IS NOT NULL)
);

-- 2. ORCHESTRATION LAYER (Workflow Engine)

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    narrative_id INT REFERENCES narratives(id),
    name VARCHAR(255),
    status VARCHAR(50),         -- 'planning', 'in_progress', 'blocked', 'completed'
    health_score INT,           -- 0-100
    current_phase VARCHAR(50),
    created_at TIMESTAMP
);

CREATE TABLE milestones (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id),
    narrative_reference VARCHAR(100),  -- Links to [[milestone-42]] in doc
    title VARCHAR(255),
    status VARCHAR(50),
    progress INT,               -- 0-100
    due_date DATE,
    owner_id INT,
    created_at TIMESTAMP
);

CREATE TABLE blockers (
    id SERIAL PRIMARY KEY,
    milestone_id INT REFERENCES milestones(id),
    description TEXT,
    severity VARCHAR(20),       -- 'low', 'medium', 'high', 'critical'
    days_active INT,
    responsible_party_id INT,
    escalated_at TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    narrative_id INT REFERENCES narratives(id),
    narrative_version INT,
    reviewer_id INT,
    status VARCHAR(20),         -- 'pending', 'approved', 'rejected'
    due_date TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 3. INDEX LAYER (Fast Queries for Dashboard)

CREATE TABLE document_index (
    narrative_id INT PRIMARY KEY REFERENCES narratives(id),
    project_id INT,
    status VARCHAR(50),
    health_score INT,
    blockers JSONB,             -- [{id, description, days_overdue}]
    next_milestones JSONB,      -- [{id, title, due_date}]
    approvers JSONB,            -- [{id, name, vote, conditions}]
    last_indexed_at TIMESTAMP,

    -- Indexes for fast dashboard queries
    INDEX idx_status (status),
    INDEX idx_health (health_score),
    INDEX idx_blockers ((blockers->>'count'))
);

-- 4. EVENT LOG (Full Audit Trail)

CREATE TABLE event_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),     -- 'document_created', 'approval_granted', etc.
    entity_type VARCHAR(50),    -- 'narrative', 'milestone', 'blocker'
    entity_id INT,
    actor_id INT,
    metadata JSONB,
    created_at TIMESTAMP
);
```

---

## Production-Ready Roadmap

### Phase 0: Foundation (Week 1-2) ✅ PARTIALLY COMPLETE

**What We Already Have**:
- ✅ Basic BRD/PRD modules (Module 2, 3)
- ✅ Dashboard (Module 1)
- ✅ AI Generator (Module 1.5)
- ✅ WebSocket for real-time updates
- ✅ PostgreSQL + Redis infrastructure

**What We Need to Build**:
- [ ] Document parser service (Markdown + YAML frontmatter)
- [ ] Version control system for narratives
- [ ] Decision register (immutable approval log)
- [ ] Document index for fast queries

**Deliverables**:
- [ ] `document-parser.service.ts` - Parse Markdown → structured data
- [ ] `narrative-versions.service.ts` - Version control
- [ ] `decision-register.service.ts` - Immutable approval log
- [ ] Database migration for new tables
- [ ] API endpoints for narrative CRUD

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

### Phase 1: Doc-Anchored Core (Week 3-6)

#### Sprint 1 (Week 3-4): Rich Narrative Editor + Versioning

**Features**:
1. **Rich-Text Editor Integration**
   - Markdown editor with YAML frontmatter support
   - Syntax highlighting for widgets (e.g., `{{widget type="status"}}`)
   - Live preview with rendered widgets

2. **Version Control**
   - Every save creates new version
   - Diff viewer (compare v2 vs v3)
   - Rollback capability
   - "Finalize for Review" locks version

3. **Contextual Comments**
   - Comment threads on specific sections
   - Resolved/unresolved states
   - @mentions for notifications

**Technical Implementation**:
```typescript
// src/controllers/narratives.controller.ts

export class NarrativesController {
  async createVersion(req: Request, res: Response) {
    const { narrative_id, content, change_reason } = req.body;

    // 1. Parse new content
    const parsed = await documentParser.parseDocument(content);

    // 2. Validate structure (required sections present?)
    const validation = await documentValidator.validate(parsed);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // 3. Create new version
    const version = await narrativeVersionsService.create({
      narrative_id,
      content,
      author_id: req.user.id,
      change_reason,
      is_auto_generated: false
    });

    // 4. Re-index for dashboard
    await documentIndexService.index(parsed);

    // 5. Broadcast update
    webSocketService.broadcast(`narrative:${narrative_id}`, {
      type: 'version_created',
      version: version.version
    });

    res.json({ success: true, version });
  }

  async renderVersion(req: Request, res: Response) {
    const { narrative_id, version } = req.params;

    // 1. Fetch version
    const doc = await narrativeVersionsService.get(narrative_id, version);

    // 2. Parse content
    const parsed = await documentParser.parseDocument(doc.content);

    // 3. Render with live widgets
    const rendered = await documentRenderer.render(parsed);

    res.json({
      success: true,
      rendered_html: rendered,
      metadata: parsed.metadata
    });
  }
}
```

**Frontend (Module 2 - BRD)**:
```html
<!-- Enhanced module-2-brd.html -->

<div class="narrative-editor">
  <!-- Version selector -->
  <div class="version-bar">
    <select id="versionSelector">
      <option value="3" selected>v3 (Current - Approved)</option>
      <option value="2">v2 (Rejected by Legal)</option>
      <option value="1">v1 (Draft)</option>
    </select>
    <button id="compareBtn">Compare Versions</button>
    <button id="finalizeBtn">Finalize for Review</button>
  </div>

  <!-- Markdown editor -->
  <div class="editor-pane">
    <textarea id="markdownEditor">
---
id: project-42
type: brd
status: approved
---

# Mobile App Redesign (BRD)

## Business Case
[content...]
    </textarea>
  </div>

  <!-- Live preview -->
  <div class="preview-pane">
    <div id="renderedContent">
      <!-- Rendered HTML with live widgets -->
    </div>
  </div>

  <!-- Comments sidebar -->
  <div class="comments-sidebar">
    <div class="comment-thread" data-section="business-case">
      <div class="comment">
        <strong>Sarah Chen</strong> (CEO)
        <p>Can we quantify the retention impact more precisely?</p>
        <button>Reply</button>
      </div>
    </div>
  </div>
</div>

<script>
// Auto-save every 30 seconds
setInterval(async () => {
  const content = document.getElementById('markdownEditor').value;
  await fetch('/api/v1/narratives/42/autosave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
}, 30000);

// Live preview updates
document.getElementById('markdownEditor').addEventListener('input',
  debounce(async (e) => {
    const rendered = await renderMarkdown(e.target.value);
    document.getElementById('renderedContent').innerHTML = rendered;
  }, 500)
);
</script>
```

**Success Criteria**:
- [ ] Can create/edit narratives with YAML + Markdown
- [ ] Every save creates versioned snapshot
- [ ] Can compare diffs between versions
- [ ] Comments work on specific sections
- [ ] Live preview renders widgets correctly

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

#### Sprint 2 (Week 5-6): Decision Register + Approval Workflow

**Features**:
1. **Formalized Review Process**
   - "Finalize for Review" creates immutable version snapshot
   - Auto-assigns reviewers based on rules
   - Each reviewer votes: Approve / Reject / Approve with Conditions

2. **Decision Register**
   - Immutable log of all approval decisions
   - Linked to specific document version
   - Conditions tracked as follow-up tasks

3. **Approval Dashboard**
   - "Pending My Review" queue
   - SLA tracking (5 days to review)
   - Auto-escalation on missed deadlines

**Technical Implementation**:
```typescript
// src/services/decision-register.service.ts

export class DecisionRegisterService {
  async recordDecision(params: {
    narrative_id: number;
    version: number;
    reviewer_id: number;
    decision: 'approved' | 'rejected' | 'conditional';
    conditions?: string[];
    reasoning: string;
  }) {
    // 1. Validate: Can't change decision once recorded
    const existing = await this.getDecision(
      params.narrative_id,
      params.version,
      params.reviewer_id
    );
    if (existing) {
      throw new Error('Decision already recorded (immutable)');
    }

    // 2. Insert into decision_register (append-only table)
    const decision = await db.query(`
      INSERT INTO decision_register (
        narrative_id, version, reviewer_id, decision, conditions, reasoning
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      params.narrative_id,
      params.version,
      params.reviewer_id,
      params.decision,
      JSON.stringify(params.conditions || []),
      params.reasoning
    ]);

    // 3. If conditional approval, create follow-up tasks
    if (params.decision === 'conditional' && params.conditions) {
      for (const condition of params.conditions) {
        await tasksService.create({
          narrative_id: params.narrative_id,
          description: condition,
          assigned_to: await this.getDocumentAuthor(params.narrative_id),
          blocks_approval: true
        });
      }
    }

    // 4. Check if all reviewers have voted
    const allDecisions = await this.getAllDecisions(
      params.narrative_id,
      params.version
    );
    const requiredReviewers = await this.getRequiredReviewers(
      params.narrative_id
    );

    if (allDecisions.length === requiredReviewers.length) {
      await this.finalizeReview(params.narrative_id, params.version);
    }

    // 5. Event log
    await eventLog.record({
      event_type: 'decision_recorded',
      entity_type: 'narrative',
      entity_id: params.narrative_id,
      actor_id: params.reviewer_id,
      metadata: decision
    });

    return decision;
  }

  async finalizeReview(narrative_id: number, version: number) {
    const decisions = await this.getAllDecisions(narrative_id, version);

    // Determine final outcome
    const hasRejection = decisions.some(d => d.decision === 'rejected');
    const allApproved = decisions.every(d =>
      d.decision === 'approved' || d.decision === 'conditional'
    );

    const final_status = hasRejection ? 'rejected' :
                         allApproved ? 'approved' : 'pending';

    // Update narrative status
    await db.query(`
      UPDATE narratives
      SET status = $1, approved_version = $2
      WHERE id = $3
    `, [final_status, final_status === 'approved' ? version : null, narrative_id]);

    // If approved, trigger next phase (e.g., BRD → PRD)
    if (final_status === 'approved') {
      await this.triggerNextPhase(narrative_id);
    }
  }
}
```

**Frontend (Decision Register View)**:
```html
<!-- New tab in narrative view -->

<div class="decision-register">
  <h2>📜 Decision History (Immutable Record)</h2>

  <div class="decision-entry">
    <div class="decision-header">
      <strong>v3 - Approved</strong>
      <span class="date">Jan 15, 2025 14:30</span>
    </div>

    <div class="decision-votes">
      <div class="vote vote-approved">
        ✅ <strong>Sarah Chen</strong> (CEO)
        <p><em>Reasoning:</em> "Strong business case, aligns with Q1 goals."</p>
        <p><strong>Condition:</strong> Reduce budget to $60k</p>
      </div>

      <div class="vote vote-approved">
        ✅ <strong>Mike Johnson</strong> (CFO)
        <p><em>Reasoning:</em> "Budget is acceptable."</p>
      </div>

      <div class="vote vote-approved">
        ✅ <strong>Alex Kim</strong> (VP Engineering)
        <p><em>Reasoning:</em> "Technical feasibility confirmed."</p>
      </div>
    </div>

    <div class="final-outcome">
      <strong>Final Decision:</strong> ✅ Approved (with 1 condition)
      <br>
      <strong>Follow-up Tasks:</strong>
      <ul>
        <li>✅ Update budget section to $60k (completed Jan 15)</li>
      </ul>
    </div>
  </div>

  <div class="decision-entry">
    <div class="decision-header">
      <strong>v2 - Rejected</strong>
      <span class="date">Jan 10, 2025 09:15</span>
    </div>

    <div class="decision-votes">
      <div class="vote vote-rejected">
        ❌ <strong>Jane Doe</strong> (Legal)
        <p><em>Reasoning:</em> "Missing GDPR compliance in Section 4."</p>
        <p><strong>Required Changes:</strong></p>
        <ul>
          <li>Add data retention policy (30 days max)</li>
          <li>Document user consent flow</li>
          <li>Include right-to-deletion process</li>
        </ul>
      </div>
    </div>

    <div class="final-outcome">
      <strong>Final Decision:</strong> ❌ Rejected
      <br>
      <strong>Action Taken:</strong> Author revised document → created v3
    </div>
  </div>
</div>
```

**Success Criteria**:
- [ ] Can finalize version for review (locks document)
- [ ] Reviewers can vote with reasoning
- [ ] Conditional approvals create follow-up tasks
- [ ] Decision register is immutable (no edits allowed)
- [ ] All decisions are auditable (who, when, why)

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

### Phase 2: Orchestration Integration (Week 7-10)

#### Sprint 3 (Week 7-8): Milestone Linking + Traceability

**Goal**: Connect execution (milestones) to narrative (why)

**Features**:
1. **Milestone Declaration in Document**
   ```markdown
   ## Milestones

   ### 1. Redesigned Home Screen [[milestone-42]]
   Owner: Alex (Design Lead)
   Timeline: Jan 20 - Feb 5
   Dependencies: None

   ### 2. Push Notifications [[milestone-43]]
   Owner: Jamie (Backend Lead)
   Timeline: Feb 6 - Feb 20
   Dependencies: [[project-api-v2]]
   ```

2. **Orchestration Engine Reads Document**
   - Parser extracts `[[milestone-XX]]` references
   - Creates corresponding records in `milestones` table
   - Maintains bidirectional link: milestone ↔ document section

3. **Status Flows Both Ways**
   - User updates milestone status in dashboard → Updates document frontmatter
   - User edits milestone in document → Updates orchestration engine

**Technical Implementation**:
```typescript
// src/services/milestone-sync.service.ts

export class MilestoneSyncService {
  /**
   * Extract milestones from document and sync to orchestration
   */
  async syncFromDocument(narrative_id: number) {
    // 1. Get latest document version
    const doc = await narrativeService.getLatest(narrative_id);
    const parsed = await documentParser.parseDocument(doc.content);

    // 2. Extract milestone references
    const milestones = this.extractMilestones(parsed);
    // Example: [[milestone-42]] in "### 1. Redesigned Home Screen"

    // 3. Sync to database
    for (const milestone of milestones) {
      const existing = await db.query(
        'SELECT * FROM milestones WHERE narrative_reference = $1',
        [milestone.reference] // e.g., "milestone-42"
      );

      if (existing.rows.length === 0) {
        // Create new milestone
        await db.query(`
          INSERT INTO milestones (
            project_id, narrative_reference, title, owner_id, due_date
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          narrative_id,
          milestone.reference,
          milestone.title,
          milestone.owner_id,
          milestone.due_date
        ]);
      } else {
        // Update existing (only if changed)
        await db.query(`
          UPDATE milestones
          SET title = $1, owner_id = $2, due_date = $3
          WHERE narrative_reference = $4
        `, [
          milestone.title,
          milestone.owner_id,
          milestone.due_date,
          milestone.reference
        ]);
      }
    }
  }

  /**
   * Update document when milestone status changes
   */
  async syncToDocument(milestone_id: number, status: string, progress: number) {
    // 1. Get milestone
    const milestone = await db.query(
      'SELECT * FROM milestones WHERE id = $1',
      [milestone_id]
    );

    // 2. Load narrative
    const narrative_id = milestone.rows[0].project_id;
    const doc = await narrativeService.getLatest(narrative_id);

    // 3. Parse and update frontmatter
    const { data: metadata, content } = matter(doc.content);

    if (!metadata.milestones) {
      metadata.milestones = [];
    }

    const milestoneIndex = metadata.milestones.findIndex(
      m => m.id === milestone.rows[0].narrative_reference
    );

    if (milestoneIndex >= 0) {
      metadata.milestones[milestoneIndex].status = status;
      metadata.milestones[milestoneIndex].progress = progress;
    } else {
      metadata.milestones.push({
        id: milestone.rows[0].narrative_reference,
        title: milestone.rows[0].title,
        status,
        progress
      });
    }

    // 4. Save updated document (auto-version)
    const updated = matter.stringify(content, metadata);
    await narrativeService.saveVersion(narrative_id, updated, {
      auto_generated: true,
      reason: `Milestone ${milestone.rows[0].narrative_reference} updated to ${status}`
    });

    // 5. Recalculate project health score
    await this.updateHealthScore(narrative_id);
  }
}
```

**Success Criteria**:
- [ ] Can declare milestones in document with `[[milestone-XX]]` syntax
- [ ] Milestones auto-sync to orchestration engine
- [ ] Updating milestone status updates document metadata
- [ ] Full traceability: milestone → section of document

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

#### Sprint 4 (Week 9-10): Live Widgets + Dashboard Integration

**Goal**: Embed real-time data in documents + fast dashboard queries

**Features**:
1. **Widget System**
   ```markdown
   ## Current Status

   {{widget type="project-status" project-id="42"}}
   <!-- Renders live status: progress, blockers, next milestones -->

   ## Success Metrics

   {{widget type="chart" source="analytics.retention" filter="last-30-days"}}
   <!-- Renders live chart from analytics system -->

   ## Blocker Alert

   {{widget type="blocker" milestone-id="43"}}
   <!-- Renders blocker details + escalation button -->
   ```

2. **Widget Rendering Engine**
   - Parse `{{widget}}` tags from document
   - Fetch live data from orchestration/metrics services
   - Render as interactive HTML
   - Update in real-time via WebSocket

3. **Document Index for Dashboard**
   - Parse metadata into `document_index` table
   - Fast queries: "Show all blocked projects"
   - Dashboard reads from index, links to full document

**Technical Implementation**:
```typescript
// src/services/widget-registry.service.ts

export class WidgetRegistryService {
  private widgets: Map<string, WidgetRenderer> = new Map();

  constructor() {
    // Register built-in widgets
    this.register('project-status', new ProjectStatusWidget());
    this.register('chart', new ChartWidget());
    this.register('blocker', new BlockerWidget());
    this.register('approval-status', new ApprovalStatusWidget());
  }

  async render(widgetTag: string, context: RenderContext): Promise<string> {
    // Parse: {{widget type="project-status" project-id="42"}}
    const parsed = this.parseWidget(widgetTag);
    const renderer = this.widgets.get(parsed.type);

    if (!renderer) {
      return `<div class="widget-error">Unknown widget type: ${parsed.type}</div>`;
    }

    // Fetch live data
    const data = await renderer.fetchData(parsed.params, context);

    // Render HTML
    return renderer.render(data, parsed.params);
  }
}

// Example widget renderer
class ProjectStatusWidget implements WidgetRenderer {
  async fetchData(params: any, context: RenderContext) {
    const projectId = params['project-id'];
    return await orchestrationService.getProjectStatus(projectId);
  }

  render(data: ProjectStatus, params: any): string {
    return `
      <div class="widget widget-project-status" data-project-id="${params['project-id']}">
        <div class="status-header">
          <span class="status-badge ${data.health}">${data.health_icon} ${data.status}</span>
          <span class="progress">${data.progress}% complete</span>
        </div>

        ${data.blockers.length > 0 ? `
          <div class="blockers">
            <strong>⚠️ Active Blockers (${data.blockers.length}):</strong>
            ${data.blockers.map(b => `
              <div class="blocker">
                ${b.description}
                <span class="overdue">(${b.days_overdue} days)</span>
                <button onclick="escalateBlocker('${b.id}')">Escalate</button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="next-milestones">
          <strong>Next Up:</strong>
          ${data.next_milestones.map(m => `
            <div class="milestone">
              ${m.title} <span class="due">(due ${m.due_date_formatted})</span>
            </div>
          `).join('')}
        </div>

        <div class="last-updated">
          Updated: <span class="timestamp" data-live="true">just now</span>
        </div>
      </div>
    `;
  }
}
```

**Real-Time Updates**:
```typescript
// When orchestration engine updates project status
orchestrationService.on('status_changed', async (projectId, newStatus) => {
  // 1. Find all documents with widgets referencing this project
  const docs = await db.query(`
    SELECT DISTINCT narrative_id
    FROM document_index
    WHERE content LIKE '%project-id="${projectId}"%'
  `);

  // 2. Broadcast to all viewers of those documents
  for (const doc of docs.rows) {
    webSocketService.broadcast(`narrative:${doc.narrative_id}`, {
      type: 'widget_update',
      widget_type: 'project-status',
      project_id: projectId,
      data: newStatus
    });
  }
});

// Client-side: Update widget without page refresh
socket.on('widget_update', async (update) => {
  if (update.widget_type === 'project-status') {
    const widget = document.querySelector(
      `.widget-project-status[data-project-id="${update.project_id}"]`
    );
    if (widget) {
      const rendered = await renderWidget('project-status', update.data);
      widget.innerHTML = rendered;
    }
  }
});
```

**Dashboard Integration**:
```typescript
// src/controllers/dashboard.controller.ts

export class DashboardController {
  async getMyProjects(req: Request, res: Response) {
    const userId = req.user.id;

    // Query index (fast!) instead of parsing all documents
    const projects = await db.query(`
      SELECT
        di.narrative_id,
        di.project_id,
        n.type,
        nv.content::jsonb->'metadata'->>'title' as title,
        di.status,
        di.health_score,
        di.blockers,
        di.next_milestones
      FROM document_index di
      JOIN narratives n ON n.id = di.narrative_id
      JOIN narrative_versions nv ON nv.narrative_id = n.id AND nv.version = n.current_version
      WHERE di.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = $1
      )
      ORDER BY di.health_score ASC, di.status DESC
    `, [userId]);

    // Each project links to full narrative
    const formatted = projects.rows.map(p => ({
      id: p.project_id,
      title: p.title,
      type: p.type,
      status: p.status,
      health: p.health_score,
      blockers: p.blockers,
      next_milestones: p.next_milestones,
      narrative_url: `/narratives/${p.narrative_id}` // Link to full doc
    }));

    res.json({ success: true, projects: formatted });
  }
}
```

**Success Criteria**:
- [ ] Can embed live widgets in documents
- [ ] Widgets update in real-time (no refresh)
- [ ] Dashboard queries index (fast), links to documents
- [ ] Charts/metrics render correctly

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

### Phase 3: Production Hardening (Week 11-14)

#### Sprint 5 (Week 11-12): Security + Performance

**Critical Fixes**:
1. **XSS Prevention**
   - Sanitize ALL user input (DOMPurify)
   - Content Security Policy headers
   - Escape widget parameters

2. **Authentication & Authorization**
   - JWT token auth (replace hardcoded "demo-user")
   - Role-based access control (RBAC)
   - Document-level permissions (who can view/edit/approve)

3. **Performance Optimization**
   - Database indexing (narrative_id, project_id, status)
   - Redis caching (rendered documents, dashboard queries)
   - Lazy-load widgets (don't fetch all data upfront)
   - Pagination (don't load all versions at once)

**Success Criteria**:
- [ ] Pass penetration testing (no XSS/CSRF/SQL injection)
- [ ] Dashboard loads < 500ms
- [ ] Document rendering < 1 second (even with 10 widgets)
- [ ] Supports 100+ concurrent users

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

#### Sprint 6 (Week 13-14): UX Polish + Demo Integration

**Goal**: Make production-ready and integrate into demo workflow

**Features**:
1. **Onboarding Flow**
   - First-time user tutorial
   - Sample documents pre-loaded
   - "Quick Start" wizard

2. **Demo Mode Enhancements**
   - Update existing modules (1, 2, 3, 4, 6) to use new narrative system
   - Keep AI Generator (1.5) as entry point
   - Add "Decision Register" tab to all document views

3. **Export/Import**
   - Export narrative as PDF (for offline sharing)
   - Export decision register as CSV (for compliance)
   - Import from Google Docs/Confluence (migration path)

**Demo Workflow Integration**:
```
┌─────────────────────────────────────────────────────────┐
│  UPDATED DEMO WORKFLOW (Production-Ready)               │
│                                                          │
│  Step 1: Capture Idea                                   │
│  └─ Module 1.5 (AI Generator) - UNCHANGED               │
│     User describes project → AI generates BRD draft     │
│                                                          │
│  Step 2: Refine Narrative                               │
│  └─ Module 2 (BRD Editor) - ENHANCED                    │
│     • Rich Markdown editor with YAML frontmatter        │
│     • Version control (v1, v2, v3...)                   │
│     • Contextual comments                               │
│     • Embedded widgets (live status, metrics)           │
│                                                          │
│  Step 3: Formal Review                                  │
│  └─ "Finalize for Review" button                        │
│     • Locks version 3                                   │
│     • Auto-assigns reviewers (CEO, CFO, Legal)          │
│     • Sends notifications with SLA (5 days)             │
│                                                          │
│  Step 4: Approval Voting                                │
│  └─ Reviewers vote in "Pending My Review" dashboard     │
│     • CEO: Approve (with condition: reduce budget)      │
│     • CFO: Approve                                      │
│     • Legal: Reject (missing GDPR details)              │
│                                                          │
│  Step 5: Iterate                                        │
│  └─ PM sees rejection feedback in Decision Register     │
│     • Updates Section 4 (GDPR compliance)               │
│     • Creates v4                                        │
│     • Re-submits for review                             │
│                                                          │
│  Step 6: Approval Complete                              │
│  └─ All reviewers approve v4                            │
│     • Decision Register shows immutable record          │
│     • System auto-generates PRD from approved BRD       │
│                                                          │
│  Step 7: Execution Planning                             │
│  └─ Module 3 (PRD) - ENHANCED                           │
│     • PM defines milestones with [[milestone-XX]]       │
│     • Links to approved BRD sections (traceability)     │
│     • Assigns owners, sets due dates                    │
│                                                          │
│  Step 8: Real-Time Tracking                             │
│  └─ Module 1 (Dashboard) - ENHANCED                     │
│     • Shows all projects with health scores             │
│     • Blockers auto-detected and escalated              │
│     • Clicking project → Opens full narrative           │
│                                                          │
│  Step 9: Live Status in Document                        │
│  └─ PRD now contains:                                   │
│     {{widget type="project-status" project-id="42"}}    │
│     • Renders: 🟡 At Risk - API team blocked           │
│     • Updates in real-time (no refresh needed)          │
│                                                          │
│  Step 10: Audit & Compliance                            │
│  └─ Any stakeholder can view:                           │
│     • Full Decision Register (who approved when)        │
│     • Version history (what changed)                    │
│     • Comment threads (discussion context)              │
│     • Event log (complete audit trail)                  │
└─────────────────────────────────────────────────────────┘
```

**File Updates Required**:
```bash
# Modules to enhance (not replace)
src/views/module-1-present.html          # Dashboard - add index queries
src/views/module-2-brd.html              # BRD - add Markdown editor + versioning
src/views/module-3-prd.html              # PRD - add Markdown editor + widgets
src/views/module-1.5-ai-generator.html   # Keep as-is (entry point)

# New modules to create
src/views/module-decision-register.html  # Immutable approval log
src/views/module-version-history.html    # Diff viewer

# Backend controllers to create
src/controllers/narratives.controller.ts
src/controllers/narrative-versions.controller.ts
src/controllers/decision-register.controller.ts
src/controllers/widgets.controller.ts

# Backend services to create
src/services/document-parser.service.ts
src/services/document-renderer.service.ts
src/services/milestone-sync.service.ts
src/services/widget-registry.service.ts
```

**Success Criteria**:
- [ ] Demo flows from Module 1.5 → 2 → 3 → 1 seamlessly
- [ ] All features work in both "mock mode" and "live mode"
- [ ] Can complete full workflow (idea → approval → execution) in 10 min
- [ ] Documentation updated (USER_GUIDE.md, API_DOCUMENTATION.md)

**Effort**: 2 engineers × 2 weeks = 4 engineer-weeks

---

## Demo Workflow Integration

### Current Demo (As-Is)
```
Module 0: Onboarding
Module 1: Dashboard (basic stats)
Module 1.5: AI Generator ✅ (good!)
Module 2: BRD (basic form)
Module 3: PRD (basic form)
Module 4: Engineering Design
Module 6: Implementation Tracking
```

**Issues**:
- No version control
- No formal approval workflow
- No decision audit trail
- Documents are forms, not narratives
- Status lives in dashboard only (not in document)

---

### Enhanced Demo (To-Be)
```
Module 0: Onboarding ✅ (keep as-is)

Module 1: Unified Dashboard (ENHANCED)
├─ Shows all projects (from document_index)
├─ Health scores, blockers, next milestones
└─ Each project links to full narrative (document)

Module 1.5: AI Generator ✅ (keep as-is)
└─ Entry point for new projects

Module 2: BRD Narrative (TRANSFORMED)
├─ Rich Markdown editor (YAML frontmatter + content)
├─ Version control (v1, v2, v3...)
├─ Embedded widgets ({{widget type="status"}})
├─ Contextual comments
├─ "Finalize for Review" button
└─ Tabs: [Edit] [Preview] [Versions] [Decisions] [Comments]

Module 3: PRD Narrative (TRANSFORMED)
├─ Auto-generated from approved BRD
├─ Milestone declarations ([[milestone-XX]])
├─ Live status widgets
├─ Traceability links to BRD sections
└─ Same tab structure as Module 2

Module 4: Engineering Design (LIGHT UPDATE)
└─ Link to PRD narrative (read-only reference)

Module 6: Implementation Tracking (LIGHT UPDATE)
└─ Shows milestones from narratives
```

---

### Sample Demo Script (10 Minutes)

**Minute 1-2: The Problem**
> "Traditional project management tools scatter information everywhere.
> BRDs in Google Docs, status in Jira, approvals via email, decisions lost in Slack.
> Project Conductor solves this by making the **document the source of truth**."

**Minute 3-4: Capture Idea**
> [Open Module 1.5 - AI Generator]
> "Let's say I want to build a mobile app redesign. I describe it in plain English..."
> [Type idea, click Generate]
> "AI creates a complete BRD draft in 10 seconds."

**Minute 5-6: Refine & Review**
> [Open Module 2 - BRD]
> "Here's my BRD as a living document. I can edit it like a wiki, add comments, embed live metrics."
> [Show Markdown editor, add widget]
> "When ready, I click 'Finalize for Review.' System auto-assigns CEO, CFO, Legal."

**Minute 7-8: Approval Process**
> [Switch to reviewer view]
> "Each reviewer votes: Approve, Reject, or Approve with Conditions."
> [Show CEO approving with condition: reduce budget]
> [Show Legal rejecting: missing GDPR]
> "Every decision is recorded in an immutable Decision Register. Full audit trail."

**Minute 9: Execution**
> [Show approved BRD auto-generates PRD]
> "Once approved, system creates the PRD. I define milestones with traceability back to BRD sections."
> [Show [[milestone-42]] syntax]
> "Each milestone links to the exact paragraph that justified it."

**Minute 10: Live Tracking**
> [Open Module 1 - Dashboard]
> "My dashboard shows all projects with real-time health scores."
> [Click project, open narrative]
> "Embedded widgets show live status: 🟡 At Risk - API team blocked 2 days."
> [Click escalate button]
> "One click to escalate. No status meetings needed."

**Closing**:
> "That's Project Conductor: **One source of truth, from idea to launch**.
> Documents are living, decisions are auditable, status is always current."

---

## Risk Analysis

### Risk 1: Complexity Overload
**Concern**: Combining doc-anchored + orchestration adds too much complexity

**Likelihood**: Medium
**Impact**: High (confuses users, slows adoption)

**Mitigation**:
1. **Progressive disclosure**: Start simple (just Markdown editor), reveal advanced features gradually
2. **Smart defaults**: Auto-routing, auto-versioning work invisibly
3. **Two modes**: "Simple mode" (just edit doc) vs "Pro mode" (full orchestration)
4. **Onboarding tutorial**: 5-min walkthrough of core workflow

**Acceptance Criteria**:
- New user can create/edit document in < 5 min (no training)
- Advanced users can enable orchestration features opt-in

---

### Risk 2: Widget Fragility
**Concern**: Live widgets break if data sources change

**Likelihood**: Medium
**Impact**: Medium (bad UX, but not critical)

**Mitigation**:
1. **Graceful degradation**: If widget fails, show error message (don't break page)
2. **Fallback to static**: Widget can render last-known-good data if live fetch fails
3. **Widget versioning**: `{{widget type="status" version="2"}}` for backwards compat
4. **Monitoring**: Alert if widget error rate > 5%

**Example**:
```typescript
async renderWidget(widget: Widget): Promise<string> {
  try {
    const data = await widget.fetchData();
    return widget.render(data);
  } catch (error) {
    logger.error('Widget render failed', { widget, error });

    // Fallback to cached data
    const cached = await cache.get(`widget:${widget.id}`);
    if (cached) {
      return widget.render(cached, { stale: true });
    }

    // Last resort: error message
    return `
      <div class="widget-error">
        ⚠️ Unable to load live data.
        <button onclick="retryWidget('${widget.id}')">Retry</button>
      </div>
    `;
  }
}
```

---

### Risk 3: Sync Conflicts (Document ↔ Orchestration)
**Concern**: User edits document while orchestration updates status → conflict

**Likelihood**: Low (rare edge case)
**Impact**: High (data loss or corruption)

**Mitigation**:
1. **Optimistic locking**: Version number in frontmatter, reject stale updates
2. **Auto-merge**: Status updates (auto-generated) don't conflict with content edits
3. **Conflict UI**: If true conflict, show diff and ask user to resolve
4. **Event sourcing**: All changes logged in event_log, can reconstruct state

**Example**:
```typescript
async saveVersion(narrative_id: number, content: string, expected_version: number) {
  const current = await this.getCurrentVersion(narrative_id);

  if (current.version !== expected_version) {
    // Conflict! User edited v3, but current is v4 (orchestration auto-updated)

    // Check if changes can be auto-merged
    const canMerge = this.canAutoMerge(current.content, content);

    if (canMerge) {
      const merged = this.mergeChanges(current.content, content);
      return this.saveVersion(narrative_id, merged, current.version);
    } else {
      // Manual resolution required
      throw new ConflictError({
        current_version: current.version,
        your_version: expected_version,
        diff: this.generateDiff(current.content, content)
      });
    }
  }

  // No conflict, save normally
  return this.createVersion(narrative_id, content);
}
```

---

### Risk 4: Performance (Parsing + Rendering)
**Concern**: Parsing Markdown + rendering widgets on every page load is slow

**Likelihood**: High (will happen as documents grow)
**Impact**: Medium (slow UX, but not broken)

**Mitigation**:
1. **Aggressive caching**: Cache rendered HTML for 5 min (invalidate on edit)
2. **Lazy widget loading**: Render placeholders first, fetch widgets async
3. **Static rendering**: Pre-render documents on save (like static site generator)
4. **Incremental parsing**: Only re-parse changed sections

**Performance Targets**:
- Document load: < 1 second (cached)
- Document load: < 3 seconds (uncached, with 10 widgets)
- Dashboard query: < 500ms (from index)

**Example**:
```typescript
async getRenderedDocument(narrative_id: number): Promise<string> {
  // Check cache first
  const cached = await redis.get(`rendered:${narrative_id}`);
  if (cached) {
    return cached; // < 50ms
  }

  // Cache miss: parse and render
  const doc = await narrativeService.getLatest(narrative_id);
  const parsed = await documentParser.parseDocument(doc.content); // ~100ms
  const rendered = await documentRenderer.render(parsed); // ~500ms for 10 widgets

  // Cache for 5 minutes
  await redis.setex(`rendered:${narrative_id}`, 300, rendered);

  return rendered; // ~600ms total
}
```

---

## Recommendation

### The Verdict: **Proceed with Integrated Approach**

**Why**:
1. **Best of both worlds**: Document truth + workflow automation
2. **Auditable + Usable**: Legal/compliance love docs, users love dashboards
3. **Amazon-proven**: Doc-anchored is battle-tested (PR/FAQ method works)
4. **Future-proof**: Documents are portable, workflows can be migrated

**Path Forward**:
1. ✅ **Week 1-2**: Get stakeholder buy-in on this integrated plan
2. ✅ **Week 3-6**: Build doc-anchored core (editor, versioning, decisions)
3. ✅ **Week 7-10**: Add orchestration layer (milestones, widgets, dashboard)
4. ✅ **Week 11-14**: Production hardening + demo integration
5. ✅ **Week 15**: Alpha launch (10 internal users)

**Critical Success Factors**:
1. **Don't build two systems**: Document IS the data model, dashboard is a view
2. **Parse don't duplicate**: Frontmatter metadata feeds orchestration, not separate DB
3. **Sync bidirectionally**: Changes flow both ways (doc ↔ engine)
4. **Cache aggressively**: Pre-render documents, index for fast queries

---

## Next Steps (This Week)

### [ ] 1. Executive Decision
Present this integrated plan to leadership:
- **Investment**: $500k (2 engineers × 14 weeks)
- **Return**: $2.4M/year (same as orchestration-only plan)
- **Differentiation**: Only tool with doc-anchored + AI orchestration

### [ ] 2. Technical Validation
- Review database schema with team
- Validate Markdown + YAML frontmatter approach
- Prototype widget rendering (1-day spike)

### [ ] 3. Demo Mockup
- Create high-fidelity mockup of enhanced Module 2 (BRD editor)
- Show version control + decision register UI
- Show embedded widget (live status)

### [ ] 4. Sprint 1 Planning
- Break down "Rich Narrative Editor + Versioning" into tasks
- Set up project tracking (meta: use Project Conductor to build it!)
- Schedule kickoff meeting

---

## Conclusion

**The integrated "doc-anchored orchestration" approach solves the fundamental tension**:

- **Documents** provide narrative coherence, auditability, portability
- **Orchestration** provides real-time visibility, automation, intelligence
- **Together** they create something neither could achieve alone

**The key insight**: Make the document machine-readable (YAML frontmatter + structured Markdown) so it can be BOTH human-readable prose AND queryable data.

**This is the vision**: Amazon's narrative discipline meets modern workflow automation.

**Ready to build it?** 🎯

---

*End of Critical Analysis & Integration Plan*
