# Project Conductor - Testing Guide

> Comprehensive testing strategies and guidelines

This guide covers all aspects of testing Project Conductor, from unit tests to end-to-end integration testing.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [Manual Testing](#manual-testing)
7. [Performance Testing](#performance-testing)
8. [Best Practices](#best-practices)

---

## Testing Philosophy

### Testing Pyramid

```
        /\
       /E2E\         ← Few (End-to-End)
      /------\
     /  Intg  \      ← Some (Integration)
    /----------\
   /    Unit    \    ← Many (Unit Tests)
  /--------------\
```

- **Unit Tests**: Test individual functions and classes in isolation (80% of tests)
- **Integration Tests**: Test API endpoints and database interactions (15% of tests)
- **E2E Tests**: Test complete workflows across multiple modules (5% of tests)

### Coverage Goals

| Layer | Target Coverage | Priority |
|-------|----------------|----------|
| Services | 80%+ | High |
| Controllers | 70%+ | High |
| Utilities | 90%+ | High |
| Models | N/A (Types only) | - |
| Routes | 60%+ | Medium |

---

## Test Structure

### Directory Layout

```
tests/
├── unit/                       # Unit tests
│   ├── services/
│   │   ├── requirements.service.test.ts
│   │   ├── links.service.test.ts
│   │   └── traceability.service.test.ts
│   └── utils/
│       └── logger.test.ts
│
├── integration/                # Integration tests
│   ├── requirements.test.ts   # Requirements API tests
│   ├── links.test.ts          # Links API tests
│   ├── brd.test.ts            # BRD API tests
│   ├── prd.test.ts            # PRD API tests
│   ├── presence.test.ts       # Presence tracking tests
│   └── websocket.test.ts      # WebSocket tests
│
└── e2e/                        # End-to-end tests
    ├── workflow.test.ts       # Complete workflow tests
    └── collaboration.test.ts  # Real-time collaboration tests
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- requirements.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create requirement"
```

### Test Suites

```bash
# Unit tests only
npm test tests/unit

# Integration tests only
npm test tests/integration

# E2E tests only
npm test tests/e2e

# Specific service tests
npm test tests/unit/services/requirements.service.test.ts

# Presence tests
npm run test:presence
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Coverage summary in terminal
npm test -- --coverage --coverageReporters=text
```

---

## Writing Tests

### Unit Tests

#### Service Test Example

```typescript
// tests/unit/services/requirements.service.test.ts

import { RequirementsService } from '../../../src/services/requirements.service';

describe('RequirementsService', () => {
  let service: RequirementsService;

  beforeEach(() => {
    service = new RequirementsService();
  });

  describe('createRequirement', () => {
    it('should create a new requirement with valid data', async () => {
      const data = {
        title: 'Test Requirement',
        description: 'Test Description',
        priority: 'high' as const,
        type: 'functional' as const,
      };

      const result = await service.createRequirement(data);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(data.title);
      expect(result.status).toBe('draft');
      expect(result.version).toBe(1);
    });

    it('should throw error with invalid data', async () => {
      const invalidData = {
        title: '',  // Invalid: empty title
        description: 'Test',
        priority: 'high' as const,
        type: 'functional' as const,
      };

      await expect(
        service.createRequirement(invalidData)
      ).rejects.toThrow();
    });
  });

  describe('getRequirementById', () => {
    it('should return requirement when it exists', async () => {
      // First create a requirement
      const created = await service.createRequirement({
        title: 'Test',
        description: 'Test',
        priority: 'medium' as const,
        type: 'functional' as const,
      });

      // Then retrieve it
      const retrieved = await service.getRequirementById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null when requirement does not exist', async () => {
      const result = await service.getRequirementById('NON_EXISTENT_ID');

      expect(result).toBeNull();
    });
  });
});
```

### Integration Tests

#### API Test Example

```typescript
// tests/integration/requirements.test.ts

import request from 'supertest';
import app from '../../src/index';

describe('Requirements API', () => {
  describe('POST /api/v1/requirements', () => {
    it('should create a new requirement', async () => {
      const response = await request(app)
        .post('/api/v1/requirements')
        .send({
          title: 'New Requirement',
          description: 'Test requirement',
          priority: 'high',
          type: 'functional',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('New Requirement');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/requirements')
        .send({
          title: '',  // Invalid: empty title
          description: 'Test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should enforce rate limiting', async () => {
      // Make 21 requests (limit is 20 for write operations)
      const requests = Array(21).fill(null).map(() =>
        request(app)
          .post('/api/v1/requirements')
          .send({
            title: 'Test',
            description: 'Test',
            priority: 'medium',
            type: 'functional',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/requirements', () => {
    it('should return paginated requirements', async () => {
      const response = await request(app)
        .get('/api/v1/requirements')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('requirements');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/requirements')
        .query({ status: 'approved' })
        .expect(200);

      const requirements = response.body.data.requirements;
      requirements.forEach((req: any) => {
        expect(req.status).toBe('approved');
      });
    });

    it('should sort by priority', async () => {
      const response = await request(app)
        .get('/api/v1/requirements')
        .query({ sortBy: 'priority', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/v1/requirements/:id', () => {
    it('should update an existing requirement', async () => {
      // First create a requirement
      const createResponse = await request(app)
        .post('/api/v1/requirements')
        .send({
          title: 'Original Title',
          description: 'Original Description',
          priority: 'medium',
          type: 'functional',
        });

      const requirementId = createResponse.body.data.id;

      // Then update it
      const updateResponse = await request(app)
        .put(`/api/v1/requirements/${requirementId}`)
        .send({
          title: 'Updated Title',
          priority: 'high',
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Updated Title');
      expect(updateResponse.body.data.priority).toBe('high');
      expect(updateResponse.body.data.version).toBe(2);
    });
  });
});
```

### WebSocket Tests

```typescript
// tests/integration/websocket.test.ts

import { io as ioClient, Socket } from 'socket.io-client';

describe('WebSocket Events', () => {
  let clientSocket: Socket;
  const PORT = process.env.PORT || 3000;

  beforeEach((done) => {
    clientSocket = ioClient(`http://localhost:${PORT}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    clientSocket.close();
  });

  it('should initialize user presence', (done) => {
    clientSocket.emit('user:initialize', {
      userId: 'test-user-1',
      username: 'Test User',
    });

    clientSocket.on('presence:initialized', (data) => {
      expect(data.userId).toBe('test-user-1');
      expect(data.username).toBe('Test User');
      expect(data.status).toBe('online');
      done();
    });
  });

  it('should join requirement room', (done) => {
    clientSocket.emit('join-requirement', {
      requirementId: 'REQ-001',
      userId: 'test-user-1',
      username: 'Test User',
    });

    clientSocket.on('presence:list', (users) => {
      expect(Array.isArray(users)).toBe(true);
      done();
    });
  });

  it('should broadcast editing status', (done) => {
    const client2 = ioClient(`http://localhost:${PORT}`);

    // Both clients join same requirement
    clientSocket.emit('join-requirement', {
      requirementId: 'REQ-001',
      userId: 'user-1',
      username: 'User 1',
    });

    client2.emit('join-requirement', {
      requirementId: 'REQ-001',
      userId: 'user-2',
      username: 'User 2',
    });

    // Client2 listens for editing start
    client2.on('presence:editing-start', (data) => {
      expect(data.user.userId).toBe('user-1');
      expect(data.requirementId).toBe('REQ-001');
      client2.close();
      done();
    });

    // Client1 starts editing
    setTimeout(() => {
      clientSocket.emit('editing:start', {
        userId: 'user-1',
        requirementId: 'REQ-001',
      });
    }, 100);
  });
});
```

### E2E Workflow Tests

```typescript
// tests/e2e/workflow.test.ts

import request from 'supertest';
import app from '../../src/index';

describe('Complete BRD to Implementation Workflow', () => {
  it('should complete full workflow from BRD to implementation', async () => {
    // Step 1: Create BRD
    const brdResponse = await request(app)
      .post('/api/v1/brd')
      .send({
        title: 'E-commerce Platform',
        businessObjective: 'Increase online sales by 50%',
        targetAudience: 'Online shoppers',
        successCriteria: ['50% sales increase', '30% cart abandonment reduction'],
      })
      .expect(201);

    const brdId = brdResponse.body.data.id;

    // Step 2: Approve BRD
    await request(app)
      .post(`/api/v1/brd/${brdId}/approve`)
      .send({
        approverId: 'user123',
        approved: true,
        comments: 'Approved for PRD generation',
      })
      .expect(200);

    // Step 3: Generate PRD from BRD
    const prdResponse = await request(app)
      .post(`/api/v1/prd/generate/${brdId}`)
      .expect(201);

    const prdId = prdResponse.body.data.id;
    expect(prdResponse.body.data.brdId).toBe(brdId);

    // Step 4: Add features to PRD
    await request(app)
      .post(`/api/v1/prd/${prdId}/features`)
      .send({
        name: 'Shopping Cart',
        description: 'Add/remove items functionality',
        priority: 'high',
      })
      .expect(201);

    // Step 5: Stakeholder alignment
    await request(app)
      .post(`/api/v1/prd/${prdId}/align`)
      .send({
        stakeholderId: 'user456',
        aligned: true,
        comments: 'Looks good',
      })
      .expect(200);

    // Step 6: Lock PRD for engineering
    await request(app)
      .post(`/api/v1/prd/${prdId}/lock`)
      .expect(200);

    // Step 7: Create engineering design
    const designResponse = await request(app)
      .post('/api/v1/engineering-design')
      .send({
        prdId: prdId,
        title: 'Shopping Cart API Design',
        architecture: 'RESTful API with PostgreSQL',
        apiEndpoints: [
          { method: 'POST', path: '/api/v1/cart/items', description: 'Add item' },
          { method: 'GET', path: '/api/v1/cart', description: 'Get cart' },
        ],
      })
      .expect(201);

    // Step 8: Verify traceability
    const traceabilityResponse = await request(app)
      .get(`/api/v1/traceability/path/${brdId}/${designResponse.body.data.id}`)
      .expect(200);

    expect(traceabilityResponse.body.data.path.length).toBeGreaterThan(0);
  });
});
```

---

## Test Coverage

### Generating Coverage Reports

```bash
# Run tests with coverage
npm run test:coverage

# Coverage files generated in ./coverage/
# - lcov-report/index.html  (HTML report)
# - lcov.info              (LCOV format)
# - coverage-final.json    (JSON format)
```

### Coverage Thresholds

Configure in `jest.config.js`:

```javascript
module.exports = {
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
};
```

### Viewing Coverage

```bash
# Open HTML coverage report
open coverage/lcov-report/index.html

# Terminal coverage summary
npm test -- --coverage --coverageReporters=text
```

---

## Manual Testing

### Using Test Dashboard

1. Start server: `npm run dev`
2. Navigate to: `http://localhost:3000/demo/test-dashboard.html`
3. Test all API endpoints interactively

### Manual Test Scenarios

#### Scenario 1: Create and Link Requirements

1. Create BRD requirement
2. Create PRD requirement
3. Link PRD to BRD
4. Verify link in traceability matrix

#### Scenario 2: Real-time Collaboration

1. Open requirement in two browser windows
2. Edit in first window
3. Verify live updates in second window
4. Add comment in second window
5. Verify comment appears in first window

#### Scenario 3: Conflict Resolution

1. Create conflicting requirements
2. System detects conflict
3. Cast votes for resolution options
4. Resolve conflict
5. Verify resolution recorded

---

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'Get Requirements'
    flow:
      - get:
          url: '/api/v1/requirements'
```

Run test:
```bash
npm install -g artillery
artillery run artillery-config.yml
```

### Response Time Benchmarks

```bash
# Test API response time
time curl http://localhost:3000/api/v1/requirements

# Expected: < 100ms (cached), < 500ms (uncached)
```

---

## Best Practices

### Do's

✅ **Test behavior, not implementation**
```typescript
// Good: Test what it does
expect(result.status).toBe('approved');

// Bad: Test how it does it
expect(service.database.query).toHaveBeenCalled();
```

✅ **Use descriptive test names**
```typescript
// Good
it('should return 404 when requirement does not exist', ...)

// Bad
it('test1', ...)
```

✅ **Arrange, Act, Assert pattern**
```typescript
it('should create requirement', async () => {
  // Arrange
  const data = { title: 'Test', ... };

  // Act
  const result = await service.createRequirement(data);

  // Assert
  expect(result).toHaveProperty('id');
});
```

✅ **Test edge cases**
```typescript
it('should handle empty string title', ...)
it('should handle extremely long descriptions', ...)
it('should handle special characters in input', ...)
```

### Don'ts

❌ **Don't test external libraries**
```typescript
// Bad: Testing Express.js
it('should call next() on middleware', ...)
```

❌ **Don't share state between tests**
```typescript
// Bad: Tests depend on execution order
let sharedData;
it('test1', () => { sharedData = 'value'; });
it('test2', () => { expect(sharedData).toBe('value'); });
```

❌ **Don't use real external services**
```typescript
// Bad: Calling real Slack API in tests
await slackService.sendNotification(...);

// Good: Mock external services
jest.mock('../services/slack.service');
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

---

## Troubleshooting

### Tests Failing Locally

1. Clear Jest cache: `npm test -- --clearCache`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node version: `node --version` (should be >= 20)

### Tests Pass Locally But Fail in CI

1. Check environment variables
2. Verify Node.js version matches
3. Check for timezone differences
4. Review CI logs for specific errors

---

**Last Updated**: October 2025
**Version**: 2.0.0
