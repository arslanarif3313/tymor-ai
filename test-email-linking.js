// Test script for email linking functionality
// Run this in the browser console on the profile page

async function testEmailLinking() {
  console.log('🧪 Testing Email Linking for Google Users...');
  
  // Test 1: Check if user is Google user
  const user = await supabase.auth.getUser();
  const hasGoogle = user.data.user?.identities?.some(identity => identity.provider === 'google');
  console.log('✅ Google user detected:', hasGoogle);
  
  // Test 2: Check current linked emails
  const linkedEmails = user.data.user?.user_metadata?.linked_emails || [];
  console.log('📧 Current linked emails:', linkedEmails);
  
  // Test 3: Test API endpoint
  try {
    const response = await fetch('/api/user/link-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.data.user.id,
        email: 'test@example.com'
      })
    });
    
    const result = await response.json();
    console.log('🔗 API Response:', result);
    
    if (response.ok) {
      console.log('✅ API call successful');
      console.log('📧 Magic link should be sent to Inbucket');
      console.log('🌐 Check: http://localhost:54324');
    } else {
      console.log('❌ API call failed:', result.error);
    }
  } catch (error) {
    console.log('❌ API call error:', error);
  }
}

// Run the test
testEmailLinking();

