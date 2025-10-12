# Project Conductor - API Contracts

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
Bearer token in Authorization header (future implementation)

---

## BRD (Business Requirements Document) Endpoints

### POST /brd
Create a new Business Requirements Document

**Request Body:**
```typescript
{
  title: string;
  problemStatement: string;
  businessImpact: string;
  successCriteria: string[];
  timeline: {
    startDate: string; // ISO date string
    targetDate: string; // ISO date string
  };
  budget: number;
  stakeholders: Array<{
    name: string;
    email: string;
    role: string;
    department: 'business' | 'product' | 'engineering' | 'marketing' | 'sales';
    isOwner: boolean;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: BRD;
  message: string;
}
```

### GET /brd/:id
Get BRD by ID

**Response:**
```typescript
{
  success: boolean;
  data: BRD;
}
```

### GET /brd
Get all BRDs with optional filters

**Query Parameters:**
- `status` - Filter by status (comma-separated)
- `createdBy` - Filter by creator ID
- `stakeholderEmail` - Filter by stakeholder email
- `department` - Filter by department (comma-separated)
- `minBudget` - Minimum budget filter
- `maxBudget` - Maximum budget filter
- `search` - Search in title and problem statement
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order (ASC/DESC, default: DESC)

**Response:**
```typescript
{
  success: boolean;
  data: BRD[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### PUT /brd/:id
Update an existing BRD

**Request Body:**
```typescript
{
  title?: string;
  problemStatement?: string;
  businessImpact?: string;
  successCriteria?: string[];
  timeline?: {
    startDate: string;
    targetDate: string;
  };
  budget?: number;
  stakeholders?: Array<Stakeholder>;
  status?: 'draft' | 'under_review' | 'approved' | 'rejected';
}
```

**Response:**
```typescript
{
  success: boolean;
  data: BRD;
  message: string;
}
```

### POST /brd/:id/approve
Stakeholder approves or rejects BRD

**Request Body:**
```typescript
{
  stakeholderId: string;
  decision: 'approved' | 'rejected';
  comments?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: BRD;
  message: string;
}
```

### GET /brd/:id/status
Check BRD approval status

**Response:**
```typescript
{
  success: boolean;
  data: {
    brdId: string;
    isFullyApproved: boolean;
    totalStakeholders: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    pending: Stakeholder[];
    approved: Stakeholder[];
    rejected: Stakeholder[];
  };
}
```

### GET /brd/summary
Get BRD summary statistics

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byStatus: Record<BRDStatusType, number>;
    byDepartment: Record<DepartmentType, number>;
    totalBudget: number;
    averageBudget: number;
    fullyApproved: number;
    pendingApproval: number;
  };
}
```

---

## PRD (Product Requirements Document) Endpoints

### POST /prd/generate-from-brd/:brdId
Generate PRD from approved BRD

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### POST /prd
Create or update PRD manually

**Request Body:**
```typescript
{
  brdId: string;
  title: string;
  features: Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    acceptanceCriteria: string[];
  }>;
  userStories: Array<{
    featureId: string;
    asA: string;
    iWant: string;
    soThat: string;
    acceptanceCriteria: string[];
  }>;
  technicalRequirements: string[];
  dependencies: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### GET /prd/:id
Get PRD by ID

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
}
```

### GET /prd
Get all PRDs with optional filters

**Query Parameters:**
- `status` - Filter by status (comma-separated)
- `brdId` - Filter by source BRD ID
- `createdBy` - Filter by creator ID
- `featurePriority` - Filter by feature priority (comma-separated)
- `hasUnresolvedConcerns` - Filter PRDs with unresolved concerns
- `search` - Search in title, features, and user stories
- `page`, `limit`, `sortBy`, `sortOrder` - Pagination options

**Response:**
```typescript
{
  success: boolean;
  data: PRD[];
  pagination: PaginationInfo;
}
```

### PUT /prd/:id
Update existing PRD

**Request Body:**
```typescript
{
  title?: string;
  features?: Array<Feature>;
  userStories?: Array<UserStory>;
  technicalRequirements?: string[];
  dependencies?: string[];
  status?: 'draft' | 'under_review' | 'aligned' | 'locked';
}
```

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### POST /prd/:id/align
Record stakeholder alignment on PRD

**Request Body:**
```typescript
{
  stakeholderId: string;
  status: 'aligned' | 'align_but' | 'not_aligned';
  concerns?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### POST /prd/:id/lock
Lock PRD for engineering review (prevents further edits)

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### POST /prd/:id/feature
Add a feature to PRD

**Request Body:**
```typescript
{
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  acceptanceCriteria: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### POST /prd/:id/user-story
Add a user story to PRD

**Request Body:**
```typescript
{
  featureId: string;
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: PRD;
  message: string;
}
```

### GET /prd/:id/alignment-status
Check PRD alignment status

**Response:**
```typescript
{
  success: boolean;
  data: {
    prdId: string;
    isFullyAligned: boolean;
    totalStakeholders: number;
    aligned: number;
    alignBut: number;
    notAligned: number;
    pending: number;
    stakeholdersWithConcerns: Array<{
      stakeholderId: string;
      status: AlignmentStatusType;
      concerns: string;
    }>;
  };
}
```

### GET /prd/summary
Get PRD summary statistics

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byStatus: Record<PRDStatusType, number>;
    totalFeatures: number;
    totalUserStories: number;
    byFeaturePriority: Record<FeaturePriorityType, number>;
    fullyAligned: number;
    needsAlignment: number;
  };
}
```

---

## Engineering Design Endpoints

### POST /engineering-design
Submit engineering design for a PRD

**Request Body:**
```typescript
{
  prdId: string;
  team: 'frontend' | 'backend' | 'mobile' | 'devops' | 'qa';
  approach: string;
  architecture: string;
  estimates: Array<{
    featureId: string;
    featureTitle: string;
    hours: number;
    engineers: number;
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
  }>;
  risks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation?: string;
  }>;
  dependencies: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign;
  message: string;
}
```

### GET /engineering-design/:id
Get engineering design by ID

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign;
}
```

### GET /engineering-design
Get all engineering designs with filters

**Query Parameters:**
- `prdId` - Filter by PRD ID
- `team` - Filter by team (comma-separated)
- `status` - Filter by status (comma-separated)
- `createdBy` - Filter by creator ID
- `hasConflicts` - Filter designs with conflicts
- `riskSeverity` - Filter by risk severity (comma-separated)
- `minEstimatedHours`, `maxEstimatedHours` - Hours range filter
- `search` - Search in approach and architecture
- `page`, `limit`, `sortBy`, `sortOrder` - Pagination options

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign[];
  pagination: PaginationInfo;
}
```

### GET /engineering-design/by-prd/:prdId
Get all engineering designs for a specific PRD

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign[];
}
```

### PUT /engineering-design/:id
Update engineering design

**Request Body:**
```typescript
{
  approach?: string;
  architecture?: string;
  estimates?: Array<Estimate>;
  risks?: Array<Risk>;
  dependencies?: string[];
  status?: 'draft' | 'under_review' | 'approved' | 'rejected';
}
```

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign;
  message: string;
}
```

### POST /engineering-design/:id/detect-conflicts
Analyze engineering design for conflicts

**Response:**
```typescript
{
  success: boolean;
  data: {
    hasConflicts: boolean;
    conflicts: DesignConflict[];
    summary: {
      timeline: number;
      budget: number;
      scope: number;
      technical: number;
    };
  };
}
```

### POST /engineering-design/:id/risk
Add a risk to engineering design

**Request Body:**
```typescript
{
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: EngineeringDesign;
  message: string;
}
```

### GET /engineering-design/cross-team-analysis/:prdId
Analyze designs across all teams for a PRD

**Response:**
```typescript
{
  success: boolean;
  data: {
    prdId: string;
    designs: EngineeringDesign[];
    totalEstimatedHours: number;
    totalEngineers: number;
    estimatedDuration: number; // days
    conflictingSections: string[];
    sharedDependencies: string[];
    teamCapacities: TeamCapacity[];
  };
}
```

### GET /engineering-design/summary
Get engineering design summary statistics

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byTeam: Record<TeamType, number>;
    byStatus: Record<DesignStatusType, number>;
    totalEstimatedHours: number;
    totalEngineers: number;
    averageEstimatePerDesign: number;
    designsWithConflicts: number;
    totalRisks: number;
    criticalRisks: number;
  };
}
```

---

## Conflict Resolution Endpoints

### POST /conflicts
Create a new conflict

**Request Body:**
```typescript
{
  type: 'timeline' | 'budget' | 'scope' | 'technical';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  raisedBy: string;
  raisedByRole: 'business' | 'product' | 'engineering' | 'tpm';
  affectedDocuments: {
    brdId?: string;
    prdId?: string;
    designId?: string;
  };
  affectedItems: string[]; // Requirement/feature IDs
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  message: string;
}
```

### GET /conflicts/:id
Get conflict by ID

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
}
```

### GET /conflicts
Get all conflicts with filters

**Query Parameters:**
- `status` - Filter by status (comma-separated)
- `type` - Filter by type (comma-separated)
- `severity` - Filter by severity (comma-separated)
- `raisedBy` - Filter by raiser ID
- `raisedByRole` - Filter by raiser role (comma-separated)
- `brdId`, `prdId`, `designId` - Filter by affected documents
- `hasResolution` - Filter by resolution status
- `search` - Search in title and description
- `page`, `limit`, `sortBy`, `sortOrder` - Pagination options

**Response:**
```typescript
{
  success: boolean;
  data: Conflict[];
  pagination: PaginationInfo;
}
```

### GET /conflicts/by-project/:projectId
Get all conflicts for a project

**Query Parameters:**
- `status` - Filter by status (open, resolved, etc.)

**Response:**
```typescript
{
  success: boolean;
  data: Conflict[];
}
```

### PUT /conflicts/:id
Update conflict

**Request Body:**
```typescript
{
  title?: string;
  description?: string;
  severity?: ConflictSeverityType;
  status?: ConflictStatusType;
  affectedItems?: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  message: string;
}
```

### POST /conflicts/:id/comment
Add discussion comment to conflict

**Request Body:**
```typescript
{
  userId: string;
  userName: string;
  userRole: 'business' | 'product' | 'engineering' | 'tpm';
  comment: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  message: string;
}
```

### POST /conflicts/:id/add-option
Add resolution option to conflict

**Request Body:**
```typescript
{
  description: string;
  impact: string;
  pros: string[];
  cons: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  message: string;
}
```

### POST /conflicts/:id/vote
Vote on a resolution option

**Request Body:**
```typescript
{
  optionId: string;
  userId: string;
  userName: string;
  userRole: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  message: string;
}
```

### POST /conflicts/:id/resolve
Resolve conflict with selected option

**Request Body:**
```typescript
{
  selectedOptionId: string;
  decision: string;
  approvedBy: Array<{
    stakeholderId: string;
    decision: 'approved' | 'rejected' | 'pending';
    comments?: string;
  }>;
  documentsUpdated: Array<{
    documentType: 'BRD' | 'PRD' | 'EngineeringDesign';
    documentId: string;
    changes: string;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: Conflict;
  updatedDocuments: any[];
  message: string;
}
```

### GET /conflicts/:id/analytics
Get conflict resolution analytics

**Response:**
```typescript
{
  success: boolean;
  data: {
    conflictId: string;
    timeToResolve?: number; // hours
    commentCount: number;
    optionCount: number;
    voteCount: number;
    participantCount: number;
    participantsByRole: Record<UserRoleType, number>;
    winningOptionVotes: number;
    consensusPercentage: number;
  };
}
```

### GET /conflicts/summary
Get conflict summary statistics

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byStatus: Record<ConflictStatusType, number>;
    byType: Record<ConflictType, number>;
    bySeverity: Record<ConflictSeverityType, number>;
    byRole: Record<UserRoleType, number>;
    avgResolutionTime: number; // hours
    totalComments: number;
    totalOptions: number;
    resolvedThisMonth: number;
  };
}
```

---

## Change Log Endpoints

### POST /change-log
Create change log entry (auto-created on conflict resolution)

**Request Body:**
```typescript
{
  projectId: string;
  item: string; // What changed
  change: string; // What happened
  reason: string; // Why it changed
  impact: string; // Effect of the change
  category: 'scope' | 'timeline' | 'budget' | 'technical' | 'process';
  phase: 'pushed_to_phase_2' | 'simplified' | 'removed' | 'added' | 'modified';
  relatedConflictId?: string;
  documentsBefore: DocumentVersion[];
  documentsAfter: DocumentVersion[];
}
```

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry;
  message: string;
}
```

### GET /change-log/:id
Get change log entry by ID

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry;
}
```

### GET /change-log
Get change log entries with filters

**Query Parameters:**
- `projectId` - Filter by project ID
- `category` - Filter by category (comma-separated)
- `phase` - Filter by phase (comma-separated)
- `createdBy` - Filter by creator ID
- `relatedConflictId` - Filter by conflict ID
- `dateFrom`, `dateTo` - Date range filter
- `isApproved` - Filter by approval status
- `search` - Search in item, change, reason, and impact
- `page`, `limit`, `sortBy`, `sortOrder` - Pagination options

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry[];
  pagination: PaginationInfo;
}
```

### GET /change-log/by-project/:projectId
Get change history for project

**Query Parameters:**
- `category` - Filter by category (scope, timeline, budget, etc.)
- `phase` - Filter by phase

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry[];
}
```

### PUT /change-log/:id
Update change log entry

**Request Body:**
```typescript
{
  item?: string;
  change?: string;
  reason?: string;
  impact?: string;
  category?: ChangeCategoryType;
  phase?: ChangePhaseType;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry;
  message: string;
}
```

### POST /change-log/:id/approve
Approve or reject change log entry

**Request Body:**
```typescript
{
  stakeholderId: string;
  decision: 'approved' | 'rejected';
  comments?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data: ChangeLogEntry;
  message: string;
}
```

### GET /change-log/:id/compare
Compare document versions in change log

**Response:**
```typescript
{
  success: boolean;
  data: Array<{
    documentType: DocumentType;
    documentId: string;
    versionBefore: number;
    versionAfter: number;
    changes: Array<{
      field: string;
      valueBefore: any;
      valueAfter: any;
      changeType: 'added' | 'modified' | 'removed';
    }>;
  }>;
}
```

### GET /change-log/:id/impact-analysis
Get impact analysis for change

**Response:**
```typescript
{
  success: boolean;
  data: {
    changeLogId: string;
    item: string;
    category: ChangeCategoryType;
    phase: ChangePhaseType;
    directImpacts: string[];
    indirectImpacts: string[];
    affectedDocuments: string[];
    affectedStakeholders: string[];
    estimatedEffort?: number; // hours
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

### GET /change-log/project/:projectId/history
Get full project change history

**Response:**
```typescript
{
  success: boolean;
  data: {
    projectId: string;
    totalChanges: number;
    timeline: Array<{
      timestamp: Date;
      item: string;
      change: string;
      category: ChangeCategoryType;
      phase: ChangePhaseType;
      impact: string;
    }>;
    summary: ChangeLogSummary;
    majorMilestones: Array<{
      date: Date;
      description: string;
      changesCount: number;
    }>;
  };
}
```

### GET /change-log/summary
Get change log summary statistics

**Response:**
```typescript
{
  success: boolean;
  data: {
    total: number;
    byCategory: Record<ChangeCategoryType, number>;
    byPhase: Record<ChangePhaseType, number>;
    totalApproved: number;
    totalPending: number;
    totalRejected: number;
    changesThisWeek: number;
    changesThisMonth: number;
    mostActiveCategory: ChangeCategoryType;
    mostCommonPhase: ChangePhaseType;
  };
}
```

---

## WebSocket Events

All real-time updates are broadcast via Socket.io. Clients should join appropriate rooms to receive updates.

### Room Structure
- `project:{projectId}` - All project updates
- `brd:{brdId}` - BRD-specific updates
- `prd:{prdId}` - PRD-specific updates
- `design:{designId}` - Engineering design updates
- `conflict:{conflictId}` - Conflict-specific updates

### Events Emitted by Server

#### BRD Events
- `brd:created` - New BRD created
  ```typescript
  { brdId: string, brd: BRD }
  ```
- `brd:updated` - BRD updated
  ```typescript
  { brdId: string, brd: BRD, changes: string[] }
  ```
- `brd:approved` - Stakeholder approved BRD
  ```typescript
  { brdId: string, stakeholderId: string, decision: string }
  ```
- `brd:fully_approved` - All stakeholders approved BRD
  ```typescript
  { brdId: string, brd: BRD }
  ```

#### PRD Events
- `prd:created` - New PRD created
  ```typescript
  { prdId: string, prd: PRD }
  ```
- `prd:generated` - PRD generated from BRD
  ```typescript
  { prdId: string, brdId: string, prd: PRD }
  ```
- `prd:aligned` - Stakeholder aligned on PRD
  ```typescript
  { prdId: string, stakeholderId: string, status: AlignmentStatusType }
  ```
- `prd:locked` - PRD locked for engineering
  ```typescript
  { prdId: string, prd: PRD }
  ```
- `prd:feature_added` - Feature added to PRD
  ```typescript
  { prdId: string, feature: Feature }
  ```

#### Engineering Design Events
- `design:created` - New design submitted
  ```typescript
  { designId: string, design: EngineeringDesign }
  ```
- `design:submitted` - Design submitted for review
  ```typescript
  { designId: string, prdId: string, team: TeamType }
  ```
- `design:conflict_detected` - Conflicts detected in design
  ```typescript
  { designId: string, conflicts: DesignConflict[] }
  ```
- `design:approved` - Design approved
  ```typescript
  { designId: string, design: EngineeringDesign }
  ```

#### Conflict Events
- `conflict:created` - New conflict created
  ```typescript
  { conflictId: string, conflict: Conflict }
  ```
- `conflict:comment` - New comment on conflict
  ```typescript
  { conflictId: string, comment: DiscussionComment }
  ```
- `conflict:option_added` - Resolution option added
  ```typescript
  { conflictId: string, option: ResolutionOption }
  ```
- `conflict:vote_cast` - Vote cast on option
  ```typescript
  { conflictId: string, optionId: string, vote: Vote }
  ```
- `conflict:resolved` - Conflict resolved
  ```typescript
  { conflictId: string, resolution: Resolution, updatedDocuments: any[] }
  ```

#### Change Log Events
- `change:logged` - Change log entry created
  ```typescript
  { changeLogId: string, entry: ChangeLogEntry }
  ```
- `change:approved` - Change approved
  ```typescript
  { changeLogId: string, stakeholderId: string }
  ```

### Events Received by Server

#### Connection Events
- `join:project` - Join project room
  ```typescript
  { projectId: string, userId: string }
  ```
- `leave:project` - Leave project room
  ```typescript
  { projectId: string, userId: string }
  ```

#### Presence Events
- `user:active` - User is active
  ```typescript
  { userId: string, projectId: string }
  ```
- `user:typing` - User is typing a comment
  ```typescript
  { userId: string, conflictId: string }
  ```

---

## Common Response Formats

### Success Response
```typescript
{
  success: true;
  data: T; // Response data
  message?: string; // Optional message
}
```

### Error Response
```typescript
{
  success: false;
  error: {
    code: string; // Error code (e.g., 'VALIDATION_ERROR')
    message: string; // Human-readable error message
    details?: any; // Additional error details
  };
}
```

### Pagination Info
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `INTERNAL_ERROR` - Server error
- `BRD_NOT_APPROVED` - BRD must be approved first
- `PRD_LOCKED` - PRD is locked and cannot be modified
- `DESIGN_CONFLICT` - Design has unresolved conflicts
- `INVALID_TRANSITION` - Invalid status transition

---

## HTTP Status Codes

- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `500 Internal Server Error` - Server error

---

## Rate Limiting (Future)

- 100 requests per minute per user
- 1000 requests per minute per organization
- WebSocket connections limited to 10 per user

---

## Versioning

Current API version: `v1`

Future versions will be accessible via:
- `/api/v2/...`
- Header: `Accept: application/vnd.conductor.v2+json`
