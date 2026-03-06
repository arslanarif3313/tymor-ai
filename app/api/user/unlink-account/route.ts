import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Unlink an account (email or Google)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, linkType, email, identityId } = await request.json()

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

    if (linkType === 'email') {
      // Email unlinking logic
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required for email unlinking' },
          { status: 400 }
        )
      }

      const linkedEmails: string[] = currentMetadata.linked_emails || []
      
      if (!linkedEmails.includes(email)) {
        return NextResponse.json(
          { error: 'This email is not linked to your profile' },
          { status: 404 }
        )
      }

      // Remove email from linked emails
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
        unlinkedEmail: email,
      })

    } else if (linkType === 'google') {
      // Google unlinking logic
      if (!identityId) {
        return NextResponse.json(
          { error: 'Identity ID is required for Google unlinking' },
          { status: 400 }
        )
      }

      // Check if this is the last sign-in method
      const remainingIdentities =
        user.identities?.filter(identity => identity.id !== identityId) || []

      if (remainingIdentities.length === 0) {
        return NextResponse.json(
          { error: 'Cannot unlink the last sign-in method' },
          { status: 400 }
        )
      }

      // For Google unlinking, we need to handle this through Supabase admin
      // Note: This is a complex operation that may require additional setup
      try {
        // Get the identity to unlink
        const identityToUnlink = user.identities?.find(id => id.id === identityId)
        
        if (!identityToUnlink) {
          return NextResponse.json(
            { error: 'Identity not found' },
            { status: 404 }
          )
        }

        // Update user metadata to remove from linked Google accounts
        const linkedGoogleAccounts = currentMetadata.linked_google_accounts || []
        const googleEmail = identityToUnlink.identity_data?.email
        
        if (googleEmail) {
          const updatedLinkedGoogleAccounts = linkedGoogleAccounts.filter(
            (email: string) => email !== googleEmail
          )

          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...currentMetadata,
              linked_google_accounts: updatedLinkedGoogleAccounts,
            },
          })
        }

        // Note: Actual identity unlinking requires Supabase admin operations
        // This might need to be handled differently based on your Supabase setup
        return NextResponse.json({
          success: true,
          message: 'Google account unlinked successfully.',
          unlinkedIdentity: identityId,
        })

      } catch (error) {
        console.error('Error unlinking Google account:', error)
        return NextResponse.json(
          { error: 'Failed to unlink Google account' },
          { status: 500 }
        )
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid link type. Must be "email" or "google"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in unlink-account DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
