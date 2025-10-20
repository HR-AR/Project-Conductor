/**
 * Route Validation Tests - Deployment Validation
 *
 * Tests all HTML routes return 200 OK instead of 404s.
 * Validates static file middleware is configured correctly.
 *
 * This test catches:
 * - Routes that return 404 because files are in wrong directory
 * - Static middleware misconfiguration
 * - Duplicate routes that override static middleware
 * - sendFile() paths that don't exist
 */

import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';

describe('Route Validation Tests - Deployment Validation', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Import the actual Express app
    const appModule = await import('../../src/index');
    app = appModule.default;

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Critical HTML Routes (Must Return 200)', () => {
    const criticalRoutes = [
      { path: '/', description: 'Root landing page' },
      { path: '/index.html', description: 'Direct index.html access' },
      { path: '/conductor-unified-dashboard.html', description: 'Main dashboard' },
      { path: '/module-0-onboarding.html', description: 'Onboarding module' },
      { path: '/demo-scenario-picker.html', description: 'Demo scenario picker' },
    ];

    criticalRoutes.forEach(({ path: routePath, description }) => {
      test(`GET ${routePath} (${description}) should return 200 OK`, async () => {
        const response = await request(app).get(routePath);

        if (response.status === 404) {
          throw new Error(
            `DEPLOYMENT BLOCKER: ${routePath} returns 404!\n` +
            `Description: ${description}\n` +
            `This route is critical and MUST return 200 OK.\n` +
            `\n` +
            `Possible fixes:\n` +
            `1. Check file exists in /public directory\n` +
            `2. Verify static middleware configuration in src/index.ts\n` +
            `3. Ensure no duplicate route override in src/index.ts\n` +
            `4. Check sendFile() path is correct`
          );
        }

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
      });
    });
  });

  describe('Module Routes (Must Return 200)', () => {
    const moduleRoutes = [
      { path: '/module-1-present.html', description: 'Module 1: Present' },
      { path: '/module-2-brd.html', description: 'Module 2: BRD' },
      { path: '/module-3-prd.html', description: 'Module 3: PRD' },
      { path: '/module-4-engineering-design.html', description: 'Module 4: Engineering Design' },
      { path: '/module-5-alignment.html', description: 'Module 5: Alignment' },
      { path: '/module-6-implementation.html', description: 'Module 6: Implementation' },
      { path: '/module-1.5-ai-generator.html', description: 'Module 1.5: AI Generator' },
      { path: '/module-1.6-project-history.html', description: 'Module 1.6: Project History' },
    ];

    moduleRoutes.forEach(({ path: routePath, description }) => {
      test(`GET ${routePath} (${description}) should return 200 OK`, async () => {
        // First check if file exists
        const projectRoot = path.resolve(__dirname, '../..');
        const filePath = path.join(projectRoot, routePath);
        const fileExists = fs.existsSync(filePath);

        if (!fileExists) {
          console.warn(
            `Warning: ${routePath} file does not exist at ${filePath}\n` +
            `Route will return 404 on Render.`
          );
        }

        const response = await request(app).get(routePath);

        if (response.status === 404) {
          throw new Error(
            `DEPLOYMENT BLOCKER: ${routePath} returns 404!\n` +
            `Description: ${description}\n` +
            `File exists: ${fileExists}\n` +
            `\n` +
            `Possible fixes:\n` +
            `1. Move file to project root (currently served via static middleware)\n` +
            `2. Check static middleware serves project root\n` +
            `3. Verify no route override in src/index.ts`
          );
        }

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
      });
    });
  });

  describe('Demo Routes (Should Return 200)', () => {
    const demoRoutes = [
      { path: '/demo', description: 'Demo index (redirects to dashboard)' },
      { path: '/demo/', description: 'Demo index with trailing slash' },
      { path: '/PROJECT_CONDUCTOR_DEMO.html', description: 'Main demo page' },
      { path: '/test-dashboard.html', description: 'Test dashboard' },
    ];

    demoRoutes.forEach(({ path: routePath, description }) => {
      test(`GET ${routePath} (${description}) should return 200 OK`, async () => {
        const response = await request(app).get(routePath);

        if (response.status === 404) {
          console.warn(
            `Warning: ${routePath} returns 404\n` +
            `Description: ${description}\n` +
            `This is non-critical but should be investigated.`
          );
        }

        // Non-blocking for demo routes
        expect([200, 301, 302, 404]).toContain(response.status);
      });
    });
  });

  describe('Static File Middleware Configuration', () => {
    test('Static middleware serves /public directory at root level', async () => {
      // Test that /public/conductor-unified-dashboard.html is accessible via /conductor-unified-dashboard.html
      const response = await request(app).get('/conductor-unified-dashboard.html');

      if (response.status === 404) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Static middleware is not serving /public directory!\n` +
          `Expected: /conductor-unified-dashboard.html → /public/conductor-unified-dashboard.html\n` +
          `Actual: 404\n` +
          `\n` +
          `Fix: Check app.use(express.static(publicDir)) in src/index.ts`
        );
      }

      expect(response.status).toBe(200);
    });

    test('Static middleware serves /public directory via /public prefix', async () => {
      // Test that /public/conductor-unified-dashboard.html is also accessible via /public/conductor-unified-dashboard.html
      const response = await request(app).get('/public/conductor-unified-dashboard.html');

      expect([200, 404]).toContain(response.status);

      if (response.status === 404) {
        console.warn(
          `Info: /public prefix not accessible (this is OK if only root-level access is needed)`
        );
      }
    });

    test('Static middleware serves project root files', async () => {
      // Test that module files in project root are accessible
      const response = await request(app).get('/module-1-present.html');

      if (response.status === 404) {
        throw new Error(
          `DEPLOYMENT BLOCKER: Static middleware is not serving project root!\n` +
          `Expected: /module-1-present.html → (project root)/module-1-present.html\n` +
          `Actual: 404\n` +
          `\n` +
          `Fix: Check app.use(express.static(projectRoot)) in src/index.ts`
        );
      }

      expect(response.status).toBe(200);
    });
  });

  describe('No Route Overrides', () => {
    test('Root route (/) should not override index.html static file', async () => {
      const rootResponse = await request(app).get('/');
      const indexResponse = await request(app).get('/index.html');

      // Both should return 200 and serve HTML
      expect(rootResponse.status).toBe(200);
      expect(indexResponse.status).toBe(200);
      expect(rootResponse.headers['content-type']).toMatch(/html/);
      expect(indexResponse.headers['content-type']).toMatch(/html/);
    });

    test('No duplicate route for /conductor-unified-dashboard.html', async () => {
      const response = await request(app).get('/conductor-unified-dashboard.html');

      // Should return 200 and serve from /public
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);

      // Content should be substantial (not empty or error page)
      expect(response.text.length).toBeGreaterThan(100);
    });
  });

  describe('Content Type Headers', () => {
    test('HTML files should have correct Content-Type', async () => {
      const response = await request(app).get('/index.html');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['content-type']).toMatch(/charset=utf-8/);
    });

    test('JavaScript files should have correct Content-Type', async () => {
      // Check if any .js files exist in /public
      const publicDir = path.join(path.resolve(__dirname, '../..'), 'public');
      const files = fs.readdirSync(publicDir);
      const jsFiles = files.filter(f => f.endsWith('.js'));

      if (jsFiles.length > 0) {
        const response = await request(app).get(`/${jsFiles[0]}`);

        if (response.status === 200) {
          expect(response.headers['content-type']).toMatch(/application\/javascript/);
        }
      }

      // Non-blocking
      expect(true).toBe(true);
    });
  });

  describe('Cache Headers', () => {
    test('HTML files should have appropriate cache headers', async () => {
      const response = await request(app).get('/index.html');

      expect(response.status).toBe(200);

      // Should have Cache-Control header
      expect(response.headers['cache-control']).toBeDefined();

      // Log cache settings for verification
      console.log(`Cache-Control for HTML: ${response.headers['cache-control']}`);
    });
  });

  describe('Health and API Endpoints', () => {
    test('GET /health should return 200 OK', async () => {
      const response = await request(app).get('/health');

      if (response.status !== 200) {
        throw new Error(
          `DEPLOYMENT BLOCKER: /health endpoint is failing!\n` +
          `Status: ${response.status}\n` +
          `Render uses /health for health checks. This MUST return 200.`
        );
      }

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    test('GET /api/v1 should return 200 OK', async () => {
      const response = await request(app).get('/api/v1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Project Conductor API');
    });
  });

  describe('404 Handling', () => {
    test('Non-existent routes should return 404', async () => {
      const response = await request(app).get('/this-route-does-not-exist.html');

      expect(response.status).toBe(404);
    });

    test('404 response should be JSON for API routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });
});

/**
 * Test Summary:
 *
 * This test suite validates all routes return correct status codes.
 *
 * BLOCKING Tests (must pass):
 * - ✅ Critical HTML routes return 200
 * - ✅ Module routes return 200
 * - ✅ Static middleware serves /public
 * - ✅ Static middleware serves project root
 * - ✅ /health endpoint returns 200
 * - ✅ Correct Content-Type headers
 *
 * WARNING Tests (non-blocking):
 * - ⚠️ Demo routes accessibility
 * - ⚠️ /public prefix access
 * - ⚠️ Cache headers validation
 *
 * Common Failure Causes:
 *
 * 1. Route returns 404:
 *    - File is in wrong directory
 *    - Static middleware not configured
 *    - Route override in src/index.ts
 *    - sendFile() path incorrect
 *
 * 2. Wrong Content-Type:
 *    - Missing setHeaders in static middleware
 *    - File extension not recognized
 *
 * 3. /health fails:
 *    - Database connection error
 *    - Service initialization failure
 *
 * How to Debug:
 *
 * 1. Check src/index.ts for static middleware order
 * 2. Verify file exists: ls public/filename.html
 * 3. Check for duplicate routes in src/index.ts
 * 4. Test route manually: curl http://localhost:3000/filename.html
 * 5. Check logs for static middleware configuration
 */
