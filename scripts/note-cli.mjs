#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const AREAS = ['components', 'api', 'tests', 'database', 'utils', 'services', 'middleware', 'general'];
const args = Object.fromEntries(
  process.argv.slice(2).map((v, i, a) => v.startsWith('--') ? [v.slice(2), a[i + 1]] : null).filter(Boolean)
);
const cmd = process.argv[2];

// Color codes for output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function usage() {
  console.log(`${colors.blue}note-cli - Quick Research Notes Manager${colors.reset}

${colors.green}Commands:${colors.reset}
  add      Add a new note to an area
  promote  Convert a note to an example stub file
  list     List all notes in an area
  search   Search notes across all areas

${colors.green}Usage:${colors.reset}
  note add --area <${AREAS.join('|')}> --title "<title>" --content "<markdown>"
  note promote --area <area> --title "<pattern-name>" --to examples/<area>/<FileName>.ts[x]
  note list --area <area>
  note search --query "<search-term>"

${colors.green}Examples:${colors.reset}
  # Add a note about API patterns
  node scripts/note-cli.mjs add --area api --title "Pagination Pattern" --content "Use cursor-based pagination for large datasets"

  # Promote a note to an example file
  node scripts/note-cli.mjs promote --area api --title "Pagination Pattern" --to examples/api/pagination.example.ts

  # List all API notes
  node scripts/note-cli.mjs list --area api

  # Search for pagination notes
  node scripts/note-cli.mjs search --query pagination
`);
  process.exit(1);
}

if (!cmd) usage();

function appendNote(area, title, content) {
  const notesDir = path.join(projectRoot, 'notes');
  const file = path.join(notesDir, `${area}.md`);

  // Create notes directory if it doesn't exist
  fs.mkdirSync(notesDir, { recursive: true });

  // Create file with header if it doesn't exist
  if (!fs.existsSync(file)) {
    const header = `# Notes — ${area.charAt(0).toUpperCase() + area.slice(1)}

> Quick research notes and patterns for ${area}

## Table of Contents
<!-- TOC will be here -->

`;
    fs.writeFileSync(file, header);
  }

  // Create timestamp
  const timestamp = new Date().toISOString().split('T')[0];

  // Format the note entry
  const entry = `
---

### ${title}
**Date:** ${timestamp}
**Status:** 📝 Research Note

**When to use:**
- [TODO: Fill when promoting to example]

**Key concepts:**
- ${content.split('\n').join('\n- ')}

**Why important:**
- [TODO: Add business/technical value]

**Code Example:**
\`\`\`typescript
// TODO: Add code example when promoting
\`\`\`

**Next Actions:**
- [ ] Validate pattern in codebase
- [ ] Add real implementation example
- [ ] Convert to example stub when ready
- [ ] Add tests if applicable

**References:**
- [TODO: Add any documentation links]
`;

  fs.appendFileSync(file, entry);
  console.log(`${colors.green}✓${colors.reset} Note added to ${colors.blue}${path.relative(projectRoot, file)}${colors.reset}`);
  console.log(`  Title: ${colors.yellow}${title}${colors.reset}`);
  console.log(`  Area: ${area}`);
  console.log(`  Date: ${timestamp}`);
}

function promote(area, title, toPath) {
  const notesDir = path.join(projectRoot, 'notes');
  const notesFile = path.join(notesDir, `${area}.md`);

  // Check if notes file exists
  if (!fs.existsSync(notesFile)) {
    console.error(`${colors.red}✗${colors.reset} No notes found for area: ${area}`);
    console.log(`  Create notes first with: note add --area ${area} ...`);
    process.exit(1);
  }

  // Read notes to extract content if possible
  const notesContent = fs.readFileSync(notesFile, 'utf8');
  const titleRegex = new RegExp(`### ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=\\n---|$)`, 'i');
  const match = notesContent.match(titleRegex);

  let extractedContent = '';
  if (match) {
    extractedContent = match[1].trim();
    console.log(`${colors.blue}ℹ${colors.reset} Found matching note for: ${title}`);
  }

  // Determine output path
  const out = toPath || path.join(projectRoot, `examples/${area}/${title.replace(/\s+/g, '-').toLowerCase()}.example.ts`);

  // Create directory if needed
  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Generate export name
  const exportName = title.replace(/\W+/g, '') || 'Example';

  // Extract key information from notes if found
  let whenToUse = '[TODO: Fill from notes]';
  let keyConcepts = '[TODO: Fill from notes]';

  if (extractedContent) {
    const whenMatch = extractedContent.match(/\*\*When to use:\*\*([^*]*)/);
    const keyMatch = extractedContent.match(/\*\*Key concepts:\*\*([^*]*)/);

    if (whenMatch) whenToUse = whenMatch[1].trim().split('\n')[0].replace(/^-\s*/, '');
    if (keyMatch) keyConcepts = keyMatch[1].trim().split('\n')[0].replace(/^-\s*/, '');
  }

  // Generate the stub file
  const stub = `/**
 * PATTERN: ${title}
 * USE WHEN: ${whenToUse}
 * KEY CONCEPTS: ${keyConcepts}
 *
 * STATUS: 🚧 STUB - Promoted from notes, implementation needed
 * SOURCE: notes/${area}.md
 * DATE: ${new Date().toISOString().split('T')[0]}
 */

import { Request, Response } from 'express';

/**
 * ${title} Implementation
 *
 * This is a stub promoted from research notes.
 * TODO: Add full implementation following project patterns
 */
export const ${exportName} = {
  // TODO: Implement the pattern

  /**
   * Example usage placeholder
   */
  example: () => {
    console.log('${title} - Implementation needed');
    return null;
  },

  /**
   * Configuration options
   */
  config: {
    // TODO: Add configuration options
  },

  /**
   * Validation rules
   */
  validation: {
    // TODO: Add validation if needed
  }
};

// TODO: Add proper TypeScript types
export interface ${exportName}Options {
  // Define options interface
}

// TODO: Add unit tests in tests/${area}/
// TODO: Update examples/STRUCTURE_PLAN.md with this new example
`;

  fs.writeFileSync(out, stub, 'utf8');
  console.log(`${colors.green}✓${colors.reset} Promoted stub to ${colors.blue}${path.relative(projectRoot, out)}${colors.reset}`);
  console.log(`  Pattern: ${colors.yellow}${title}${colors.reset}`);
  console.log(`  Status: Stub file created, ready for implementation`);
  console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
  console.log(`  1. Edit ${path.relative(projectRoot, out)}`);
  console.log(`  2. Add full implementation`);
  console.log(`  3. Add tests in tests/${area}/`);
  console.log(`  4. Update examples/STRUCTURE_PLAN.md`);
}

function listNotes(area) {
  const notesDir = path.join(projectRoot, 'notes');
  const file = path.join(notesDir, `${area}.md`);

  if (!fs.existsSync(file)) {
    console.log(`${colors.yellow}No notes found for area: ${area}${colors.reset}`);
    console.log(`Available areas: ${AREAS.join(', ')}`);
    return;
  }

  const content = fs.readFileSync(file, 'utf8');
  const titles = content.match(/^### (.+)$/gm) || [];

  console.log(`${colors.blue}Notes in ${area}:${colors.reset}`);
  titles.forEach(title => {
    const clean = title.replace('### ', '');
    console.log(`  • ${clean}`);
  });

  if (titles.length === 0) {
    console.log('  (no notes yet)');
  } else {
    console.log(`\n${colors.green}Total: ${titles.length} notes${colors.reset}`);
  }
}

function searchNotes(query) {
  const notesDir = path.join(projectRoot, 'notes');

  if (!fs.existsSync(notesDir)) {
    console.log('No notes directory found. Create your first note!');
    return;
  }

  console.log(`${colors.blue}Searching for: "${query}"${colors.reset}\n`);

  let totalMatches = 0;
  const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));

  files.forEach(file => {
    const content = fs.readFileSync(path.join(notesDir, file), 'utf8');
    const lines = content.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(query.toLowerCase())) {
        matches.push({ line: index + 1, text: line.trim() });
      }
    });

    if (matches.length > 0) {
      console.log(`${colors.green}${file}:${colors.reset}`);
      matches.forEach(match => {
        const highlighted = match.text.replace(
          new RegExp(query, 'gi'),
          `${colors.yellow}$&${colors.reset}`
        );
        console.log(`  Line ${match.line}: ${highlighted}`);
      });
      console.log('');
      totalMatches += matches.length;
    }
  });

  if (totalMatches === 0) {
    console.log('No matches found.');
  } else {
    console.log(`${colors.green}Found ${totalMatches} matches across ${files.length} files${colors.reset}`);
  }
}

// Main command switch
switch (cmd) {
  case 'add': {
    const { area, title, content } = args;
    if (!AREAS.includes(area) || !title || !content) {
      console.error(`${colors.red}Error: Missing or invalid arguments${colors.reset}`);
      usage();
    }
    appendNote(area, title, content);
    break;
  }

  case 'promote': {
    const { area, title } = args;
    const to = args.to;
    if (!AREAS.includes(area) || !title) {
      console.error(`${colors.red}Error: Missing or invalid arguments${colors.reset}`);
      usage();
    }
    promote(area, title, to);
    break;
  }

  case 'list': {
    const { area } = args;
    if (!area || !AREAS.includes(area)) {
      console.log(`${colors.yellow}Available areas:${colors.reset} ${AREAS.join(', ')}`);
    } else {
      listNotes(area);
    }
    break;
  }

  case 'search': {
    const { query } = args;
    if (!query) {
      console.error(`${colors.red}Error: Search query required${colors.reset}`);
      console.log('Usage: note search --query "<search-term>"');
      process.exit(1);
    }
    searchNotes(query);
    break;
  }

  default:
    usage();
}