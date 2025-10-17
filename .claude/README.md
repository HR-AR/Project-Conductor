# Claude Skills System

This directory contains the Self-Learning Skill System for Project Conductor.

## Directory Structure

```
.claude/
├── learning/
│   └── patterns.json          # Pattern tracking database (auto-generated)
├── skills/
│   ├── skill-generator/       # Meta-skill for creating skills
│   │   └── SKILL.md
│   └── auto-[intent]-[id]/   # Auto-generated skills
│       └── SKILL.md
└── scripts/
    └── skill_learner.py      # Pattern detection engine
```

## Quick Start

### 1. Track a Pattern Interactively

```bash
./skill-learner track
```

This will prompt you to describe what you're asking for and how you want it done.

### 2. Record a Pattern Programmatically

```bash
./skill-learner record \
  "Analyze BRD for market fit" \
  "1) Read exec summary 2) Check competitive landscape 3) Assess technical feasibility"
```

### 3. View Learned Skills

```bash
./skill-learner list
```

This shows all auto-generated skills and patterns being tracked.

## How It Works

1. **Pattern Detection**: After you explain a workflow 2+ times with similar instructions, the system detects a pattern
2. **Auto-Generation**: At threshold (default: 2 occurrences), a new skill is automatically created
3. **Auto-Invocation**: Future similar requests automatically trigger the learned skill
4. **Refinement**: Skills improve with each use and can be manually edited

## Example Workflow

### First Request
```
User: "Analyze this BRD. First read exec summary, check market fit, assess feasibility."
System: [Records pattern - 1/2 occurrences]
```

### Second Request
```
User: "Analyze the warehouse BRD using same approach."
System: [Detects pattern - 2/2 occurrences]
        ✅ Creates skill: auto-analysis-[id]
```

### Third Request
```
User: "Analyze the new mobile app BRD."
System: [Auto-invokes learned skill]
        No need to re-explain methodology!
```

## Skill Types

The system automatically detects these intents:

- **analysis**: Document/code analysis workflows
- **api_docs**: API documentation lookup (auto-enables web search)
- **reporting**: Status reports and summaries
- **search**: Finding files/code/information
- **comparison**: Comparing alternatives
- **validation**: Testing and verification
- **generation**: Creating new code/docs

## Configuration

Edit thresholds and behavior in `.claude/scripts/skill_learner.py`:

```python
self.threshold = 2  # Create skill after N similar requests
```

## Pattern Database

Patterns are stored in `.claude/learning/patterns.json`:

```json
{
  "patterns": [
    {
      "signature": "unique-hash",
      "intent": "analysis",
      "count": 2,
      "examples": [...],
      "skill_created": true
    }
  ],
  "skills_created": [...]
}
```

## Maintenance

### Clean Up Old Patterns

```bash
# View patterns
./skill-learner list

# Edit manually if needed
nano .claude/learning/patterns.json
```

### Delete a Skill

```bash
# Remove the skill directory
rm -rf .claude/skills/auto-analysis-[id]

# Optionally remove from patterns.json
nano .claude/learning/patterns.json
```

### Share Skills with Team

Add to `.gitignore` to keep learning private:
```
.claude/learning/
```

Or commit skills to share with team:
```bash
git add .claude/skills/
git commit -m "Add team skills for BRD analysis"
```

## Integration with Claude Code

The skill system is designed to work seamlessly with Claude Code:

1. Claude detects repetitive patterns in conversation
2. Automatically records patterns via `./skill-learner record`
3. Notifies you when skills are created
4. Auto-invokes skills on future requests

See [CLAUDE.md](../CLAUDE.md#self-learning-skill-system) for full documentation.

## Examples for Project Conductor

### BRD Analysis Skill
After explaining your BRD analysis process twice, the system creates a reusable skill:

```bash
# Triggers automatically on:
"Analyze this BRD"
"Evaluate the BRD document"
"Assess this business requirements doc"
```

### API Documentation Skill
After asking for API docs multiple times, auto-enables web search:

```bash
# Automatically searches current docs for:
"What's the latest Express.js middleware API?"
"Check Socket.io authentication documentation"
```

### Deployment Checklist Skill
After running deployments with similar steps:

```bash
# Auto-invokes comprehensive checklist for:
"Deploy to production"
"Push to staging environment"
```

## Troubleshooting

### Skill Not Creating

- Check pattern count: `./skill-learner list`
- Ensure instructions are similar enough (uses first 100 chars for matching)
- Verify threshold (default: 2 occurrences)

### Python Errors

- Ensure Python 3.6+ is installed: `python3 --version`
- Check script is executable: `chmod +x skill-learner`
- Verify script path in wrapper: `cat skill-learner`

### Skills Not Auto-Invoking

- Skills are created for future use (not retroactive)
- Claude must detect the trigger phrases from your request
- You can manually reference skills in conversation

## Advanced Usage

### Custom Skill Templates

Create manual skills in `.claude/skills/[name]/SKILL.md`:

```markdown
---
name: my-custom-skill
description: Description here
version: 1.0.0
allowed-tools: [web_search, bash_tool]
---

# My Custom Skill

[Your skill documentation]
```

### Skill Improvement

Edit any `SKILL.md` file to refine:
- Add more trigger phrases
- Update instructions
- Include validation steps
- Add examples

## Support

For issues or questions:
- See [CLAUDE.md](../CLAUDE.md) for full documentation
- Check pattern database: `.claude/learning/patterns.json`
- Review skill files: `.claude/skills/*/SKILL.md`

---

**Version**: 1.0.0
**Created**: 2025-10-17
**Project**: Project Conductor
