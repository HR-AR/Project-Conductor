# Quick Start Guide - Build Demo in Phases
## Simplified Implementation Plan

**Goal**: Working demo in 2 weeks, production-ready in 4 weeks
**Strategy**: Build incrementally, test continuously, ship fast

---

## 🚀 Phase 1A: Document Parser Backend (Days 1-2)

### Step 1: Install Dependencies
```bash
cd "/Users/h0r03cw/Desktop/Coding/Project Conductor"
npm install gray-matter marked diff
```

### Step 2: Create TypeScript Interfaces
**File**: `src/models/narrative.model.ts`

```typescript
export interface Narrative {
  id: number;
  project_id: number;
  type: 'brd' | 'prd' | 'design' | 'engineering';
  current_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface NarrativeVersion {
  id: number;
  narrative_id: number;
  version: number;
  content: string; // Full Markdown + YAML frontmatter
  author_id: number;
  change_reason?: string;
  is_auto_generated: boolean;
  created_at: Date;
}

export interface ParsedDocument {
  metadata: DocumentMetadata;
  rawContent: string;
  htmlContent: string;
  widgets: Widget[];
  references: Reference[];
}

export interface DocumentMetadata {
  id?: string;
  type?: string;
  status?: string;
  health_score?: number;
  milestones?: Milestone[];
  approvers?: Approver[];
  [key: string]: any;
}

export interface Widget {
  type: string;
  params: Record<string, string>;
  position: number;
  raw: string;
}

export interface Reference {
  type: 'milestone' | 'project' | 'requirement';
  id: string;
  position: number;
}
```

### Step 3: Create Document Parser Service
**File**: `src/services/document-parser.service.ts`

```typescript
import matter from 'gray-matter';
import { marked } from 'marked';
import { ParsedDocument, Widget, Reference } from '../models/narrative.model';

export class DocumentParserService {
  /**
   * Parse Markdown document with YAML frontmatter
   */
  parseDocument(markdown: string): ParsedDocument {
    // Extract YAML frontmatter
    const { data: metadata, content: rawContent } = matter(markdown);

    // Convert Markdown to HTML
    const htmlContent = marked(rawContent);

    // Extract widgets
    const widgets = this.extractWidgets(rawContent);

    // Extract cross-references
    const references = this.extractReferences(rawContent);

    return {
      metadata,
      rawContent,
      htmlContent,
      widgets,
      references
    };
  }

  /**
   * Extract widget tags like {{widget type="status" project-id="42"}}
   */
  private extractWidgets(content: string): Widget[] {
    const widgets: Widget[] = [];
    const regex = /\{\{widget\s+([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const paramsString = match[1];
      const params: Record<string, string> = {};

      // Parse key="value" pairs
      const paramRegex = /(\w+)="([^"]+)"/g;
      let paramMatch;
      while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
        params[paramMatch[1]] = paramMatch[2];
      }

      widgets.push({
        type: params.type || 'unknown',
        params,
        position: match.index,
        raw: match[0]
      });
    }

    return widgets;
  }

  /**
   * Extract cross-references like [[milestone-42]]
   */
  private extractReferences(content: string): Reference[] {
    const references: Reference[] = [];
    const regex = /\[\[(\w+)-(\d+)\]\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      references.push({
        type: match[1] as any,
        id: match[2],
        position: match.index
      });
    }

    return references;
  }
}

export default new DocumentParserService();
```

### Step 4: Create Narrative Versions Service
**File**: `src/services/narrative-versions.service.ts`

```typescript
import { NarrativeVersion } from '../models/narrative.model';
import db from '../config/database';

export class NarrativeVersionsService {
  private useMock = process.env.USE_MOCK_DB !== 'false';
  private mockVersions: NarrativeVersion[] = [];

  /**
   * Create new version
   */
  async create(params: {
    narrative_id: number;
    content: string;
    author_id: number;
    change_reason?: string;
    is_auto_generated?: boolean;
  }): Promise<NarrativeVersion> {
    if (this.useMock) {
      const version = this.mockVersions.filter(v => v.narrative_id === params.narrative_id).length + 1;
      const newVersion: NarrativeVersion = {
        id: this.mockVersions.length + 1,
        narrative_id: params.narrative_id,
        version,
        content: params.content,
        author_id: params.author_id,
        change_reason: params.change_reason,
        is_auto_generated: params.is_auto_generated || false,
        created_at: new Date()
      };
      this.mockVersions.push(newVersion);
      return newVersion;
    }

    const result = await db.query(
      `INSERT INTO narrative_versions
       (narrative_id, version, content, author_id, change_reason, is_auto_generated)
       VALUES ($1,
         (SELECT COALESCE(MAX(version), 0) + 1 FROM narrative_versions WHERE narrative_id = $1),
         $2, $3, $4, $5)
       RETURNING *`,
      [params.narrative_id, params.content, params.author_id, params.change_reason, params.is_auto_generated || false]
    );

    return result.rows[0];
  }

  /**
   * Get latest version
   */
  async getLatest(narrative_id: number): Promise<NarrativeVersion> {
    if (this.useMock) {
      const versions = this.mockVersions
        .filter(v => v.narrative_id === narrative_id)
        .sort((a, b) => b.version - a.version);
      return versions[0];
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1
       ORDER BY version DESC
       LIMIT 1`,
      [narrative_id]
    );

    return result.rows[0];
  }

  /**
   * Get specific version
   */
  async getVersion(narrative_id: number, version: number): Promise<NarrativeVersion> {
    if (this.useMock) {
      return this.mockVersions.find(
        v => v.narrative_id === narrative_id && v.version === version
      );
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1 AND version = $2`,
      [narrative_id, version]
    );

    return result.rows[0];
  }

  /**
   * List all versions
   */
  async listVersions(narrative_id: number): Promise<NarrativeVersion[]> {
    if (this.useMock) {
      return this.mockVersions
        .filter(v => v.narrative_id === narrative_id)
        .sort((a, b) => b.version - a.version);
    }

    const result = await db.query(
      `SELECT * FROM narrative_versions
       WHERE narrative_id = $1
       ORDER BY version DESC`,
      [narrative_id]
    );

    return result.rows;
  }

  /**
   * Load mock data
   */
  loadMockData(versions: NarrativeVersion[]) {
    this.mockVersions = versions;
  }
}

export default new NarrativeVersionsService();
```

### Step 5: Create Mock Data
**File**: `src/mock-data/narratives.mock.ts`

```typescript
import { NarrativeVersion } from '../models/narrative.model';

export const mockNarrativeVersions: NarrativeVersion[] = [
  {
    id: 1,
    narrative_id: 1,
    version: 1,
    content: `---
id: project-42
type: brd
status: draft
created_at: 2025-01-10T10:00:00Z
---

# Mobile App Redesign (BRD v1)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days.

## Business Case
Current retention: 45%
Target retention: 65%
Expected revenue impact: $2M ARR

## Initial Requirements
- Redesigned home screen
- Push notifications
- User profiles
`,
    author_id: 1,
    change_reason: 'Initial draft',
    is_auto_generated: false,
    created_at: new Date('2025-01-10T10:00:00Z')
  },
  {
    id: 2,
    narrative_id: 1,
    version: 2,
    content: `---
id: project-42
type: brd
status: rejected
---

# Mobile App Redesign (BRD v2)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days.

## Business Case
Current retention: 45%
Target retention: 65%
Expected revenue impact: $2M ARR

## GDPR Compliance
Added section on data retention and user consent.

## Requirements
- Redesigned home screen
- Push notifications
- User profiles
`,
    author_id: 1,
    change_reason: 'Added GDPR section per Legal feedback',
    is_auto_generated: false,
    created_at: new Date('2025-01-12T14:00:00Z')
  },
  {
    id: 3,
    narrative_id: 1,
    version: 3,
    content: `---
id: project-42
type: brd
status: approved
approved_at: 2025-01-15T14:30:00Z
health_score: 85
milestones:
  - id: milestone-42
    title: Home Screen Redesign
    status: in_progress
    progress: 80
  - id: milestone-43
    title: Push Notifications
    status: blocked
    progress: 0
---

# Mobile App Redesign (BRD v3 - APPROVED)

## Executive Summary
We're redesigning our mobile app to increase user retention from 45% to 65% over 30 days, translating to $2M in additional annual recurring revenue.

## Status
{{widget type="project-status" project-id="42"}}

## Business Case
- Current retention: 45% at 30 days
- Target retention: 65% at 30 days
- Expected revenue impact: $2M ARR
- Investment: $60,000 (reduced from $75k per CFO condition)

## GDPR Compliance
- Data retention: 30 days max
- User consent: Required on first launch
- Right to deletion: Automated via settings

## Milestones

### 1. Home Screen Redesign [[milestone-42]]
Owner: Alex (Design Lead)
Timeline: Jan 20 - Feb 5
Status: 80% complete

### 2. Push Notifications [[milestone-43]]
Owner: Jamie (Backend Lead)
Timeline: Feb 6 - Feb 20
Status: ⚠️ Blocked - API team dependency

## Success Criteria
- 20% increase in 30-day retention
- $2M additional ARR
- Launch by April 30, 2025
`,
    author_id: 1,
    change_reason: 'Final revisions approved by all stakeholders',
    is_auto_generated: false,
    created_at: new Date('2025-01-15T14:30:00Z')
  }
];
```

### Step 6: Create API Controller
**File**: `src/controllers/narratives.controller.ts`

```typescript
import { Request, Response } from 'express';
import narrativeVersionsService from '../services/narrative-versions.service';
import documentParserService from '../services/document-parser.service';
import { mockNarrativeVersions } from '../mock-data/narratives.mock';

// Load mock data
narrativeVersionsService.loadMockData(mockNarrativeVersions);

export class NarrativesController {
  /**
   * GET /api/v1/narratives/:id
   * Get latest version of narrative
   */
  async getLatest(req: Request, res: Response) {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = await narrativeVersionsService.getLatest(narrative_id);

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Narrative not found'
        });
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/versions
   * List all versions
   */
  async listVersions(req: Request, res: Response) {
    try {
      const narrative_id = parseInt(req.params.id);
      const versions = await narrativeVersionsService.listVersions(narrative_id);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/versions/:ver
   * Get specific version
   */
  async getVersion(req: Request, res: Response) {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = parseInt(req.params.ver);
      const doc = await narrativeVersionsService.getVersion(narrative_id, version);

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      res.json({
        success: true,
        data: doc
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/v1/narratives/:id/versions
   * Create new version
   */
  async createVersion(req: Request, res: Response) {
    try {
      const narrative_id = parseInt(req.params.id);
      const { content, change_reason } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required'
        });
      }

      const version = await narrativeVersionsService.create({
        narrative_id,
        content,
        author_id: 1, // TODO: Get from authenticated user
        change_reason
      });

      res.status(201).json({
        success: true,
        data: version,
        message: 'Version created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/v1/narratives/:id/render
   * Render document with parsed metadata
   */
  async render(req: Request, res: Response) {
    try {
      const narrative_id = parseInt(req.params.id);
      const version = await narrativeVersionsService.getLatest(narrative_id);

      if (!version) {
        return res.status(404).json({
          success: false,
          message: 'Narrative not found'
        });
      }

      const parsed = documentParserService.parseDocument(version.content);

      res.json({
        success: true,
        data: {
          ...version,
          parsed
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new NarrativesController();
```

### Step 7: Create Routes
**File**: `src/routes/narratives.routes.ts`

```typescript
import express from 'express';
import narrativesController from '../controllers/narratives.controller';

const router = express.Router();

router.get('/:id', (req, res) => narrativesController.getLatest(req, res));
router.get('/:id/versions', (req, res) => narrativesController.listVersions(req, res));
router.get('/:id/versions/:ver', (req, res) => narrativesController.getVersion(req, res));
router.post('/:id/versions', (req, res) => narrativesController.createVersion(req, res));
router.get('/:id/render', (req, res) => narrativesController.render(req, res));

export default router;
```

### Step 8: Register Routes in Main App
**File**: `src/index.ts` (add this line)

```typescript
import narrativesRoutes from './routes/narratives.routes';

// ... existing code ...

app.use('/api/v1/narratives', narrativesRoutes);
```

### Step 9: Test Backend
```bash
# Start server
npm run dev

# Test in another terminal
curl http://localhost:3000/api/v1/narratives/1
curl http://localhost:3000/api/v1/narratives/1/versions
curl http://localhost:3000/api/v1/narratives/1/render
```

---

## ✅ Success Criteria for Phase 1A
- [ ] Can GET /api/v1/narratives/1 (returns v3)
- [ ] Can GET /api/v1/narratives/1/versions (returns array of 3 versions)
- [ ] Can GET /api/v1/narratives/1/versions/2 (returns v2)
- [ ] Can GET /api/v1/narratives/1/render (returns parsed document with metadata)
- [ ] Mock data works without PostgreSQL
- [ ] No TypeScript errors

---

## 📝 Next Phase

Once Phase 1A is complete, we'll move to:
- **Phase 1B**: Markdown Editor UI (module-2-brd.html enhancement)
- **Phase 1C**: Decision Register & Approvals
- **Phase 2**: Widget System & Dashboard Integration

---

**LET'S START WITH PHASE 1A RIGHT NOW!**

Shall I begin implementing these files?
