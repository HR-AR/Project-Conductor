# Project Conductor - Implementation Plan (Building on Existing System)

## Current State Assessment

### ✅ What We Already Have (Keep & Enhance)
1. **Dashboard UI** - Beautiful home view with metrics, activity feed, action items
2. **Module System** - 5 modules with iframe loading and caching
3. **Demo Journey** - Automated tour through modules with overlays
4. **Live Collaboration Feed** - Real-time notifications showing cross-team activity
5. **Backend API** - Express + TypeScript with requirements CRUD
6. **Mock Service** - Pre-populated demo data (cart abandonment scenario)
7. **Module 0 (Present)** - Landing page with video/slideshow
8. **Module 2 (Business Input)** - Form for problem statement
9. **Module 3 (PRD Alignment)** - 3-tier alignment system
10. **Module 4 (Implementation)** - Basic task tracking
11. **Module 5 (Change Impact)** - Impact analysis

### 🔨 What We Need to Build

## Phase 1: Restructure Navigation & Roles (Week 1)

### 1.1 Separate Dashboard from Modules
**Current**: Dashboard is shown when clicking logo/home
**Change**: Make it crystal clear - Dashboard is NOT a module tab
**Tasks**:
- [x] Dashboard already works correctly
- [ ] Add "🏠 Home" to logo area to make it clear
- [ ] Remove any confusion between "Present" module and dashboard

### 1.2 Update Module Tab Structure
**Current Tabs**: Present | Business Problem | PRD Alignment | Implementation | Change Impact
**New Tabs**:
```
🏠 Dashboard (Logo click - not a tab)
  ↓
📖 Present (Module 0 - Demo & Learn)
💡 BRD (Module 1 - Business Requirements) ← Rename from "Business Problem"
📋 PRD (Module 2 - Product Requirements) ← Keep alignment system
🔍 Design (Module 3 - Engineering Design Review) ← NEW
⚖️ Align (Module 4 - Conflict Resolution) ← NEW
🔨 Build (Module 5 - Implementation Tracking) ← Enhanced
📊 History (Module 6 - Change Log & Impact) ← Rename from "Change Impact"
```

**Tasks**:
- [ ] Update `MODULES` array in dashboard to 7 modules
- [ ] Rename Module 1 to "BRD Creation"
- [ ] Rename Module 2 to "PRD Alignment"
- [ ] Create new Module 3: Engineering Design Review
- [ ] Create new Module 4: Alignment & Trade-offs
- [ ] Enhance Module 5: Implementation (TPM view)
- [ ] Enhance Module 6: Change History + Impact

### 1.3 Add Role-Based Context
**Purpose**: Show user which role they're playing in demo
**Implementation**:
- [ ] Add role selector to dashboard: "View as: Business | Product | Engineering | TPM"
- [ ] Show different content based on selected role
- [ ] Highlight ownership in each module (e.g., "👤 You are: Product Manager")

## Phase 2: Enhance Present Module (Week 1)

### 2.1 Pre-filled Demo in Present Tab
**Current**: Module 0 has slideshow + "Try It Live" form
**Enhancement**:
- [x] "Load Example" button already pre-fills form
- [ ] Make the demo auto-load when module loads (optional checkbox)
- [ ] Add "Start Journey with This Example" button that immediately goes to BRD with data
- [ ] Show preview of complete journey: BRD → PRD → Design → Alignment → Build

**Tasks**:
- [ ] Update `module-0-onboarding.html` (Present) to show journey preview
- [ ] Add "Quick Start: Use Cart Abandonment Example" prominent button
- [ ] Pre-populate data automatically when "Try Demo" is clicked

## Phase 3: BRD Module Enhancement (Week 1-2)

### 3.1 Rename Module 1 to "BRD Creation"
**Current**: "Business Problem Input" - just a form
**Enhancement**: Make it a proper BRD with sections

**New Structure**:
```
BRD Creation
├── Problem Statement (existing)
├── Business Impact ($2M revenue loss, 68% abandonment)
├── Success Criteria (measurable goals)
├── Timeline Expectations (Q2 launch)
├── Budget Constraints ($500k)
├── Stakeholders & Roles
│   ├── Sarah Chen (VP Product) - Owner
│   ├── Sales Team - Stakeholder
│   └── Marketing Team - Stakeholder
└── Approval Section
    ├── Status: Draft | Under Review | Approved
    └── Approvals: [Sarah Chen ✓] [Sales Team ✓] [Marketing Team ✓]
```

**Tasks**:
- [ ] Update `module-2-business-input.html` to include all BRD sections
- [ ] Add timeline picker (target launch date)
- [ ] Add budget field
- [ ] Add stakeholder assignment with roles
- [ ] Add approval workflow UI
- [ ] Add "Submit for Approval" button → Changes status to "under_review"
- [ ] Add approval buttons for stakeholders
- [ ] When all approve → Status becomes "approved" → PRD unlocks

### 3.2 Backend for BRD
**Tasks**:
- [ ] Create `BRD` model in backend (extends requirement model)
- [ ] Add fields: timeline, budget, approvals[], status
- [ ] Create approval endpoint: `POST /api/v1/brd/:id/approve`
- [ ] Add validation: Can't create PRD until BRD approved

## Phase 4: PRD Module Enhancement (Week 2)

### 4.1 PRD Generation from BRD
**Current**: Module 3 has alignment system
**Enhancement**: Show PRD is generated FROM approved BRD

**New Structure**:
```
PRD Creation
├── Source BRD: "High Cart Abandonment" ← Links back
├── Product Features (generated from BRD)
│   ├── Feature 1: One-Click Checkout
│   ├── Feature 2: Shipping Calculator
│   └── Feature 3: Security Trust Badges
├── User Stories
│   ├── "As a returning customer, I want..."
│   └── "As a mobile user, I want..."
├── Acceptance Criteria (per feature)
├── Technical Requirements (high-level)
└── Alignment Section (existing 3-tier system)
    ├── Business Stakeholders
    ├── Product Team
    └── Engineering Leads
```

**Tasks**:
- [ ] Update `module-3-prd-alignment.html` to show source BRD
- [ ] Add "Generate PRD from BRD" button (auto-populates features)
- [ ] Add user story editor
- [ ] Add acceptance criteria per feature
- [ ] Keep existing 3-tier alignment UI
- [ ] Require all stakeholders to align before moving forward
- [ ] Add "Lock PRD for Engineering Review" button

## Phase 5: Engineering Design Review Module (Week 2-3) **NEW**

### 5.1 Create Module 3: Design Review
**Purpose**: Engineering teams provide technical design and estimates

**File**: `module-3-engineering-design.html`

**Structure**:
```
Engineering Design Review
├── Source PRD: "E-commerce Checkout Improvement" ← Links back
├── Team Selection
│   ├── ☑ Frontend Team (2 engineers)
│   ├── ☑ Backend Team (3 engineers)
│   ├── ☑ Mobile Team (2 engineers)
│   └── ☐ DevOps Team (1 engineer)
├── Design Sections (per team)
│   ├── Frontend Design
│   │   ├── Approach: "React components with..."
│   │   ├── Estimates:
│   │   │   ├── One-Click Checkout: 40 hours
│   │   │   ├── Shipping Calculator: 60 hours ⚠️
│   │   │   └── Trust Badges: 16 hours
│   │   ├── Total: 116 hours (3 weeks with 2 engineers)
│   │   └── Risks: "Shipping calculator needs real-time API"
│   └── Backend Design
│       ├── Approach: "Node.js microservice with..."
│       ├── Estimates:
│       │   ├── Payment Gateway: 80 hours ⚠️
│       │   ├── Shipping API: 40 hours
│       │   └── Analytics: 24 hours
│       ├── Total: 144 hours (4 weeks with 3 engineers)
│       └── Risks: "Payment gateway needs PCI compliance review"
├── Conflicts Detected ⚠️
│   ├── Timeline Conflict: "Total 4 weeks vs BRD target of 2 weeks"
│   └── Dependency: "Shipping calc needs 3rd party API ($500/mo)"
└── Actions
    ├── [Raise Concern] → Goes to Alignment module
    └── [Approve Design] → If no conflicts
```

**Tasks**:
- [ ] Create `module-3-engineering-design.html`
- [ ] Add multi-team design submission UI
- [ ] Add estimate entry per feature (hours, engineers)
- [ ] Auto-calculate total timeline
- [ ] Compare against BRD timeline → Flag conflicts
- [ ] Add "Raise Concern" button → Creates conflict in Module 4
- [ ] Create backend model for `EngineeringDesign`
- [ ] Create API endpoints for design CRUD

## Phase 6: Alignment & Trade-offs Module (Week 3) **NEW**

### 6.1 Create Module 4: Conflict Resolution
**Purpose**: Resolve conflicts between BRD, PRD, and Engineering estimates

**File**: `module-4-alignment-tradeoffs.html`

**Structure**:
```
Alignment & Trade-offs
├── Active Conflicts (2)
│   ├── ⚠️ Conflict #1: Timeline Mismatch
│   │   ├── Issue: "Engineering estimates 4 weeks, BRD requires 2 weeks"
│   │   ├── Affected Items:
│   │   │   ├── BRD: Timeline (2 weeks)
│   │   │   ├── PRD: All features
│   │   │   └── Design: Frontend + Backend estimates
│   │   ├── Raised by: Backend Team Lead (Alex Kumar)
│   │   ├── Discussion Thread
│   │   │   ├── Sarah Chen (Business): "Q2 deadline is critical for trade show"
│   │   │   ├── John Chen (Product): "Can we simplify features?"
│   │   │   ├── Alex Kumar (Engineering): "Options: Simplify OR add 2 engineers OR push to Q3"
│   │   │   └── Emily Brown (Marketing): "Trade show can't move, let's simplify"
│   │   ├── Options for Resolution
│   │   │   ├── Option 1: Simplify shipping calculator (saves 2 weeks) ⭐ Recommended
│   │   │   ├── Option 2: Add 2 more engineers (budget +$50k)
│   │   │   └── Option 3: Push full feature to Q3 (miss trade show)
│   │   ├── Decision
│   │   │   ├── Selected: Option 1 (Simplify shipping calculator)
│   │   │   ├── Approved by: Sarah Chen ✓, John Chen ✓, Alex Kumar ✓
│   │   │   └── Date: 2025-10-05
│   │   └── Impact Preview
│   │       ├── BRD: Timeline stays at 2 weeks ✓
│   │       ├── PRD: Shipping calculator → "Static estimates only (Phase 1), Real-time API (Phase 2)"
│   │       └── Design: Frontend estimate reduced to 80 hours
│   └── ⚠️ Conflict #2: Budget for 3rd Party API
│       └── [Similar structure]
└── Resolved Conflicts (5)
    └── [Show history]
```

**Tasks**:
- [ ] Create `module-4-alignment-tradeoffs.html`
- [ ] Create conflict detection logic (timeline, budget, scope)
- [ ] Add discussion thread UI
- [ ] Add options entry (alternatives)
- [ ] Add voting/approval UI (requires Business + Product + Engineering)
- [ ] Add impact preview (what changes in BRD/PRD)
- [ ] Create backend `Conflict` model
- [ ] Create API for conflict CRUD
- [ ] Auto-update BRD/PRD when conflict resolved

## Phase 7: Implementation Module Enhancement (Week 3-4)

### 7.1 Convert to TPM Interface
**Current**: Module 4 has basic task list
**Enhancement**: Full TPM/PM task management interface

**New Structure**:
```
Implementation Tracking
├── Overview
│   ├── Progress: 45% complete
│   ├── Timeline: On track (2 weeks remaining)
│   └── Team Velocity: 120 points/sprint
├── Epics (from PRD features)
│   ├── Epic 1: One-Click Checkout
│   │   ├── Story 1.1: Save payment method [Frontend] [Done]
│   │   ├── Story 1.2: Payment token API [Backend] [In Review]
│   │   └── Story 1.3: Apple Pay integration [Frontend] [In Progress]
│   ├── Epic 2: Shipping Calculator (Simplified)
│   │   ├── Story 2.1: Static shipping table [Backend] [Done]
│   │   └── Story 2.2: Estimate display UI [Frontend] [Not Started]
│   └── Epic 3: Security Trust Badges
│       └── Story 3.1: Badge component [Frontend] [In Progress]
├── Task Management (TPM View)
│   ├── Assign to: [Dropdown: Frontend Team, Backend Team, etc.]
│   ├── Story Points: [Input]
│   ├── Status: [Dropdown: Not Started, In Progress, In Review, Done]
│   └── Blockers: [Text area]
├── Optional: AI Code Generation
│   ├── "Generate Code for Story 2.2" [Button]
│   ├── Review AI Code [Opens code viewer]
│   └── Merge to Codebase [Button]
└── Progress Links to PRD
    └── "Payment token API" completes → PRD requirement "One-Click Checkout" marked 50% done
```

**Tasks**:
- [ ] Update `module-4-implementation.html` to show epic/story hierarchy
- [ ] Add task assignment to specific teams/individuals
- [ ] Add story point estimation
- [ ] Add blocker tracking
- [ ] Link stories back to PRD requirements (traceability)
- [ ] Add progress calculation (auto-update PRD completion %)
- [ ] Add AI code generation placeholder (future integration)
- [ ] Create backend `Epic`, `Story`, `Task` models
- [ ] Create API for task management

## Phase 8: Change History Module Enhancement (Week 4)

### 8.1 Add Change Log
**Current**: Module 5 shows change impact analysis
**Enhancement**: Add comprehensive change log

**New Structure**:
```
Change History & Impact
├── Change Log
│   ├── 2025-10-05: Shipping Calculator Simplified
│   │   ├── What: "Real-time shipping API → Static estimates"
│   │   ├── Why: "Timeline conflict - Engineering needed 4 weeks, BRD required 2 weeks"
│   │   ├── Impact: "Phase 1 ships on time, Phase 2 adds real-time API"
│   │   ├── Approved by: Sarah Chen (Business), John Chen (Product), Alex Kumar (Engineering)
│   │   ├── Documents Updated:
│   │   │   ├── PRD v2.0: Shipping calculator feature modified
│   │   │   └── Design v1.1: Frontend estimate reduced 60h → 20h
│   │   └── Related Conflict: #CONF-001
│   └── [More entries...]
├── Impact Analysis (existing)
│   └── "If we change requirement X, what's affected?"
└── Version History
    ├── BRD Versions: v1.0 → v2.0 → v2.1
    └── PRD Versions: v1.0 → v2.0
```

**Tasks**:
- [ ] Update `module-5-change-impact.html` to add Change Log section
- [ ] Auto-create change log entries when conflicts resolved
- [ ] Show what was pushed to Phase 2 and why
- [ ] Show approval chain for each change
- [ ] Keep existing impact analysis tool
- [ ] Add version comparison (diff view)
- [ ] Create backend `ChangeLogEntry` model
- [ ] Create API for change log

## Phase 9: Integration & Workflow (Week 4-5)

### 9.1 Connect All Modules
**Workflow**:
1. **Dashboard** → User clicks "Start New Project" or "Continue E-commerce Project"
2. **Present** → Shows demo, user clicks "Start with Example"
3. **BRD** → Pre-filled, user adjusts, stakeholders approve
4. **PRD** → Generated from BRD, Product Manager refines, all stakeholders align
5. **Design** → Engineering teams submit designs, estimates, raise concerns if needed
6. **Align** → If conflicts exist, stakeholders discuss and resolve
7. **Build** → TPM creates tasks, engineers implement
8. **History** → Track all changes, view impact

**Tasks**:
- [ ] Add workflow state tracking (which module is active)
- [ ] Lock later modules until earlier ones complete
  - Can't do PRD until BRD approved
  - Can't do Design until PRD aligned
  - Can't do Build until Design approved (or conflicts resolved)
- [ ] Add progress indicator showing where user is in workflow
- [ ] Add "Next Step" prompts in each module
- [ ] Update Live Collaboration Feed to show activities from all modules

### 9.2 Pre-populate Demo Data Throughout Journey
**Current**: Only BRD has demo data
**Enhancement**: Every module has realistic demo data

**Tasks**:
- [ ] Extend `simple-mock.service.ts` with full workflow data:
  - BRD with approvals
  - PRD with alignments
  - Engineering designs with conflicts
  - Resolved conflict with decision
  - Implementation tasks with progress
  - Change log entries
- [ ] Make demo journey actually walk through real data at each step
- [ ] Show realistic collaboration feed events

## Phase 10: Polish & UX (Week 5)

### 10.1 Role Clarity
- [ ] Add "👤 Current Role: Product Manager" indicator at top
- [ ] Show ownership in each module ("This is your responsibility")
- [ ] Disable actions not allowed for current role

### 10.2 Visual Improvements
- [ ] Add icons for each module type (BRD, PRD, Design, etc.)
- [ ] Color-code modules by phase (Planning = Blue, Execution = Green, Review = Purple)
- [ ] Add workflow diagram showing current step
- [ ] Improve mobile responsiveness

### 10.3 Help & Guidance
- [ ] Add context-sensitive help in each module
- [ ] Add tooltips explaining terms (BRD, PRD, TPM, etc.)
- [ ] Update demo walkthrough to cover new modules

## Implementation Priority

### Must Have (MVP)
1. ✅ Dashboard separation (already done)
2. ✅ Module renaming (BRD, PRD, etc.)
3. 🔨 BRD enhancement with approval workflow
4. 🔨 PRD generation from BRD
5. 🔨 Engineering Design module (NEW)
6. 🔨 Conflict detection and resolution (NEW)
7. 🔨 Change log tracking

### Should Have
8. TPM task management enhancements
9. Multi-team design submissions
10. Role-based views
11. Pre-populated demo data throughout
12. Workflow state management

### Nice to Have
13. AI code generation integration
14. Version comparison diff view
15. Advanced impact analysis
16. Real-time collaboration enhancements

## Success Criteria

### After Phase 1-3 (Weeks 1-2)
- [ ] Clear separation: Dashboard (home) vs Modules (workflow)
- [ ] BRD module has all sections + approval workflow
- [ ] PRD can be generated from approved BRD
- [ ] Demo journey shows complete BRD → PRD flow

### After Phase 4-6 (Weeks 2-3)
- [ ] Engineering Design module exists
- [ ] Conflicts can be detected (timeline, budget, scope)
- [ ] Alignment module allows discussion and resolution
- [ ] Changes update BRD/PRD automatically

### After Phase 7-10 (Weeks 3-5)
- [ ] TPM can manage implementation tasks
- [ ] Change log tracks all decisions
- [ ] Complete workflow works end-to-end
- [ ] Demo has realistic data at every step

## Next Steps

Would you like me to start with:
1. **Phase 1-2**: Restructure modules and enhance Present tab (1-2 days)
2. **Phase 3**: Build comprehensive BRD module (2-3 days)
3. **Phase 5**: Create Engineering Design module (3-4 days)
4. **Phase 6**: Create Conflict Resolution module (3-4 days)

Or tackle them in a different order?
