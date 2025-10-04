# Project Conductor - API Documentation

> Complete RESTful API reference for Project Conductor

**Base URL**: `http://localhost:3000/api/v1`

**Version**: 1.0.0

**Authentication**: Currently disabled (demo mode)

**Rate Limiting**:
- General API: 100 requests per 15 minutes
- Write operations: 20 requests per 15 minutes

---

## Table of Contents

1. [Requirements API](#requirements-api)
2. [Links API](#links-api)
3. [Traceability API](#traceability-api)
4. [Comments API](#comments-api)
5. [Quality API](#quality-api)
6. [Review API](#review-api)
7. [Metrics API](#metrics-api)
8. [BRD API](#brd-api)
9. [PRD API](#prd-api)
10. [Engineering Design API](#engineering-design-api)
11. [Conflicts API](#conflicts-api)
12. [Change Log API](#change-log-api)
13. [Presence API](#presence-api)
14. [WebSocket Events](#websocket-events)

---

## Requirements API

Manage requirements with full CRUD operations, versioning, and bulk updates.

### List All Requirements

**Endpoint**: `GET /api/v1/requirements`

**Description**: Get paginated list of requirements with filtering and sorting.

**Query Parameters**:
```
page         (number, optional)  - Page number (default: 1)
limit        (number, optional)  - Items per page (default: 10)
sortBy       (string, optional)  - Sort field (default: 'createdAt')
sortOrder    (string, optional)  - Sort order: 'asc' or 'desc' (default: 'desc')
status       (string, optional)  - Filter by status
priority     (string, optional)  - Filter by priority
type         (string, optional)  - Filter by type
source       (string, optional)  - Filter by source
search       (string, optional)  - Search in title and description
```

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/requirements?page=1&limit=10&status=approved&sortBy=priority"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "requirements": [
      {
        "id": "REQ-001",
        "title": "User Authentication",
        "description": "Implement secure user login system",
        "status": "approved",
        "priority": "high",
        "type": "functional",
        "source": "brd",
        "version": 1,
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

### Create Requirement

**Endpoint**: `POST /api/v1/requirements`

**Description**: Create a new requirement.

**Request Body**:
```json
{
  "title": "User Authentication",
  "description": "Implement secure user login system",
  "priority": "high",
  "type": "functional",
  "source": "brd",
  "status": "draft"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Authentication",
    "description": "Implement secure user login system",
    "priority": "high",
    "type": "functional"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "REQ-001",
    "title": "User Authentication",
    "description": "Implement secure user login system",
    "status": "draft",
    "priority": "high",
    "type": "functional",
    "source": "brd",
    "version": 1,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  "message": "Requirement created successfully"
}
```

### Get Requirement by ID

**Endpoint**: `GET /api/v1/requirements/:id`

**Description**: Retrieve a single requirement by its ID.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/requirements/REQ-001
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "REQ-001",
    "title": "User Authentication",
    "description": "Implement secure user login system",
    "status": "approved",
    "priority": "high",
    "type": "functional",
    "source": "brd",
    "version": 2,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-16T14:30:00.000Z"
  }
}
```

### Update Requirement

**Endpoint**: `PUT /api/v1/requirements/:id`

**Description**: Update an existing requirement (creates new version).

**Request Body**:
```json
{
  "title": "User Authentication (Updated)",
  "description": "Implement secure user login with 2FA",
  "priority": "critical",
  "status": "in-review"
}
```

**Example Request**:
```bash
curl -X PUT http://localhost:3000/api/v1/requirements/REQ-001 \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Implement secure user login with 2FA",
    "priority": "critical"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "REQ-001",
    "title": "User Authentication",
    "description": "Implement secure user login with 2FA",
    "status": "in-review",
    "priority": "critical",
    "type": "functional",
    "source": "brd",
    "version": 3,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-17T09:15:00.000Z"
  },
  "message": "Requirement updated successfully"
}
```

### Delete Requirement

**Endpoint**: `DELETE /api/v1/requirements/:id`

**Description**: Archive a requirement (soft delete).

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/api/v1/requirements/REQ-001
```

**Example Response**:
```json
{
  "success": true,
  "message": "Requirement archived successfully"
}
```

### Get Requirement Versions

**Endpoint**: `GET /api/v1/requirements/:id/versions`

**Description**: Get version history for a requirement.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/requirements/REQ-001/versions
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "version": 3,
        "title": "User Authentication",
        "description": "Implement secure user login with 2FA",
        "priority": "critical",
        "updatedAt": "2025-01-17T09:15:00.000Z",
        "updatedBy": "user123"
      },
      {
        "version": 2,
        "title": "User Authentication",
        "description": "Implement secure user login system",
        "priority": "high",
        "updatedAt": "2025-01-16T14:30:00.000Z",
        "updatedBy": "user456"
      }
    ]
  }
}
```

### Get Requirements Summary

**Endpoint**: `GET /api/v1/requirements/summary`

**Description**: Get summary statistics for all requirements.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/requirements/summary
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "draft": 12,
      "in-review": 8,
      "approved": 20,
      "rejected": 5
    },
    "byPriority": {
      "critical": 5,
      "high": 15,
      "medium": 20,
      "low": 5
    },
    "byType": {
      "functional": 30,
      "non-functional": 15
    }
  }
}
```

### Export Requirements

**Endpoint**: `GET /api/v1/requirements/export`

**Description**: Export requirements to CSV format.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/requirements/export > requirements.csv
```

**Response**: CSV file download

### Bulk Update Requirements

**Endpoint**: `PUT /api/v1/requirements/bulk`

**Description**: Update multiple requirements at once.

**Request Body**:
```json
{
  "updates": [
    {
      "id": "REQ-001",
      "status": "approved"
    },
    {
      "id": "REQ-002",
      "priority": "high"
    }
  ]
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 0
  },
  "message": "Bulk update completed"
}
```

---

## Links API

Manage bidirectional links between requirements for traceability.

### Create Link

**Endpoint**: `POST /api/v1/requirements/:id/links`

**Description**: Create a link from one requirement to another.

**Request Body**:
```json
{
  "targetId": "REQ-002",
  "linkType": "derives-from",
  "description": "PRD derived from BRD requirement"
}
```

**Link Types**:
- `derives-from` - Derived requirement
- `depends-on` - Dependency
- `conflicts-with` - Conflict
- `related-to` - Related

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/v1/requirements/REQ-001/links \
  -H "Content-Type: application/json" \
  -d '{
    "targetId": "REQ-002",
    "linkType": "derives-from"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "LINK-001",
    "sourceId": "REQ-001",
    "targetId": "REQ-002",
    "linkType": "derives-from",
    "description": "PRD derived from BRD requirement",
    "isSuspect": false,
    "createdAt": "2025-01-15T10:00:00.000Z"
  },
  "message": "Link created successfully"
}
```

### Get Requirement Links

**Endpoint**: `GET /api/v1/requirements/:id/links`

**Description**: Get all links for a specific requirement.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/requirements/REQ-001/links
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "outgoing": [
      {
        "id": "LINK-001",
        "targetId": "REQ-002",
        "linkType": "derives-from",
        "isSuspect": false
      }
    ],
    "incoming": [
      {
        "id": "LINK-003",
        "sourceId": "REQ-005",
        "linkType": "depends-on",
        "isSuspect": false
      }
    ]
  }
}
```

### Validate Link

**Endpoint**: `POST /api/v1/requirements/:id/links/validate`

**Description**: Validate a potential link before creating it.

**Request Body**:
```json
{
  "targetId": "REQ-002",
  "linkType": "derives-from"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "warnings": [],
    "conflicts": []
  }
}
```

### Update Link

**Endpoint**: `PUT /api/v1/links/:linkId`

**Description**: Update an existing link.

**Request Body**:
```json
{
  "linkType": "related-to",
  "description": "Updated relationship"
}
```

### Mark Link as Suspect

**Endpoint**: `PUT /api/v1/links/:linkId/suspect`

**Description**: Mark or unmark a link as suspect.

**Request Body**:
```json
{
  "isSuspect": true,
  "reason": "Source requirement changed significantly"
}
```

### Delete Link

**Endpoint**: `DELETE /api/v1/links/:linkId`

**Description**: Delete a link between requirements.

**Example Request**:
```bash
curl -X DELETE http://localhost:3000/api/v1/links/LINK-001
```

### Get Link Statistics

**Endpoint**: `GET /api/v1/links/statistics`

**Description**: Get statistics about all links.

**Example Response**:
```json
{
  "success": true,
  "data": {
    "total": 120,
    "byType": {
      "derives-from": 45,
      "depends-on": 30,
      "related-to": 35,
      "conflicts-with": 10
    },
    "suspect": 5
  }
}
```

---

## Traceability API

Generate traceability matrices and analyze requirement coverage.

### Get Traceability Matrix

**Endpoint**: `GET /api/v1/traceability/matrix`

**Description**: Generate complete traceability matrix.

**Query Parameters**:
```
sourceType   (string, optional) - Filter by source type
targetType   (string, optional) - Filter by target type
format       (string, optional) - Response format: 'json' or 'matrix'
```

**Example Request**:
```bash
curl -X GET "http://localhost:3000/api/v1/traceability/matrix?sourceType=brd&targetType=prd"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "matrix": [
      {
        "sourceId": "BRD-001",
        "sourceTitle": "User Management",
        "targets": [
          {
            "targetId": "PRD-001",
            "targetTitle": "Login Feature",
            "linkType": "derives-from"
          },
          {
            "targetId": "PRD-002",
            "targetTitle": "User Profile",
            "linkType": "derives-from"
          }
        ]
      }
    ],
    "statistics": {
      "totalSources": 15,
      "totalTargets": 35,
      "totalLinks": 42,
      "coverage": "93.3%"
    }
  }
}
```

### Get Link Analytics

**Endpoint**: `GET /api/v1/traceability/analytics`

**Description**: Get comprehensive analytics about requirement links.

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalLinks": 120,
    "byType": {
      "derives-from": 45,
      "depends-on": 30,
      "related-to": 35,
      "conflicts-with": 10
    },
    "suspectLinks": 5,
    "orphanedRequirements": 3,
    "mostLinkedRequirement": {
      "id": "BRD-001",
      "linkCount": 12
    }
  }
}
```

### Get Coverage Report

**Endpoint**: `GET /api/v1/traceability/coverage`

**Description**: Get coverage report showing which requirements have links.

**Query Parameters**:
```
type      (string, optional) - Filter by requirement type
source    (string, optional) - Filter by requirement source
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "coverage": {
      "total": 45,
      "covered": 42,
      "uncovered": 3,
      "percentage": 93.3
    },
    "uncoveredRequirements": [
      {
        "id": "BRD-015",
        "title": "Backup System",
        "type": "non-functional"
      }
    ]
  }
}
```

### Get Impact Analysis

**Endpoint**: `GET /api/v1/traceability/impact/:id`

**Description**: Get impact analysis for a requirement showing all affected requirements.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/traceability/impact/REQ-001
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "requirementId": "REQ-001",
    "directImpact": [
      {
        "id": "REQ-002",
        "title": "Derived Requirement",
        "linkType": "derives-from"
      }
    ],
    "indirectImpact": [
      {
        "id": "REQ-003",
        "title": "Secondary Requirement",
        "path": ["REQ-001", "REQ-002", "REQ-003"]
      }
    ],
    "totalImpacted": 5
  }
}
```

### Get Traceability Path

**Endpoint**: `GET /api/v1/traceability/path/:fromId/:toId`

**Description**: Find traceability path between two requirements.

**Example Request**:
```bash
curl -X GET http://localhost:3000/api/v1/traceability/path/BRD-001/IMPL-005
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "path": [
      {
        "id": "BRD-001",
        "title": "Business Requirement",
        "type": "brd"
      },
      {
        "id": "PRD-003",
        "title": "Product Feature",
        "type": "prd"
      },
      {
        "id": "DESIGN-002",
        "title": "Technical Design",
        "type": "design"
      },
      {
        "id": "IMPL-005",
        "title": "Implementation",
        "type": "implementation"
      }
    ],
    "length": 4
  }
}
```

---

## Comments API

Manage comments and discussions on requirements.

### Create Comment

**Endpoint**: `POST /api/v1/requirements/:id/comments`

**Description**: Add a comment to a requirement.

**Request Body**:
```json
{
  "content": "This requirement needs clarification",
  "userId": "user123",
  "username": "John Doe",
  "parentId": null
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3000/api/v1/requirements/REQ-001/comments \
  -H "Content-Type: application/json" \
  -d '{
    "content": "This requirement needs clarification",
    "userId": "user123",
    "username": "John Doe"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "COMMENT-001",
    "requirementId": "REQ-001",
    "content": "This requirement needs clarification",
    "userId": "user123",
    "username": "John Doe",
    "parentId": null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  "message": "Comment created successfully"
}
```

### Get Comments

**Endpoint**: `GET /api/v1/requirements/:id/comments`

**Description**: Get all comments for a requirement.

**Example Response**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "COMMENT-001",
        "content": "This requirement needs clarification",
        "userId": "user123",
        "username": "John Doe",
        "parentId": null,
        "replies": [
          {
            "id": "COMMENT-002",
            "content": "I agree, let's discuss",
            "userId": "user456",
            "username": "Jane Smith",
            "parentId": "COMMENT-001",
            "createdAt": "2025-01-15T11:00:00.000Z"
          }
        ],
        "createdAt": "2025-01-15T10:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

### Update Comment

**Endpoint**: `PUT /api/v1/comments/:id`

**Description**: Update an existing comment.

**Request Body**:
```json
{
  "content": "Updated comment text"
}
```

### Delete Comment

**Endpoint**: `DELETE /api/v1/comments/:id`

**Description**: Delete a comment.

### Get Comment Thread

**Endpoint**: `GET /api/v1/comments/:id/thread`

**Description**: Get comment with all replies.

---

## Quality API

Perform quality checks and validation on requirements.

### Analyze Quality

**Endpoint**: `POST /api/v1/quality/analyze`

**Description**: Analyze requirement quality.

**Request Body**:
```json
{
  "requirementId": "REQ-001"
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "score": 85,
    "issues": [
      {
        "type": "ambiguity",
        "severity": "medium",
        "description": "Contains ambiguous term 'usually'"
      }
    ],
    "suggestions": [
      "Define specific criteria for 'usually'"
    ]
  }
}
```

### Validate Completeness

**Endpoint**: `POST /api/v1/quality/validate`

**Description**: Validate requirement completeness.

---

## Review API

Manage review and approval workflows.

### Submit for Review

**Endpoint**: `POST /api/v1/review/:id/submit`

**Description**: Submit requirement for review.

### Approve Requirement

**Endpoint**: `POST /api/v1/review/:id/approve`

**Description**: Approve a requirement.

**Request Body**:
```json
{
  "reviewerId": "user123",
  "comments": "Looks good"
}
```

### Reject Requirement

**Endpoint**: `POST /api/v1/review/:id/reject`

**Description**: Reject a requirement with feedback.

---

## Metrics API

Get analytics and metrics about the system.

### Get System Metrics

**Endpoint**: `GET /api/v1/metrics`

**Description**: Get overall system metrics.

**Example Response**:
```json
{
  "success": true,
  "data": {
    "requirements": {
      "total": 120,
      "approved": 85,
      "pending": 35
    },
    "links": {
      "total": 250,
      "suspect": 5
    },
    "activity": {
      "commentsToday": 45,
      "updatesToday": 23
    }
  }
}
```

---

## BRD API

Manage Business Requirements Documents.

### Create BRD

**Endpoint**: `POST /api/v1/brd`

**Request Body**:
```json
{
  "title": "E-commerce Platform",
  "businessObjective": "Increase online sales by 50%",
  "targetAudience": "Online shoppers aged 25-45",
  "successCriteria": [
    "50% increase in conversion rate",
    "20% reduction in cart abandonment"
  ],
  "stakeholders": ["CEO", "Marketing Director", "Product Manager"]
}
```

### Get All BRDs

**Endpoint**: `GET /api/v1/brd`

### Get BRD by ID

**Endpoint**: `GET /api/v1/brd/:id`

### Update BRD

**Endpoint**: `PUT /api/v1/brd/:id`

### Delete BRD

**Endpoint**: `DELETE /api/v1/brd/:id`

### Approve BRD

**Endpoint**: `POST /api/v1/brd/:id/approve`

**Request Body**:
```json
{
  "approverId": "user123",
  "approved": true,
  "comments": "Approved for PRD generation"
}
```

### Get Approval Status

**Endpoint**: `GET /api/v1/brd/:id/approval-status`

### Get BRD Summary

**Endpoint**: `GET /api/v1/brd/summary`

---

## PRD API

Manage Product Requirements Documents.

### Create PRD

**Endpoint**: `POST /api/v1/prd`

**Request Body**:
```json
{
  "title": "User Authentication Feature",
  "brdId": "BRD-001",
  "description": "Implement secure user login",
  "features": [
    {
      "name": "Login Form",
      "description": "Email and password login",
      "priority": "high"
    }
  ]
}
```

### Generate PRD from BRD

**Endpoint**: `POST /api/v1/prd/generate/:brdId`

**Description**: Automatically generate PRD from approved BRD.

### Get All PRDs

**Endpoint**: `GET /api/v1/prd`

### Get PRD by ID

**Endpoint**: `GET /api/v1/prd/:id`

### Update PRD

**Endpoint**: `PUT /api/v1/prd/:id`

### Delete PRD

**Endpoint**: `DELETE /api/v1/prd/:id`

### Record Alignment

**Endpoint**: `POST /api/v1/prd/:id/align`

**Request Body**:
```json
{
  "stakeholderId": "user123",
  "aligned": true,
  "comments": "Looks good to proceed"
}
```

### Lock PRD

**Endpoint**: `POST /api/v1/prd/:id/lock`

**Description**: Lock PRD for engineering review.

### Add Feature

**Endpoint**: `POST /api/v1/prd/:id/features`

**Request Body**:
```json
{
  "name": "Two-Factor Authentication",
  "description": "SMS-based 2FA",
  "priority": "high"
}
```

### Add User Story

**Endpoint**: `POST /api/v1/prd/:id/stories`

**Request Body**:
```json
{
  "title": "As a user, I want to login securely",
  "acceptanceCriteria": [
    "User can enter email and password",
    "System validates credentials",
    "User is redirected to dashboard on success"
  ]
}
```

### Get Alignment Status

**Endpoint**: `GET /api/v1/prd/:id/alignment-status`

---

## Engineering Design API

Manage technical design documents.

### Create Design

**Endpoint**: `POST /api/v1/engineering-design`

### Get All Designs

**Endpoint**: `GET /api/v1/engineering-design`

### Get Design by ID

**Endpoint**: `GET /api/v1/engineering-design/:id`

### Update Design

**Endpoint**: `PUT /api/v1/engineering-design/:id`

### Delete Design

**Endpoint**: `DELETE /api/v1/engineering-design/:id`

---

## Conflicts API

Manage requirement conflicts and resolutions.

### Get All Conflicts

**Endpoint**: `GET /api/v1/conflicts`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "conflicts": [
      {
        "id": "CONFLICT-001",
        "requirement1": "REQ-001",
        "requirement2": "REQ-005",
        "type": "contradiction",
        "description": "Conflicting security requirements",
        "status": "open",
        "votes": {
          "option1": 5,
          "option2": 3
        }
      }
    ]
  }
}
```

### Get Conflict by ID

**Endpoint**: `GET /api/v1/conflicts/:id`

### Vote on Conflict

**Endpoint**: `POST /api/v1/conflicts/:id/vote`

**Request Body**:
```json
{
  "voterId": "user123",
  "vote": "option1",
  "rationale": "This approach is more secure"
}
```

### Resolve Conflict

**Endpoint**: `POST /api/v1/conflicts/:id/resolve`

**Request Body**:
```json
{
  "resolution": "Adopt option1",
  "resolvedBy": "user123"
}
```

---

## Change Log API

Track all changes and maintain audit trail.

### Get Change Log

**Endpoint**: `GET /api/v1/change-log`

**Query Parameters**:
```
requirementId  (string, optional) - Filter by requirement
userId         (string, optional) - Filter by user
startDate      (date, optional)   - Filter by date range
endDate        (date, optional)   - Filter by date range
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "changes": [
      {
        "id": "CHANGE-001",
        "requirementId": "REQ-001",
        "changeType": "update",
        "field": "priority",
        "oldValue": "high",
        "newValue": "critical",
        "userId": "user123",
        "username": "John Doe",
        "timestamp": "2025-01-15T10:00:00.000Z"
      }
    ],
    "total": 150
  }
}
```

### Get Requirement History

**Endpoint**: `GET /api/v1/change-log/requirement/:id`

---

## Presence API

Track user presence and activity.

### Get Presence Stats

**Endpoint**: `GET /api/v1/presence/stats`

**Example Response**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalOnline": 15,
      "totalEditing": 3,
      "totalAway": 2
    },
    "activeUsers": [
      {
        "userId": "user123",
        "username": "John Doe",
        "status": "online",
        "isEditing": true,
        "requirementId": "REQ-001",
        "lastSeen": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

### Get Requirement Presence

**Endpoint**: `GET /api/v1/presence/requirement/:requirementId`

**Description**: Get all users currently viewing a requirement.

---

## WebSocket Events

Real-time collaboration via Socket.io.

### Client Events (Emit)

#### Initialize User
```javascript
socket.emit('user:initialize', {
  userId: 'user123',
  username: 'John Doe'
});
```

#### Join Requirement
```javascript
socket.emit('join-requirement', {
  requirementId: 'REQ-001',
  userId: 'user123',
  username: 'John Doe'
});
```

#### Start Editing
```javascript
socket.emit('editing:start', {
  userId: 'user123',
  requirementId: 'REQ-001'
});
```

#### Stop Editing
```javascript
socket.emit('editing:stop', {
  userId: 'user123',
  requirementId: 'REQ-001'
});
```

#### Update Status
```javascript
socket.emit('status:update', {
  userId: 'user123',
  status: 'away' // 'online', 'away', 'offline'
});
```

### Server Events (Listen)

#### Presence Initialized
```javascript
socket.on('presence:initialized', (data) => {
  console.log('User presence:', data);
});
```

#### Presence List
```javascript
socket.on('presence:list', (users) => {
  console.log('Active users:', users);
});
```

#### User Joined
```javascript
socket.on('presence:user-joined', ({ user, requirementId }) => {
  console.log(`${user.username} joined ${requirementId}`);
});
```

#### User Left
```javascript
socket.on('presence:user-left', ({ user, requirementId }) => {
  console.log(`${user.username} left ${requirementId}`);
});
```

#### Comment Created
```javascript
socket.on('comment:created', (comment) => {
  console.log('New comment:', comment);
});
```

#### Field Changed
```javascript
socket.on('requirement:field-changed', ({ field, value, username }) => {
  console.log(`${username} updated ${field} to ${value}`);
});
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "statusCode": 400
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Rate Limiting

Rate limits are applied per IP address:

- **General API**: 100 requests per 15 minutes
- **Write Operations**: 20 requests per 15 minutes

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 15 minutes.",
  "statusCode": 429
}
```

---

## Pagination

All list endpoints support pagination:

**Request**:
```
GET /api/v1/requirements?page=2&limit=20
```

**Response**:
```json
{
  "data": { ... },
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Testing the API

### Using cURL
```bash
# Get all requirements
curl http://localhost:3000/api/v1/requirements

# Create requirement
curl -X POST http://localhost:3000/api/v1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test requirement"}'
```

### Using Postman

Import the API endpoints into Postman for easy testing.

### Using the Test Dashboard

Visit `http://localhost:3000/demo/test-dashboard.html` for interactive API testing.

---

**Last Updated**: October 2025
**Version**: 1.0.0
