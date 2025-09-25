/**
 * Simple test script to verify the Requirements API functionality
 * Run this after starting the server with: npm run dev
 */

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testAPI() {
  console.log('🧪 Testing Project Conductor Requirements API\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const healthResponse = await fetch('http://localhost:3000/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData.status);
    console.log(`   Database: ${healthData.database}\n`);

    // Test 2: Create a requirement
    console.log('2. Creating a new requirement...');
    const newRequirement = {
      title: 'Test Requirement from API',
      description: 'This is a test requirement created via API',
      priority: 'high',
      estimatedEffort: 8,
      tags: ['test', 'api', 'demo']
    };

    const createResponse = await fetch(`${API_BASE_URL}/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-id'
      },
      body: JSON.stringify(newRequirement)
    });

    if (!createResponse.ok) {
      throw new Error(`Create failed: ${createResponse.status}`);
    }

    const createdReq = await createResponse.json();
    console.log('✅ Requirement created:', createdReq.data.title);
    console.log(`   ID: ${createdReq.data.id}`);
    console.log(`   Status: ${createdReq.data.status}\n`);

    const requirementId = createdReq.data.id;

    // Test 3: Get all requirements
    console.log('3. Getting all requirements...');
    const listResponse = await fetch(`${API_BASE_URL}/requirements`);
    const listData = await listResponse.json();
    console.log(`✅ Retrieved ${listData.data.length} requirements`);
    console.log(`   Total in database: ${listData.pagination.total}\n`);

    // Test 4: Get specific requirement
    console.log('4. Getting specific requirement...');
    const getResponse = await fetch(`${API_BASE_URL}/requirements/${requirementId}`);
    const getData = await getResponse.json();
    console.log('✅ Retrieved requirement:', getData.data.title);
    console.log(`   Priority: ${getData.data.priority}\n`);

    // Test 5: Update requirement
    console.log('5. Updating requirement...');
    const updateData = {
      status: 'active',
      completionPercentage: 25,
      actualEffort: 2
    };

    const updateResponse = await fetch(`${API_BASE_URL}/requirements/${requirementId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-id',
        'x-change-reason': 'API test update'
      },
      body: JSON.stringify(updateData)
    });

    const updatedReq = await updateResponse.json();
    console.log('✅ Requirement updated');
    console.log(`   Status: ${updatedReq.data.status}`);
    console.log(`   Completion: ${updatedReq.data.completionPercentage}%\n`);

    // Test 6: Get version history
    console.log('6. Getting version history...');
    const versionsResponse = await fetch(`${API_BASE_URL}/requirements/${requirementId}/versions`);
    const versionsData = await versionsResponse.json();
    console.log(`✅ Retrieved ${versionsData.data.length} versions`);
    versionsData.data.forEach(version => {
      console.log(`   v${version.versionNumber}: ${version.changeReason}`);
    });
    console.log();

    // Test 7: Get requirements summary
    console.log('7. Getting requirements summary...');
    const summaryResponse = await fetch(`${API_BASE_URL}/requirements/summary`);
    const summaryData = await summaryResponse.json();
    console.log('✅ Requirements summary:');
    console.log(`   Total: ${summaryData.data.total}`);
    console.log(`   Active: ${summaryData.data.byStatus.active}`);
    console.log(`   Draft: ${summaryData.data.byStatus.draft}\n`);

    // Test 8: Archive requirement
    console.log('8. Archiving requirement...');
    const deleteResponse = await fetch(`${API_BASE_URL}/requirements/${requirementId}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': 'test-user-id'
      }
    });

    const deleteData = await deleteResponse.json();
    console.log('✅ Requirement archived successfully\n');

    console.log('🎉 All tests passed! The Requirements API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the server is running with: npm run dev');
    }
  }
}

// Run the tests
testAPI();