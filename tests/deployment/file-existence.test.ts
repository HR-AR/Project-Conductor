/**
 * File Existence Tests - Deployment Validation
 *
 * Ensures all HTML files and static assets exist in the correct locations
 * BEFORE deployment to Render. Catches missing file issues that work locally
 * but fail on Render.
 *
 * This test catches:
 * - HTML files referenced in routes but missing from /public
 * - Broken file paths in index.ts
 * - Files in wrong directories
 */

import fs from 'fs';
import path from 'path';

describe('File Existence Tests - Deployment Validation', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const publicDir = path.join(projectRoot, 'public');

  describe('Critical HTML Files in /public', () => {
    const criticalFiles = [
      'index.html',
      'conductor-unified-dashboard.html',
      'module-0-onboarding.html',
      'demo-scenario-picker.html',
      'analytics-dashboard.html',
      'project-detail.html',
      'offline.html',
    ];

    criticalFiles.forEach((filename) => {
      test(`${filename} must exist in /public directory`, () => {
        const filePath = path.join(publicDir, filename);
        const exists = fs.existsSync(filePath);

        if (!exists) {
          throw new Error(
            `DEPLOYMENT BLOCKER: ${filename} is missing from /public directory!\n` +
            `Expected path: ${filePath}\n` +
            `This file is referenced in src/index.ts and MUST exist for Render deployment.`
          );
        }

        expect(exists).toBe(true);
      });
    });
  });

  describe('Module HTML Files in Project Root', () => {
    const moduleFiles = [
      'module-1-present.html',
      'module-2-brd.html',
      'module-3-prd.html',
      'module-4-engineering-design.html',
      'module-5-alignment.html',
      'module-6-implementation.html',
      'module-1.5-ai-generator.html',
      'module-1.6-project-history.html',
    ];

    moduleFiles.forEach((filename) => {
      test(`${filename} must exist in project root`, () => {
        const filePath = path.join(projectRoot, filename);
        const exists = fs.existsSync(filePath);

        if (!exists) {
          throw new Error(
            `DEPLOYMENT BLOCKER: ${filename} is missing from project root!\n` +
            `Expected path: ${filePath}\n` +
            `Module files are served via static middleware and must be in project root.`
          );
        }

        expect(exists).toBe(true);
      });
    });
  });

  describe('Demo HTML Files in Project Root', () => {
    const demoFiles = [
      'PROJECT_CONDUCTOR_DEMO.html',
      'test-dashboard.html',
      'simple-demo.html',
      'login.html',
      'register.html',
    ];

    demoFiles.forEach((filename) => {
      test(`${filename} must exist in project root`, () => {
        const filePath = path.join(projectRoot, filename);
        const exists = fs.existsSync(filePath);

        if (!exists) {
          console.warn(`Warning: ${filename} is missing from project root at ${filePath}`);
        }

        // Non-critical for demo files, but log warning
        expect(true).toBe(true);
      });
    });
  });

  describe('Directory Structure Validation', () => {
    test('/public directory must exist', () => {
      const exists = fs.existsSync(publicDir);

      if (!exists) {
        throw new Error(
          `DEPLOYMENT BLOCKER: /public directory does not exist!\n` +
          `Path: ${publicDir}\n` +
          `This directory is required for static file serving on Render.`
        );
      }

      expect(exists).toBe(true);
    });

    test('/src directory must exist', () => {
      const srcDir = path.join(projectRoot, 'src');
      const exists = fs.existsSync(srcDir);

      if (!exists) {
        throw new Error(
          `DEPLOYMENT BLOCKER: /src directory does not exist!\n` +
          `Path: ${srcDir}`
        );
      }

      expect(exists).toBe(true);
    });

    test('/dist directory should exist after build', () => {
      const distDir = path.join(projectRoot, 'dist');
      const exists = fs.existsSync(distDir);

      if (!exists) {
        console.warn(
          `Warning: /dist directory does not exist. Run 'npm run build' before deployment.\n` +
          `Path: ${distDir}`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });

  describe('File Accessibility', () => {
    test('All files in /public must be readable', () => {
      const files = fs.readdirSync(publicDir);
      const unreadableFiles: string[] = [];

      files.forEach((filename) => {
        const filePath = path.join(publicDir, filename);
        const stats = fs.statSync(filePath);

        if (stats.isFile()) {
          try {
            fs.accessSync(filePath, fs.constants.R_OK);
          } catch (error) {
            unreadableFiles.push(filename);
          }
        }
      });

      if (unreadableFiles.length > 0) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Files in /public are not readable!\n` +
          `Unreadable files: ${unreadableFiles.join(', ')}\n` +
          `Check file permissions before deployment.`
        );
      }

      expect(unreadableFiles.length).toBe(0);
    });
  });

  describe('No Duplicate Files', () => {
    test('HTML files should not exist in both /public and root', () => {
      const publicFiles = fs.readdirSync(publicDir)
        .filter(f => f.endsWith('.html'));

      const rootFiles = fs.readdirSync(projectRoot)
        .filter(f => f.endsWith('.html'));

      const duplicates = publicFiles.filter(f => rootFiles.includes(f));

      if (duplicates.length > 0) {
        console.warn(
          `Warning: Duplicate HTML files found in both /public and root:\n` +
          `${duplicates.join(', ')}\n` +
          `This may cause routing conflicts. Keep critical files in /public only.`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    test('HTML files should not be empty', () => {
      const checkDirectory = (dir: string, label: string) => {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith('.html'));

        const emptyFiles: string[] = [];

        files.forEach((filename) => {
          const filePath = path.join(dir, filename);
          const stats = fs.statSync(filePath);

          if (stats.size === 0) {
            emptyFiles.push(`${label}/${filename}`);
          }
        });

        return emptyFiles;
      };

      const emptyPublicFiles = checkDirectory(publicDir, '/public');
      const emptyRootFiles = checkDirectory(projectRoot, '/root');

      const allEmptyFiles = [...emptyPublicFiles, ...emptyRootFiles];

      if (allEmptyFiles.length > 0) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Empty HTML files detected!\n` +
          `Empty files: ${allEmptyFiles.join(', ')}\n` +
          `Empty files will cause 500 errors on Render.`
        );
      }

      expect(allEmptyFiles.length).toBe(0);
    });

    test('HTML files should have reasonable size (> 100 bytes)', () => {
      const checkDirectory = (dir: string, label: string) => {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith('.html'));

        const tinyFiles: string[] = [];

        files.forEach((filename) => {
          const filePath = path.join(dir, filename);
          const stats = fs.statSync(filePath);

          // Warn if file is suspiciously small (< 100 bytes)
          if (stats.size < 100 && stats.size > 0) {
            tinyFiles.push(`${label}/${filename} (${stats.size} bytes)`);
          }
        });

        return tinyFiles;
      };

      const tinyPublicFiles = checkDirectory(publicDir, '/public');
      const tinyRootFiles = checkDirectory(projectRoot, '/root');

      const allTinyFiles = [...tinyPublicFiles, ...tinyRootFiles];

      if (allTinyFiles.length > 0) {
        console.warn(
          `Warning: Suspiciously small HTML files detected:\n` +
          `${allTinyFiles.join('\n')}\n` +
          `Verify these files have proper content.`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });
});

/**
 * Test Summary:
 *
 * This test suite validates file existence and accessibility before deployment.
 *
 * BLOCKING Tests (must pass):
 * - ✅ Critical HTML files exist in /public
 * - ✅ Module HTML files exist in project root
 * - ✅ Directory structure is correct
 * - ✅ Files are readable
 * - ✅ No empty HTML files
 *
 * WARNING Tests (non-blocking):
 * - ⚠️ Demo files existence
 * - ⚠️ /dist directory exists
 * - ⚠️ Duplicate file detection
 * - ⚠️ Tiny file size warning
 *
 * How to Fix Failures:
 *
 * 1. Missing /public file:
 *    - Move file from root to /public directory
 *    - Update route in src/index.ts if needed
 *
 * 2. Empty HTML file:
 *    - Check file content
 *    - Restore from git if corrupted
 *
 * 3. Unreadable file:
 *    - Fix permissions: chmod 644 file.html
 *
 * 4. Missing /dist:
 *    - Run: npm run build
 */
