#!/usr/bin/env node
/**
 * Integration and End-to-End Testing Script
 * Agent 13: Integration & End-to-End Testing Specialist
 *
 * This script tests the complete workflow integration across all 7 modules
 */

const http = require('http');

// Test results tracker
const results = {
  api: { passed: 0, failed: 0, tests: [] },
  validation: { passed: 0, failed: 0, tests: [] },
  workflow: { passed: 0, failed: 0, tests: [] },
  issues: []
};

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Test API endpoint
async function testEndpoint(name, method, path, expectedStatus, postData = null) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  try {
    const response = await makeRequest(options, postData);
    const passed = response.statusCode === expectedStatus;

    const test = {
      name,
      method,
      path,
      expectedStatus,
      actualStatus: response.statusCode,
      passed,
      body: response.body
    };

    results.api.tests.push(test);
    if (passed) {
      results.api.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.api.failed++;
      console.log(`❌ ${name} - Expected ${expectedStatus}, got ${response.statusCode}`);
      if (response.body && response.body.error) {
        results.issues.push({
          type: 'API Error',
          endpoint: path,
          error: response.body.error.message || response.body.error
        });
      }
    }

    return test;
  } catch (error) {
    results.api.failed++;
    results.api.tests.push({
      name,
      method,
      path,
      passed: false,
      error: error.message
    });
    console.log(`❌ ${name} - ${error.message}`);
    results.issues.push({
      type: 'API Error',
      endpoint: path,
      error: error.message
    });
    return null;
  }
}

// Main test execution
async function runTests() {
  console.log('='.repeat(80));
  console.log('PROJECT CONDUCTOR - INTEGRATION & E2E TEST SUITE');
  console.log('Agent 13: Integration & End-to-End Testing Specialist');
  console.log('='.repeat(80));
  console.log('');

  // ========================================================================
  // 1. API INTEGRATION TESTS
  // ========================================================================
  console.log('📋 1. API INTEGRATION TESTS');
  console.log('-'.repeat(80));

  // Health check
  await testEndpoint('Health Check', 'GET', '/health', 200);

  // Requirements API
  await testEndpoint('GET /api/v1/requirements', 'GET', '/api/v1/requirements', 200);

  const createReqTest = await testEndpoint(
    'POST /api/v1/requirements (Create BRD)',
    'POST',
    '/api/v1/requirements',
    201,
    {
      title: 'Test BRD for Integration',
      type: 'BRD',
      description: 'Integration test BRD',
      priority: 'high',
      tags: ['test', 'integration']
    }
  );

  let createdReqId = null;
  if (createReqTest && createReqTest.body && createReqTest.body.data) {
    createdReqId = createReqTest.body.data.id;
    console.log(`   Created requirement: ${createdReqId}`);
  }

  if (createdReqId) {
    await testEndpoint(
      `GET /api/v1/requirements/${createdReqId}`,
      'GET',
      `/api/v1/requirements/${createdReqId}`,
      200
    );

    await testEndpoint(
      `PATCH /api/v1/requirements/${createdReqId}`,
      'PATCH',
      `/api/v1/requirements/${createdReqId}`,
      200,
      { status: 'under_review' }
    );
  }

  // Conflicts API
  await testEndpoint('GET /api/v1/conflicts', 'GET', '/api/v1/conflicts', 200);

  // Links API
  await testEndpoint('GET /api/v1/links', 'GET', '/api/v1/links', 200);

  // Comments API
  await testEndpoint('GET /api/v1/comments', 'GET', '/api/v1/comments', 200);

  // Quality API
  if (createdReqId) {
    await testEndpoint(
      `GET /api/v1/quality/${createdReqId}`,
      'GET',
      `/api/v1/quality/${createdReqId}`,
      200
    );
  }

  console.log('');

  // ========================================================================
  // 2. TRACEABILITY TESTS
  // ========================================================================
  console.log('📋 2. TRACEABILITY & DATA FLOW TESTS');
  console.log('-'.repeat(80));

  // Create BRD
  const brdTest = await testEndpoint(
    'Create BRD',
    'POST',
    '/api/v1/requirements',
    201,
    {
      title: 'Checkout Optimization BRD',
      type: 'BRD',
      description: 'Reduce cart abandonment rate',
      priority: 'critical',
      tags: ['revenue', 'checkout'],
      metadata: {
        businessImpact: '$2M annual revenue loss',
        stakeholders: 'Sales,Marketing,Engineering'
      }
    }
  );

  let brdId = null;
  if (brdTest && brdTest.body && brdTest.body.data) {
    brdId = brdTest.body.data.id;
    console.log(`   ✅ BRD Created: ${brdId}`);
  }

  // Create PRD linked to BRD
  let prdId = null;
  if (brdId) {
    const prdTest = await testEndpoint(
      'Create PRD linked to BRD',
      'POST',
      '/api/v1/requirements',
      201,
      {
        title: 'One-Click Checkout PRD',
        type: 'PRD',
        description: 'Enable saved payment methods',
        priority: 'critical',
        tags: ['checkout', 'ux'],
        metadata: {
          parentRequirement: brdId,
          alignment: 'aligned'
        }
      }
    );

    if (prdTest && prdTest.body && prdTest.body.data) {
      prdId = prdTest.body.data.id;
      console.log(`   ✅ PRD Created: ${prdId}`);

      // Create link between BRD and PRD
      const linkTest = await testEndpoint(
        'Create Link BRD → PRD',
        'POST',
        '/api/v1/links',
        201,
        {
          sourceId: brdId,
          targetId: prdId,
          linkType: 'derives',
          rationale: 'PRD implements BRD requirements'
        }
      );

      if (linkTest && linkTest.passed) {
        console.log(`   ✅ Traceability Link Created`);
      }
    }
  }

  // Create Design linked to PRD
  let designId = null;
  if (prdId) {
    const designTest = await testEndpoint(
      'Create Design linked to PRD',
      'POST',
      '/api/v1/requirements',
      201,
      {
        title: 'Payment Gateway Integration Design',
        type: 'DESIGN',
        description: 'Stripe API integration architecture',
        priority: 'critical',
        tags: ['backend', 'payment'],
        metadata: {
          parentRequirement: prdId,
          implementationStatus: 'in-progress'
        }
      }
    );

    if (designTest && designTest.body && designTest.body.data) {
      designId = designTest.body.data.id;
      console.log(`   ✅ Design Created: ${designId}`);

      if (prdId) {
        await testEndpoint(
          'Create Link PRD → Design',
          'POST',
          '/api/v1/links',
          201,
          {
            sourceId: prdId,
            targetId: designId,
            linkType: 'implements',
            rationale: 'Design implements PRD features'
          }
        );
      }
    }
  }

  console.log('');

  // ========================================================================
  // 3. VALIDATION TESTS
  // ========================================================================
  console.log('📋 3. VALIDATION RULE TESTS');
  console.log('-'.repeat(80));

  // Test missing required fields
  await testEndpoint(
    'Validation: Missing title',
    'POST',
    '/api/v1/requirements',
    400,
    {
      type: 'BRD',
      description: 'No title provided'
    }
  );

  // Test invalid enum values
  await testEndpoint(
    'Validation: Invalid priority',
    'POST',
    '/api/v1/requirements',
    400,
    {
      title: 'Test',
      priority: 'invalid_priority'
    }
  );

  console.log('');

  // ========================================================================
  // 4. ERROR HANDLING TESTS
  // ========================================================================
  console.log('📋 4. ERROR HANDLING TESTS');
  console.log('-'.repeat(80));

  // Test 404
  await testEndpoint(
    'Error: 404 Not Found',
    'GET',
    '/api/v1/requirements/INVALID-ID-999',
    404
  );

  // Test invalid endpoint
  await testEndpoint(
    'Error: 404 Invalid Endpoint',
    'GET',
    '/api/v1/invalid-endpoint',
    404
  );

  console.log('');

  // ========================================================================
  // FINAL REPORT
  // ========================================================================
  console.log('='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  console.log('API Tests:');
  console.log(`  ✅ Passed: ${results.api.passed}`);
  console.log(`  ❌ Failed: ${results.api.failed}`);
  console.log(`  📊 Total:  ${results.api.passed + results.api.failed}`);
  console.log('');

  if (results.issues.length > 0) {
    console.log('🐛 ISSUES FOUND:');
    console.log('-'.repeat(80));
    results.issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.type}] ${issue.endpoint || issue.module || ''}`);
      console.log(`   Error: ${issue.error}`);
      console.log('');
    });
  } else {
    console.log('✅ No issues found!');
  }

  console.log('='.repeat(80));
  console.log('');

  // Export detailed results
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/h0r03cw/Desktop/Coding/Project Conductor/test-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 Detailed results saved to: test-results.json');

  // Exit with appropriate code
  const totalFailed = results.api.failed + results.validation.failed + results.workflow.failed;
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
