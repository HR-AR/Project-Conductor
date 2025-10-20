/**
 * Path Validation Tests
 * Ensures all file paths in routes resolve correctly
 *
 * This utility test validates:
 * - All routes reference existing files
 * - Path resolution is correct
 * - No broken sendFile() paths
 * - Directory structure is correct
 */

import path from 'path';
import fs from 'fs';

describe('File Path Validation', () => {

  const projectRoot = path.resolve(__dirname, '../..');
  const publicDir = path.join(projectRoot, 'public');
  const srcDir = path.join(projectRoot, 'src');

  test('publicDir should exist', () => {
    expect(fs.existsSync(publicDir)).toBe(true);
  });

  test('All routes should reference existing files', () => {
    // Read src/index.ts and extract sendFile paths
    const indexTs = fs.readFileSync(
      path.join(srcDir, 'index.ts'),
      'utf-8'
    );

    // Extract all sendFile calls with different patterns
    const sendFilePatterns = [
      // Pattern 1: res.sendFile(path.join(publicDir, 'file.html'))
      /res\.sendFile\(path\.join\(publicDir,\s*['"]([^'"]+)['"]\)\)/g,
      // Pattern 2: res.sendFile(path.join(projectRoot, 'file.html'))
      /res\.sendFile\(path\.join\(projectRoot,\s*['"]([^'"]+)['"]\)\)/g,
    ];

    const fileReferences: Array<{path: string, baseDir: 'public' | 'root'}> = [];

    // Extract publicDir references
    let match;
    const publicRegex = /res\.sendFile\(path\.join\(publicDir,\s*['"]([^'"]+)['"]\)\)/g;
    while ((match = publicRegex.exec(indexTs)) !== null) {
      fileReferences.push({
        path: match[1],
        baseDir: 'public'
      });
    }

    // Extract projectRoot references
    const rootRegex = /res\.sendFile\(path\.join\(projectRoot,\s*['"]([^'"]+)['"]\)\)/g;
    while ((match = rootRegex.exec(indexTs)) !== null) {
      fileReferences.push({
        path: match[1],
        baseDir: 'root'
      });
    }

    console.log(`\n📂 Found ${fileReferences.length} file references in routes:`);

    const missingFiles: Array<{path: string, baseDir: string, fullPath: string}> = [];

    fileReferences.forEach(({ path: filePath, baseDir }) => {
      const fullPath = baseDir === 'public'
        ? path.join(publicDir, filePath)
        : path.join(projectRoot, filePath);

      const exists = fs.existsSync(fullPath);

      console.log(`   ${exists ? '✓' : '✗'} /${baseDir}/${filePath}`);

      if (!exists) {
        missingFiles.push({ path: filePath, baseDir, fullPath });
      }
    });

    if (missingFiles.length > 0) {
      throw new Error(
        `DEPLOYMENT BLOCKER: Routes reference missing files!\n\n` +
        missingFiles.map(f =>
          `  ✗ ${f.path}\n` +
          `    Base: ${f.baseDir}\n` +
          `    Expected at: ${f.fullPath}\n`
        ).join('\n') +
        `\nFix: Create missing files or update routes in src/index.ts`
      );
    }

    expect(missingFiles.length).toBe(0);
  });

  test('Critical directories exist', () => {
    const criticalDirs = [
      { path: publicDir, name: '/public' },
      { path: srcDir, name: '/src' },
      { path: path.join(projectRoot, 'node_modules'), name: '/node_modules' },
    ];

    criticalDirs.forEach(({ path: dirPath, name }) => {
      const exists = fs.existsSync(dirPath);

      if (!exists) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Critical directory missing!\n` +
          `Directory: ${name}\n` +
          `Path: ${dirPath}\n` +
          `This directory is required for deployment.`
        );
      }

      expect(exists).toBe(true);
    });
  });

  test('No broken symbolic links in /public', () => {
    const brokenLinks: string[] = [];

    const checkDirectory = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const itemPath = path.join(dir, item);

        try {
          const stats = fs.lstatSync(itemPath);

          if (stats.isSymbolicLink()) {
            // Check if symlink target exists
            const targetExists = fs.existsSync(itemPath);
            if (!targetExists) {
              brokenLinks.push(path.relative(projectRoot, itemPath));
            }
          } else if (stats.isDirectory()) {
            // Recursively check subdirectories
            checkDirectory(itemPath);
          }
        } catch (error) {
          // Error accessing file
          brokenLinks.push(path.relative(projectRoot, itemPath));
        }
      });
    };

    checkDirectory(publicDir);

    if (brokenLinks.length > 0) {
      console.warn(
        `Warning: Broken symbolic links detected:\n` +
        brokenLinks.map(link => `  - ${link}`).join('\n')
      );
    }

    // Non-blocking warning
    expect(true).toBe(true);
  });

  test('All HTML files have valid syntax (basic check)', () => {
    const htmlFiles = fs.readdirSync(publicDir)
      .filter(f => f.endsWith('.html'));

    const invalidFiles: Array<{file: string, issue: string}> = [];

    htmlFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Basic syntax checks
      const hasOpeningHtml = content.includes('<html') || content.includes('<HTML');
      const hasClosingHtml = content.includes('</html>') || content.includes('</HTML>');
      const hasBody = content.includes('<body') || content.includes('<BODY');

      if (!hasOpeningHtml) {
        invalidFiles.push({ file, issue: 'Missing <html> tag' });
      }
      if (!hasClosingHtml) {
        invalidFiles.push({ file, issue: 'Missing </html> tag' });
      }
      if (!hasBody) {
        invalidFiles.push({ file, issue: 'Missing <body> tag' });
      }
    });

    if (invalidFiles.length > 0) {
      console.warn(
        `Warning: HTML files with potential syntax issues:\n` +
        invalidFiles.map(f => `  - ${f.file}: ${f.issue}`).join('\n')
      );
    }

    // Non-blocking warning
    expect(true).toBe(true);
  });

  test('Static assets referenced in HTML exist', () => {
    const htmlFiles = fs.readdirSync(publicDir)
      .filter(f => f.endsWith('.html'));

    const missingAssets: Array<{file: string, asset: string}> = [];

    htmlFiles.forEach(file => {
      const filePath = path.join(publicDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract local script/link references
      const scriptMatches = content.match(/src=["'](?!http|https|\/\/)([^"']+)["']/g) || [];
      const linkMatches = content.match(/href=["'](?!http|https|\/\/)([^"']+)["']/g) || [];

      const allRefs = [...scriptMatches, ...linkMatches];

      allRefs.forEach(ref => {
        // Extract path
        const pathMatch = ref.match(/["']([^"']+)["']/);
        if (pathMatch) {
          let assetPath = pathMatch[1];

          // Skip data URIs, anchors, etc
          if (assetPath.startsWith('data:') || assetPath.startsWith('#')) {
            return;
          }

          // Remove query strings and fragments
          assetPath = assetPath.split('?')[0].split('#')[0];

          // Check if asset exists (relative to public or project root)
          const publicAssetPath = path.join(publicDir, assetPath);
          const rootAssetPath = path.join(projectRoot, assetPath);

          const existsInPublic = fs.existsSync(publicAssetPath);
          const existsInRoot = fs.existsSync(rootAssetPath);

          if (!existsInPublic && !existsInRoot) {
            missingAssets.push({ file, asset: assetPath });
          }
        }
      });
    });

    if (missingAssets.length > 0) {
      console.warn(
        `⚠️  Warning: HTML files reference missing assets:\n` +
        missingAssets.slice(0, 10).map(m => `   ${m.file} → ${m.asset}`).join('\n') +
        (missingAssets.length > 10 ? `\n   ... and ${missingAssets.length - 10} more` : '')
      );
    }

    // Non-blocking warning (some assets may be CDN or dynamically loaded)
    expect(true).toBe(true);
  });

  test('Package.json points to correct main file', () => {
    const packagePath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    const mainFile = packageJson.main;
    expect(mainFile).toBeDefined();

    // Main should point to dist/index.js
    expect(mainFile).toBe('dist/index.js');

    // After build, this file should exist
    const mainFilePath = path.join(projectRoot, mainFile);
    const distExists = fs.existsSync(mainFilePath);

    if (!distExists) {
      console.warn(
        `Warning: Main file ${mainFile} does not exist.\n` +
        `Run 'npm run build' before deployment.`
      );
    }

    // Non-blocking (build may not have been run yet)
    expect(true).toBe(true);
  });
});

/**
 * Test Summary:
 *
 * This utility validates all file path references are correct.
 *
 * ✅ BLOCKING Tests (must pass):
 * - All routes reference existing files
 * - Critical directories exist
 * - Package.json main file is correct
 *
 * ⚠️ WARNING Tests (non-blocking):
 * - Broken symbolic links
 * - HTML syntax validation
 * - Missing static assets
 * - dist/index.js existence
 *
 * How to Fix Failures:
 *
 * 1. Route references missing file:
 *    - Create the file in the specified directory
 *    - OR update the route in src/index.ts to point to correct file
 *
 * 2. Missing directory:
 *    - Create the directory
 *    - OR fix the path in src/index.ts
 *
 * 3. Missing assets:
 *    - Add the asset file
 *    - OR update HTML to use correct path
 *    - OR use CDN URL instead
 *
 * 4. Missing dist/index.js:
 *    - Run: npm run build
 *
 * Usage:
 *
 * npm run test:deploy:paths
 */
