# Project Conductor Requirements API

## Overview

The Requirements CRUD API is a comprehensive system for managing requirements in the Project Conductor workflow orchestration system. It provides full CRUD operations, versioning, advanced filtering, and real-time capabilities.

## Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- Environment variables configured (see `.env.example`)

### Installation
```bash
npm install
npm run build
npm run dev
```

### Testing the API
```bash
# Run the test script (after starting the server)
node test-api.js
```

## API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Health Check
- `GET /health` - Check service and database status

### Requirements Management

#### Core CRUD Operations
- `GET /api/v1/requirements` - List all requirements with pagination and filtering
- `POST /api/v1/requirements` - Create a new requirement
- `GET /api/v1/requirements/:id` - Get a specific requirement
- `PUT /api/v1/requirements/:id` - Update a requirement
- `DELETE /api/v1/requirements/:id` - Archive a requirement (soft delete)

#### Advanced Operations
- `GET /api/v1/requirements/:id/versions` - Get requirement version history
- `GET /api/v1/requirements/summary` - Get requirements statistics
- `GET /api/v1/requirements/export` - Export requirements to CSV
- `PUT /api/v1/requirements/bulk` - Bulk update requirements

## Request/Response Examples

### Create Requirement
```bash
POST /api/v1/requirements
Content-Type: application/json
x-user-id: user-uuid

{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system",
  "priority": "high",
  "estimatedEffort": 16,
  "tags": ["auth", "security"],
  "metadata": {
    "component": "backend",
    "epic": "user-management"
  }
}
```

### Update Requirement
```bash
PUT /api/v1/requirements/:id
Content-Type: application/json
x-user-id: user-uuid
x-change-reason: Updating progress

{
  "status": "active",
  "completionPercentage": 50,
  "actualEffort": 8
}
```

### Filter Requirements
```bash
GET /api/v1/requirements?status=active,draft&priority=high&page=1&limit=20&sortBy=created_at&sortOrder=DESC
```

## Features Implemented

### 1. **Complete CRUD Operations**
- ✅ Create requirements with validation
- ✅ Read single and multiple requirements
- ✅ Update requirements with change tracking
- ✅ Soft delete (archive) requirements

### 2. **Versioning System**
- ✅ Automatic version creation on changes
- ✅ Version history tracking
- ✅ Change reason logging
- ✅ Complete audit trail

### 3. **Advanced Filtering & Search**
- ✅ Filter by status, priority, assignee, creator
- ✅ Tag-based filtering
- ✅ Date range filtering
- ✅ Full-text search in title and description
- ✅ Pagination with configurable limits
- ✅ Sorting by multiple fields

### 4. **ID Generation System**
- ✅ Unique IDs in format: REQ-YYYYMMDD-XXXX
- ✅ Automatic counter increment per day
- ✅ Extensible for other entity types

### 5. **Database Integration**
- ✅ PostgreSQL with connection pooling
- ✅ Transaction support for data consistency
- ✅ Automatic schema initialization
- ✅ Optimized indexes for performance

### 6. **Request Validation**
- ✅ Input validation using express-validator
- ✅ Type checking and sanitization
- ✅ Comprehensive error messages
- ✅ Request parameter validation

### 7. **Error Handling**
- ✅ Structured error responses
- ✅ HTTP status code management
- ✅ Development vs production error details
- ✅ Async error handling

### 8. **Middleware & Security**
- ✅ Rate limiting (configurable)
- ✅ CORS handling
- ✅ Request logging
- ✅ Input validation middleware

### 9. **Additional Features**
- ✅ Requirements summary statistics
- ✅ CSV export functionality
- ✅ Bulk operations
- ✅ Real-time WebSocket setup
- ✅ Health check with database status

## Database Schema

### Requirements Table
- Stores main requirement data
- Supports tags, metadata (JSONB)
- Tracks completion percentage and effort
- Foreign keys to users table

### Requirements Versions Table
- Maintains complete history of changes
- Links to original requirement
- Tracks who made changes and why
- Preserves all field values

### Users Table (from init.sql)
- User management with roles
- Used for assignment and audit tracking

## TypeScript Implementation

All components are fully typed with TypeScript:
- **Models**: Complete type definitions and interfaces
- **Services**: Business logic with type safety
- **Controllers**: Request/response handling
- **Middleware**: Validation and error handling
- **Utils**: Utility functions with proper typing

## Development Guidelines

### Code Structure
```
src/
├── config/         # Database configuration
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/         # TypeScript interfaces
├── routes/         # Express routes
├── services/       # Business logic
└── utils/          # Utility functions
```

### Testing
- Use `node test-api.js` for basic API testing
- Unit tests can be added using Jest framework
- Database integration tests recommended

### Deployment
1. Set environment variables
2. Run database migrations
3. Build TypeScript: `npm run build`
4. Start production: `npm start`

## Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conductor
DB_USER=conductor
DB_PASSWORD=conductor

# Server
PORT=3000
NODE_ENV=development

# Security
ALLOWED_ORIGINS=*
```

## Rate Limiting

- Default: 100 requests per 15 minutes
- Write operations: 20 requests per 15 minutes
- Configurable per endpoint

## Authentication Notes

Currently uses header-based user identification (`x-user-id`) for demo purposes. In production:
- Implement JWT/OAuth authentication
- Add role-based authorization
- Validate user permissions per operation

---

## API Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "data": {...}|[...],
  "message": "Human readable message",
  "pagination": {...}  // For paginated responses
}
```

Error responses include:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "validationErrors": [...]  // If validation failed
  }
}
```