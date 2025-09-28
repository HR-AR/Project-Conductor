# Project Requirements Plans (PRPs)

This directory contains Project Requirements Plans for all features and changes to Project Conductor.

## Workflow

### 1. Start with INITIAL.md
```bash
# Edit INITIAL.md in project root with your feature request
vim INITIAL.md
```

### 2. Generate PRP
```bash
# Run the generator script
node scripts/gen-prp.mjs
# or
npm run gen-prp  # if script is added to package.json
```

### 3. Complete the PRP
Edit the generated PRP file to include:
- Detailed goal and value proposition
- List of files to be modified
- Reference to example patterns from `examples/` directory
- Step-by-step implementation plan
- Validation criteria

### 4. Implement
Follow the PRP blueprint, using referenced patterns

### 5. Validate
Run all validation commands specified in the PRP:
```bash
npm run lint
npm test
npm run build
```

## PRP Structure

Each PRP contains:
- **Feature Name & Date**: Auto-generated from INITIAL.md
- **Goal & Why**: Business value and technical rationale
- **Context**: Relevant files and pattern references
- **Implementation Blueprint**: Detailed steps
- **Validation Loop**: Required passing tests/checks
- **Success Criteria**: Definition of done

## Naming Convention

PRPs are automatically named:
```
PRP-[feature-slug]-[YYYY-MM-DD].md
```

Example: `PRP-add-user-authentication-2024-01-15.md`

## Best Practices

1. **One Feature Per PRP**: Keep PRPs focused on a single feature or fix
2. **Reference Examples**: Always reference patterns from `examples/` directory
3. **List All Files**: Include all files that will be touched
4. **Define Tests First**: Specify validation criteria before implementing
5. **Update as You Go**: PRPs are living documents during implementation

## Archive

Completed PRPs can be moved to an `archive/` subdirectory:
```bash
mkdir -p docs/prps/archive
mv docs/prps/PRP-completed-feature-*.md docs/prps/archive/
```