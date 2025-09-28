# Project Conductor - Development Guidelines

## Overview
Project Conductor is a self-orchestrating requirements management and traceability system with real-time collaboration capabilities. It manages complex multi-step processes through an autonomous phase-gated implementation approach.

## Tech Stack

### Core Technologies (Verified from package.json and package-lock.json)
- **Runtime**: Node.js (>=16.0.0)
- **Language**: TypeScript ^5.2.2
- **Framework**: Express.js ^4.18.2
- **Real-time**: Socket.io ^4.7.2 + socket.io-client ^4.7.2
- **Database**: PostgreSQL (pg ^8.11.3)
- **Caching**: Redis ^4.6.8
- **Validation**: express-validator ^7.2.1

### Development Tools
- **Build**: TypeScript Compiler (tsc)
- **Dev Server**: ts-node-dev 2.0.0
- **Testing**: Jest 29.6.4 with ts-jest 29.1.1
- **Linting**: ESLint 8.48.0
- **TypeScript ESLint**: @typescript-eslint/parser 6.5.0 + @typescript-eslint/eslint-plugin 6.5.0
- **Testing Utils**: Supertest 6.3.3
- **Type Definitions**: @types/express 4.17.17, @types/jest 29.5.5, @types/node 20.5.9, @types/pg 8.10.2, @types/supertest 2.0.12

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15 (via Docker)
- **Cache**: Redis 7-alpine (via Docker)

## Coding Conventions (Observed Patterns)

### TypeScript Standards
- **Strict Mode**: All TypeScript strict flags enabled (tsconfig.json)
- **No Implicit Any**: `noImplicitAny: true`
- **No Unused Variables**: `noUnusedLocals: true`, `noUnusedParameters: true`
- **Consistent Casing**: `forceConsistentCasingInFileNames: true`
- **Optional Properties**: `exactOptionalPropertyTypes: true`
- **Target**: ES2020 with CommonJS modules
- **Source Maps**: Enabled for debugging
- **Declarations**: Generated with declaration maps

### Code Organization
- **Controller Pattern**: Request handlers in `/controllers` with async error handling
  - Mix of exported and non-exported classes (inconsistency noted)
  - Direct mock service usage in controllers (USE_MOCK_DB pattern)
- **Service Layer**: Business logic in `/services` with clear separation from controllers
  - Some services exported, others not (inconsistency noted)
  - ServiceFactory pattern for dependency injection
- **Model Definitions**: TypeScript interfaces and enums in `/models`
- **Route Definitions**: RESTful routes in `/routes` mapping to controller methods
- **Middleware Pipeline**: Composable middleware in `/middleware`

### Naming Conventions (Observed in Codebase)
- **Files**: kebab-case with suffix (e.g., `requirements.controller.ts`, `links.service.ts`)
- **Classes**: PascalCase, often exported (e.g., `export class RequirementsController`)
- **Methods/Functions**: camelCase (e.g., `getRequirementById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `REQUIREMENT_STATUS`)
- **Interfaces**: PascalCase, no 'I' prefix used (e.g., `RequirementFilters`, `BaseRequirement`)
- **Type Definitions**: PascalCase (e.g., `PaginationParams`, `RequirementStatusType`)

### API Conventions
- **Versioning**: All APIs under `/api/v1/` namespace
- **Response Format**: Consistent JSON structure with `success`, `data`, `message`
- **Error Handling**: Custom error classes with appropriate HTTP status codes
- **Pagination**: Standard pagination with `page`, `limit`, `sortBy`, `sortOrder`
- **Filtering**: Query parameter based filtering with type validation

### Async Patterns
- **Error Handling**: Use `asyncHandler` wrapper for controller methods
- **Promise Handling**: Async/await preferred over callbacks
- **Error Propagation**: Throw custom errors that bubble to error middleware

## Testing Strategy

### Test Structure
```
tests/
├── unit/                 # Isolated unit tests
├── integration/          # API and database integration tests
└── e2e/                  # End-to-end workflow tests
```

### Testing Commands
- `npm test`: Run all tests using Jest
- `npm test:presence`: Specific presence test suite
- `npm run dev`: Start development server with auto-reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run production server
- `npm run lint`: Run ESLint on TypeScript files
- `npm run lint:fix`: Auto-fix linting issues
- `npm run demo:presence`: Run presence demo

### Test Coverage Targets
- **Unit Tests**: 80% coverage for services and utils
- **Integration Tests**: All API endpoints tested
- **Critical Paths**: 100% coverage for authentication, requirements CRUD

### Test Patterns
- **Mocking**: Use service factory for dependency injection
- **Database**: Use mock service when `USE_MOCK_DB=true`
- **API Testing**: Supertest for HTTP endpoint testing
- **WebSocket Testing**: Socket.io-client for real-time features

## File Structure Conventions (Observed)

### Module Boundaries
```
/src
├── /controllers   # HTTP layer only, no business logic
├── /services      # Business logic, database queries
├── /models        # Data types, interfaces, schemas
├── /routes        # Route definitions, validation
├── /middleware    # Cross-cutting concerns
└── /utils         # Shared utilities
```

### Import Order
1. Node.js built-in modules
2. External dependencies
3. Internal modules (absolute paths)
4. Internal modules (relative paths)
5. Type imports

### Export Patterns
- **Named Exports**: Preferred for multiple exports
- **Default Exports**: For main class/function per file
- **Barrel Exports**: Index files for directory exports

## Common Patterns to Follow (Observed in Codebase)

### 1. Service Factory Pattern
```typescript
// Centralized service instantiation - used in index.ts
ServiceFactory.initialize(webSocketService);
const service = ServiceFactory.getRequirementsService();
```
# TODO: Verify this with team - Not consistently used in controllers

### 2. Error Handling Pattern
```typescript
// Custom errors with proper status codes
throw new NotFoundError('Requirement not found');
```

### 3. Async Handler Pattern
```typescript
// Wrap async controllers
export const getRequirement = asyncHandler(async (req, res) => {
  // Implementation
});
```

### 4. Response Pattern
```typescript
// Consistent response structure
res.json({
  success: true,
  data: result,
  message: 'Operation successful'
});
```

### 5. WebSocket Event Pattern
```typescript
// Room-based broadcasting
socket.to(`requirement:${id}`).emit('event', data);
```

### 6. Validation Pattern
```typescript
// Express-validator middleware chain
[
  body('title').notEmpty().trim(),
  body('priority').isIn(['low', 'medium', 'high']),
  validationHandler
]
```

## Anti-patterns to Avoid

### Observed Anti-patterns in Current Codebase

### 1. ⚠️ Excessive Use of 'any' Type
```typescript
// Found: 38+ instances of 'any' in services
// Bad: Defeats TypeScript's type safety
async createRequirement(data: any): Promise<any> { }

// Good: Use proper types
async createRequirement(data: CreateRequirementRequest): Promise<Requirement> { }
```
# TODO: Verify this with team - Migrate away from 'any' types

### 2. ⚠️ Inconsistent Export Patterns
```typescript
// Found: Mix of export class vs class with default export
export class RequirementsController { } // Some controllers
class LinksController { } // Others
export default linksController; // Inconsistent
```

### 3. ⚠️ Direct Mock Service in Controllers
```typescript
// Found: Controllers directly managing mock services
this.useMock = process.env['USE_MOCK_DB'] !== 'false';
this.requirementsService = this.useMock ? simpleMockService : new RequirementsService();
```
# TODO: Verify this with team - Should be handled by ServiceFactory

### 4. ⚠️ Console.log in Production Code
```typescript
// Found: 10+ console.log/error statements in services
console.log('[SlackService] Sending notification', {...});
```
# TODO: Verify this with team - Replace with proper logging service

### Previously Listed Anti-patterns to Continue Avoiding

### 1. ❌ Direct Database Access in Controllers
```typescript
// Bad: Controller accessing database
const result = await db.query('SELECT * FROM requirements');

// Good: Use service layer
const result = await requirementsService.getAll();
```

### 2. ❌ Business Logic in Routes
```typescript
// Bad: Logic in route file
router.post('/requirements', async (req, res) => {
  const id = generateId();
  // More logic...
});

// Good: Delegate to controller
router.post('/requirements', controller.createRequirement);
```

### 3. ❌ Callback Hell
```typescript
// Bad: Nested callbacks
getData((err, data) => {
  processData(data, (err, result) => {
    // More nesting
  });
});

// Good: Async/await
const data = await getData();
const result = await processData(data);
```

### 4. ❌ Unhandled Promise Rejections
```typescript
// Bad: No error handling
async function risky() {
  await someOperation();
}

// Good: Proper error handling
async function safe() {
  try {
    await someOperation();
  } catch (error) {
    // Handle error
  }
}
```

### 5. ❌ Hardcoded Configuration
```typescript
// Bad: Hardcoded values
const PORT = 3000;

// Good: Environment variables
const PORT = process.env.PORT || 3000;
```

### 6. ❌ Synchronous File Operations
```typescript
// Bad: Blocking I/O
const data = fs.readFileSync('file.txt');

// Good: Async operations
const data = await fs.promises.readFile('file.txt');
```

## Database Conventions

### Query Patterns
- **Parameterized Queries**: Always use to prevent SQL injection
- **Connection Pooling**: Reuse connections from pool
- **Transaction Management**: Use transactions for multi-step operations
- **Error Recovery**: Graceful handling of connection failures

### Migration Strategy
- **Versioned Migrations**: Sequential numbered files
- **Rollback Support**: Down migrations for all changes
- **Seed Data**: Separate seed scripts from migrations

## Security Best Practices

### Input Validation
- Validate all input at API boundaries
- Sanitize user-generated content
- Use parameterized database queries
- Implement rate limiting

### Authentication & Authorization
- JWT tokens for stateless auth
- API key management for service-to-service
- OAuth 2.0 for third-party integrations
- Role-based access control (RBAC)

### Data Protection
- Hash passwords with bcrypt
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement CORS properly

## Performance Guidelines

### Optimization Strategies
- **Caching**: Redis for frequently accessed data
- **Pagination**: Limit result sets
- **Indexing**: Database indexes on query fields
- **Connection Pooling**: Reuse database connections
- **Lazy Loading**: Load data on demand

### Monitoring
- Health check endpoints
- Performance metrics collection
- Error rate tracking
- Resource usage monitoring

## Git Workflow

### Branch Naming
- `feature/[ticket-id]-description`
- `bugfix/[ticket-id]-description`
- `hotfix/[ticket-id]-description`
- `release/[version]`

### Commit Messages
- Present tense, imperative mood
- First line: 50 chars max
- Reference ticket numbers
- Include "why" not just "what"

### Pull Request Guidelines
- Link to related issues
- Include test coverage
- Update documentation
- Request appropriate reviews

## Implementation Phases

### Phase 0: Initialization
- Project structure and Docker environment setup
- Database schema and migrations
- Base dependencies installation
- Health check endpoints

### Phase 1: Core Requirements Engine
- Requirements CRUD API (`/api/v1/requirements`)
- Unique ID generation system
- Version control and audit logging
- Data model implementation

### Phase 2: Traceability Engine
- Bidirectional requirement linking
- Suspect link detection and flagging
- Traceability matrix visualization
- Coverage gap analysis

### Phase 3: Real-time Collaboration
- WebSocket server (Socket.io)
- Commenting and threading system
- User presence tracking
- Live update propagation

### Phase 4: Quality & Validation
- NLP-based ambiguity detection
- Review and approval workflows
- Status transition enforcement
- Quality metrics dashboard

### Phase 5: External Integrations
- Jira issue export/import
- Slack notification channels
- OAuth authentication flow
- API rate limiting

## State Management
The system maintains its implementation state in:
- `/.conductor/state.json` - Current phase and completed milestones
- `/.conductor/progress.md` - Living implementation log
- `/.conductor/dashboard.md` - Real-time progress visualization
- `/.conductor/errors.log` - Error tracking and recovery
- `/.conductor/lessons.json` - Self-improvement tracking

## Testing Milestones
Each phase has specific exit criteria:
- **Phase 0**: `npm test:structure`, Docker health checks
- **Phase 1**: `npm test:api:requirements`, audit verification
- **Phase 2**: `npm test:traceability`, coverage checks
- **Phase 3**: `npm test:websocket`, load testing (20+ users)
- **Phase 4**: `npm test:quality`, workflow validation
- **Phase 5**: `npm test:integrations`, security checks

## Sub-Agent Architecture
Components are built by specialized agents working in parallel:
- **Agent-API**: REST endpoint implementation
- **Agent-Models**: Data model and schema design
- **Agent-Test**: Continuous testing and validation
- **Agent-Realtime**: WebSocket and live features
- **Agent-Quality**: NLP and validation logic
- **Agent-Integration**: External system connectors

## Commands
- `status` - Show current phase and progress
- `test` - Run current phase test suite
- `advance` - Move to next phase (if tests pass)
- `rollback` - Return to previous phase
- `deploy [agent]` - Trigger specific sub-agent
- `report` - Generate progress report

## Getting Started
1. Initialize the orchestrator: Check for `/.conductor/state.json`
2. Deploy Phase 0 agents to set up infrastructure
3. Run `docker-compose up -d` to start services
4. Execute `npm run migrate` for database setup
5. Monitor progress in `/.conductor/dashboard.md`
6. System auto-advances through phases as milestones complete