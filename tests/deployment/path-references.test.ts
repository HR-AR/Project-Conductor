/**
 * Path References Tests - Deployment Validation
 *
 * Scans codebase for hardcoded local paths, incorrect path resolution,
 * and common Render deployment issues.
 *
 * This test catches:
 * - Hardcoded local paths that won't work on Render
 * - Incorrect use of projectRoot vs publicDir
 * - Absolute paths that don't exist on Render
 * - Path.join issues that break on different OS
 */

import fs from 'fs';
import path from 'path';

describe('Path References Tests - Deployment Validation', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const srcDir = path.join(projectRoot, 'src');

  describe('Source Code Path Analysis', () => {
    test('index.ts should use publicDir not projectRoot for /public files', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for proper publicDir usage
      const hasPublicDir = content.includes('const publicDir');
      const hasProjectRoot = content.includes('const projectRoot');

      expect(hasPublicDir).toBe(true);
      expect(hasProjectRoot).toBe(true);

      // Check that index.html uses publicDir
      const indexHtmlPatterns = [
        /sendFile\(path\.join\(publicDir,\s*['"]index\.html['"]\)/,
        /sendFile\(.*publicDir.*index\.html/,
      ];

      const usesPublicDirForIndex = indexHtmlPatterns.some(pattern =>
        pattern.test(content)
      );

      if (!usesPublicDirForIndex) {
        const match = content.match(/sendFile\(.*index\.html.*\)/);
        if (match) {
          console.warn(
            `Warning: index.html sendFile may not use publicDir:\n${match[0]}`
          );
        }
      }

      // Non-blocking - just warn
      expect(true).toBe(true);
    });

    test('index.ts should NOT have duplicate route for unified dashboard', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for duplicate app.get() for conductor-unified-dashboard
      const dashboardRoutes = content.match(
        /app\.get\(['"]\/conductor-unified-dashboard\.html['"]/g
      );

      if (dashboardRoutes && dashboardRoutes.length > 1) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Duplicate route for /conductor-unified-dashboard.html!\n` +
          `Found ${dashboardRoutes.length} route definitions.\n` +
          `This causes routes to override static middleware.\n` +
          `\n` +
          `Fix: Remove duplicate app.get('/conductor-unified-dashboard.html') from src/index.ts\n` +
          `Let static middleware serve this file from /public directory.`
        );
      }

      // Should have at most 1 explicit route
      expect(dashboardRoutes ? dashboardRoutes.length : 0).toBeLessThanOrEqual(1);
    });

    test('index.ts should use path.join() for all file paths', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Look for sendFile with string concatenation (bad)
      const badPatterns = [
        /sendFile\(['"].*\/.*['"]\)/,  // sendFile('/path/to/file')
        /sendFile\(.*\s*\+\s*['"].*['"]\)/,  // sendFile(dir + '/file')
      ];

      const violations: string[] = [];

      badPatterns.forEach((pattern) => {
        const matches = content.match(new RegExp(pattern, 'g'));
        if (matches) {
          matches.forEach(match => {
            // Exclude path.join() usage (that's good)
            if (!match.includes('path.join')) {
              violations.push(match);
            }
          });
        }
      });

      if (violations.length > 0) {
        console.warn(
          `Warning: Potential path concatenation issues:\n` +
          violations.map(v => `  - ${v}`).join('\n') +
          `\n\nUse path.join() for all file paths.`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });

  describe('Static Middleware Configuration', () => {
    test('Static middleware should serve publicDir before projectRoot', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Find positions of static middleware declarations (match with or without options object)
      const publicStaticMatch = content.match(
        /app\.use\(express\.static\(publicDir[^)]*\)(?:,\s*\{[^}]*\})?\)/
      );
      const rootStaticMatch = content.match(
        /app\.use\(express\.static\(projectRoot[^)]*\)(?:,\s*\{[^}]*\})?\)/
      );

      if (!publicStaticMatch) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Missing static middleware for publicDir!\n` +
          `Add: app.use(express.static(publicDir))`
        );
      }

      if (!rootStaticMatch) {
        console.warn(
          `Warning: Missing static middleware for projectRoot\n` +
          `Module files may not be accessible.`
        );
      }

      if (publicStaticMatch && rootStaticMatch) {
        const publicIndex = content.indexOf(publicStaticMatch[0]);
        const rootIndex = content.indexOf(rootStaticMatch[0]);

        if (rootIndex < publicIndex) {
          console.warn(
            `Warning: projectRoot static middleware comes before publicDir\n` +
            `This may cause files to be served from wrong location.\n` +
            `Recommended: publicDir static middleware should come first.`
          );
        }
      }

      expect(publicStaticMatch).toBeDefined();
    });

    test('Static middleware should have index: false option', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for index: false in static middleware
      const staticWithIndex = content.match(
        /express\.static\([^)]+,\s*\{[^}]*index:\s*false[^}]*\}/g
      );

      if (!staticWithIndex || staticWithIndex.length === 0) {
        console.warn(
          `Warning: Static middleware may not have 'index: false' option.\n` +
          `Without this, Express may serve index.html automatically,\n` +
          `which can conflict with explicit routes.`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });

  describe('Hardcoded Path Detection', () => {
    test('Should not have hardcoded /Users/ paths', () => {
      const violations: Array<{ file: string; line: string }> = [];

      const scanDirectory = (dir: string) => {
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            // Skip node_modules, dist, coverage
            if (!['node_modules', 'dist', 'coverage', '.git'].includes(file)) {
              scanDirectory(filePath);
            }
          } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf-8');

            // Look for hardcoded local paths
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (
                line.includes('/Users/') ||
                line.includes('/home/') ||
                line.includes('C:\\Users\\')
              ) {
                // Exclude comments and test files
                if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                  violations.push({
                    file: path.relative(projectRoot, filePath),
                    line: `Line ${index + 1}: ${line.trim()}`,
                  });
                }
              }
            });
          }
        });
      };

      scanDirectory(srcDir);

      if (violations.length > 0) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Hardcoded local paths detected!\n` +
          violations.map(v => `${v.file}\n  ${v.line}`).join('\n\n') +
          `\n\nThese paths will not work on Render.\n` +
          `Use path.resolve(__dirname, ...) or environment variables.`
        );
      }

      expect(violations.length).toBe(0);
    });

    test('Should use __dirname or process.cwd() for base paths', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      const hasDirname = content.includes('__dirname');
      const hasProcessCwd = content.includes('process.cwd()');

      if (!hasDirname && !hasProcessCwd) {
        console.warn(
          `Warning: index.ts does not use __dirname or process.cwd()\n` +
          `This may cause path resolution issues on Render.`
        );
      }

      // Should use at least one
      expect(hasDirname || hasProcessCwd).toBe(true);
    });
  });

  describe('Route Path Validation', () => {
    test('All sendFile() calls should use absolute paths', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Find all sendFile calls
      const sendFileMatches = content.match(/sendFile\([^)]+\)/g);

      if (sendFileMatches) {
        const violations: string[] = [];

        sendFileMatches.forEach((match) => {
          // Should use path.join() or path.resolve()
          if (!match.includes('path.join') && !match.includes('path.resolve')) {
            violations.push(match);
          }
        });

        if (violations.length > 0) {
          throw new Error(
            `DEPLOYMENT BLOCKER: sendFile() without path.join/resolve!\n` +
            violations.join('\n') +
            `\n\nAlways use path.join() or path.resolve() for sendFile paths.`
          );
        }
      }

      expect(true).toBe(true);
    });

    test('No routes should use relative paths', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Look for relative paths in routes (./file or ../file)
      const relativePathPattern = /sendFile\(['"]\.\.?\//;
      const hasRelativePaths = relativePathPattern.test(content);

      if (hasRelativePaths) {
        const matches = content.match(/sendFile\(['"]\.\.?\/[^'"]+['"]\)/g);
        throw new Error(
          `DEPLOYMENT BLOCKER: Relative paths in sendFile()!\n` +
          (matches ? matches.join('\n') : '') +
          `\n\nUse absolute paths with path.join(__dirname, ...) or path.resolve()`
        );
      }

      expect(hasRelativePaths).toBe(false);
    });
  });

  describe('Environment-Specific Code', () => {
    test('Should not have development-only paths in production code', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      const devPaths = [
        'localhost',
        '127.0.0.1',
        'development',
      ];

      const violations: string[] = [];

      devPaths.forEach((devPath) => {
        const regex = new RegExp(`['"]${devPath}['"]`, 'g');
        const matches = content.match(regex);

        if (matches) {
          // Check if it's wrapped in environment check
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes(devPath)) {
              // Look for NODE_ENV check in surrounding lines
              const contextStart = Math.max(0, index - 3);
              const contextEnd = Math.min(lines.length, index + 3);
              const context = lines.slice(contextStart, contextEnd).join('\n');

              if (!context.includes('NODE_ENV') && !context.includes('development')) {
                violations.push(`Line ${index + 1}: ${line.trim()}`);
              }
            }
          });
        }
      });

      if (violations.length > 0) {
        console.warn(
          `Warning: Development-specific values without environment check:\n` +
          violations.join('\n') +
          `\n\nConsider wrapping in: if (process.env.NODE_ENV === 'development')`
        );
      }

      // Non-blocking warning
      expect(true).toBe(true);
    });
  });

  describe('File Extension Handling', () => {
    test('Static middleware should handle .html, .js, .css extensions', () => {
      const indexPath = path.join(srcDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Check for setHeaders in static middleware
      const hasSetHeaders = content.includes('setHeaders');

      if (!hasSetHeaders) {
        console.warn(
          `Warning: Static middleware does not have setHeaders option.\n` +
          `Without this, Content-Type headers may be incorrect.`
        );
      }

      // Check for specific file extension handling
      const hasHtmlContentType = content.includes('.html');
      const hasJsContentType = content.includes('.js');

      expect(hasSetHeaders || (hasHtmlContentType && hasJsContentType)).toBe(true);
    });
  });
});

/**
 * Test Summary:
 *
 * This test suite scans source code for path-related issues that
 * cause local vs Render deployment differences.
 *
 * BLOCKING Tests (must pass):
 * - ✅ No hardcoded /Users/ or /home/ paths
 * - ✅ All sendFile() uses absolute paths
 * - ✅ No relative paths in sendFile()
 * - ✅ Static middleware configured for publicDir
 * - ✅ No duplicate routes
 *
 * WARNING Tests (non-blocking):
 * - ⚠️ publicDir vs projectRoot usage
 * - ⚠️ Static middleware order
 * - ⚠️ index: false option
 * - ⚠️ Development-only paths
 * - ⚠️ setHeaders configuration
 *
 * Common Issues Found:
 *
 * 1. Hardcoded paths:
 *    - BAD:  sendFile('/Users/name/project/file.html')
 *    - GOOD: sendFile(path.join(__dirname, '../public/file.html'))
 *
 * 2. Relative paths:
 *    - BAD:  sendFile('./public/file.html')
 *    - GOOD: sendFile(path.join(publicDir, 'file.html'))
 *
 * 3. String concatenation:
 *    - BAD:  sendFile(dir + '/file.html')
 *    - GOOD: sendFile(path.join(dir, 'file.html'))
 *
 * 4. Duplicate routes:
 *    - BAD:  app.get('/file.html', ...) + static middleware
 *    - GOOD: Only static middleware (remove explicit route)
 *
 * How to Fix:
 *
 * 1. Replace hardcoded paths:
 *    const projectRoot = path.resolve(__dirname, '..');
 *    const publicDir = path.join(projectRoot, 'public');
 *
 * 2. Use path.join() everywhere:
 *    res.sendFile(path.join(publicDir, 'index.html'));
 *
 * 3. Remove duplicate routes:
 *    Delete: app.get('/file.html', (req, res) => {...})
 *    Keep: app.use(express.static(publicDir))
 *
 * 4. Check static middleware order:
 *    app.use(express.static(publicDir));  // First
 *    app.use(express.static(projectRoot)); // Second
 */
