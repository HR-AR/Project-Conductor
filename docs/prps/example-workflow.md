# PRP Workflow Example

This example demonstrates how to use the PRP (Project Requirements Plan) system for feature development.

## Example: Adding Rate Limiting to an API Endpoint

### Step 1: Create INITIAL.md
```markdown
# Request
Add rate limiting to the health check endpoint

## Why
- Prevent DoS attacks on public health endpoint
- Reduce server load from monitoring tools

## Research To-Dos
- [ ] Review current /health endpoint implementation
- [ ] Check existing rate limiting patterns
- [ ] Define appropriate limits

## Paste-Here Prompts
- Rate limiting middleware
- Redis-based rate limiting
- Health check best practices
```

### Step 2: Generate PRP
```bash
npm run gen-prp
# Creates: docs/prps/PRP-add-rate-limiting-to-the-health-check-endpoint-2024-01-15.md
```

### Step 3: Complete the PRP
Edit the generated file with implementation details:
- List files: `src/index.ts`, `src/middleware/rate-limit.ts`
- Reference pattern: `examples/api/validation-chain.example.ts`
- Define steps: Add middleware, configure limits, add tests

### Step 4: Implement
Follow the PRP blueprint, using the referenced patterns

### Step 5: Validate
```bash
npm run validate
# Or run individually:
npm run lint
npm test
npm run build
```

## Tips

1. **Keep INITIAL.md Simple**: Just capture the essence - details go in the PRP
2. **Reference Patterns**: Always check `examples/` for existing patterns
3. **Test First**: Consider writing tests before implementation
4. **Iterate**: PRPs can be updated during implementation as you learn more

## Common Patterns

### For New Features
- Start with API endpoint example from `examples/api/`
- Add service layer following `examples/services/`
- Include tests based on `examples/tests/`

### For Bug Fixes
- Document current behavior vs expected
- Include regression test in validation
- Reference the issue number

### For Refactoring
- List all affected files
- Include performance metrics if relevant
- Ensure backward compatibility