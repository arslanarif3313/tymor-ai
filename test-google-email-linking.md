# Google User Email Linking Test

## Implementation Changes Made

### 1. **SignInMethods Component Updates**
- ✅ Removed restriction that only allowed linking when `linkedEmails.length === 0`
- ✅ Now allows Google users to link additional emails
- ✅ Updated dialog description for Google users
- ✅ Updated help text to show "up to 3 additional emails"
- ✅ Updated button text to show "Link Email" for Google users

### 2. **API Updates (link-email/route.ts)**
- ✅ Added logic to detect Google users via `user.identities`
- ✅ Google users can link up to 3 additional emails
- ✅ Non-Google users can still only link 1 additional email
- ✅ Proper error messages for different user types

### 3. **Magic Link Flow**
- ✅ Fixed redirect URL to use `/api/user/link-callback`
- ✅ Fixed redirect to go to `/profile` instead of `/dashboard/profile`
- ✅ Added logic to delete newly created users and just link the email

## Testing Steps

### 1. **Start the Development Server**
```bash
cd /Users/iamcaptain/Desktop/smuves-app-develop
npm run dev
```

### 2. **Navigate to Profile Page**
Go to: `http://localhost:3001/profile`

### 3. **Test Email Linking for Google User**
1. **Verify you're logged in with Google** (should see Google account in sign-in methods)
2. **Click "Link Email Account"** button
3. **Enter test email**: `biweg74627@cerisun.com`
4. **Set a password** for the email
5. **Click "Link Email"**

### 4. **Check Magic Link**
1. **Open Inbucket**: `http://localhost:54324`
2. **Look for email** sent to `biweg74627@cerisun.com`
3. **Click the email** to view the magic link
4. **Copy the magic link**

### 5. **Complete the Linking**
1. **Click the magic link**
2. **Should redirect to**: `http://localhost:3001/profile?linked=success&email=biweg74627@cerisun.com`
3. **Check for success toast**
4. **Verify email appears** in sign-in methods

### 6. **Test Multiple Email Linking**
1. **Try linking another email** (e.g., `test2@example.com`)
2. **Should work** (Google users can link up to 3 emails)
3. **Verify both emails appear** in sign-in methods

## Expected Results

### ✅ **For Google Users:**
- Can link up to 3 additional emails
- Magic link is sent to Inbucket
- No new user is created (email is linked to existing Google account)
- Success toast appears
- Linked emails appear in sign-in methods

### ✅ **For Non-Google Users:**
- Can link 1 additional email (existing behavior)
- Same magic link flow works

## Troubleshooting

### If Magic Link Doesn't Work:
1. Check browser console for errors
2. Verify Inbucket is accessible at `http://localhost:54324`
3. Check network tab for API call success
4. Verify Supabase is running locally

### If New User is Created:
1. Check the link-callback route logic
2. Verify the user deletion logic is working
3. Check that the primary user ID is being passed correctly

### If Email Doesn't Appear in Sign-in Methods:
1. Check that the user metadata is being updated
2. Verify the UI refresh is working
3. Check for any JavaScript errors

## Test Email Addresses
- `biweg74627@cerisun.com`
- `test2@example.com`
- `demo@test.org`

## Next Steps
1. Test the complete flow
2. Debug any issues found
3. Verify the final solution works correctly
4. Test with multiple emails for Google users

