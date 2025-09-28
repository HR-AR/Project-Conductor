#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read the input files
const initPath = path.join(projectRoot, 'INITIAL.md');
const tmplPath = path.join(projectRoot, 'docs/prps/prp_template.md');

// Check if files exist
if (!fs.existsSync(initPath)) {
  console.error('❌ INITIAL.md not found. Please create it first.');
  process.exit(1);
}

if (!fs.existsSync(tmplPath)) {
  console.error('❌ PRP template not found at docs/prps/prp_template.md');
  process.exit(1);
}

const init = fs.readFileSync(initPath, 'utf8');
const tmpl = fs.readFileSync(tmplPath, 'utf8');

// Extract the feature name from INITIAL.md
const title = (init.match(/^#\s*Request\s*\n([\s\S]*?)\n/m)?.[1] || 'New Feature').trim();

// Get today's date
const today = new Date().toISOString().slice(0, 10);

// Create slug from title
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Generate output filename
const outPath = path.join(projectRoot, `docs/prps/PRP-${slug(title)}-${today}.md`);

// Replace placeholders in template
let content = tmpl
  .replace('[Feature Name]', title)
  .replace('[Date]', today);

// Extract additional context from INITIAL.md if available
const whyMatch = init.match(/^##\s*Why\s*\n([\s\S]*?)(?=\n##|\n#|$)/m);
if (whyMatch) {
  const whyContent = whyMatch[1].trim();
  content = content.replace('[What are we building and why is it valuable?]',
    `[What are we building and why is it valuable?]\n\n${whyContent}`);
}

// Write the PRP file
fs.writeFileSync(outPath, content);
console.log(`✓ Created ${path.relative(projectRoot, outPath)}`);
console.log(`  Feature: ${title}`);
console.log(`  Date: ${today}`);
console.log('\nNext steps:');
console.log('1. Edit the PRP file to fill in the details');
console.log('2. Review relevant files and add them to the Context section');
console.log('3. Reference appropriate examples from examples/ directory');
console.log('4. Define the implementation blueprint');