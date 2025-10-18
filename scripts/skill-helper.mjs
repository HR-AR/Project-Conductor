#!/usr/bin/env node
import fs from 'fs';

const cmd = process.argv[2];
const name = process.argv[3] || 'new-skill';

if (cmd === 'create') {
  const dir = `.claude/skills/${name}`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/SKILL.md`, \`---
name: [Name]
description: [What it does. Use when user mentions...]
---

# Instructions

## When to Use
- Trigger phrases

## Process
1. Steps

## Validation
\\`\\`\\`bash
npm run validate
\\`\\`\\`
\`);
  console.log(`✅ Created: ${dir}/SKILL.md`);
} else if (cmd === 'list') {
  console.log('Skills:');
  if (fs.existsSync('.claude/skills')) {
    fs.readdirSync('.claude/skills').forEach(s => console.log(`  - ${s}`));
  }
} else {
  console.log('Usage: npm run skill:create [name] | npm run skill:list');
}
