# Workflow Demo Data - Quick Reference

## Overview
Complete workflow demonstration showing BRD → PRD → Engineering Design → Conflict → Resolution → Change Log

## Story: E-commerce Cart Abandonment Crisis

### Timeline
- **Oct 1**: BRD created
- **Oct 2-3**: BRD approved by all stakeholders
- **Oct 4-6**: PRD created and aligned
- **Oct 7**: Engineering designs submitted
- **Oct 8**: Conflict detected, discussed, and resolved
- **Oct 8**: Change log entry created

---

## 1. BRD (Business Requirements Document)

**ID**: `BRD-{generated}`

### Core Data
```javascript
{
  id: "BRD-20251001-0001",
  title: "E-commerce Cart Abandonment Crisis",
  problemStatement: "68% of mobile users abandon checkout at payment screen...",
  businessImpact: "$2M annual revenue loss, 68% cart abandonment rate...",
  successCriteria: [
    "Reduce cart abandonment by 50% (68% → 34%)",
    "Increase mobile conversion rate by 30%",
    "Recover $1M in annual revenue within 6 months",
    "Achieve 90% customer satisfaction on checkout experience"
  ],
  timeline: {
    startDate: "2025-10-01",
    targetDate: "2025-12-15"
  },
  budget: 500000,
  status: "approved",
  version: 1
}
```

### Stakeholders
```javascript
[
  {
    id: "STK-001",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "VP Product",
    department: "product",
    isOwner: true
  },
  {
    id: "STK-002",
    name: "Mark Davis",
    email: "mark.davis@company.com",
    role: "Sales Director",
    department: "sales",
    isOwner: false
  },
  {
    id: "STK-003",
    name: "Emily Brown",
    email: "emily.brown@company.com",
    role: "Marketing Lead",
    department: "marketing",
    isOwner: false
  }
]
```

### Approvals
```javascript
[
  {
    stakeholderId: "sarah.chen@company.com",
    decision: "approved",
    comments: "Critical for Q4 revenue",
    timestamp: "2025-10-02"
  },
  {
    stakeholderId: "mark.davis@company.com",
    decision: "approved",
    comments: "Aligns with sales goals",
    timestamp: "2025-10-02"
  },
  {
    stakeholderId: "emily.brown@company.com",
    decision: "approved",
    timestamp: "2025-10-03"
  }
]
```

---

## 2. PRD (Product Requirements Document)

**ID**: `PRD-{generated}`
**Links To**: BRD-{generated}

### Core Data
```javascript
{
  id: "PRD-20251004-0001",
  brdId: "BRD-20251001-0001",
  title: "Mobile Checkout Optimization - Phase 1",
  status: "aligned",
  version: 1
}
```

### Features
```javascript
[
  {
    id: "FEAT-001",
    title: "One-Click Checkout",
    description: "Enable saved payment methods and addresses...",
    priority: "critical",
    acceptanceCriteria: [
      "Returning users see saved payment methods",
      "Apple Pay integration functional on iOS",
      "Google Pay integration functional on Android",
      "PCI compliance maintained"
    ]
  },
  {
    id: "FEAT-002",
    title: "Real-time Shipping Calculator",
    description: "Display shipping costs and delivery estimates...",
    priority: "high",
    acceptanceCriteria: [
      "Shipping costs displayed on cart page",
      "Updates dynamically as user enters address",
      "Shows delivery date estimates",
      "Supports multiple shipping options"
    ]
  },
  {
    id: "FEAT-003",
    title: "Security Trust Indicators",
    description: "Show SSL badges, payment security logos...",
    priority: "medium",
    acceptanceCriteria: [
      "SSL badge visible on checkout pages",
      "Payment provider logos displayed",
      "Money-back guarantee clearly stated",
      "Security messaging increases trust score"
    ]
  }
]
```

### User Stories
```javascript
[
  {
    id: "US-001",
    featureId: "FEAT-001",
    asA: "returning customer",
    iWant: "to checkout with one click using my saved payment method",
    soThat: "I can complete my purchase quickly without re-entering information",
    acceptanceCriteria: [
      "Payment info auto-filled",
      "Single click completes checkout"
    ]
  },
  {
    id: "US-002",
    featureId: "FEAT-002",
    asA: "mobile user",
    iWant: "to see shipping costs before entering payment details",
    soThat: "I can decide if I want to proceed with the purchase",
    acceptanceCriteria: [
      "Costs visible on cart page",
      "No surprises at checkout"
    ]
  }
]
```

### Technical Requirements & Dependencies
```javascript
technicalRequirements: [
  "Payment gateway API integration (Stripe)",
  "Shipping API integration (USPS, FedEx, UPS)",
  "Mobile-responsive UI components",
  "Analytics tracking for conversion funnel"
],
dependencies: [
  "Payment gateway approval",
  "Shipping API contracts"
]
```

### Alignments
```javascript
[
  {
    stakeholderId: "sarah.chen@company.com",
    status: "aligned",
    timestamp: "2025-10-05"
  },
  {
    stakeholderId: "john.chen@company.com",
    status: "aligned",
    timestamp: "2025-10-06"
  },
  {
    stakeholderId: "alex.kumar@company.com",
    status: "align_but",
    concerns: "Shipping API may add timeline risk",
    timestamp: "2025-10-06"
  }
]
```

---

## 3. Engineering Designs

### Frontend Design

**ID**: `DESIGN-{generated}`
**Links To**: PRD-{generated}

```javascript
{
  id: "DESIGN-20251007-0001",
  prdId: "PRD-20251004-0001",
  team: "frontend",
  approach: "React components with Redux state management. Mobile-first responsive design using Tailwind CSS.",
  architecture: "Component library: PaymentForm, ShippingCalculator, TrustBadges. State management via Redux Toolkit.",
  status: "under_review"
}
```

**Estimates**:
```javascript
[
  { featureId: "FEAT-001", featureTitle: "One-Click Checkout", hours: 60, engineers: 2 },
  { featureId: "FEAT-002", featureTitle: "Shipping Calculator", hours: 80, engineers: 2 },
  { featureId: "FEAT-003", featureTitle: "Trust Indicators", hours: 20, engineers: 1 }
]
// Total: 160 hours, 5 engineers
```

**Risks**:
```javascript
[
  {
    id: "RISK-001",
    description: "Apple Pay requires iOS device testing",
    severity: "medium",
    mitigation: "Use TestFlight for QA"
  },
  {
    id: "RISK-002",
    description: "Shipping API rate limits may impact UX",
    severity: "high",
    mitigation: "Implement caching layer"
  }
]
```

**Conflicts**:
```javascript
[
  {
    id: "CONF-001",
    type: "timeline",
    description: "Shipping calculator real-time API requires 2 additional weeks",
    impact: "Pushes Phase 1 delivery from Dec 15 to Dec 29",
    alternatives: [
      "Use static shipping estimates for Phase 1",
      "Add 2 more engineers",
      "Push to Phase 2"
    ]
  }
]
```

### Backend Design

**ID**: `DESIGN-{generated}`
**Links To**: PRD-{generated}

```javascript
{
  id: "DESIGN-20251007-0002",
  prdId: "PRD-20251004-0001",
  team: "backend",
  approach: "Node.js microservices with REST APIs. Stripe SDK for payments, third-party shipping APIs.",
  architecture: "Services: PaymentService, ShippingService, AnalyticsService. PostgreSQL for persistence.",
  status: "approved"
}
```

**Estimates**:
```javascript
[
  { featureId: "FEAT-001", featureTitle: "Payment API", hours: 100, engineers: 3 },
  { featureId: "FEAT-002", featureTitle: "Shipping API", hours: 60, engineers: 2 },
  { featureId: "FEAT-003", featureTitle: "Analytics", hours: 30, engineers: 1 }
]
// Total: 190 hours, 6 engineers
```

**Risks**:
```javascript
[
  {
    id: "RISK-003",
    description: "PCI compliance review required",
    severity: "critical",
    mitigation: "Start compliance audit immediately"
  },
  {
    id: "RISK-004",
    description: "Stripe API rate limits",
    severity: "low",
    mitigation: "Use exponential backoff"
  }
]
```

---

## 4. Conflict (Resolved)

**ID**: `CONFLICT-{generated}`

### Core Data
```javascript
{
  id: "CONFLICT-20251008-0001",
  type: "timeline",
  title: "Shipping Calculator Timeline Conflict",
  description: "Engineering estimates that real-time shipping calculator will add 2 weeks to Phase 1 timeline...",
  severity: "high",
  raisedBy: "alex.kumar@company.com",
  raisedByRole: "engineering",
  status: "resolved"
}
```

### Affected Documents
```javascript
{
  brdId: "BRD-20251001-0001",
  prdId: "PRD-20251004-0001",
  designId: "DESIGN-20251007-0001"
}
```

### Discussion Thread
```javascript
[
  {
    id: "DISC-001",
    userId: "sarah.chen@company.com",
    userName: "Sarah Chen",
    userRole: "business",
    comment: "Q4 deadline is critical for trade show demo. Can we simplify?",
    timestamp: "2025-10-08T10:00:00"
  },
  {
    id: "DISC-002",
    userId: "john.chen@company.com",
    userName: "John Chen",
    userRole: "product",
    comment: "Shipping calculator is #1 requested feature. Maybe static estimates for Phase 1?",
    timestamp: "2025-10-08T11:00:00"
  },
  {
    id: "DISC-003",
    userId: "alex.kumar@company.com",
    userName: "Alex Kumar",
    userRole: "engineering",
    comment: "Static estimates would take only 1 week. Real-time API can be Phase 2.",
    timestamp: "2025-10-08T14:00:00"
  }
]
```

### Resolution Options
```javascript
[
  {
    id: "OPT-001",
    description: "Simplify to static shipping estimates for Phase 1",
    impact: "Meets Dec 15 deadline, reduces functionality slightly",
    pros: ["On time delivery", "Lower complexity", "Easier testing"],
    cons: ["Less accurate estimates", "Users may see surprises"],
    votes: [
      { userId: "sarah.chen@company.com", userName: "Sarah Chen", userRole: "business" },
      { userId: "john.chen@company.com", userName: "John Chen", userRole: "product" },
      { userId: "alex.kumar@company.com", userName: "Alex Kumar", userRole: "engineering" }
    ]
  },
  {
    id: "OPT-002",
    description: "Add 2 more engineers to meet timeline",
    impact: "Budget increase of $50k",
    pros: ["Full functionality", "Meets deadline"],
    cons: ["Over budget", "Onboarding time"],
    votes: []
  }
]
```

### Resolution
```javascript
{
  selectedOptionId: "OPT-001",
  decision: "Implement static shipping estimates for Phase 1. Real-time shipping API moved to Phase 2.",
  approvedBy: [
    {
      stakeholderId: "sarah.chen@company.com",
      decision: "approved",
      comments: "Good compromise",
      timestamp: "2025-10-08T17:00:00"
    },
    {
      stakeholderId: "john.chen@company.com",
      decision: "approved",
      timestamp: "2025-10-08T17:15:00"
    },
    {
      stakeholderId: "alex.kumar@company.com",
      decision: "approved",
      timestamp: "2025-10-08T17:30:00"
    }
  ],
  documentsUpdated: [
    {
      documentType: "PRD",
      documentId: "PRD-20251004-0001",
      changes: "Updated FEAT-002: Simplified to static shipping estimates for Phase 1",
      version: 2
    },
    {
      documentType: "EngineeringDesign",
      documentId: "DESIGN-20251007-0001",
      changes: "Reduced FEAT-002 estimate from 80 to 30 hours",
      version: 2
    }
  ],
  implementedAt: "2025-10-08T18:00:00"
}
```

---

## 5. Change Log Entry

**ID**: `CHANGE-{generated}`

```javascript
{
  id: "CHANGE-20251008-0001",
  projectId: "BRD-20251001-0001",
  item: "Real-time Shipping Calculator",
  change: "Simplified to static shipping estimates for Phase 1",
  reason: "Timeline conflict - Real-time API would delay Phase 1 by 2 weeks, missing Q4 trade show deadline",
  impact: "Phase 1 ships on time (Dec 15). Real-time shipping API moved to Phase 2 (Q1 2026).",
  category: "scope",
  phase: "pushed_to_phase_2",
  relatedConflictId: "CONFLICT-20251008-0001",
  timestamp: "2025-10-08T18:00:00",
  createdBy: "system"
}
```

### Approvals
```javascript
[
  {
    stakeholderId: "sarah.chen@company.com",
    decision: "approved",
    comments: "Critical for trade show",
    timestamp: "2025-10-08T17:00:00"
  },
  {
    stakeholderId: "john.chen@company.com",
    decision: "approved",
    timestamp: "2025-10-08T17:15:00"
  },
  {
    stakeholderId: "alex.kumar@company.com",
    decision: "approved",
    timestamp: "2025-10-08T17:30:00"
  }
]
```

### Document Snapshots
```javascript
documentsBefore: [
  {
    documentType: "PRD",
    documentId: "PRD-20251004-0001",
    version: 1,
    snapshot: { features: [...] } // Full PRD v1
  }
],
documentsAfter: [
  {
    documentType: "PRD",
    documentId: "PRD-20251004-0001",
    version: 2,
    snapshot: { features: [...] } // Updated PRD v2
  }
]
```

---

## Data Access Methods

### Mock Service API

```javascript
const { simpleMockService } = require('./dist/services/simple-mock.service');

// Get all BRDs
const brds = await simpleMockService.getBRDs();

// Get specific BRD
const brd = await simpleMockService.getBRDById('BRD-20251001-0001');

// Get all PRDs
const prds = await simpleMockService.getPRDs();

// Get specific PRD
const prd = await simpleMockService.getPRDById('PRD-20251004-0001');

// Get all Engineering Designs
const designs = await simpleMockService.getEngineeringDesigns();

// Get specific design
const design = await simpleMockService.getEngineeringDesignById('DESIGN-20251007-0001');

// Get all Conflicts
const conflicts = await simpleMockService.getConflicts();

// Get specific conflict
const conflict = await simpleMockService.getConflictById('CONFLICT-20251008-0001');

// Get all Change Log entries
const changeLog = await simpleMockService.getChangeLog();

// Get specific change log entry
const change = await simpleMockService.getChangeLogById('CHANGE-20251008-0001');
```

---

## Entity Relationships

```
BRD (1)
  ├─> PRD (many)
  │     ├─> EngineeringDesign (many, by team)
  │     └─> Conflict (many)
  │           └─> ChangeLog (many)
  └─> ChangeLog (many, project-level)
```

## Key Insights from Demo Data

1. **Democratic Decision Making**: Conflict resolution shows voting system with 3 stakeholders
2. **Practical Compromise**: Timeline vs. Scope tradeoff resolved with phased approach
3. **Full Traceability**: Change log links back to conflict and documents
4. **Multi-Team Coordination**: Frontend and Backend designs submitted separately
5. **Risk Management**: Critical risks identified early (PCI compliance)
6. **Version Control**: Documents updated with version 2 after conflict resolution

---

This demo data showcases the complete workflow from business problem to resolved implementation plan.
