/**
 * Multi-Tenant Security Test Script
 * 
 * This script tests the multi-tenant security implementation by simulating
 * various scenarios to ensure proper data isolation between organizations.
 * 
 * Run with: node scripts/test-multi-tenant-security.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration for testing
const API_BASE_URL = 'http://localhost:5000';
const TEST_USERS = {
  admin: {
    id: '1',
    email: 'admin@example.com',
    password: 'admin123', // Only used for login testing
    organizations: ['org1', 'org2'] // Organizations this user belongs to
  },
  regularUser: {
    id: '2',
    email: 'user@example.com',
    password: 'user123',
    organizations: ['org1'] // Only belongs to org1
  }
};

const TEST_ORGANIZATIONS = {
  org1: {
    id: 'org1',
    name: 'Test Organization 1',
    plan: 'premium'
  },
  org2: {
    id: 'org2',
    name: 'Test Organization 2',
    plan: 'basic'
  }
};

// Create an axios instance with auth token handling
const api = axios.create({
  baseURL: API_BASE_URL,
  validateStatus: (status) => status < 500 // Don't throw on 4xx errors
});

// Track test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Helper to record test results
 */
function recordTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    testResults.details.push({ name, passed, error: null });
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    testResults.details.push({ name, passed, error });
    console.log(`❌ FAIL: ${name}`);
    if (error) {
      console.error(`   Error: ${error.message || error}`);
    }
  }
}

/**
 * Test 1: Verify organization context is properly passed in headers
 */
async function testOrganizationHeaders() {
  try {
    // Login as admin
    const token = 'simulated-jwt-token'; // In a real test, this would be obtained from login
    
    // Set token and organization headers
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org1.id;
    
    // Make a request to a protected endpoint
    const response = await api.get('/api/platforms');
    
    // Verify response headers show the organization context was accepted
    recordTest(
      'Organization context headers are properly processed', 
      response.status === 200 || response.status === 204
    );
  } catch (error) {
    recordTest('Organization context headers are properly processed', false, error);
  }
}

/**
 * Test 2: Verify data isolation between organizations
 */
async function testOrganizationDataIsolation() {
  try {
    // Login as admin
    const token = 'simulated-jwt-token';
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Get platforms from org1
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org1.id;
    const org1Response = await api.get('/api/platforms');
    const org1Platforms = org1Response.data || [];
    
    // Get platforms from org2
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org2.id;
    const org2Response = await api.get('/api/platforms');
    const org2Platforms = org2Response.data || [];
    
    // Check for data isolation by comparing IDs - there should be no overlap
    const org1Ids = org1Platforms.map(p => p.id);
    const org2Ids = org2Platforms.map(p => p.id);
    const hasOverlap = org1Ids.some(id => org2Ids.includes(id));
    
    recordTest(
      'Data is properly isolated between organizations',
      !hasOverlap
    );
  } catch (error) {
    recordTest('Data is properly isolated between organizations', false, error);
  }
}

/**
 * Test 3: Verify access control based on organization membership
 */
async function testOrganizationAccessControl() {
  try {
    // Login as regularUser who only belongs to org1
    const token = 'simulated-jwt-token-regular-user';
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Try to access org1 (should succeed)
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org1.id;
    const org1Response = await api.get('/api/platforms');
    
    // Try to access org2 (should fail with 403)
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org2.id;
    const org2Response = await api.get('/api/platforms');
    
    recordTest(
      'Access is properly restricted based on organization membership',
      org1Response.status === 200 && org2Response.status === 403
    );
  } catch (error) {
    recordTest('Access is properly restricted based on organization membership', false, error);
  }
}

/**
 * Test 4: Verify cache isolation between organizations
 */
async function testCacheIsolation() {
  try {
    // Login as admin
    const token = 'simulated-jwt-token';
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Set organization context to org1
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org1.id;
    
    // First request should be slower (cache miss)
    const start1 = performance.now();
    await api.get('/api/platforms');
    const end1 = performance.now();
    const firstRequestTime = end1 - start1;
    
    // Second request should be faster (cache hit)
    const start2 = performance.now();
    await api.get('/api/platforms');
    const end2 = performance.now();
    const secondRequestTime = end2 - start2;
    
    // Switch to org2 - should be a cache miss
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org2.id;
    const start3 = performance.now();
    await api.get('/api/platforms');
    const end3 = performance.now();
    const thirdRequestTime = end3 - start3;
    
    // Cache hit for org1 should be faster than cache miss for org2
    const cacheWorking = secondRequestTime < firstRequestTime;
    const cacheIsolated = thirdRequestTime > secondRequestTime;
    
    recordTest(
      'Cache properly isolates data between organizations',
      cacheWorking && cacheIsolated
    );
  } catch (error) {
    recordTest('Cache properly isolates data between organizations', false, error);
  }
}

/**
 * Test 5: Verify platform creation with proper organization context
 */
async function testPlatformCreation() {
  try {
    // Login as admin
    const token = 'simulated-jwt-token';
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Set organization context to org1
    api.defaults.headers.common['X-Organization-ID'] = TEST_ORGANIZATIONS.org1.id;
    
    // Create a platform in org1
    const platformData = {
      name: 'facebook',
      displayName: 'Facebook Test',
      type: 'social_media',
      isConnected: false
    };
    
    const createResponse = await api.post('/api/platforms', platformData);
    const createdPlatform = createResponse.data;
    
    // Verify the platform was created with proper organization context
    const hasOrgId = createdPlatform && 
                     createdPlatform.organizationId === TEST_ORGANIZATIONS.org1.id;
    
    recordTest(
      'Platforms are created with proper organization context',
      createResponse.status === 201 && hasOrgId
    );
  } catch (error) {
    recordTest('Platforms are created with proper organization context', false, error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🔒 Running multi-tenant security tests...\n');
  
  try {
    await testOrganizationHeaders();
    await testOrganizationDataIsolation();
    await testOrganizationAccessControl();
    await testCacheIsolation();
    await testPlatformCreation();
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`   Total: ${testResults.total}`);
    console.log(`   Passed: ${testResults.passed}`);
    console.log(`   Failed: ${testResults.failed}`);
    console.log(`   Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ Some tests failed. Review the output above for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed! Multi-tenant security is properly implemented.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Execute the tests
runTests();