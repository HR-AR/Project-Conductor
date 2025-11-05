#!/usr/bin/env node
/**
 * Optimization Implementation Helper
 * Guides implementation of optimization findings
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = '.claude/reports';

const PRIORITIES = {
  P0: { label: '🔴 CRITICAL', color: '\x1b[31m' },
  P1: { label: '🟠 HIGH', color: '\x1b[33m' },
  P2: { label: '🟡 MEDIUM', color: '\x1b[33m' },
  P3: { label: '🟢 LOW', color: '\x1b[32m' },
};

function main() {
  const priority = process.argv[2]?.toUpperCase() || 'P0';

  console.log('\n📋 Full-Stack Optimization Implementation\n');

  // Check if reports exist
  if (!existsSync(REPORTS_DIR)) {
    console.log('❌ No optimization reports found.');
    console.log('   Run: npm run optimize:analyze (or invoke the full-stack-optimizer skill)\n');
    process.exit(1);
  }

  const reports = [
    'frontend-analysis.md',
    'backend-analysis.md',
    'security-audit.md',
    'database-optimization.md',
    'code-quality.md',
    'UNIFIED_IMPROVEMENT_PLAN.md'
  ];

  const existingReports = reports.filter(r => existsSync(join(REPORTS_DIR, r)));

  if (existingReports.length === 0) {
    console.log('❌ No reports generated yet.');
    console.log('   The optimization agents need to complete their analysis first.\n');
    process.exit(1);
  }

  console.log(`✅ Found ${existingReports.length} report(s):\n`);
  existingReports.forEach(r => console.log(`   • ${r}`));

  if (priority === 'ALL') {
    console.log('\n🚀 Implementing all priorities (P0 → P1 → P2 → P3)...\n');
    console.log('⚠️  This will take significant time. Consider running by priority:\n');
    console.log('   npm run optimize:implement P0  # Start with critical fixes\n');
  } else {
    const { label, color } = PRIORITIES[priority] || PRIORITIES.P0;
    console.log(`\n${color}${label}\x1b[0m - Implementing ${priority} fixes...\n`);
  }

  console.log('📖 Next Steps:\n');
  console.log('1. Review the unified plan:');
  console.log(`   cat ${REPORTS_DIR}/UNIFIED_IMPROVEMENT_PLAN.md\n`);
  console.log('2. Ask Claude to implement specific priorities:');
  console.log('   "Implement all P0 critical fixes from the optimization report"\n');
  console.log('3. Validate after each round:');
  console.log('   npm test && npm run lint && npm run build\n');
  console.log('4. Deploy when ready:');
  console.log('   npm run test:render-ready\n');
}

main();
