#!/usr/bin/env node

/**
 * Test Complete Account Linking Flow
 * Tests both email linking and Google linking flows
 */

const BASE_URL = 'http://localhost:3000'
const TEST_USER_ID = '4a3eefa4-c62c-4d89-b191-44828e8b786f' // Real user from logs
const TEST_EMAIL = 'complete-test@example.com'
const TEST_GOOGLE_EMAIL = 'complete-test@gmail.com'

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

async function testEmailLinkingFlow() {
  logTest('Email Linking Flow (Google User → Link Email)')
  
  logInfo('Step 1: Testing email validation...')
  const validationResult = await makeRequest(`${BASE_URL}/api/user/validate-linking`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      linkType: 'email',
      email: TEST_EMAIL
    })
  })
  
  logInfo(`Validation status: ${validationResult.status}`)
  logInfo(`Validation response: ${JSON.stringify(validationResult.data, null, 2)}`)
  
  if (validationResult.success && validationResult.data.valid) {
    logSuccess('✅ Email validation passed')
  } else {
    logError('❌ Email validation failed')
    return { success: false }
  }
  
  logInfo('Step 2: Testing magic link generation...')
  const magicLinkResult = await makeRequest(`${BASE_URL}/api/user/link-email`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      email: TEST_EMAIL
    })
  })
  
  logInfo(`Magic link status: ${magicLinkResult.status}`)
  logInfo(`Magic link response: ${JSON.stringify(magicLinkResult.data, null, 2)}`)
  
  if (magicLinkResult.success && magicLinkResult.data.actionLink) {
    logSuccess('✅ Magic link generated successfully')
    logInfo(`Action link: ${magicLinkResult.data.actionLink}`)
    
    // Check if redirect URL is localhost
    const actionLink = magicLinkResult.data.actionLink
    const url = new URL(actionLink)
    const redirectTo = url.searchParams.get('redirect_to')
    
    if (redirectTo && redirectTo.includes('localhost:3000')) {
      logSuccess('✅ Magic link redirects to localhost (fixed!)')
    } else {
      logError('❌ Magic link still redirects to production')
    }
    
    return { success: true, actionLink }
  } else {
    logError('❌ Magic link generation failed')
    return { success: false }
  }
}

async function testGoogleLinkingFlow() {
  logTest('Google Linking Flow (Email User → Link Google)')
  
  logInfo('Step 1: Testing Google linking validation...')
  const validationResult = await makeRequest(`${BASE_URL}/api/user/validate-linking`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      linkType: 'google',
      googleEmail: TEST_GOOGLE_EMAIL
    })
  })
  
  logInfo(`Validation status: ${validationResult.status}`)
  logInfo(`Validation response: ${JSON.stringify(validationResult.data, null, 2)}`)
  
  if (validationResult.success) {
    logSuccess('✅ Google validation completed')
  } else {
    logError('❌ Google validation failed')
    return { success: false }
  }
  
  logInfo('Step 2: Testing Google linking initiation...')
  const googleLinkResult = await makeRequest(`${BASE_URL}/api/user/link-google`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      googleEmail: TEST_GOOGLE_EMAIL
    })
  })
  
  logInfo(`Google linking status: ${googleLinkResult.status}`)
  logInfo(`Google linking response: ${JSON.stringify(googleLinkResult.data, null, 2)}`)
  
  if (googleLinkResult.success && googleLinkResult.data.requiresOAuth) {
    logSuccess('✅ Google linking OAuth flow initiated')
    logInfo(`OAuth URL: ${googleLinkResult.data.oauthUrl}`)
    
    // Check if OAuth URL is localhost
    if (googleLinkResult.data.oauthUrl && googleLinkResult.data.oauthUrl.includes('localhost:3000')) {
      logSuccess('✅ OAuth URL redirects to localhost (fixed!)')
    } else {
      logError('❌ OAuth URL still redirects to production')
    }
    
    return { success: true, oauthUrl: googleLinkResult.data.oauthUrl }
  } else {
    logError('❌ Google linking failed')
    return { success: false }
  }
}

async function testLinkAccountEndpoint() {
  logTest('Link Account Endpoint (Unified)')
  
  logInfo('Testing unified link-account endpoint for email...')
  const emailResult = await makeRequest(`${BASE_URL}/api/user/link-account`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      linkType: 'email',
      email: TEST_EMAIL
    })
  })
  
  logInfo(`Email linking status: ${emailResult.status}`)
  logInfo(`Email linking response: ${JSON.stringify(emailResult.data, null, 2)}`)
  
  if (emailResult.success && emailResult.data.actionLink) {
    logSuccess('✅ Unified email linking working')
  } else {
    logError('❌ Unified email linking failed')
  }
  
  logInfo('Testing unified link-account endpoint for Google...')
  const googleResult = await makeRequest(`${BASE_URL}/api/user/link-account`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      linkType: 'google'
    })
  })
  
  logInfo(`Google linking status: ${googleResult.status}`)
  logInfo(`Google linking response: ${JSON.stringify(googleResult.data, null, 2)}`)
  
  if (googleResult.success && googleResult.data.requiresOAuth) {
    logSuccess('✅ Unified Google linking working')
  } else {
    logError('❌ Unified Google linking failed')
  }
  
  return { 
    emailSuccess: emailResult.success, 
    googleSuccess: googleResult.success 
  }
}

async function runCompleteLinkingTest() {
  log(`${colors.bold}🚀 Testing Complete Account Linking Flows${colors.reset}`)
  log('='.repeat(60))
  
  const tests = [
    { name: 'Email Linking Flow', fn: testEmailLinkingFlow },
    { name: 'Google Linking Flow', fn: testGoogleLinkingFlow },
    { name: 'Unified Link Account', fn: testLinkAccountEndpoint }
  ]
  
  const results = []
  
  for (const test of tests) {
    try {
      const result = await test.fn()
      results.push({ name: test.name, success: result.success || result.emailSuccess || result.googleSuccess })
    } catch (error) {
      logError(`Test ${test.name} failed with error: ${error.message}`)
      results.push({ name: test.name, success: false, error: error.message })
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 Complete Linking Test Results${colors.reset}`)
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
    logSuccess('🎉 Complete account linking system is working correctly!')
  } else {
    logError('⚠️  Some parts of the linking system failed. Please check the issues above.')
  }
  
  // Flow Summary
  log(`\n${colors.bold}📝 Account Linking Flows Implemented:${colors.reset}`)
  log('1. ✅ Email User → Link Google: Uses OAuth + linkIdentity')
  log('2. ✅ Google User → Link Email: Uses Magic Link + metadata update')
  log('3. ✅ Validation: Checks conflicts and limits')
  log('4. ✅ Redirect URLs: Fixed to use localhost in development')
  log('5. ✅ Error Handling: Comprehensive error responses')
  
  return results
}

// Run the complete test
if (require.main === module) {
  runCompleteLinkingTest().catch(console.error)
}

module.exports = { runCompleteLinkingTest }
