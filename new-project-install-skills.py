#!/usr/bin/env python3
"""
New Project Skills Installer (Official + Custom Auto-Learning)
===============================================================

ONE-COMMAND INSTALLATION:
    python3 new-project-install-skills.py

WHAT THIS INSTALLS:
    ✅ Official Agent Skills structure
       - Validation Loop skill
       - Pattern Scout skill  
       - Meta Skill Generator
    
    ✅ Custom Auto-Learning System (experimental)
       - Pattern tracking (npm run learn:*)
       - Auto-generates official-format skills
       - Integrates with context-engine.mjs
    
    ✅ Documentation
       - Updates CLAUDE.md
       - Adds to package.json scripts
       - Creates skill templates

WORKS WITH:
    Your existing context-engine.mjs bootstrap system
    Adds skills layer on top of PRP/Scout/Implement workflow

OFFICIAL vs CUSTOM:
    Official: SKILL.md with YAML (name + description only)
    Custom: Detects patterns → auto-generates official skills

POST-INSTALL:
    npm run learn:track      # Interactive tracking
    npm run learn:list       # Show learned skills
    npm run skill:create     # Manual skill creation
"""

import os, json
from pathlib import Path

SKILLS = {
    "validation": {
        "yaml": {
            "name": "Running Validation Loops",
            "description": "Execute self-correcting validation workflow. Use when validation fails, tests fail, or build breaks."
        },
        "body": """# Validation Loop

## When to Use
- npm run validate fails
- CI/CD breaks
- Test or build failures

## Process
1. Capture full error output
2. Analyze root cause in context of examples/
3. Apply minimal fix aligned with patterns
4. Re-run validation
5. Repeat until success (max 5 attempts)

## Commands
```bash
npm run validate
```

## Success Criteria
- All gates pass
- Fix follows patterns in examples/
- No new anti-patterns introduced"""
    },
    
    "scout": {
        "yaml": {
            "name": "Scouting Code Patterns",
            "description": "Find and document external code patterns from public sources. Use when user mentions 'find examples', 'scout patterns', 'research implementations', or starting new feature without precedent."
        },
        "body": """# Pattern Scout

## When to Use
- User asks to "find examples"
- Starting new feature without precedent
- Need to research best practices
- References docs/prompts/SCOUT-*

## Process
1. Read PRP from docs/prps/ for context
2. Search for 3-5 public examples (MIT/Apache licenses)
3. For each, document:
   - PATTERN name
   - USE WHEN scenarios
   - KEY CONCEPTS
   - Minimal compilable stub
   - VALIDATION approach
4. Save to examples/[category]/
5. Include Source URL
6. Run npm run sync to update CLAUDE.md

## Output Format
Create files in examples/[category]/:
```
// PATTERN: [name]
// USE WHEN: [scenarios]
// SOURCE: [URL]
// VALIDATION: [how to test]

[minimal compilable code]
```

## Anti-patterns
- Don't paste proprietary code
- Don't include non-working examples
- Always provide source attribution"""
    },
    
    "meta/skill-generator": {
        "yaml": {
            "name": "Generating New Skills",
            "description": "Meta-skill that creates other skills from detected patterns. Use when user repeatedly explains workflow (2+ times), says 'remember this', or you notice repetitive pattern."
        },
        "body": """# Skill Generator

## When to Use
- User explains same process 2+ times
- User says "remember this", "save workflow"
- You notice reusable pattern
- Detailed step-by-step methodology provided

## Detection Signals
1. Repetition (2+ similar requests)
2. Detailed instructions
3. Explicit: "make this a skill"
4. API/docs pattern

## Auto-Learning Process

### Track Pattern
```bash
npm run learn:track
# or
npm run learn:record "what asked" "how to do it"
```

### Threshold → Auto-Generate
After 2 occurrences: `.claude/skills/auto-[intent]-[id]/SKILL.md`

### Generated Format
Official Anthropic format:
- YAML: name + description only
- Gerund-form naming
- Under 500 lines
- Progressive disclosure"""
    }
}

SKILL_LEARNER_JS = """#!/usr/bin/env node
// Custom Skill Learning - Auto-generates official Agent Skills from patterns
// EXPERIMENTAL automation layer on official Anthropic Agent Skills
import fs from 'fs';
import crypto from 'crypto';

class SkillLearner {
  constructor() {
    this.patternsFile = '.claude/learning/patterns.json';
    this.skillsDir = '.claude/skills';
    this.threshold = 2;
  }

  loadPatterns() {
    if (!fs.existsSync(this.patternsFile)) return { patterns: [], skills: [] };
    return JSON.parse(fs.readFileSync(this.patternsFile, 'utf8'));
  }

  savePatterns(data) {
    fs.mkdirSync('.claude/learning', { recursive: true });
    fs.writeFileSync(this.patternsFile, JSON.stringify(data, null, 2));
  }

  extractIntent(request) {
    const keywords = {
      validation: ['validate', 'test', 'check', 'verify'],
      implementation: ['implement', 'build', 'create', 'code'],
      api_docs: ['api', 'documentation', 'docs', 'reference'],
      analysis: ['analyze', 'evaluate', 'assess', 'review'],
      debugging: ['debug', 'fix', 'error', 'issue']
    };

    const lower = request.toLowerCase();
    for (const [intent, terms] of Object.entries(keywords)) {
      if (terms.some(term => lower.includes(term))) return intent;
    }
    return 'general';
  }

  createSig(intent, context) {
    const hash = crypto.createHash('md5');
    hash.update(`${intent}:${context.slice(0, 100)}`);
    return hash.digest('hex').slice(0, 12);
  }

  record(userRequest, userInstructions = '') {
    const data = this.loadPatterns();
    const intent = this.extractIntent(userRequest);
    const sig = this.createSig(intent, userInstructions);

    let pattern = data.patterns.find(p => p.signature === sig);
    
    if (pattern) {
      pattern.count++;
      pattern.lastSeen = new Date().toISOString();
      pattern.examples.push({ request: userRequest, instructions: userInstructions });

      if (pattern.count === this.threshold && !pattern.skillCreated) {
        this.generateSkill(pattern);
        pattern.skillCreated = true;
        console.log(`\\n🎯 Pattern detected ${this.threshold} times - skill generated!`);
      }
    } else {
      data.patterns.push({
        signature: sig,
        intent,
        count: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        examples: [{ request: userRequest, instructions: userInstructions }],
        skillCreated: false
      });
    }

    this.savePatterns(data);
    const count = data.patterns.find(p => p.signature === sig)?.count || 1;
    console.log(`✅ Pattern tracked: ${intent} (${count}/${this.threshold})`);
    if (count === 1) console.log('💡 One more will auto-generate skill');
  }

  generateSkill(pattern) {
    const { intent, examples, signature } = pattern;
    
    const gerundMap = {
      validation: 'Running Validations',
      implementation: 'Implementing Features',
      api_docs: 'Looking Up API Documentation',
      analysis: 'Analyzing Code',
      debugging: 'Debugging Issues'
    };
    const skillName = gerundMap[intent] || `Processing ${intent}`;
    const skillDir = `${this.skillsDir}/auto-${intent}-${signature}`;
    
    fs.mkdirSync(skillDir, { recursive: true });

    const needsWeb = /api|docs|documentation|latest|current/.test(
      examples.map(e => e.request + e.instructions).join(' ').toLowerCase()
    );

    const triggers = this.extractTriggers(examples);
    const instructions = this.synthInstructions(examples);

    const skillContent = `---
name: ${skillName}
description: Auto-generated ${intent} skill. ${needsWeb ? 'Always searches web for current info. ' : ''}Triggers: ${triggers.join(', ')}.
---

# ${skillName} (Auto-Generated)

⚡ **Created from detected usage pattern**

## When to Use
${triggers.map(t => `- "${t}"`).join('\\n')}

## Your Methodology
${instructions}

${needsWeb ? \`## Web Search Enabled
ALWAYS searches for current info via web_search + web_fetch\` : ''}

## Examples
${examples.slice(0, 2).map(e => `- "${e.request}"`).join('\\n')}

## Validation
\\\`\\\`\\\`bash
npm run validate
\\\`\\\`\\\`

---
**Generated:** ${new Date().toISOString()}
**From:** ${pattern.count} similar requests
`;

    fs.writeFileSync(`${skillDir}/SKILL.md`, skillContent);
    
    console.log(`\\n✅ Skill: ${skillDir}/SKILL.md`);
    console.log(`   Name: ${skillName}`);
    if (needsWeb) console.log('   🌐 Web search enabled');

    data.skills.push({
      name: skillName,
      intent,
      created: new Date().toISOString(),
      fromPattern: signature
    });
    this.savePatterns(data);
  }

  extractTriggers(examples) {
    const triggers = new Set();
    examples.forEach(ex => {
      const words = ex.request.toLowerCase().split(/\\s+/);
      ['analyze', 'test', 'build', 'api', 'docs', 'implement'].forEach(key => {
        const idx = words.indexOf(key);
        if (idx >= 0) {
          triggers.add(words.slice(idx, idx + 3).join(' '));
        }
      });
    });
    return Array.from(triggers).slice(0, 3);
  }

  synthInstructions(examples) {
    const detailed = examples
      .map(e => e.instructions)
      .filter(i => i.length > 20)
      .sort((a, b) => b.length - a.length)[0];

    if (!detailed) return '1. Analyze request\\n2. Apply methodology\\n3. Deliver results';

    const lines = detailed.split('\\n').filter(l => l.trim());
    return lines.slice(0, 8).map((l, i) => {
      return l.match(/^\\d/) ? l : `${i + 1}. ${l}`;
    }).join('\\n');
  }

  list() {
    const data = this.loadPatterns();
    console.log('\\n' + '='.repeat(70));
    console.log('📚 AUTO-GENERATED SKILLS');
    console.log('='.repeat(70));
    data.skills.forEach(s => {
      console.log(`  ✅ ${s.name} (${s.intent})`);
    });
    console.log('\\n' + '='.repeat(70));
    console.log('📊 TRACKING PATTERNS');
    console.log('='.repeat(70));
    data.patterns.filter(p => !p.skillCreated).forEach(p => {
      console.log(`  🔍 ${p.intent}: ${p.count}/${this.threshold}`);
      if (p.count === this.threshold - 1) console.log('     ⚡ One more will generate!');
    });
    console.log('='.repeat(70));
  }
}

const learner = new SkillLearner();
const cmd = process.argv[2];

if (cmd === 'record' && process.argv[3]) {
  learner.record(process.argv[3], process.argv[4] || '');
} else if (cmd === 'list') {
  learner.list();
} else if (cmd === 'track') {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\\n🎓 Skill Learning Mode\\n');
  readline.question('What did you ask for? ', (req) => {
    readline.question('How did you explain to do it? ', (instr) => {
      learner.record(req, instr);
      console.log('\\n✅ Pattern recorded!');
      readline.close();
    });
  });
} else {
  console.log(\`Skill Learner (Experimental)

Commands:
  track                    Interactive pattern tracking
  record "req" "method"    Track programmatically  
  list                     Show learned skills

Usage:
  npm run learn:track
  npm run learn:record "implement auth" "use JWT, test with Jest"
  npm run learn:list
\`);
}
"""

PACKAGE_JSON_SCRIPTS = {
  "skill:create": "node scripts/skill-helper.mjs create",
  "skill:list": "node scripts/skill-helper.mjs list",
  "learn:track": "node scripts/skill-learner.mjs track",
  "learn:record": "node scripts/skill-learner.mjs record",
  "learn:list": "node scripts/skill-learner.mjs list"
}

SKILL_HELPER_JS = """#!/usr/bin/env node
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
\\\`\\\`\\\`bash
npm run validate
\\\`\\\`\\\`
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
"""

CLAUDE_MD_ADDITION = """

## Agent Skills (Official + Custom Auto-Learning)

### Overview
Official Agent Skills with experimental auto-learning layer

### Available Skills
- **Validation Loop** - Self-correcting validation workflow
- **Pattern Scout** - Find external code examples
- **Skill Generator** (Meta) - Creates skills from patterns

### Auto-Learning
```bash
npm run learn:track           # Interactive tracking
npm run learn:record "..." "..."  # Manual tracking
npm run learn:list           # Show learned skills
```

### How It Works
1. Explain methodology (1st time)
2. System tracks pattern (1/2)
3. Similar request (2nd time)
4. Skill auto-generated (2/2)
5. Future requests auto-invoke

### Manual Skills
```bash
npm run skill:create [name]   # Create skill template
npm run skill:list           # Show all skills
```

### Official Format
```yaml
---
name: [Gerund Form]
description: [What + When]
---
[Instructions <500 lines]
```

### Files
```
.claude/
├── skills/
│   ├── validation/
│   ├── scout/
│   └── auto-*/
└── learning/
    └── patterns.json
```

### Integration
Works with existing context-engine.mjs:
- PRP → Scout → Implement → Skills
- Skills auto-invoke based on patterns
- npm run sync updates CLAUDE.md

### References
- [Official Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
"""

def install():
    print("🚀 Installing Agent Skills for New Project...")
    print()
    
    # Create skills
    print("📁 Creating official Agent Skills...")
    for skill_name, content in SKILLS.items():
        skill_dir = Path(f".claude/skills/{skill_name}")
        skill_dir.mkdir(parents=True, exist_ok=True)
        
        yaml = f"---\nname: {content['yaml']['name']}\ndescription: {content['yaml']['description']}\n---\n\n"
        (skill_dir / "SKILL.md").write_text(yaml + content['body'])
        print(f"   ✅ {skill_name}")
    
    # Create learning directory
    Path(".claude/learning").mkdir(parents=True, exist_ok=True)
    
    # Create scripts directory
    Path("scripts").mkdir(parents=True, exist_ok=True)
    
    # Create skill learner
    print("\n🧠 Creating auto-learning system...")
    Path("scripts/skill-learner.mjs").write_text(SKILL_LEARNER_JS)
    os.chmod("scripts/skill-learner.mjs", 0o755)
    print("   ✅ scripts/skill-learner.mjs")
    
    # Create skill helper
    print("\n🛠️ Creating helper commands...")
    Path("scripts/skill-helper.mjs").write_text(SKILL_HELPER_JS)
    os.chmod("scripts/skill-helper.mjs", 0o755)
    print("   ✅ scripts/skill-helper.mjs")
    
    # Update package.json
    print("\n📦 Updating package.json...")
    if Path("package.json").exists():
        pkg = json.loads(Path("package.json").read_text())
        if "scripts" not in pkg:
            pkg["scripts"] = {}
        pkg["scripts"].update(PACKAGE_JSON_SCRIPTS)
        Path("package.json").write_text(json.dumps(pkg, indent=2))
        print("   ✅ Added npm scripts")
    else:
        print("   ⚠️  No package.json found - create one first")
    
    # Update CLAUDE.md
    print("\n📖 Updating CLAUDE.md...")
    if Path("CLAUDE.md").exists():
        with open("CLAUDE.md", "a") as f:
            f.write(CLAUDE_MD_ADDITION)
        print("   ✅ CLAUDE.md updated")
    else:
        Path("CLAUDE.md").write_text("# Project Context" + CLAUDE_MD_ADDITION)
        print("   ✅ CLAUDE.md created")
    
    print("\n" + "="*70)
    print("✅ INSTALLATION COMPLETE")
    print("="*70)
    print("\nINSTALLED:")
    print("  📁 .claude/skills/{validation,scout,meta}")
    print("  🧠 scripts/skill-learner.mjs")
    print("  🛠️ scripts/skill-helper.mjs")
    print("  📦 package.json (updated)")
    print("  📖 CLAUDE.md (updated)")
    print("\nNPM SCRIPTS ADDED:")
    print("  npm run learn:track")
    print("  npm run learn:record \"...\" \"...\"")
    print("  npm run learn:list")
    print("  npm run skill:create [name]")
    print("  npm run skill:list")
    print("\nQUICK START:")
    print("  1. Test: Ask 'Run validation loop'")
    print("  2. Track: npm run learn:track")
    print("  3. List: npm run learn:list")
    print("\nINTEGRATION:")
    print("  Works with context-engine.mjs")
    print("  PRP → Scout → Implement → Skills")
    print("\n📚 Read full guide in CLAUDE.md")
    print("="*70)

if __name__ == "__main__":
    install()
