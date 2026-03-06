import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const primaryUserId = searchParams.get('primary')
    const code = searchParams.get('code')

    console.log('🔐 link-callback: Starting email linking callback...')
    console.log('🔐 link-callback: Primary user ID:', primaryUserId)
    console.log('🔐 link-callback: Code received:', code ? 'Yes' : 'No')

    if (!primaryUserId || !code) {
      console.log('🔐 link-callback: Missing required parameters')
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get primary user first
    const { data: primaryData, error: primaryError } = await supabase.auth.admin.getUserById(primaryUserId)
    if (primaryError || !primaryData?.user) {
      console.log('🔐 link-callback: Primary user not found:', primaryError)
      return NextResponse.json({ error: 'Primary user not found' }, { status: 404 })
    }
    const primaryUser = primaryData.user
    console.log('🔐 link-callback: Primary user email:', primaryUser.email)

    // For magic links, we need to exchange the code to get the email
    // This will create a temporary session, but we'll handle it properly
    const { data: tempSession, error: tempError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (tempError || !tempSession?.user) {
      console.log('🔐 link-callback: Invalid or expired magic link:', tempError)
      return NextResponse.json({ error: 'Invalid or expired magic link' }, { status: 401 })
    }
    
    const tempUser = tempSession.user
    const secondaryEmail = tempUser.email
    if (!secondaryEmail) {
      console.log('🔐 link-callback: No email found in magic link verification')
      return NextResponse.json({ error: 'No email found in magic link' }, { status: 400 })
    }
    
    console.log('🔐 link-callback: Magic link verified for email:', secondaryEmail)

    // Check if this email is already linked to another user
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      console.log('🔐 link-callback: Error searching for existing users:', searchError)
      return NextResponse.json({ error: 'Failed to search for existing users' }, { status: 500 })
    }

    // Check if email is already linked to another user
    const emailAlreadyLinked = existingUsers.users.some(user =>
      user.identities?.some(
        identity => identity.provider === 'email' && identity.identity_data?.email === secondaryEmail
      ) && user.id !== primaryUserId
    )

    if (emailAlreadyLinked) {
      console.log('🔐 link-callback: Email already linked to another user')
      return NextResponse.json({ error: 'This email is already linked to another user' }, { status: 409 })
    }

    // Delete the temporary email user that was created
    try {
      await supabase.auth.admin.deleteUser(tempUser.id)
      console.log('🔐 link-callback: Temporary email user deleted:', tempUser.id)
    } catch (deleteError) {
      console.log('🔐 link-callback: Could not delete temporary user (may not exist):', deleteError)
    }

    // Since linkUser is not available in current Supabase version,
    // we'll use metadata tracking approach
    console.log('🔐 link-callback: Email identity will be tracked via metadata')

    // Update metadata for tracking linked emails
    const currentMetadata = primaryUser.user_metadata || {}
    const linkedEmails: string[] = currentMetadata.linked_emails || []

    if (!linkedEmails.includes(secondaryEmail)) {
      linkedEmails.push(secondaryEmail)
      console.log('🔐 link-callback: Adding email to linked emails:', secondaryEmail)
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(primaryUserId, {
        user_metadata: { ...currentMetadata, linked_emails: linkedEmails },
        })

      if (updateError) {
        console.log('🔐 link-callback: Error updating user metadata:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      
      console.log('🔐 link-callback: Successfully updated user metadata')
    } else {
      console.log('🔐 link-callback: Email already linked:', secondaryEmail)
    }

    // ✅ Success → redirect back to frontend
    // Force localhost for development
    const siteUrl = 'http://localhost:3000'
    const redirectUrl = `${siteUrl}/profile?linked=success&email=${encodeURIComponent(secondaryEmail)}`
    console.log('🔐 link-callback: Redirecting to:', redirectUrl)
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Error in link-callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
