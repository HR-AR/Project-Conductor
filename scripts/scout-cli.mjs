#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Parse command line arguments
const args = Object.fromEntries(
  process.argv.slice(2).map((v, i, a) => v.startsWith('--') ? [v.slice(2), a[i + 1]] : null).filter(Boolean)
);

// Configuration with defaults
const from = args.from || path.join(projectRoot, 'docs/prps');
const stackFrom = args.stackFrom || path.join(projectRoot, 'CLAUDE.md');
const out = args.out;
const verbose = args.verbose === 'true';

// Color codes for output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
};

// Helper functions
function read(p) {
  const fullPath = path.isAbsolute(p) ? p : path.join(projectRoot, p);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function firstPRPorFile(p) {
  const fullPath = path.isAbsolute(p) ? p : path.join(projectRoot, p);

  // If it's a file, return it
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return fullPath;
  }

  // If directory doesn't exist, try INITIAL.md as fallback
  if (!fs.existsSync(fullPath)) {
    const initialPath = path.join(projectRoot, 'INITIAL.md');
    if (fs.existsSync(initialPath)) {
      console.log(`${colors.yellow}ℹ${colors.reset} No PRP found, using INITIAL.md`);
      return initialPath;
    }
    return null;
  }

  // Find the most recent PRP file
  const files = fs.readdirSync(fullPath)
    .filter(f => /^PRP-.*\.md$/.test(f))
    .sort();

  if (files.length > 0) {
    const latest = path.join(fullPath, files[files.length - 1]);
    if (verbose) {
      console.log(`${colors.gray}Using PRP: ${path.basename(latest)}${colors.reset}`);
    }
    return latest;
  }

  // No PRP found, check for INITIAL.md
  const initialPath = path.join(projectRoot, 'INITIAL.md');
  if (fs.existsSync(initialPath)) {
    console.log(`${colors.yellow}ℹ${colors.reset} No PRP found, using INITIAL.md`);
    return initialPath;
  }

  return null;
}

function extractSection(md, rx) {
  const m = md.match(rx);
  if (!m) return '';
  const start = m.index;
  const after = md.slice(start);
  const next = after.search(/\n## /);
  return next === -1 ? after : after.slice(0, next);
}

function extractRelevantFiles(prpContent) {
  // Look for "Relevant Files" section
  const filesSection = extractSection(prpContent, /### Relevant Files/i);
  if (!filesSection) return '';

  // Extract file paths
  const lines = filesSection.split('\n');
  const files = lines
    .filter(line => line.match(/^[\s-]*[\w/.-]+\.(ts|js|tsx|jsx|md)/))
    .map(line => line.replace(/^[\s-]*/, '').trim())
    .filter(Boolean);

  if (files.length === 0) return '';

  return `\nRelevant files to review:\n${files.map(f => `- ${f}`).join('\n')}`;
}

function extractPatternRefs(prpContent) {
  // Look for "Pattern References" section
  const patternsSection = extractSection(prpContent, /### Pattern References/i);
  if (!patternsSection) return '';

  const patterns = patternsSection
    .split('\n')
    .filter(line => line.includes('examples/'))
    .map(line => line.replace(/^.*examples\//, 'examples/').trim())
    .filter(Boolean);

  if (patterns.length === 0) return '';

  return `\nExisting patterns to follow:\n${patterns.map(p => `- ${p}`).join('\n')}`;
}

// Main execution
console.log(`${colors.blue}Scout CLI - AI Prompt Generator${colors.reset}`);
console.log(`${colors.gray}${'─'.repeat(40)}${colors.reset}\n`);

// Find and read the source file
const src = firstPRPorFile(from);
if (!src) {
  console.error(`${colors.red}✖${colors.reset} Could not find PRP/PRD from: ${from}`);
  console.log(`\n${colors.yellow}Tip:${colors.reset} Create a PRP first with: npm run gen-prp`);
  process.exit(2);
}

const text = read(src);
if (!text) {
  console.error(`${colors.red}✖${colors.reset} Could not read file: ${src}`);
  process.exit(2);
}

console.log(`${colors.green}✓${colors.reset} Source: ${colors.blue}${path.relative(projectRoot, src)}${colors.reset}`);

// Extract feature title
const title = (text.match(/^#\s*Feature:\s*(.+)$/m)?.[1] ||
               text.match(/^#\s*Request\s*\n([\s\S]*?)\n/m)?.[1] ||
               'New Feature').trim();

console.log(`${colors.green}✓${colors.reset} Feature: ${colors.yellow}${title}${colors.reset}`);

// Extract why/goal section
const whyBlock = extractSection(text, /^##\s*(Goal & Why|Why|WHY.*)\s*$/mi)
  .replace(/^##.*\n/, '').trim().slice(0, 1200);

// Extract implementation blueprint if available
const blueprintBlock = extractSection(text, /^##\s*Implementation Blueprint\s*$/mi)
  .replace(/^##.*\n/, '').trim().slice(0, 800);

// Extract relevant files and patterns
const relevantFiles = extractRelevantFiles(text);
const patternRefs = extractPatternRefs(text);

// Read and extract tech stack
const stackMd = read(stackFrom);
if (!stackMd) {
  console.log(`${colors.yellow}⚠${colors.reset} Could not read stack from: ${stackFrom}`);
}

const techStack = extractSection(stackMd, /^##\s*Tech Stack\s*$/mi)
  .replace(/^##.*\n/, '').trim().slice(0, 1200) || '[Tech stack not found - please provide]';

// Extract coding conventions if available
const conventions = extractSection(stackMd, /^##\s*Coding Conventions.*$/mi)
  .replace(/^##.*\n/, '').trim().slice(0, 800);

// Build the feature intent block
const intent = `Feature: ${title}\n\n${
  whyBlock ? 'Why/Context:\n' + whyBlock + '\n' : ''
}${
  blueprintBlock ? '\nPlanned Approach:\n' + blueprintBlock + '\n' : ''
}${relevantFiles}${patternRefs}`.trim();

// Generate the scout prompt
const prompt = `You are my Context Engineering Scout, helping me research implementation patterns for our project.

Here is the feature intent (from PRP/PRD):
${'─'.repeat(60)}
${intent}
${'─'.repeat(60)}

Our tech stack (from CLAUDE.md):
${'─'.repeat(60)}
${techStack}
${'─'.repeat(60)}

${conventions ? `Our coding conventions:
${'─'.repeat(60)}
${conventions}
${'─'.repeat(60)}

` : ''}Tasks for you:

1) **Identify Design Patterns**
   - Find 3-5 common patterns for this type of feature in our stack
   - Focus on production-ready, battle-tested approaches

2) **Source Public Examples**
   - Find real implementations from docs, blogs, or open-source repos
   - Prioritize examples using our exact stack (${techStack.split('\n')[0]})
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

\`\`\`typescript
/**
 * PATTERN: [Pattern Name]
 * USE WHEN: [Specific scenarios]
 * KEY CONCEPTS: [Bullet points]
 * TRADE-OFFS: [Pros and cons]
 */

// Minimal, sanitized TypeScript stub
export interface ${title.replace(/[^a-zA-Z0-9]/g, '')}Options {
  // Configuration interface
}

export class ${title.replace(/[^a-zA-Z0-9]/g, '')}Pattern {
  // Skeleton implementation
  async execute(options: ${title.replace(/[^a-zA-Z0-9]/g, '')}Options): Promise<void> {
    // TODO: Implementation
  }
}

// Source: [URL to documentation or example]
\`\`\`

**Important Guidelines:**
- Use TypeScript with strict typing (no 'any' types)
- Follow our existing patterns from examples/ directory
- Include error handling patterns
- Consider our existing architecture
- Provide actionable, copy-paste ready stubs
- Each stub should be < 50 lines
- No proprietary code, no real credentials
- Include commented TODOs where implementation is needed

Ready to research and provide patterns!`;

// Determine output path
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'feature';
const timestamp = new Date().toISOString().slice(0, 10);
const outPath = out || path.join(projectRoot, `docs/prompts/SCOUT-${slug}-${timestamp}.md`);

// Create directory and write file
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, prompt);

// Success output
console.log(`${colors.green}✓${colors.reset} Generated: ${colors.blue}${path.relative(projectRoot, outPath)}${colors.reset}`);
console.log(`\n${colors.yellow}Next Steps:${colors.reset}`);
console.log('1. Open the generated file');
console.log('2. Copy its content');
console.log('3. Paste into Gemini, Claude, or ChatGPT');
console.log('4. Review patterns and save useful ones to notes/');
console.log('5. Promote best patterns to examples/ when ready');

// Show preview if verbose
if (verbose) {
  console.log(`\n${colors.gray}Preview (first 500 chars):${colors.reset}`);
  console.log(colors.gray + prompt.slice(0, 500) + '...' + colors.reset);
}

// Additional tips
console.log(`\n${colors.blue}Tips:${colors.reset}`);
console.log('• Update CLAUDE.md if stack info is missing');
console.log('• Include "Relevant Files" in your PRP for better context');
console.log('• Use --from to specify a different PRP file');
console.log('• Use --out to specify custom output location');