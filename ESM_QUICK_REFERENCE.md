# ESM/CommonJS Quick Reference Guide

## 🎯 TL;DR - Current Status

✅ **All clear!** Your codebase is ESM/CommonJS compatible. The `marked` issue is already fixed.

---

## 📊 Package Safety Summary

### ✅ Safe to Use (In Active Code)
- `express`, `socket.io`, `pg`, `redis` - Pure CommonJS
- `helmet` - Dual-mode (has both CJS and ESM)
- `pino`, `gray-matter`, `compression` - CommonJS
- `marked` - ESM-only, but **already using dynamic import** ✅

### ⚠️ Monitor When Re-enabling
- `uuid` (in `orchestrator-disabled/`) - ESM-only
- `axios` (in `integrations-disabled/`) - ESM-only

### ❌ Not Used
- `diff` - Not imported anywhere in backend

---

## 🔧 Quick Fix Patterns

### ESM-Only Package Import Pattern

```typescript
// ❌ BAD - May fail in CommonJS project
import { something } from 'esm-only-package';

// ✅ GOOD - Works in CommonJS
let someModule: any;
private moduleInitialized = false;

private async initModule() {
  if (!this.moduleInitialized) {
    const module = await import('esm-only-package');
    someModule = module.default || module;
    this.moduleInitialized = true;
  }
}

async myMethod() {
  await this.initModule();
  someModule.doSomething();
}
```

### Real Example from Your Codebase

See: `src/services/document-parser.service.ts`

```typescript
// Dynamic import for ESM module
let marked: any;

export class DocumentParserService {
  private markedInitialized = false;

  private async initMarked() {
    if (!this.markedInitialized) {
      const markedModule = await import('marked');
      marked = markedModule.marked;
      this.markedInitialized = true;
    }
  }

  async parseDocument(markdown: string): Promise<ParsedDocument> {
    await this.initMarked(); // Initialize before use
    const htmlContent = marked(rawContent) as string;
    // ... rest of code
  }
}
```

---

## 🚨 How to Identify ESM-Only Packages

### Method 1: Check package.json
```bash
cat node_modules/<package>/package.json | grep '"type"'
```

**Results**:
- `"type": "module"` → ESM-only ⚠️
- `"type": "commonjs"` → Safe ✅
- No "type" field → CommonJS by default ✅

### Method 2: Check exports field
```bash
cat node_modules/<package>/package.json | grep -A5 '"exports"'
```

**Look for**:
- Both `"import"` and `"require"` → Dual-mode ✅
- Only `"import"` → ESM-only ⚠️

---

## 📦 Common ESM-Only Packages to Watch

| Package | Version | Status |
|---------|---------|--------|
| `chalk` | v5+ | ESM-only (stay on v4 or use dynamic import) |
| `node-fetch` | v3+ | ESM-only (use `axios` or native `fetch`) |
| `got` | v12+ | ESM-only (use `axios` instead) |
| `nanoid` | v4+ | ESM-only (use dynamic import) |
| `ora` | v6+ | ESM-only (CLI spinner, use dynamic import) |
| `marked` | v10+ | ESM-only (use dynamic import) ✅ Already done |
| `uuid` | v10+ | ESM-only (use dynamic import) ⚠️ Monitor |

---

## 🛠️ Before Adding New Package

### Pre-Installation Checklist
```bash
# 1. Check npm page for ESM information
npm info <package-name>

# 2. Check latest version module type
npm info <package-name> type

# 3. Look at package.json on GitHub
# Search for "type": "module" in package.json

# 4. Test locally before committing
npm install <package-name>
npm run build
npm run typecheck
```

---

## 🔍 Quick Commands

### Check if package is ESM
```bash
npm list <package> --depth=0
cat node_modules/<package>/package.json | grep '"type"'
```

### Find all ESM packages in project
```bash
for dir in node_modules/*/; do
  pkg=$(basename "$dir")
  if grep -q '"type": "module"' "$dir/package.json" 2>/dev/null; then
    echo "ESM: $pkg"
  fi
done
```

### Search for static imports of a package
```bash
grep -r "from '<package>'" src/ --include="*.ts"
```

---

## 🎓 Why This Matters

### The Problem
Node.js has two module systems:
1. **CommonJS** (CJS) - `require()`, `module.exports`
2. **ES Modules** (ESM) - `import`, `export`

**Your project uses CommonJS** (`tsconfig.json`: `"module": "commonjs"`)

### The Issue
ESM-only packages can't be imported with static `import` in CommonJS projects at runtime, even though TypeScript compiles them fine.

### The Solution
Use **dynamic imports** (`await import()`) for ESM-only packages. This works in both CJS and ESM.

---

## 📋 Verification Checklist

After adding new packages:

- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm start` runs without import errors
- [ ] Runtime functionality works (test the feature)
- [ ] No "Cannot use import statement outside a module" errors
- [ ] No "require() of ES Module not supported" errors

---

## 🆘 Troubleshooting

### Error: "require() of ES Module not supported"
**Cause**: Trying to use `require()` on ESM-only package
**Fix**: Use dynamic import instead

### Error: "Cannot use import statement outside a module"
**Cause**: ESM code in CommonJS project
**Fix**: Use dynamic import or check `tsconfig.json` settings

### Build succeeds but runtime fails
**Cause**: TypeScript compiles but Node.js can't load ESM module
**Fix**: Convert static import to dynamic import

---

## 📚 Further Reading

- [Node.js ES Modules Documentation](https://nodejs.org/api/esm.html)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

---

**Last Updated**: 2025-10-12
**Quick Reference Version**: 1.0
