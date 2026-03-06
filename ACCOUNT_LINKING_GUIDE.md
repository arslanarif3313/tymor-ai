# Account Linking System Implementation Guide

## Overview

This system allows users to link multiple authentication providers (email/password and Google) to their accounts, enabling flexible sign-in options.

## Features

✅ **Email Linking**: Users can link additional email addresses via magic links  
✅ **Google Linking**: Users can link Google accounts via OAuth  
✅ **Validation**: Comprehensive validation to prevent conflicts and enforce limits  
✅ **Metadata Storage**: Linked accounts stored in user_metadata  
✅ **Flexible Login**: Users can authenticate via any linked provider  

## Architecture

### API Endpoints

#### 1. `/api/user/link-account` (POST)
Initiates account linking requests.

**Request Body:**
```json
{
  "userId": "user-id",
  "linkType": "email" | "google",
  "email": "user@example.com", // for email linking
  "password": "password123"    // for email linking
}
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent to user@example.com",
  "linkType": "email",
  "linkedEmail": "user@example.com",
  "actionLink": "https://..." // for debugging
}
```

#### 2. `/api/user/validate-linking` (POST)
Validates if an account can be linked.

**Request Body:**
```json
{
  "userId": "user-id",
  "linkType": "email" | "google",
  "email": "user@example.com" // for email validation
}
```

**Response:**
```json
{
  "valid": true,
  "message": "Email can be linked",
  "linkType": "email",
  "email": "user@example.com"
}
```

#### 3. `/api/user/unlink-account` (DELETE)
Unlinks an account.

**Request Body:**
```json
{
  "userId": "user-id",
  "linkType": "email" | "google",
  "email": "user@example.com", // for email unlinking
  "identityId": "identity-id"  // for Google unlinking
}
```

#### 4. `/api/user/link-callback` (GET)
Handles magic link callbacks for email linking.

**Query Parameters:**
- `primary`: Primary user ID
- `code`: Magic link code

### Frontend Components

#### 1. `useAccountLinking` Hook
Custom hook for managing account linking operations.

```typescript
const {
  isLoading,
  error,
  validateLinking,
  linkAccount,
  unlinkAccount,
  getUserLinkingStatus,
  initiateGoogleLinking,
  clearError,
} = useAccountLinking(user)
```

#### 2. `AccountLinkingManager` Component
Complete UI component for managing account linking.

```tsx
<AccountLinkingManager 
  user={user} 
  onUpdate={() => refetchUser()} 
/>
```

## User Flows

### Email Linking Flow

1. **User initiates linking** from profile page
2. **Validation** checks if email can be linked
3. **Magic link sent** to the email address
4. **User clicks link** in their email
5. **Callback handler** processes the verification
6. **Metadata updated** with linked email
7. **Success redirect** to profile page

### Google Linking Flow

1. **User initiates linking** from profile page
2. **OAuth flow** redirects to Google
3. **Google authentication** completed
4. **Callback handler** processes the OAuth response
5. **Metadata updated** with linked Google account
6. **Success redirect** to profile page

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Setup

1. **Enable Email Auth** in Supabase Dashboard
2. **Configure Google OAuth** in Supabase Dashboard
3. **Set up redirect URLs** for OAuth flows
4. **Configure email templates** for magic links

## Usage Examples

### Basic Email Linking

```typescript
const { linkAccount } = useAccountLinking(user)

const handleLinkEmail = async () => {
  const result = await linkAccount({
    linkType: 'email',
    email: 'user@example.com',
    password: 'password123'
  })
  
  if (result.success) {
    toast.success(result.message)
  }
}
```

### Google Account Linking

```typescript
const { linkAccount, initiateGoogleLinking } = useAccountLinking(user)

const handleLinkGoogle = async () => {
  const result = await linkAccount({ linkType: 'google' })
  
  if (result.success && result.requiresOAuth) {
    const redirectUrl = initiateGoogleLinking()
    window.location.href = redirectUrl
  }
}
```

### Validation Before Linking

```typescript
const { validateLinking } = useAccountLinking(user)

const handleValidate = async () => {
  const result = await validateLinking({
    linkType: 'email',
    email: 'user@example.com'
  })
  
  if (result.valid) {
    // Proceed with linking
  } else {
    // Show error message
    console.error(result.error)
  }
}
```

## Linking Limits

### Email Linking
- **Non-Google users**: 1 additional email
- **Google users**: Up to 3 additional emails

### Google Linking
- **Email users**: 1 Google account
- **Google users**: Up to 2 additional Google accounts

## Security Considerations

1. **Magic Link Expiration**: Links expire after a set time
2. **Email Verification**: All emails must be verified before linking
3. **OAuth Verification**: Google accounts must be verified via OAuth
4. **Conflict Prevention**: System prevents linking accounts already in use
5. **Last Method Protection**: Users cannot unlink their last sign-in method

## Error Handling

### Common Error Codes

- `EMAIL_ALREADY_LINKED`: Email is already linked to the user
- `EMAIL_IN_USE`: Email is already used by another user
- `EMAIL_LIMIT_REACHED`: User has reached email linking limit
- `GOOGLE_ALREADY_LINKED`: Google account is already linked
- `GOOGLE_ACCOUNT_IN_USE`: Google account is used by another user
- `GOOGLE_LIMIT_REACHED`: User has reached Google linking limit

### Error Response Format

```json
{
  "valid": false,
  "error": "This email is already linked to your profile",
  "code": "EMAIL_ALREADY_LINKED"
}
```

## Testing

### Local Development

1. **Start Supabase**: `supabase start`
2. **Start Next.js**: `npm run dev`
3. **Test Email Linking**: Use Inbucket at `http://localhost:54324`
4. **Test Google Linking**: Use OAuth flow with test accounts

### Test Scenarios

1. **Email linking** with valid email
2. **Email linking** with duplicate email
3. **Google linking** with valid account
4. **Google linking** with already linked account
5. **Unlinking** email accounts
6. **Unlinking** Google accounts
7. **Validation** of linking limits

## Troubleshooting

### Common Issues

1. **Magic links not working**: Check redirect URLs in Supabase
2. **OAuth redirects failing**: Verify callback URLs
3. **Metadata not updating**: Check service role permissions
4. **Validation errors**: Review linking limits and conflicts

### Debug Steps

1. Check browser console for errors
2. Verify Supabase logs
3. Test API endpoints directly
4. Check environment variables
5. Verify Supabase configuration

## Future Enhancements

- [ ] Support for additional OAuth providers (GitHub, Apple, etc.)
- [ ] Bulk account linking operations
- [ ] Account linking analytics
- [ ] Advanced security features (2FA, etc.)
- [ ] Account merging capabilities
