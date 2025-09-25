# Project Conductor

## Overview
Project Conductor is a self-orchestrating requirements management and traceability system with real-time collaboration capabilities. It manages complex multi-step processes through an autonomous phase-gated implementation approach.

## Project Context
A comprehensive requirements engineering platform that provides:
- Requirements lifecycle management with full traceability
- Real-time collaborative editing and review workflows
- Quality validation and ambiguity detection
- Integration with external tools (Jira, Slack)
- Automated testing and milestone-based progression

## Key Features
### Core Capabilities
- **Requirements Management**: CRUD operations with versioning and unique ID generation
- **Traceability Engine**: Bidirectional linking, suspect flagging, and coverage analysis
- **Real-time Collaboration**: WebSocket-based live updates, comments, and user presence
- **Quality Assurance**: NLP-based ambiguity detection and review workflows
- **External Integrations**: Jira export, Slack notifications, OAuth authentication

### Implementation Features
- Self-orchestrating development with phase-gated milestones
- Parallel sub-agent deployment for component development
- Automated testing and progression between phases
- State tracking in `/.conductor/state.json`
- Progress visualization in `/.conductor/dashboard.md`

## Technical Stack
- **Language**: TypeScript/Node.js
- **Framework**: Express.js with Socket.io for real-time features
- **Database**: PostgreSQL (primary), Redis (caching/sessions)
- **Container**: Docker and Docker Compose
- **Testing**: Jest for unit tests, integration test suite
- **Authentication**: OAuth 2.0 and API key management
- **Documentation**: OpenAPI/Swagger

## Development Guidelines
- Follow clean code principles
- Write comprehensive tests for all features
- Document all public APIs and complex logic
- Use semantic versioning for releases
- Maintain backwards compatibility where possible

## Testing Strategy
- Unit tests for all core functionality
- Integration tests for workflow execution
- End-to-end tests for critical paths
- Performance testing for scalability

## Architecture Notes
The system should be designed with:
- Modularity and extensibility in mind
- Clear separation of concerns
- Scalability considerations
- Robust error handling
- Comprehensive logging

## Important Conventions
- Use consistent naming conventions throughout
- Follow the established project structure
- Commit messages should be clear and descriptive
- Pull requests should include proper documentation

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