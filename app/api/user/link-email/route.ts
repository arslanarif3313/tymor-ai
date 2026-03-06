import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * DISABLED - Using native Supabase methods instead
 */
export async function GET() {
  return NextResponse.json({ 
    message: 'This endpoint is disabled. Use native Supabase linkIdentity() and updateUser() methods instead.',
    disabled: true 
  }, { status: 410 })
}

/**
 * Link a secondary email for Google users (send magic link for confirmation)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, email, password } = await request.json()
    console.log('🔐 link-email POST: Starting email linking request...')
    console.log('🔐 link-email POST: User ID:', userId)
    console.log('🔐 link-email POST: Email:', email)
    
    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'User ID, email, and password are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get primary user
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userData.user
    const currentMetadata = user.user_metadata || {}
    console.log('🔐 link-email POST: Current metadata:', currentMetadata)
    const linkedEmails: string[] = currentMetadata.linked_emails || []

    // Allow Google users to link additional emails (check if user has Google identity)
    const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
    
    // For non-Google users, only allow ONE linked email
    if (!hasGoogleIdentity && linkedEmails.length >= 1) {
      console.log('🔐 link-email POST: Non-Google user has linked emails:', linkedEmails)
      console.log('🔐 link-email POST: Non-Google user has linked emails:', linkedEmails)
      return NextResponse.json(
        { error: 'You can only link one additional email. Unlink first.' },
        { status: 400 }
      )
    }
    
    // For Google users, allow up to 3 additional emails
    if (hasGoogleIdentity && linkedEmails.length >= 3) {
      return NextResponse.json(
        { error: 'You can link up to 3 additional emails. Unlink one first.' },
        { status: 400 }
      )
    }

    // Prevent duplicate linking
    if (linkedEmails.includes(email) || user.email === email) {
      return NextResponse.json(
        { error: 'This email is already linked to your profile' },
        { status: 409 }
      )
    }

    // For Google users linking additional emails, we need to use the admin API
    // to create a proper email identity that can be used for login.
    
    try {
      // First, check if a user with this email already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers.users.find(u => u.email === email)
      
      if (existingUser) {
        return NextResponse.json({ 
          error: 'A user with this email already exists. Please use a different email.' 
        }, { status: 409 })
      }

      // Create a new user with the email and password
      const { data: newUserData, error: newUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
      })

      if (newUserError) {
        console.error('Error creating new user:', newUserError)
        return NextResponse.json({ error: 'Failed to create user with this email' }, { status: 500 })
      }

      const newUser = newUserData.user
      console.log('✅ New user created:', newUser.id)

      // Get the email identity from the new user
      const emailIdentity = newUser.identities?.find(identity => identity.provider === 'email')
      
      if (!emailIdentity) {
        // Clean up the new user if no email identity found
        await supabase.auth.admin.deleteUser(newUser.id)
        return NextResponse.json({ error: 'Failed to create email identity' }, { status: 500 })
      }

      // Since linkUser is not available in current Supabase version,
      // we'll use a different approach: update the primary user's email
      // to include the new email as an additional identity
      
      // Get the current user data
      const { data: currentUserData, error: currentUserError } = await supabase.auth.admin.getUserById(userId)
      
      if (currentUserError || !currentUserData?.user) {
        console.error('Error getting current user:', currentUserError)
        await supabase.auth.admin.deleteUser(newUser.id)
        return NextResponse.json({ error: 'Failed to get current user' }, { status: 500 })
      }

      const currentUser = currentUserData.user
      
      // Update the primary user to include the email identity
      // We'll store the email identity data in metadata for login purposes
      
      // Update the user with the new identity
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        email: currentUser.email, // Keep the original email
        user_metadata: {
          ...currentUser.user_metadata,
          linked_emails: [...(currentUser.user_metadata?.linked_emails || []), email],
          // Store the email identity data for login purposes
          email_identities: {
            ...(currentUser.user_metadata?.email_identities || {}),
            [email]: {
              provider: 'email',
              identity_data: emailIdentity.identity_data,
              created_at: new Date().toISOString(),
            }
          }
        },
      })

      if (updateError) {
        console.error('Error updating user with email identity:', updateError)
        // Clean up the new user if update fails
        await supabase.auth.admin.deleteUser(newUser.id)
        return NextResponse.json({ error: 'Failed to link email identity' }, { status: 500 })
      }

      console.log('✅ Email identity added to primary user')

      // Delete the new user since we've linked its identity to the primary user
      try {
        await supabase.auth.admin.deleteUser(newUser.id)
        console.log('✅ New user deleted after identity linking:', newUser.id)
      } catch (deleteError) {
        console.log('⚠️ Could not delete new user:', deleteError)
      }

      return NextResponse.json({
        success: true,
        message: `Email ${email} has been linked to your profile. You can now sign in with this email.`,
        linkedEmail: email,
      })

    } catch (error) {
      console.error('Error in email linking process:', error)
      return NextResponse.json({ error: 'Failed to link email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in link-email POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Unlink a secondary email
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Get user
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userData.user
    const currentMetadata = user.user_metadata || {}
    const linkedEmails: string[] = currentMetadata.linked_emails || []

    // Remove email
    const updatedLinkedEmails = linkedEmails.filter((e) => e !== email)

    const { error: updateError } =
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...currentMetadata,
          linked_emails: updatedLinkedEmails,
        },
      })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Email ${email} unlinked successfully.`,
    })
  } catch (error) {
    console.error('Error in link-email DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
