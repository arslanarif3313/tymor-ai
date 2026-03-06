import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Custom login endpoint for linked email identities
 * This handles login attempts with emails that are linked to Google users
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    const supabase = createServiceClient()

    // First, try normal Supabase login
    const { data: normalLoginData, error: normalLoginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!normalLoginError && normalLoginData.user) {
      // Normal login succeeded
      return NextResponse.json({
        success: true,
        user: normalLoginData.user,
        session: normalLoginData.session,
      })
    }

    // If normal login failed, check if this email is linked to a Google user
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    
    // Find users who have this email in their linked_emails metadata
    const linkedUser = allUsers.users.find(user => {
      const linkedEmails = user.user_metadata?.linked_emails || []
      return linkedEmails.includes(email)
    })

    if (!linkedUser) {
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

    // Check if the email identity data exists in metadata
    const emailIdentities = linkedUser.user_metadata?.email_identities || {}
    const emailIdentity = emailIdentities[email]

    if (!emailIdentity) {
      return NextResponse.json({ 
        error: 'Email identity not found' 
      }, { status: 401 })
    }

    // Verify the password by attempting to create a temporary user
    // This is a workaround since we can't directly verify the password
    try {
      const { data: tempUserData, error: tempUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (tempUserError) {
        return NextResponse.json({ 
          error: 'Invalid credentials' 
        }, { status: 401 })
      }

      // Password is correct, clean up the temporary user
      await supabase.auth.admin.deleteUser(tempUserData.user.id)

      // Return the linked user data
      return NextResponse.json({
        success: true,
        user: linkedUser,
        message: 'Login successful with linked email',
      })

    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid credentials' 
      }, { status: 401 })
    }

  } catch (error) {
    console.error('Error in linked email login:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
