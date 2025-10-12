# Orchestrator Quick Start Guide

## TL;DR

```bash
# Enable orchestrator
ENABLE_ORCHESTRATOR=true npm run dev

# Check status
npm run conductor:status

# View dashboard
npm run conductor:dashboard

# Generate report
npm run conductor:report
```

## What is it?

The Orchestrator is an **autonomous agent system** that:
- Coordinates 6 specialized agents to build features
- Automatically progresses through 6 phases
- Tracks milestones and validates completion
- Generates real-time progress dashboards
- Learns from execution (self-improvement)

## Quick Commands

| Command | What it does |
|---------|-------------|
| `npm run conductor:status` | Show current phase and progress |
| `npm run conductor:test` | Run tests for current phase |
| `npm run conductor:advance` | Move to next phase |
| `npm run conductor:rollback` | Go back to previous phase |
| `npm run conductor:deploy agent-api` | Trigger specific agent |
| `npm run conductor:report` | Full status report |
| `npm run conductor:dashboard` | Show dashboard |

## The 6 Agents

1. **Agent Models** - Designs data structures
2. **Agent API** - Generates REST endpoints
3. **Agent Test** - Creates and runs tests
4. **Agent Realtime** - WebSocket features
5. **Agent Quality** - NLP validation
6. **Agent Integration** - External systems (Jira/Slack)

## The 6 Phases

| Phase | Name | What gets built |
|-------|------|-----------------|
| 0 | Initialization | Docker, database, health checks |
| 1 | Requirements Engine | CRUD API, audit logs, versioning |
| 2 | Traceability | Links, suspect detection, matrix |
| 3 | Real-time | WebSocket, presence, comments |
| 4 | Quality | NLP, reviews, workflows |
| 5 | Integrations | OAuth, Jira, Slack |

## State Files

All state in `.conductor/` directory:
- `state.json` - Current orchestrator state
- `progress.md` - Timeline of progress
- `dashboard.md` - Visual dashboard
- `errors.log` - Error tracking
- `lessons.json` - Self-improvement data

## API Endpoints

```bash
# Start orchestrator
POST /api/v1/orchestrator/start

# Check status
GET /api/v1/orchestrator/status

# Advance phase
POST /api/v1/orchestrator/advance

# Deploy agent
POST /api/v1/orchestrator/deploy/agent-api

# Get dashboard data
GET /api/v1/orchestrator/dashboard
```

## How It Works

```
1. Orchestrator starts → Loads state from .conductor/
2. Every 5 seconds → Checks for pending tasks
3. Assigns tasks → To available agents based on dependencies
4. Agents execute → Create files, run tests, validate
5. Tasks complete → Milestones validated
6. Phase complete → Automatically advance to next phase
7. Repeat → Until all 6 phases done
```

## Example Workflow

```bash
# 1. Start server with orchestrator
ENABLE_ORCHESTRATOR=true npm run dev

# 2. In another terminal, watch status
watch -n 5 npm run conductor:status

# 3. Check dashboard periodically
npm run conductor:dashboard

# 4. View generated files
ls -la .conductor/

# 5. Read progress log
cat .conductor/progress.md

# 6. Check for errors
cat .conductor/errors.log
```

## Troubleshooting

**Orchestrator won't start?**
```bash
# Check .conductor directory exists
mkdir -p .conductor

# Check state file
cat .conductor/state.json
```

**Phase won't advance?**
```bash
# Check milestone status
npm run conductor:status

# Run phase tests
npm run conductor:test
```

**Need to rollback?**
```bash
npm run conductor:rollback
```

## Demo Script

```bash
# Run the demo
npx ts-node examples/orchestrator-demo.ts
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENABLE_ORCHESTRATOR` | `false` | Enable autonomous orchestration |
| `AUTO_ADVANCE` | `true` | Auto-advance through phases |
| `ORCHESTRATION_INTERVAL` | `5000` | Loop interval (ms) |

## Key Features

- ✅ Fully autonomous
- ✅ Self-healing
- ✅ Progress tracking
- ✅ Error recovery
- ✅ Self-improvement
- ✅ CLI + API control
- ✅ Real-time dashboard
- ✅ Comprehensive logging

## For More Info

- `ORCHESTRATION_ARCHITECTURE.md` - Full technical docs
- `ORCHESTRATION_SUMMARY.md` - Implementation summary
- `CLAUDE.md` - Project guidelines

---

**Need help?** Check the dashboard or generate a report to see current state.
