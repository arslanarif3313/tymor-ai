# Testing Email Linking Functionality

## Steps to Test Email Linking

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the profile page**:
   - Go to: `http://localhost:3000/profile`
   - Make sure you're logged in with your Google account

3. **Test the email linking**:
   - Look for the "Sign-in Methods" section
   - Click "Link Email Account" button
   - Enter a test email (e.g., `test@example.com`)
   - Set a password for the new email
   - Click "Link Email"

4. **Check for the magic link**:
   - The magic link will be sent to Inbucket (local email testing server)
   - Open: `http://localhost:54324` in your browser
   - Look for the email with the magic link
   - Click on the email to view the magic link

5. **Complete the linking process**:
   - Click the magic link from the email
   - You should be redirected back to the profile page
   - The linked email should now appear in the "Sign-in Methods" section

## Expected Behavior

- ✅ Magic link should be generated and "sent" to Inbucket
- ✅ You should see a success toast when clicking "Link Email"
- ✅ The magic link should be accessible at `http://localhost:54324`
- ✅ After clicking the magic link, the email should appear in sign-in methods
- ✅ You should see a success toast when the linking is complete

## Troubleshooting

If the magic link doesn't work:
1. Check the browser console for any errors
2. Verify that Supabase is running locally (`supabase start`)
3. Check that the Inbucket server is accessible at `http://localhost:54324`
4. Look at the network tab to see if the API calls are successful

## Test Email Addresses

You can use any of these test emails:
- `test@example.com`
- `user@test.com`
- `demo@example.org`

