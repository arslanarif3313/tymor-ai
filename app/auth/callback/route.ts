// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getServerUserSettings } from '@/lib/store/serverUtils'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const linkAccount = searchParams.get('link') === 'true'
  const primaryUserId = searchParams.get('primary')

  if (code) {
    const supabase = createClient()

    // Check if user is already logged in (for account linking)
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser()

    // Handle email linking (magic link with primary user ID)
    if (primaryUserId && existingUser) {
      console.log('🔗 Email linking detected for user:', existingUser.id)

      try {
        const { createServiceClient } = await import('@/lib/supabase/service')
        const supabaseService = createServiceClient()

        // Exchange the code to get the email user info
        const { data: tempSession, error: tempError } =
          await supabase.auth.exchangeCodeForSession(code)

        if (tempError || !tempSession?.user) {
          console.error('❌ Failed to exchange code for session:', tempError)
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        const tempUser = tempSession.user
        const secondaryEmail = tempUser.email

        if (!secondaryEmail) {
          console.error('❌ No email found in magic link')
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        console.log('🔗 Email to link:', secondaryEmail)

        // Check if this email is already linked to another user
        const { data: existingUsers, error: searchError } =
          await supabaseService.auth.admin.listUsers()

        if (searchError) {
          console.error(
            '❌ Error searching for existing users:',
            searchError
          )
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        // Check if email is already linked to another user
        const emailAlreadyLinked = existingUsers.users.some(
          (user) =>
            user.identities?.some(
              (identity) =>
                identity.provider === 'email' &&
                identity.identity_data?.email === secondaryEmail
            ) && user.id !== existingUser.id
        )

        if (emailAlreadyLinked) {
          console.error('❌ Email already linked to another user')
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=email_already_linked`
          )
        }

        // Delete the temporary email user that was created
        try {
          await supabaseService.auth.admin.deleteUser(tempUser.id)
          console.log('✅ Temporary email user deleted:', tempUser.id)
        } catch (deleteError) {
          console.log(
            '⚠️ Could not delete temporary user (may not exist):',
            deleteError
          )
        }

        // Update user metadata to track linked email
        const currentMetadata = existingUser.user_metadata || {}
        const linkedEmails = currentMetadata.linked_emails || []

        if (!linkedEmails.includes(secondaryEmail)) {
          linkedEmails.push(secondaryEmail)

          await supabaseService.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...currentMetadata,
              linked_emails: linkedEmails,
            },
          })

          console.log('✅ Email account added to metadata:', secondaryEmail)
        }

        // Redirect back to profile with success message
        const siteUrl = 'http://localhost:3000'
        return NextResponse.redirect(
          `${siteUrl}/profile?linked=success&email=${secondaryEmail}`
        )
      } catch (error) {
        console.error('❌ Error during email linking:', error)
        return NextResponse.redirect(
          `${origin}/auth/auth-code-error?error=link_failed`
        )
      }
    }

    // Handle Google account linking
    if (linkAccount && existingUser) {
      console.log('🔗 Account linking detected for user:', existingUser.id)

      try {
        const { createServiceClient } = await import('@/lib/supabase/service')
        const supabaseService = createServiceClient()

        const { data: tempSession, error: tempError } =
          await supabase.auth.exchangeCodeForSession(code)

        if (tempError || !tempSession?.user) {
          console.error('❌ Failed to exchange code for session:', tempError)
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        const googleUser = tempSession.user
        const googleIdentity = googleUser.identities?.find(
          (identity) => identity.provider === 'google'
        )

        if (!googleIdentity) {
          console.error('❌ No Google identity found in session')
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        const googleEmail = googleIdentity.identity_data?.email
        console.log('🔗 Google account to link:', googleEmail)

        const { data: existingUsers, error: searchError } =
          await supabaseService.auth.admin.listUsers()

        if (searchError) {
          console.error(
            '❌ Error searching for existing users:',
            searchError
          )
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=link_failed`
          )
        }

        const emailAlreadyLinked = existingUsers.users.some(
          (user) =>
            user.identities?.some(
              (identity) =>
                identity.provider === 'google' &&
                identity.identity_data?.email === googleEmail
            ) && user.id !== existingUser.id
        )

        if (emailAlreadyLinked) {
          console.error('❌ Google email already linked to another user')
          return NextResponse.redirect(
            `${origin}/auth/auth-code-error?error=email_already_linked`
          )
        }

        try {
          await supabaseService.auth.admin.deleteUser(googleUser.id)
          console.log('✅ Temporary Google user deleted:', googleUser.id)
        } catch (deleteError) {
          console.log(
            '⚠️ Could not delete temporary user (may not exist):',
            deleteError
          )
        }

        console.log('✅ Google identity will be tracked via metadata')

        const currentMetadata = existingUser.user_metadata || {}
        const linkedGoogleAccounts =
          currentMetadata.linked_google_accounts || []

        if (googleEmail && !linkedGoogleAccounts.includes(googleEmail)) {
          linkedGoogleAccounts.push(googleEmail)

          await supabaseService.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...currentMetadata,
              linked_google_accounts: linkedGoogleAccounts,
            },
          })

          console.log('✅ Google account added to metadata:', googleEmail)
        }

        const isLocal =
          origin.includes('localhost') || origin.includes('127.0.0.1')
        const siteUrl = isLocal
          ? 'http://localhost:3000'
          : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

        return NextResponse.redirect(
          `${siteUrl}/profile?linked=success&email=${googleEmail}`
        )
      } catch (error) {
        console.error('❌ Error during account linking:', error)
        return NextResponse.redirect(
          `${origin}/auth/auth-code-error?error=link_failed`
        )
      }
    }

    // Normal OAuth sign-in flow
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      console.log(
        '✅ Server-side code exchange successful for:',
        data.user.email
      )

      console.log(
        'Verifying user settings on the server for user:',
        data.user.id
      )
      const userSettings = await getServerUserSettings(data.user.id)

      if (!userSettings) {
        console.log(
          '...No settings found. Creating new user_settings row on server...'
        )
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert([{ user_id: data.user.id }])

        if (insertError) {
          console.error(
            '❌ CRITICAL: Failed to create user_settings on server:',
            insertError
          )
          return NextResponse.redirect(`${origin}/auth/auth-code-error`)
        }
        console.log('✅ user_settings created successfully on the server.')
      } else {
        console.log('✅ user_settings already exist on the server.')
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  console.error('❌ Server-side callback error: No code or exchange failed.')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
