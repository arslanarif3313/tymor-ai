import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Validate if an account can be linked
 * Checks for conflicts, limits, and existing links
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, linkType, email, googleEmail } = await request.json()

    if (!userId || !linkType) {
      return NextResponse.json(
        { error: 'User ID and link type are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get user data
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userData.user
    const currentMetadata = user.user_metadata || {}
    const linkedEmails: string[] = currentMetadata.linked_emails || []
    const linkedGoogleAccounts: string[] = currentMetadata.linked_google_accounts || []

    if (linkType === 'email') {
      // Email validation
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for email validation' },
          { status: 400 }
        )
      }

      // Check if email is already linked
      if (linkedEmails.includes(email) || user.email === email) {
        return NextResponse.json({
          valid: false,
          error: 'This email is already linked to your profile',
          code: 'EMAIL_ALREADY_LINKED'
        })
      }

      // Check if email is already used by another user
      const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
      
      if (searchError) {
        return NextResponse.json({ error: 'Failed to validate email' }, { status: 500 })
      }

      const emailInUse = existingUsers.users.some(existingUser => 
        existingUser.email === email && existingUser.id !== userId
      )

      if (emailInUse) {
        return NextResponse.json({
          valid: false,
          error: 'This email is already associated with another account',
          code: 'EMAIL_IN_USE'
        })
      }

      // Check linking limits
      const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
      
      if (!hasGoogleIdentity && linkedEmails.length >= 1) {
        return NextResponse.json({
          valid: false,
          error: 'You can only link one additional email. Unlink first.',
          code: 'EMAIL_LIMIT_REACHED'
        })
      }
      
      if (hasGoogleIdentity && linkedEmails.length >= 3) {
        return NextResponse.json({
          valid: false,
          error: 'You can link up to 3 additional emails. Unlink one first.',
          code: 'EMAIL_LIMIT_REACHED'
        })
      }

      return NextResponse.json({
        valid: true,
        message: 'Email can be linked',
        linkType: 'email',
        email
      })

    } else if (linkType === 'google') {
      // Google validation
      if (!googleEmail) {
        return NextResponse.json(
          { error: 'Google email is required for Google validation' },
          { status: 400 }
        )
      }

      // Check if user already has Google linked
      const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
      if (hasGoogleIdentity) {
        return NextResponse.json({
          valid: false,
          error: 'You already have a Google account linked',
          code: 'GOOGLE_ALREADY_LINKED'
        })
      }

      // Check if Google email is already linked to another user
      const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
      
      if (searchError) {
        return NextResponse.json({ error: 'Failed to validate Google account' }, { status: 500 })
      }

      const googleEmailInUse = existingUsers.users.some(existingUser => 
        existingUser.identities?.some(identity => 
          identity.provider === 'google' && 
          identity.identity_data?.email === googleEmail
        ) && existingUser.id !== userId
      )

      if (googleEmailInUse) {
        return NextResponse.json({
          valid: false,
          error: 'This Google account is already linked to another user',
          code: 'GOOGLE_ACCOUNT_IN_USE'
        })
      }

      // Check if this Google email is already in linked accounts
      if (linkedGoogleAccounts.includes(googleEmail)) {
        return NextResponse.json({
          valid: false,
          error: 'This Google account is already linked to your profile',
          code: 'GOOGLE_ALREADY_LINKED'
        })
      }

      // Check linking limits
      if (linkedGoogleAccounts.length >= 2) {
        return NextResponse.json({
          valid: false,
          error: 'You can link up to 2 additional Google accounts. Unlink one first.',
          code: 'GOOGLE_LIMIT_REACHED'
        })
      }

      return NextResponse.json({
        valid: true,
        message: 'Google account can be linked',
        linkType: 'google',
        googleEmail
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid link type. Must be "email" or "google"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in validate-linking POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
