#!/usr/bin/env python3
"""
Skill Learning System - Automatically generates skills from repetitive patterns
"""

import json
import os
from datetime import datetime
from pathlib import Path
from collections import Counter
from typing import Dict, List, Optional
import hashlib

class SkillLearner:
    def __init__(self):
        self.patterns_file = Path(".claude/learning/patterns.json")
        self.patterns_file.parent.mkdir(parents=True, exist_ok=True)
        self.skills_dir = Path(".claude/skills")
        self.threshold = 2  # Create skill after 2 similar requests

    def load_patterns(self) -> Dict:
        """Load existing pattern tracking"""
        if self.patterns_file.exists():
            return json.loads(self.patterns_file.read_text())
        return {"patterns": [], "skills_created": []}

    def save_patterns(self, data: Dict):
        """Persist pattern data"""
        self.patterns_file.write_text(json.dumps(data, indent=2))

    def extract_intent(self, user_request: str) -> str:
        """Extract the core intent from user request"""
        # Simple keyword extraction - could use embeddings for better matching
        keywords = {
            "analysis": ["analyze", "analysis", "break down", "examine", "evaluate"],
            "api_docs": ["api", "documentation", "latest api", "current docs", "api reference"],
            "reporting": ["report", "summary", "brief", "update", "status"],
            "search": ["search", "find", "lookup", "query"],
            "comparison": ["compare", "vs", "versus", "difference between"],
            "validation": ["validate", "check", "verify", "test"],
            "generation": ["generate", "create", "make", "build"]
        }

        request_lower = user_request.lower()
        intent_scores = Counter()

        for intent, terms in keywords.items():
            for term in terms:
                if term in request_lower:
                    intent_scores[intent] += 1

        return intent_scores.most_common(1)[0][0] if intent_scores else "general"

    def create_signature(self, intent: str, context: str) -> str:
        """Create unique signature for a pattern"""
        combined = f"{intent}:{context}"
        return hashlib.md5(combined.encode()).hexdigest()[:12]

    def record_request(self, user_request: str, user_instructions: str = ""):
        """Track a user request and detect patterns"""
        data = self.load_patterns()

        intent = self.extract_intent(user_request)
        signature = self.create_signature(intent, user_instructions[:100])

        # Find existing pattern or create new
        pattern_found = False
        for pattern in data["patterns"]:
            if pattern["signature"] == signature:
                pattern["count"] += 1
                pattern["last_seen"] = datetime.now().isoformat()
                pattern["examples"].append({
                    "request": user_request[:200],
                    "instructions": user_instructions[:500]
                })
                pattern_found = True

                # Trigger skill creation at threshold
                if pattern["count"] == self.threshold and not pattern.get("skill_created"):
                    self.generate_skill(pattern)
                    pattern["skill_created"] = True
                break

        if not pattern_found:
            data["patterns"].append({
                "signature": signature,
                "intent": intent,
                "count": 1,
                "first_seen": datetime.now().isoformat(),
                "last_seen": datetime.now().isoformat(),
                "examples": [{
                    "request": user_request[:200],
                    "instructions": user_instructions[:500]
                }],
                "skill_created": False
            })

        self.save_patterns(data)
        print(f"✅ Tracked pattern: {intent} (seen {self._get_pattern_count(signature, data)} times)")

        # Check if threshold reached
        count = self._get_pattern_count(signature, data)
        if count == self.threshold:
            print(f"🎯 Pattern detected {self.threshold} times - generating skill!")

    def _get_pattern_count(self, signature: str, data: Dict) -> int:
        for pattern in data["patterns"]:
            if pattern["signature"] == signature:
                return pattern["count"]
        return 0

    def generate_skill(self, pattern: Dict):
        """Auto-generate a skill from detected pattern"""
        intent = pattern["intent"]
        examples = pattern["examples"]

        # Synthesize instructions from examples
        instructions = self._synthesize_instructions(examples)
        triggers = self._extract_triggers(examples)

        skill_name = f"auto-{intent}-{pattern['signature']}"
        skill_dir = self.skills_dir / skill_name
        skill_dir.mkdir(parents=True, exist_ok=True)

        # Determine if this needs web search
        needs_web_search = any(
            keyword in intent.lower() or any(keyword in ex["request"].lower() for ex in examples)
            for keyword in ["api", "documentation", "latest", "current", "updated", "recent"]
        )

        skill_content = f"""---
name: {skill_name}
description: Auto-generated skill for {intent}. Triggers on: {', '.join(triggers)}. {'Always searches web for current information.' if needs_web_search else ''}
version: 1.0.0
auto_generated: true
created: {datetime.now().isoformat()}
{'allowed-tools: [web_search, web_fetch, bash_tool, view, create_file]' if needs_web_search else ''}
---

# {intent.replace('_', ' ').title()} Skill (Auto-Generated)

**⚡ This skill was automatically created after detecting a repetitive pattern.**

## When to Use
{self._format_triggers(triggers)}

## Common Request Patterns
{self._format_examples(examples)}

## Instructions
{instructions}

{'## API Documentation Lookup' if needs_web_search else ''}
{'This skill ALWAYS checks current documentation:' if needs_web_search else ''}
{'1. Use web_search to find official docs' if needs_web_search else ''}
{'2. Use web_fetch to read full content' if needs_web_search else ''}
{'3. Prioritize official sources over third-party tutorials' if needs_web_search else ''}
{'4. Check version compatibility' if needs_web_search else ''}

## User's Preferred Approach
{self._format_preferred_approach(examples)}

## Validation
```bash
# Verify the output meets user's expectations
{self._suggest_validation(intent)}
```

## Skill Improvement
This skill improves with use. After each invocation:
1. Note what worked well
2. Identify gaps or confusion
3. Update this file with refinements

## Usage Stats
- Created: {datetime.now().isoformat()}
- Triggered from: {pattern['count']} similar requests
- Last refined: {datetime.now().isoformat()}
"""

        skill_file = skill_dir / "SKILL.md"
        skill_file.write_text(skill_content)

        print(f"\n✅ Created new skill: .claude/skills/{skill_name}/SKILL.md")
        print(f"   Intent: {intent}")
        print(f"   Triggers: {', '.join(triggers)}")
        if needs_web_search:
            print(f"   🌐 Web search enabled for current documentation")
        print(f"\n💡 This skill will now be auto-invoked for similar requests!")

        # Log skill creation
        data = self.load_patterns()
        data["skills_created"].append({
            "name": skill_name,
            "intent": intent,
            "created": datetime.now().isoformat(),
            "from_pattern": pattern["signature"]
        })
        self.save_patterns(data)

    def _synthesize_instructions(self, examples: List[Dict]) -> str:
        """Create step-by-step instructions from examples"""
        # Extract common steps from user instructions
        all_instructions = [ex.get("instructions", "") for ex in examples if ex.get("instructions")]

        if not all_instructions:
            return "1. Analyze the request\n2. Apply relevant methodology\n3. Provide clear results"

        # For now, use the most detailed instruction as template
        most_detailed = max(all_instructions, key=len)

        # Format as numbered list
        lines = [line.strip() for line in most_detailed.split('\n') if line.strip()]
        if not any(line[0].isdigit() for line in lines if line):
            # Add numbering if not present
            return '\n'.join(f"{i+1}. {line}" for i, line in enumerate(lines[:10]))

        return '\n'.join(lines[:10])

    def _extract_triggers(self, examples: List[Dict]) -> List[str]:
        """Extract trigger phrases from examples"""
        triggers = set()
        for ex in examples:
            request = ex["request"].lower()
            # Extract key phrases (simple approach)
            words = request.split()
            for i, word in enumerate(words):
                if word in ["analyze", "search", "find", "compare", "check", "api", "documentation"]:
                    # Capture 2-3 word phrase
                    phrase = ' '.join(words[i:i+3])
                    triggers.add(phrase)

        return list(triggers)[:5]  # Max 5 triggers

    def _format_triggers(self, triggers: List[str]) -> str:
        return '\n'.join(f"- User mentions: \"{trigger}\"" for trigger in triggers)

    def _format_examples(self, examples: List[Dict]) -> str:
        return '\n'.join(f"- \"{ex['request'][:100]}...\"" for ex in examples[:3])

    def _format_preferred_approach(self, examples: List[Dict]) -> str:
        """Format user's explained methodology"""
        approaches = [ex.get("instructions", "") for ex in examples if ex.get("instructions")]
        if approaches:
            return f"```\n{approaches[-1][:500]}\n```"
        return "User's approach will be refined with more examples."

    def _suggest_validation(self, intent: str) -> str:
        """Suggest validation based on intent"""
        validations = {
            "analysis": "# Check: Does output match expected analysis depth?",
            "api_docs": "# Check: Is documentation current and from official source?",
            "reporting": "# Check: Does report include all requested sections?",
            "search": "# Check: Are results relevant and recent?",
            "comparison": "# Check: Are all comparison points addressed?",
        }
        return validations.get(intent, "# Verify output meets requirements")

    def list_learned_skills(self):
        """Show all auto-generated skills"""
        data = self.load_patterns()

        print("\n📚 Learned Skills:")
        for skill in data.get("skills_created", []):
            print(f"\n  • {skill['name']}")
            print(f"    Intent: {skill['intent']}")
            print(f"    Created: {skill['created']}")

        print(f"\n📊 Patterns Being Tracked: {len(data['patterns'])}")
        for pattern in data["patterns"]:
            if not pattern.get("skill_created"):
                print(f"  • {pattern['intent']}: {pattern['count']}/{self.threshold} occurrences")

    def track_interactive(self):
        """Interactive mode to track current request"""
        print("\n🎓 Skill Learning Mode")
        print("Tell me what you're asking for and how you want it done.\n")

        request = input("What are you asking for? ")
        instructions = input("\nHow do you want it done? (your methodology): ")

        self.record_request(request, instructions)
        print("\n✅ Pattern recorded!")

def main():
    import sys
    learner = SkillLearner()

    if len(sys.argv) < 2:
        print("""
Skill Learning System

Commands:
  track           - Interactive: track a new request pattern
  list            - Show all learned skills and patterns
  record "request" "instructions"  - Record a pattern programmatically

Examples:
  ./skill-learner track
  ./skill-learner list
  ./skill-learner record "analyze the BRD" "First read the BRD, then..."
        """)
        return

    cmd = sys.argv[1]

    if cmd == "track":
        learner.track_interactive()
    elif cmd == "list":
        learner.list_learned_skills()
    elif cmd == "record" and len(sys.argv) >= 4:
        learner.record_request(sys.argv[2], sys.argv[3])
    else:
        print("Unknown command. Use: track, list, or record")

if __name__ == "__main__":
    main()
