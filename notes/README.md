# Research Notes

This directory contains quick research notes and patterns discovered during development. Notes can be promoted to example stub files when ready for implementation.

## Areas

Notes are organized by area:
- **api** - API endpoint patterns and best practices
- **components** - UI component patterns (if applicable)
- **database** - Query patterns, schema designs, optimizations
- **middleware** - Cross-cutting concerns and middleware patterns
- **services** - Business logic patterns and service designs
- **tests** - Testing strategies and patterns
- **utils** - Utility functions and helpers
- **general** - Miscellaneous notes

## Workflow

### 1. Capture Quick Notes
```bash
# Add a note about a pattern you discovered
npm run note add -- --area api --title "Rate Limiting Pattern" --content "Use sliding window with Redis"

# Or use the note command directly
npm run note -- add --area database --title "Soft Delete Pattern" --content "Add deleted_at column instead of removing rows"
```

### 2. Review Notes
```bash
# List all notes in an area
npm run note list -- --area api

# Search across all notes
npm run note search -- --query "pagination"
```

### 3. Promote to Example
When a pattern is ready for implementation:
```bash
# Promote to default location
npm run note promote -- --area api --title "Rate Limiting Pattern"
# Creates: examples/api/rate-limiting-pattern.example.ts

# Or specify custom path
npm run note promote -- --area api --title "Rate Limiting Pattern" --to examples/api/custom-name.ts
```

### 4. Implement the Stub
After promoting, edit the generated stub file:
1. Replace TODO sections with actual implementation
2. Add proper TypeScript types
3. Add unit tests
4. Update `examples/STRUCTURE_PLAN.md`

## Note Structure

Each note contains:
- **Date** - When the note was created
- **Status** - Research Note → Stub → Implemented
- **When to use** - Appropriate use cases
- **Key concepts** - Core ideas and principles
- **Why important** - Business/technical value
- **Code Example** - Implementation snippet (added when promoting)
- **Next Actions** - Checklist for implementation
- **References** - Documentation links

## Benefits

1. **Quick Capture** - Don't lose insights during development
2. **Pattern Discovery** - Build a library of reusable patterns
3. **Knowledge Sharing** - Team members can search and learn
4. **Progressive Enhancement** - Notes → Stubs → Full Examples
5. **Traceability** - Track where patterns originated

## Tips

- **Be Specific** - Include concrete examples in notes
- **Add Context** - Note why the pattern is useful
- **Link Resources** - Include documentation URLs
- **Update Status** - Mark notes as implemented
- **Regular Review** - Periodically review and promote notes

## Integration with PRPs

Notes can inform PRP creation:
1. Research patterns in notes
2. Reference promoted stubs in PRPs
3. Use notes for "Research To-Dos" in INITIAL.md

## Example Note Entry

```markdown
### Optimistic Locking Pattern
**Date:** 2024-01-15
**Status:** 📝 Research Note

**When to use:**
- Concurrent updates to same resource
- Prevent lost updates
- Better than pessimistic locking for read-heavy workloads

**Key concepts:**
- Version column in database
- Check version on update
- Retry on conflict

**Why important:**
- Prevents data corruption
- Better performance than locks
- User-friendly conflict resolution

**Next Actions:**
- [ ] Add to requirements.service.ts
- [ ] Create example with retry logic
- [ ] Add integration tests
```

## Maintenance

- Archive old/implemented notes periodically
- Keep notes concise and actionable
- Update promoted stubs with implementation
- Link implemented examples back to original notes