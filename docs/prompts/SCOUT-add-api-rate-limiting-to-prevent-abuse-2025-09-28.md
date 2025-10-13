You are my Context Engineering Scout, helping me research implementation patterns for our project.

Here is the feature intent (from PRP/PRD):
────────────────────────────────────────────────────────────
Feature: Add API rate limiting to prevent abuse

Why/Context:
We need to implement rate limiting middleware to protect our API endpoints from abuse and ensure fair resource allocation across all clients.

**Business Value:**
- Prevent DoS attacks on public endpoints that could impact service availability
- Ensure fair resource usage across clients preventing any single user from monopolizing resources
- Reduce infrastructure costs by preventing unnecessary load
- Improve overall API reliability and user experience

**Technical Requirements:**
- Implement per-IP and per-user rate limiting
- Support different limits for different endpoint types
- Provide clear rate limit headers in responses
- Enable Redis-based distributed rate limiting for scalability

Planned Approach:
### Phase 1: Core Rate Limiting Middleware
1. Create `src/middleware/rate-limiter.ts`:
   - Implement sliding window algorithm
   - Support both Redis and in-memory stores
   - Configure per-route limits

2. Define rate limit strategies:
   - Public endpoints: 100 requests per 15 minutes
   - Authenticated endpoints: 1000 requests per 15 minutes
   - Write operations: 20 requests per 15 minutes
   - Health check: No limit

### Phase 2: Redis Integration
3. Update Redis configuration:
   - Add rate limit key namespace
   - Implement sliding window with Redis sorted sets
   - Add connection pooling for performance

4. Create fallback mechanism:
   - Graceful degradation to in-memory when Redis unavailable
   - Log Redis connection issues
   - Maintain rate limiting even during Redis outages


Existing patterns to follow:
- examples/api/validation-chain.example.ts (middleware composition)
- examples/middleware/error-handler.example.ts (error handling)
- examples/api/requirements-crud.example.ts (existing rate limit setup)
────────────────────────────────────────────────────────────

Our tech stack (from CLAUDE.md):
────────────────────────────────────────────────────────────
### Core Technologies (Verified from package.json and package-lock.json)
- **Runtime**: Node.js (>=20.0.0)
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
────────────────────────────────────────────────────────────

Our coding conventions:
────────────────────────────────────────────────────────────
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
- **Service Layer**: Business logic in `/services` with clear separation 
────────────────────────────────────────────────────────────

Tasks for you:

1) **Identify Design Patterns**
   - Find 3-5 common patterns for this type of feature in our stack
   - Focus on production-ready, battle-tested approaches

2) **Source Public Examples**
   - Find real implementations from docs, blogs, or open-source repos
   - Prioritize examples using our exact stack (### Core Technologies (Verified from package.json and package-lock.json))
   - Include URLs for verification

3) **For Each Pattern Provide:**
   - PATTERN: Descriptive name
   - USE WHEN: Specific scenarios where this applies
   - KEY CONCEPTS: Core principles (bulleted list)
   - TRADE-OFFS: Pros and cons
   - Minimal stub code that compiles (TypeScript preferred)

4) **Anti-patterns to Avoid**
   - Common mistakes with this feature type
   - Security pitfalls
   - Performance gotchas
   - Include brief rationale for each

5) **Testing & Security Considerations**
   - Unit test scenarios
   - Integration test cases
   - Security checks needed
   - Privacy/GDPR considerations if applicable

**Deliverable Format:**

Each pattern as a markdown section:

```typescript
/**
 * PATTERN: [Pattern Name]
 * USE WHEN: [Specific scenarios]
 * KEY CONCEPTS: [Bullet points]
 * TRADE-OFFS: [Pros and cons]
 */

// Minimal, sanitized TypeScript stub
export interface AddAPIratelimitingtopreventabuseOptions {
  // Configuration interface
}

export class AddAPIratelimitingtopreventabusePattern {
  // Skeleton implementation
  async execute(options: AddAPIratelimitingtopreventabuseOptions): Promise<void> {
    // TODO: Implementation
  }
}

// Source: [URL to documentation or example]
```

**Important Guidelines:**
- Use TypeScript with strict typing (no 'any' types)
- Follow our existing patterns from examples/ directory
- Include error handling patterns
- Consider our existing architecture
- Provide actionable, copy-paste ready stubs
- Each stub should be < 50 lines
- No proprietary code, no real credentials
- Include commented TODOs where implementation is needed

Ready to research and provide patterns!