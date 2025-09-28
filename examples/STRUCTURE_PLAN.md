# Examples Directory Structure Plan

## Overview
This directory contains examples from the Project Conductor codebase, sanitized and organized for reference.

**Note on "Best" Examples**: These examples represent common patterns found in the codebase. However, some contain anti-patterns that should be addressed:
- Use of 'any' types (should be properly typed)
- Direct console.log statements (should use logging service)
- Inconsistent export patterns
# TODO: Verify this with team - Update examples as codebase improves

## Directory Structure

```
examples/
├── api/                     # Best API endpoint examples
│   ├── requirements-crud.example.ts    # RESTful CRUD pattern
│   ├── validation-chain.example.ts     # Request validation pattern
│   └── pagination-filter.example.ts    # Pagination & filtering pattern
├── services/                # Best service layer examples
│   ├── async-operations.example.ts     # Async/await service pattern
│   ├── error-handling.example.ts       # Service error handling
│   └── websocket-events.example.ts     # Real-time event broadcasting
├── tests/                   # Best test examples
│   ├── unit-test.example.ts           # Unit test with mocking
│   ├── integration-test.example.ts    # Integration test pattern
│   └── websocket-test.example.ts      # WebSocket testing pattern
├── database/                # Best database query examples
│   ├── parameterized-query.example.ts # SQL injection prevention
│   ├── transaction.example.ts         # Transaction management
│   └── versioning.example.ts          # Version history tracking
├── middleware/              # Middleware examples
│   ├── error-handler.example.ts       # Global error handling
│   └── validation.example.ts          # Input validation
└── utils/                   # Utility examples
    └── id-generator.example.ts         # Unique ID generation

```

## Selected Examples

### API Endpoint Examples (3 selected)
1. **requirements-crud.example.ts** - From `requirements.controller.ts`
   - Demonstrates complete CRUD pattern with validation
   - Shows proper error handling and response formatting
   - Includes pagination and filtering
   - **Issues**: Uses 'any' types, should be fully typed

2. **validation-chain.example.ts** - From `routes/requirements.routes.ts`
   - Shows express-validator middleware chains
   - Demonstrates validation composition
   - Includes rate limiting setup

3. **pagination-filter.example.ts** - From `requirements.controller.ts`
   - Shows query parameter parsing
   - Demonstrates pagination implementation
   - Includes advanced filtering patterns

### Service Layer Examples (3 selected)
1. **async-operations.example.ts** - From `requirements.service.ts`
   - Shows async/await patterns
   - Demonstrates database operations
   - Includes transaction handling

2. **error-handling.example.ts** - From `links.service.ts`
   - Shows custom error throwing
   - Demonstrates error propagation
   - Includes recovery patterns

3. **websocket-events.example.ts** - From `websocket.service.ts`
   - Shows Socket.io event broadcasting
   - Demonstrates room management
   - Includes real-time updates

### Test File Examples (3 available)
   **Note**: Limited test coverage in codebase - these are the only substantial tests found
1. **unit-test.example.ts** - From `tests/unit/id-generator.test.ts`
   - Shows Jest unit testing patterns
   - Demonstrates test organization
   - Includes assertion patterns

2. **integration-test.example.ts** - From `tests/integration/presence.test.ts`
   - Shows integration test setup
   - Demonstrates service testing
   - Includes state management

3. **websocket-test.example.ts** - From presence testing
   - Shows WebSocket testing patterns
   - Demonstrates event testing
   - Includes async testing

### Database Query/Model Examples (3 selected)
1. **parameterized-query.example.ts** - From `requirements.service.ts`
   - Shows parameterized queries for SQL injection prevention
   - Demonstrates query building
   - Includes result processing

2. **transaction.example.ts** - From `links.service.ts`
   - Shows transaction management
   - Demonstrates rollback handling
   - Includes multi-step operations

3. **versioning.example.ts** - From `requirements.service.ts`
   - Shows version history tracking
   - Demonstrates audit logging
   - Includes change tracking

## Key Patterns Demonstrated

### 1. Error Handling
- Custom error classes with HTTP status codes
- Async error propagation with asyncHandler
- Global error middleware

### 2. Request Validation
- Express-validator chains
- Custom validation rules
- Validation error formatting

### 3. Database Operations
- Connection pooling
- Parameterized queries
- Transaction management
- Version tracking

### 4. Real-time Features
- WebSocket event broadcasting
- Room-based communication
- Presence tracking

### 5. Testing Patterns
- Unit test organization
- Integration test setup
- Mock service usage
- Async test handling

### 6. API Design
- RESTful resource patterns
- Pagination and filtering
- Response formatting
- Rate limiting

## Usage Notes

Each example file includes:
- **PATTERN**: What the example demonstrates
- **USE WHEN**: Appropriate usage scenarios
- **KEY CONCEPTS**: Important implementation details
- Sanitized code with placeholders for business logic
- Comments explaining key decisions

## Implementation Status

### Completed
- [x] API endpoint examples identified
- [x] Service layer examples selected
- [x] Test file examples chosen
- [x] Database examples determined
- [x] Middleware examples picked
- [x] Utility examples selected

### To Be Created
- [ ] requirements-crud.example.ts
- [ ] validation-chain.example.ts
- [ ] pagination-filter.example.ts
- [ ] async-operations.example.ts
- [ ] error-handling.example.ts
- [ ] websocket-events.example.ts
- [ ] unit-test.example.ts
- [ ] integration-test.example.ts
- [ ] websocket-test.example.ts
- [ ] parameterized-query.example.ts
- [ ] transaction.example.ts
- [ ] versioning.example.ts
- [ ] error-handler.example.ts
- [ ] validation.example.ts
- [ ] id-generator.example.ts