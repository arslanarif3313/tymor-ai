import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * DISABLED - Use native Supabase methods instead
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'This endpoint is disabled. Use supabase.auth.linkIdentity() and updateUser() instead.',
    disabled: true 
  }, { status: 410 })

    const supabase = createServiceClient()

    // Get primary user
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userData.user
    const currentMetadata = user.user_metadata || {}

    if (linkType === 'email') {
      // Email linking logic
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for email linking' },
          { status: 400 }
        )
      }

      const linkedEmails: string[] = currentMetadata.linked_emails || []
      const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
      
      // Validation rules
      if (!hasGoogleIdentity && linkedEmails.length >= 1) {
        return NextResponse.json(
          { error: 'You can only link one additional email. Unlink first.' },
          { status: 400 }
        )
      }
      
      if (hasGoogleIdentity && linkedEmails.length >= 3) {
        return NextResponse.json(
          { error: 'You can link up to 3 additional emails. Unlink one first.' },
          { status: 400 }
        )
      }

      if (linkedEmails.includes(email) || user.email === email) {
        return NextResponse.json(
          { error: 'This email is already linked to your profile' },
          { status: 409 }
        )
      }

      // Generate & send magic link
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${siteUrl}/api/user/link-callback?primary=${userId}`,
          },
        })

      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Magic link sent to ${email}. Confirm it to finish linking.`,
        linkType: 'email',
        linkedEmail: email,
        actionLink: linkData?.properties?.action_link || null,
      })

    } else if (linkType === 'google') {
      // Google linking logic
      const linkedGoogleAccounts = currentMetadata.linked_google_accounts || []
      
      // Check if user already has Google linked
      const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
      if (hasGoogleIdentity) {
        return NextResponse.json(
          { error: 'You already have a Google account linked' },
          { status: 409 }
        )
      }

      // Check limits for additional Google accounts
      if (linkedGoogleAccounts.length >= 2) {
        return NextResponse.json(
          { error: 'You can link up to 2 additional Google accounts. Unlink one first.' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Google account linking initiated. Complete the OAuth flow to finish linking.',
        linkType: 'google',
        requiresOAuth: true,
        oauthUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?link=true`,
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid link type. Must be "email" or "google"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in link-account POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get current linking status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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
    const metadata = user.user_metadata || {}
    
    // Check current identities
    const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
    const hasEmailIdentity = user.identities?.some(identity => identity.provider === 'email')
    
    // Get linked accounts
    const linkedEmails = metadata.linked_emails || []
    const linkedGoogleAccounts = metadata.linked_google_accounts || []

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        identities: user.identities,
        hasGoogleIdentity,
        hasEmailIdentity,
        linkedEmails,
        linkedGoogleAccounts,
        canLinkEmail: !hasEmailIdentity || linkedEmails.length < (hasGoogleIdentity ? 3 : 1),
        canLinkGoogle: !hasGoogleIdentity && linkedGoogleAccounts.length < 2,
      }
    })

  } catch (error) {
    console.error('Error in link-account GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
