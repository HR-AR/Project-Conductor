# Project Conductor - Developer Guide

> Comprehensive development guide for contributors and maintainers

This guide covers architecture, development setup, coding standards, and best practices for developing Project Conductor.

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Adding Features](#adding-features)
6. [Testing](#testing)
7. [Code Standards](#code-standards)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Development Setup

### Prerequisites

- **Node.js**: >= 20.0.0 (LTS recommended)
- **npm**: >= 7.0.0
- **PostgreSQL**: 15+ (optional - mock mode available)
- **Redis**: 7+ (optional - in-memory fallback)
- **Docker**: 20.10+ (optional)
- **Git**: 2.30+

### Environment Setup

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/project-conductor.git
cd project-conductor
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

Create `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/conductor
USE_MOCK_DB=true  # Set to false for PostgreSQL

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Security
JWT_SECRET=your-secret-key-here-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Features
ENABLE_ORCHESTRATOR=false
ENABLE_CACHING=true

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

#### 4. Start Development Server

```bash
# Start with auto-reload
npm run dev

# Server starts on http://localhost:3000
```

#### 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","service":"project-conductor",...}
```

### Docker Setup (Optional)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### IDE Setup

#### Visual Studio Code

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "firsttris.vscode-jest-runner"
  ]
}
```

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Architecture Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Client Layer                        │
│  HTML/JavaScript + Socket.io Client                  │
└────────────────┬─────────────────────────────────────┘
                 │ HTTP/WebSocket
┌────────────────▼─────────────────────────────────────┐
│              Express.js Server                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ Middleware Stack                             │   │
│  │ • CORS, Helmet, Compression                  │   │
│  │ • Rate Limiting, Caching                     │   │
│  │ • Request Logging, Error Handling            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Routes Layer                                 │   │
│  │ • Requirements, Links, Traceability          │   │
│  │ • BRD, PRD, Engineering Design               │   │
│  │ • Conflicts, Change Log                      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Controllers Layer                            │   │
│  │ • Request validation                         │   │
│  │ • Response formatting                        │   │
│  │ • Error handling                             │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Services Layer (Business Logic)              │   │
│  │ • Requirements Service                       │   │
│  │ • Links Service                              │   │
│  │ • Traceability Service                       │   │
│  │ • WebSocket Service                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Service Factory (Dependency Injection)       │   │
│  └──────────────────────────────────────────────┘   │
└────────────────┬──────────────────┬──────────────────┘
                 │                  │
┌────────────────▼─────┐   ┌────────▼──────────┐
│   PostgreSQL         │   │      Redis        │
│   (Database)         │   │      (Cache)      │
└──────────────────────┘   └───────────────────┘
```

### Request Flow

#### HTTP Request Flow

```
Client Request
     ↓
CORS Middleware
     ↓
Security Headers (Helmet)
     ↓
Rate Limiting
     ↓
Request Logging
     ↓
Body Parsing
     ↓
Cache Check (GET requests)
     ↓
Route Handler
     ↓
Validation Middleware
     ↓
Controller Method
     ↓
Service Method
     ↓
Database Query
     ↓
Response Formatting
     ↓
Cache Update
     ↓
Client Response
```

#### WebSocket Event Flow

```
Client Event (emit)
     ↓
Socket.io Server
     ↓
Event Handler (index.ts)
     ↓
Presence Service / WebSocket Service
     ↓
Broadcast to Room
     ↓
Connected Clients (on)
```

### Data Flow

#### Create Requirement Flow

```
1. Client: POST /api/v1/requirements
2. Rate Limiter: Check limit
3. Validation: Validate request body
4. Controller: requirementsController.createRequirement()
5. Service: requirementsService.createRequirement()
6. Database: INSERT into requirements table
7. WebSocket: Broadcast "requirement:created" event
8. Cache: Invalidate relevant cache keys
9. Response: Return created requirement
```

### Module Architecture

Each module follows a consistent pattern:

```
Module (e.g., BRD)
├── Route (/routes/brd.routes.ts)
│   └── Defines HTTP endpoints
│
├── Controller (/controllers/brd.controller.ts)
│   └── Handles HTTP requests/responses
│
├── Service (/services/brd.service.ts)
│   └── Business logic and data access
│
├── Models (/models/brd.model.ts)
│   └── TypeScript interfaces and types
│
└── Validation (/middleware/validation.ts)
    └── Input validation rules
```

---

## Project Structure

### Directory Layout

```
project-conductor/
├── src/                          # Source code
│   ├── controllers/              # HTTP request handlers
│   │   ├── requirements.controller.ts
│   │   ├── brd.controller.ts
│   │   ├── prd.controller.ts
│   │   ├── engineering-design.controller.ts
│   │   ├── conflict.controller.ts
│   │   ├── change-log.controller.ts
│   │   ├── links.controller.ts
│   │   ├── traceability.controller.ts
│   │   ├── comments.controller.ts
│   │   ├── quality.controller.ts
│   │   ├── review.controller.ts
│   │   └── metrics.controller.ts
│   │
│   ├── services/                 # Business logic layer
│   │   ├── requirements.service.ts
│   │   ├── brd.service.ts
│   │   ├── prd.service.ts
│   │   ├── engineering-design.service.ts
│   │   ├── conflict.service.ts
│   │   ├── change-log.service.ts
│   │   ├── links.service.ts
│   │   ├── traceability.service.ts
│   │   ├── comments.service.ts
│   │   ├── quality.service.ts
│   │   ├── review.service.ts
│   │   ├── metrics.service.ts
│   │   ├── websocket.service.ts
│   │   ├── presence.service.ts
│   │   ├── simple-mock.service.ts
│   │   └── service-factory.ts
│   │
│   ├── models/                   # Data types and interfaces
│   │   ├── requirements.model.ts
│   │   ├── brd.model.ts
│   │   ├── prd.model.ts
│   │   ├── engineering-design.model.ts
│   │   ├── conflict.model.ts
│   │   ├── links.model.ts
│   │   ├── comments.model.ts
│   │   └── common.model.ts
│   │
│   ├── routes/                   # API route definitions
│   │   ├── requirements.routes.ts
│   │   ├── brd.routes.ts
│   │   ├── prd.routes.ts
│   │   ├── engineering-design.routes.ts
│   │   ├── conflict.routes.ts
│   │   ├── change-log.routes.ts
│   │   ├── links.routes.ts
│   │   ├── traceability.routes.ts
│   │   ├── comments.routes.ts
│   │   ├── quality.routes.ts
│   │   ├── review.routes.ts
│   │   └── metrics.routes.ts
│   │
│   ├── middleware/               # Express middleware
│   │   ├── error-handler.ts     # Error handling and CORS
│   │   ├── validation.ts        # Input validation
│   │   ├── performance.ts       # Performance monitoring
│   │   ├── cache.ts             # Caching middleware
│   │   └── rate-limiter.ts      # Rate limiting
│   │
│   ├── config/                   # Configuration
│   │   ├── database.ts          # Database config
│   │   └── redis.ts             # Redis config
│   │
│   ├── utils/                    # Utility functions
│   │   └── logger.ts            # Pino logger
│   │
│   └── index.ts                  # Application entry point
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
│
├── module-*.html                 # Frontend modules
│   ├── module-0-onboarding.html
│   ├── module-1-present.html
│   ├── module-2-brd.html
│   ├── module-3-prd-alignment.html
│   ├── module-4-engineering-design.html
│   ├── module-5-change-impact.html
│   └── module-6-implementation.html
│
├── conductor-unified-dashboard.html  # Main dashboard
├── test-dashboard.html           # API testing dashboard
│
├── dist/                         # Compiled JavaScript (generated)
├── coverage/                     # Test coverage (generated)
├── node_modules/                 # Dependencies
│
├── .env                          # Environment variables (create this)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── .eslintrc.js                  # ESLint configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest configuration
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Docker image
└── package.json                  # Dependencies and scripts
```

### Key Files

#### `src/index.ts`
- Application entry point
- Express server configuration
- Middleware setup
- Route registration
- WebSocket server initialization
- Database connection

#### `src/services/service-factory.ts`
- Centralized service instantiation
- Dependency injection
- Mock vs real service switching

#### `src/middleware/error-handler.ts`
- Global error handling
- CORS configuration
- Rate limiting setup
- Custom error classes

#### `src/config/database.ts`
- Database connection pool
- Query helpers
- Transaction management

---

## Development Workflow

### Adding a New Feature

#### Example: Adding a "Tags" Feature

1. **Create Model** (`src/models/tags.model.ts`)

```typescript
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}
```

2. **Create Service** (`src/services/tags.service.ts`)

```typescript
import { Tag, CreateTagRequest } from '../models/tags.model';

export class TagsService {
  async getAllTags(): Promise<Tag[]> {
    // Implementation
    return [];
  }

  async createTag(data: CreateTagRequest): Promise<Tag> {
    // Implementation
    return {
      id: 'TAG-001',
      name: data.name,
      color: data.color || '#000000',
      createdAt: new Date(),
    };
  }
}
```

3. **Create Controller** (`src/controllers/tags.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { TagsService } from '../services/tags.service';

export class TagsController {
  private tagsService: TagsService;

  constructor() {
    this.tagsService = new TagsService();
  }

  getTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const tags = await this.tagsService.getAllTags();
      res.json({
        success: true,
        data: tags,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tags',
      });
    }
  };

  createTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const tag = await this.tagsService.createTag(req.body);
      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create tag',
      });
    }
  };
}
```

4. **Add Validation** (`src/middleware/validation.ts`)

```typescript
import { body } from 'express-validator';

export const validateCreateTag = [
  body('name').notEmpty().trim().isLength({ min: 1, max: 50 }),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  validationHandler,
];
```

5. **Create Routes** (`src/routes/tags.routes.ts`)

```typescript
import { Router } from 'express';
import { TagsController } from '../controllers/tags.controller';
import { validateCreateTag } from '../middleware/validation';

const router = Router();
const tagsController = new TagsController();

router.get('/', tagsController.getTags);
router.post('/', validateCreateTag, tagsController.createTag);

export default router;
```

6. **Register Routes** (`src/index.ts`)

```typescript
import tagsRoutes from './routes/tags.routes';

// ... other imports

app.use('/api/v1/tags', tagsRoutes);
```

7. **Write Tests** (`tests/integration/tags.test.ts`)

```typescript
import request from 'supertest';
import app from '../../src/index';

describe('Tags API', () => {
  describe('POST /api/v1/tags', () => {
    it('should create a new tag', async () => {
      const response = await request(app)
        .post('/api/v1/tags')
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});
```

8. **Update Documentation**
- Add to API_DOCUMENTATION.md
- Update README.md if user-facing
- Add JSDoc comments

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-tags-feature

# Make changes and commit
git add .
git commit -m "Add tags feature with CRUD operations"

# Push to remote
git push origin feature/add-tags-feature

# Create pull request on GitHub
```

### Code Review Checklist

Before submitting PR:

- [ ] Code follows TypeScript standards
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] WebSocket events added (if needed)

---

## Testing

See [TESTING.md](./TESTING.md) for comprehensive testing guide.

### Quick Testing Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tags.test.ts

# Watch mode
npm run test:watch

# Integration tests only
npm test tests/integration
```

---

## Code Standards

### TypeScript Standards

#### Strict Mode

All strict TypeScript flags enabled in `tsconfig.json`:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

#### Type Usage

✅ **Good**:
```typescript
interface User {
  id: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // Implementation
}
```

❌ **Bad**:
```typescript
function getUser(id: any): Promise<any> {
  // Avoid 'any' type
}
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `requirements.service.ts`)
- **Classes**: `PascalCase` (e.g., `RequirementsService`)
- **Functions**: `camelCase` (e.g., `getRequirementById`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_PAGE_SIZE`)
- **Interfaces**: `PascalCase`, no 'I' prefix (e.g., `Requirement`)

### Async Patterns

✅ **Prefer async/await**:
```typescript
async function fetchData(): Promise<Data> {
  const result = await database.query('SELECT * FROM table');
  return result;
}
```

❌ **Avoid callbacks**:
```typescript
function fetchData(callback: (data: Data) => void) {
  database.query('SELECT * FROM table', (result) => {
    callback(result);
  });
}
```

### Error Handling

✅ **Use try-catch**:
```typescript
async function riskyOperation(): Promise<void> {
  try {
    await someAsyncOperation();
  } catch (error) {
    logger.error({ error }, 'Operation failed');
    throw new ServiceError('Operation failed');
  }
}
```

### Logging

Use Pino logger, not console.log:

```typescript
import logger from './utils/logger';

// Good
logger.info({ userId: '123' }, 'User logged in');
logger.error({ error }, 'Database query failed');

// Bad
console.log('User logged in');
```

### Comments and Documentation

Add JSDoc for public APIs:

```typescript
/**
 * Retrieves a requirement by its unique identifier
 *
 * @param id - The unique requirement ID
 * @returns Promise resolving to the requirement
 * @throws {NotFoundError} If requirement doesn't exist
 */
async getRequirementById(id: string): Promise<Requirement> {
  // Implementation
}
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Build for Production

```bash
# Build TypeScript
npm run build

# Output in ./dist directory
```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL/TLS certificates installed
- [ ] CORS origins configured
- [ ] Rate limits appropriate
- [ ] Logging configured
- [ ] Health checks enabled
- [ ] Error tracking setup

---

## Troubleshooting

### Common Development Issues

#### TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf dist
npm run build

# Check for type errors
npm run typecheck
```

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues

1. Check PostgreSQL is running:
   ```bash
   # Mac
   brew services list

   # Linux
   sudo systemctl status postgresql
   ```

2. Verify connection string in `.env`

3. Use mock mode:
   ```env
   USE_MOCK_DB=true
   ```

#### WebSocket Connection Issues

1. Check browser console for errors
2. Verify Socket.io client version matches server
3. Check CORS configuration
4. Test with: `http://localhost:3000/health`

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

View detailed logs:

```bash
npm run dev

# Logs will show:
# [DEBUG] WebSocket connection established
# [DEBUG] Cache hit for key: api:requirements:page:1
```

---

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [User Guide](./USER_GUIDE.md)
- [Testing Guide](./TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [CLAUDE.md](./CLAUDE.md) - Development guidelines

---

**Last Updated**: October 2025
**Version**: 1.0.0
