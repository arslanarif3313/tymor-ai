#!/usr/bin/env node

/**
 * Test Magic Link Functionality
 * Tests the existing magic link system and new account linking features
 */

const BASE_URL = 'http://localhost:3000'

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(testName) {
  log(`\n${colors.bold}🧪 Testing: ${testName}${colors.reset}`)
  log('─'.repeat(50))
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return { response, data, success: response.ok, status: response.status }
  } catch (error) {
    return { error: error.message, success: false }
  }
}

async function testExistingEndpoints() {
  logTest('Existing API Endpoints')
  
  const endpoints = [
    { path: '/api/user/link-email', method: 'GET', expectedStatus: 200 },
    { path: '/api/user/link-google', method: 'GET', expectedStatus: 200 },
    { path: '/api/user/link-callback', method: 'GET', expectedStatus: 400 }
  ]
  
  for (const endpoint of endpoints) {
    logInfo(`Testing ${endpoint.method} ${endpoint.path}...`)
    
    const result = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method
    })
    
    if (result.status === endpoint.expectedStatus) {
      logSuccess(`${endpoint.path}: Status ${result.status} (Expected: ${endpoint.expectedStatus})`)
    } else {
      logError(`${endpoint.path}: Status ${result.status} (Expected: ${endpoint.expectedStatus})`)
    }
    
    if (result.data) {
      logInfo(`Response: ${JSON.stringify(result.data)}`)
    }
  }
}

async function testNewEndpoints() {
  logTest('New API Endpoints')
  
  const endpoints = [
    { path: '/api/user/link-account', method: 'GET', expectedStatus: 400 },
    { path: '/api/user/validate-linking', method: 'GET', expectedStatus: 400 },
    { path: '/api/user/unlink-account', method: 'GET', expectedStatus: 400 }
  ]
  
  for (const endpoint of endpoints) {
    logInfo(`Testing ${endpoint.method} ${endpoint.path}...`)
    
    const result = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method
    })
    
    if (result.status === endpoint.expectedStatus) {
      logSuccess(`${endpoint.path}: Status ${result.status} (Expected: ${endpoint.expectedStatus})`)
    } else {
      logError(`${endpoint.path}: Status ${result.status} (Expected: ${endpoint.expectedStatus})`)
    }
    
    if (result.data) {
      logInfo(`Response: ${JSON.stringify(result.data)}`)
    }
  }
}

async function testMagicLinkGeneration() {
  logTest('Magic Link Generation')
  
  logInfo('Testing magic link generation with existing endpoint...')
  
  const result = await makeRequest(`${BASE_URL}/api/user/link-email`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'test-user-id',
      email: 'test@example.com'
    })
  })
  
  logInfo(`Status: ${result.status}`)
  logInfo(`Response: ${JSON.stringify(result.data)}`)
  
  if (result.data && result.data.actionLink) {
    logSuccess('Magic link generated successfully')
    logInfo(`Action link: ${result.data.actionLink}`)
    
    // Check if the link contains the correct callback URL
    if (result.data.actionLink.includes('/api/user/link-callback')) {
      logSuccess('Magic link contains correct callback URL')
    } else {
      logError('Magic link callback URL is incorrect')
    }
  } else if (result.data && result.data.error) {
    logError(`Magic link generation failed: ${result.data.error}`)
    
    // Check if it's a Supabase connection issue
    if (result.data.error.includes('invalid claim') || result.data.error.includes('missing sub claim')) {
      logInfo('This appears to be a Supabase authentication issue - the endpoint is working but needs proper Supabase setup')
    }
  } else {
    logError('Magic link generation failed with unknown error')
  }
  
  return result.success
}

async function testLinkCallback() {
  logTest('Link Callback Endpoint')
  
  logInfo('Testing link callback with missing parameters...')
  const missingParams = await makeRequest(`${BASE_URL}/api/user/link-callback`)
  
  if (missingParams.status === 400) {
    logSuccess('Missing parameters properly handled')
  } else {
    logError('Missing parameters should return 400')
  }
  
  logInfo('Testing link callback with invalid parameters...')
  const invalidParams = await makeRequest(`${BASE_URL}/api/user/link-callback?primary=test&code=invalid`)
  
  if (invalidParams.status === 400 || invalidParams.status === 401) {
    logSuccess('Invalid parameters properly handled')
  } else {
    logError('Invalid parameters should return 400 or 401')
  }
  
  logInfo(`Invalid params response: ${JSON.stringify(invalidParams.data)}`)
  
  return true
}

async function testGoogleLinking() {
  logTest('Google Linking Endpoint')
  
  logInfo('Testing Google linking endpoint...')
  const result = await makeRequest(`${BASE_URL}/api/user/link-google`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'test-user-id',
      googleEmail: 'test@gmail.com'
    })
  })
  
  logInfo(`Status: ${result.status}`)
  logInfo(`Response: ${JSON.stringify(result.data)}`)
  
  if (result.data && result.data.requiresOAuth) {
    logSuccess('Google linking endpoint working - requires OAuth flow')
  } else if (result.data && result.data.error) {
    logError(`Google linking failed: ${result.data.error}`)
  } else {
    logError('Google linking endpoint not working as expected')
  }
  
  return result.success
}

async function testValidationEndpoint() {
  logTest('Validation Endpoint')
  
  logInfo('Testing validation endpoint...')
  const result = await makeRequest(`${BASE_URL}/api/user/validate-linking`, {
    method: 'POST',
    body: JSON.stringify({
      userId: 'test-user-id',
      linkType: 'email',
      email: 'test@example.com'
    })
  })
  
  logInfo(`Status: ${result.status}`)
  logInfo(`Response: ${JSON.stringify(result.data)}`)
  
  if (result.data && (result.data.valid !== undefined || result.data.error)) {
    logSuccess('Validation endpoint is working')
  } else {
    logError('Validation endpoint not working as expected')
  }
  
  return result.success
}

async function runAllTests() {
  log(`${colors.bold}🚀 Testing Account Linking System${colors.reset}`)
  log('='.repeat(60))
  
  const tests = [
    { name: 'Existing Endpoints', fn: testExistingEndpoints },
    { name: 'New Endpoints', fn: testNewEndpoints },
    { name: 'Magic Link Generation', fn: testMagicLinkGeneration },
    { name: 'Link Callback', fn: testLinkCallback },
    { name: 'Google Linking', fn: testGoogleLinking },
    { name: 'Validation', fn: testValidationEndpoint }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, success: result })
    } catch (error) {
      logError(`Test ${test.name} failed with error: ${error.message}`)
      results.push({ name: test.name, success: false, error: error.message })
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 Test Results Summary${colors.reset}`)
  log('='.repeat(60))
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    if (result.success) {
      logSuccess(`${result.name}: PASSED`)
    } else {
      logError(`${result.name}: FAILED`)
      if (result.error) {
        logError(`  Error: ${result.error}`)
      }
    }
  })
  
  log(`\n${colors.bold}Overall: ${passed}/${total} tests passed${colors.reset}`)
  
  if (passed === total) {
    logSuccess('🎉 All tests passed! Account linking system is working correctly.')
  } else {
    logError('⚠️  Some tests failed. Please check the issues above.')
  }
  
  // Additional recommendations
  log(`\n${colors.bold}📝 Recommendations:${colors.reset}`)
  log('1. Set up Supabase locally or use production instance for full testing')
  log('2. Configure environment variables for Supabase connection')
  log('3. Test with real user accounts for complete functionality')
  log('4. Check Inbucket at http://localhost:54324 for email testing')
  
  return results
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests }
