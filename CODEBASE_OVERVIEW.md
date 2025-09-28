# Project Conductor - Codebase Overview

## Project Description
Project Conductor is a self-orchestrating requirements management and traceability system with real-time collaboration capabilities. It manages complex multi-step processes through an autonomous phase-gated implementation approach, providing workflow orchestration and automation for requirement tracking, linking, and quality management.

## Complete File Tree Structure

```
project-conductor/
├── src/                          # TypeScript source code
│   ├── config/                   # Configuration modules
│   │   └── database.ts           # PostgreSQL connection and pool management
│   ├── controllers/              # HTTP request handlers
│   │   ├── comments.controller.ts      # Comment management endpoints
│   │   ├── links.controller.ts         # Requirement linking endpoints
│   │   ├── metrics.controller.ts       # Metrics and analytics endpoints
│   │   ├── quality.controller.ts       # Quality validation endpoints
│   │   ├── requirements.controller.ts  # Core requirements CRUD
│   │   ├── review.controller.ts        # Review workflow endpoints
│   │   └── traceability.controller.ts  # Traceability matrix endpoints
│   ├── middleware/               # Express middleware
│   │   ├── error-handler.ts     # Global error handling and custom errors
│   │   ├── rate-limit.ts        # Rate limiting middleware
│   │   └── validation.ts        # Request validation middleware
│   ├── models/                   # TypeScript interfaces and types
│   │   ├── auth.model.ts        # Authentication types
│   │   ├── comment.model.ts     # Comment system types
│   │   ├── jira.model.ts        # Jira integration types
│   │   ├── link.model.ts        # Requirement linking types
│   │   ├── metrics.model.ts     # Metrics and analytics types
│   │   ├── presence.model.ts    # Real-time presence types
│   │   ├── quality.model.ts     # Quality validation types
│   │   ├── requirement.model.ts # Core requirement types
│   │   ├── review.model.ts      # Review workflow types
│   │   └── slack.model.ts       # Slack integration types
│   ├── routes/                   # API route definitions
│   │   ├── comments.routes.ts   # Comment API routes
│   │   ├── links.routes.ts      # Link management routes
│   │   ├── metrics.routes.ts    # Metrics API routes
│   │   ├── quality.routes.ts    # Quality API routes
│   │   ├── requirements.routes.ts # Requirements API routes
│   │   ├── review.routes.ts     # Review workflow routes
│   │   └── traceability.routes.ts # Traceability routes
│   ├── services/                 # Business logic layer
│   │   ├── comments.service.ts  # Comment operations
│   │   ├── jira.service.ts      # Jira integration logic
│   │   ├── links.service.ts     # Link management logic
│   │   ├── metrics.service.ts   # Metrics calculations
│   │   ├── presence.service.ts  # Real-time presence tracking
│   │   ├── quality.service.ts   # Quality validation logic
│   │   ├── requirements.service.ts # Requirements business logic
│   │   ├── review.service.ts    # Review workflow logic
│   │   ├── service-factory.ts   # Service initialization factory
│   │   ├── simple-mock.service.ts # Mock service for testing
│   │   ├── slack.service.ts     # Slack notifications
│   │   ├── traceability.service.ts # Traceability logic
│   │   └── websocket.service.ts # WebSocket event handling
│   ├── utils/                    # Utility modules
│   │   └── id-generator.ts      # Unique ID generation
│   └── index.ts                  # Application entry point
├── dist/                         # Compiled JavaScript output
├── database/                     # Database scripts
│   └── init.sql                  # PostgreSQL schema initialization
├── tests/                        # Test suites (Limited coverage)
│   ├── integration/              # Integration tests
│   │   └── presence.test.ts     # Presence service tests
│   ├── unit/                     # Unit tests (Minimal coverage)
│   │   └── id-generator.test.ts # ID generator tests (Only unit test found)
│   └── index.test.ts             # Main app tests
├── examples/                     # Example implementations
│   ├── api/                      # API endpoint examples
│   │   ├── requirements-crud.example.ts   # CRUD pattern example
│   │   └── validation-chain.example.ts    # Validation middleware example
│   ├── database/                 # Database query examples
│   │   └── parameterized-query.example.ts # SQL safety patterns
│   ├── services/                 # Service examples
│   │   └── async-operations.example.ts    # Async service patterns
│   ├── tests/                    # Test examples
│   │   └── integration-test.example.ts    # Integration testing patterns
│   ├── middleware/               # Middleware examples (Empty - needs examples)
│   ├── utils/                    # Utility examples (Empty - needs examples)
│   ├── presence-demo.js          # Presence tracking demo
│   └── STRUCTURE_PLAN.md         # Examples structure plan
├── .conductor/                   # Conductor state management
│   ├── state.json                # Implementation state
│   ├── progress.md               # Progress log
│   ├── dashboard.md              # Progress visualization
│   ├── errors.log                # Error tracking
│   └── lessons.json              # Self-improvement tracking
├── docker-compose.yml            # Docker services configuration
├── Dockerfile                    # Container image definition
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest test configuration
├── CLAUDE.md                     # Development guidelines
├── API_README.md                 # API documentation
├── README.md                     # Project documentation
├── test-api.js                   # API test script
├── demo-ui.html                  # Demo UI interface
├── ui-demo.html                  # UI demo
└── complete-ui.html              # Complete UI
```

## Directory Purposes

### `/src`
Main source directory containing all TypeScript application code.

### `/src/config`
- **database.ts**: PostgreSQL connection pooling, query execution, and database health checks

### `/src/controllers`
HTTP request handlers implementing the Controller pattern:
- **requirements.controller.ts**: Core CRUD operations for requirements
- **links.controller.ts**: Managing relationships between requirements
- **comments.controller.ts**: Threading and commenting system
- **quality.controller.ts**: NLP-based quality validation
- **review.controller.ts**: Approval workflow management
- **metrics.controller.ts**: Analytics and reporting
- **traceability.controller.ts**: Traceability matrix generation

### `/src/services`
Business logic layer with clean separation from controllers:
- **requirements.service.ts**: Core requirement operations and versioning
- **links.service.ts**: Bidirectional linking and suspect detection
- **comments.service.ts**: Comment threading and notifications
- **presence.service.ts**: Real-time user presence tracking
- **websocket.service.ts**: Socket.io event broadcasting
- **quality.service.ts**: Ambiguity detection and validation
- **review.service.ts**: Review workflow state management
- **metrics.service.ts**: Coverage analysis and KPI calculations
- **traceability.service.ts**: Matrix generation and gap analysis
- **simple-mock.service.ts**: In-memory mock for testing
- **service-factory.ts**: Centralized service instantiation

### `/src/models`
TypeScript interfaces and type definitions:
- Strict typing for all domain entities
- Request/response DTOs
- Database schema representations
- WebSocket event types

### `/src/routes`
RESTful API route definitions:
- Express router configurations
- Validation middleware chains
- Rate limiting per endpoint
- Route documentation

### `/src/middleware`
Cross-cutting concerns:
- **error-handler.ts**: Global error handling, custom error classes
- **validation.ts**: Express-validator chains for input validation
- **rate-limit.ts**: Per-endpoint rate limiting

### `/src/utils`
Shared utilities:
- **id-generator.ts**: Unique, sortable ID generation system

### `/database`
Database initialization and migration scripts:
- **init.sql**: Complete PostgreSQL schema with tables, indexes, triggers

### `/tests`
Test suites organized by type:
- **unit/**: Isolated component tests
- **integration/**: API and database integration tests
- Jest with ts-jest for TypeScript support

### `/.conductor`
Self-orchestration state management:
- Tracks implementation phases
- Maintains progress logs
- Error recovery information

## Major Entry Points

### 1. **Main Application Entry** (`/src/index.ts`)
- Express server initialization
- Socket.io WebSocket server setup
- Service factory initialization
- Route mounting
- Middleware pipeline configuration
- Health check endpoints

### 2. **API Routes** (`/api/v1/`)
- `/api/v1/requirements` - Requirements CRUD
- `/api/v1/links` - Requirement linking
- `/api/v1/traceability` - Traceability operations
- `/api/v1/comments` - Comment management
- `/api/v1/quality` - Quality validation
- `/api/v1/reviews` - Review workflows
- `/api/v1/metrics` - Analytics and reporting
- `/health` - Health check endpoint

### 3. **WebSocket Events** (Socket.io)
- Requirement updates
- Comment notifications
- Presence tracking
- Real-time collaboration events

## Key Classes and Services

### Core Services
1. **RequirementsService**: Core requirement operations, versioning, audit logging
   - Note: Not consistently exported, uses 'any' types extensively
2. **LinksService**: Bidirectional linking, suspect detection, relationship management
   - Note: Not exported class, instantiated via ServiceFactory
3. **WebSocketService**: Real-time event broadcasting, room management
   - Note: Exported class, properly typed
4. **PresenceService**: User presence tracking, editing status
   - Note: Exported class, singleton instance pattern
5. **QualityService**: NLP-based validation, ambiguity detection
   - Note: Exported class
6. **ReviewService**: Multi-step approval workflows
   - Note: Not exported, uses 'any' types
7. **MetricsService**: Coverage analysis, KPI calculations
   - Note: Exported class
8. **TraceabilityService**: Matrix generation, gap analysis
   - Note: Not exported class
9. **SimpleMockService**: In-memory mock for testing
   - Note: Used directly in controllers when USE_MOCK_DB is set

### Key Controllers
1. **RequirementsController**: Request handling for requirements API
   - Exported class, handles own mock service switching
2. **LinksController**: Link management endpoints
   - Not exported class, instantiated directly in routes
3. **CommentsController**: Comment threading endpoints
   - Exported class, receives WebSocketService via constructor
4. **QualityController**: Quality validation endpoints
   - Exported class
5. **ReviewController**: Review workflow endpoints
   - Exported class, handles own mock service switching
6. **TraceabilityController**: Traceability matrix endpoints
   - Not exported class
7. **MetricsController**: Analytics and metrics endpoints
   - Exported class

### Utilities
1. **IdGenerator**: Generates unique, sortable IDs with prefixes
   - Default export, static methods
   - Format: PREFIX-YYYYMMDD-XXXX
2. **ServiceFactory**: Centralizes service instantiation with dependency injection
   - Static class with initialization pattern
   - Note: Not consistently used - controllers often instantiate services directly
   # TODO: Verify this with team - Should all services go through factory?

### Middleware
1. **errorHandler**: Global error handling with custom error types
2. **asyncHandler**: Wraps async controllers for error propagation
3. **validation middleware**: Express-validator chains for input validation
4. **rate limiting**: Configurable per-endpoint rate limits

### Custom Error Classes
- **AppError**: Base error class with status codes
- **ValidationError**: Input validation failures (400)
- **NotFoundError**: Resource not found (404)
- **UnauthorizedError**: Authentication required (401)
- **ForbiddenError**: Insufficient permissions (403)
- **ConflictError**: Resource conflicts (409)
- **DatabaseError**: Database operation failures (500)

## Database Schema

### Core Tables
- **users**: User accounts and authentication
- **requirements**: Core requirement entities
- **links**: Relationships between requirements
- **comments**: Threading and discussions
- **reviews**: Review workflow states
- **requirement_versions**: Version history
- **audit_log**: Complete audit trail

### Supporting Tables
- **notifications**: User notifications
- **sessions**: Active user sessions
- **api_keys**: Service-to-service authentication
- **webhooks**: External integrations

## External Dependencies

### Runtime Dependencies (Verified from package-lock.json)
- **express**: Web framework (^4.18.2)
- **socket.io**: Real-time WebSocket communication (^4.7.2)
- **pg**: PostgreSQL client (^8.11.3)
- **redis**: Caching and session storage (^4.6.8)
- **express-validator**: Input validation (^7.2.1)
- **socket.io-client**: Client-side WebSocket (^4.7.2)

### Development Dependencies (Verified from package-lock.json)
- **typescript**: Type-safe JavaScript (^5.2.2)
- **ts-node-dev**: Development server (^2.0.0)
- **jest**: Testing framework (^29.6.4)
- **ts-jest**: TypeScript Jest support (^29.1.1)
- **supertest**: HTTP endpoint testing (^6.3.3)
- **eslint**: Code linting (^8.48.0)
- **@typescript-eslint/parser**: TypeScript ESLint (^6.5.0)
- **@typescript-eslint/eslint-plugin**: TypeScript rules (^6.5.0)
- **@types/express**: Express types (^4.17.17)
- **@types/jest**: Jest types (^29.5.5)
- **@types/node**: Node types (^20.5.9)
- **@types/pg**: PostgreSQL types (^8.10.2)
- **@types/supertest**: Supertest types (^2.0.12)

## Configuration

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `PORT`: Server port
- `USE_MOCK_DB`: Enable mock service
- `ALLOWED_ORIGINS`: CORS origins

### Docker Services
- **postgres**: PostgreSQL 15 database
- **redis**: Redis 7 Alpine cache
- **app**: Node.js application container

## Architecture Issues & Improvements Needed

### Inconsistencies Found
1. **Export Pattern Inconsistency**
   - Some classes exported, others not
   - Mix of default and named exports
   - ServiceFactory not consistently used

2. **Type Safety Issues**
   - Extensive use of 'any' type (38+ instances in services)
   - Missing proper type definitions for many functions
   # TODO: Verify this with team - Create proper type definitions

3. **Mock Service Handling**
   - Controllers directly check USE_MOCK_DB instead of using factory
   - Inconsistent mock service initialization
   # TODO: Verify this with team - Centralize mock service logic

4. **Logging Issues**
   - Console.log statements in production code
   - No centralized logging service
   # TODO: Verify this with team - Implement proper logging service

5. **Test Coverage Gaps**
   - Minimal unit test coverage (only 1 file)
   - No E2E tests found
   - Limited integration tests

## Testing Infrastructure

### Test Organization
- Unit tests in `/tests/unit/`
  - Limited coverage: Only id-generator.test.ts found
  # TODO: Verify this with team - Expand unit test coverage
- Integration tests in `/tests/integration/`
  - Main focus: presence.test.ts
- E2E tests for complete workflows
  - Not found in current structure
  # TODO: Verify this with team - Add E2E test suite

### Test Commands
- `npm test`: Run all tests
- `npm test:unit`: Unit tests only
- `npm test:integration`: Integration tests
- `npm test:presence`: Presence service tests

### Coverage Targets
- Unit tests: 80% coverage (Target - actual coverage unknown)
- Integration tests: All endpoints (Target - partially implemented)
- Critical paths: 100% coverage (Target - needs verification)
# TODO: Verify this with team - Set up coverage reporting