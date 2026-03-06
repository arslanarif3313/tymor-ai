import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'This endpoint is disabled. Use supabase.auth.linkIdentity() instead.',
    disabled: true 
  }, { status: 410 })

    const supabase = createServiceClient()

    // Get the current user to check existing identities
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      console.log('🔐 link-google POST: User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('🔐 link-google POST: Current user identities:', user.user.identities)

    // Check if user already has Google identity
    const hasGoogleIdentity = user.user.identities?.some(identity => identity.provider === 'google')
    
    if (hasGoogleIdentity) {
      console.log('🔐 link-google POST: User already has Google identity')
      return NextResponse.json(
        { error: 'You already have a Google account linked' },
        { status: 409 }
      )
    }

    // Check if this Google email is already linked to another account
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      console.log('🔐 link-google POST: Error searching users:', searchError)
      return NextResponse.json({ error: 'Failed to search for existing users' }, { status: 500 })
    }

    // Check if the Google email is already linked to any user
    const emailAlreadyLinked = existingUsers.users.some(existingUser =>
      existingUser.identities?.some(
        identity => identity.provider === 'google' && identity.identity_data?.email === googleEmail
      ) && existingUser.id !== userId
    )

    if (emailAlreadyLinked) {
      console.log('🔐 link-google POST: Google email already linked to another user')
      return NextResponse.json(
        { error: 'This Google account is already linked to another user' },
        { status: 409 }
      )
    }

    console.log('🔐 link-google POST: Google account can be linked, initiating OAuth flow')
    
    // Return success - the actual linking will happen via OAuth flow
    // Force localhost for development
    return NextResponse.json({
      success: true,
      message: 'Google account can be linked. Please complete the OAuth flow.',
      requiresOAuth: true,
      oauthUrl: 'http://localhost:3000/auth/callback?link=true'
    })
  } catch (error) {
    console.error('Error in link-google route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, identityId } = await request.json()

    if (!userId || !identityId) {
      return NextResponse.json({ error: 'User ID and identity ID are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get the current user to check if this is the last sign-in method
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !user.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if this is the last sign-in method
    const remainingIdentities =
      user.user.identities?.filter(identity => identity.id !== identityId) || []

    if (remainingIdentities.length === 0) {
      return NextResponse.json({ error: 'Cannot unlink the last sign-in method' }, { status: 400 })
    }

    // Unlink the identity
    // Note: unlinkIdentity is not available in current Supabase version
    // We'll need to handle this differently - for now, return an error
    return NextResponse.json(
      { error: 'Unlinking identities is not supported in current version' },
      { status: 501 }
    )

    return NextResponse.json({
      success: true,
      message: 'Google account unlinked successfully',
    })
  } catch (error) {
    console.error('Error in unlink-google route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
