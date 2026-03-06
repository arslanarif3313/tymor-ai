import { useState } from 'react'
import { User } from '@supabase/supabase-js'

interface LinkAccountRequest {
  linkType: 'email' | 'google'
  email?: string
  password?: string
  googleEmail?: string
}

interface LinkAccountResponse {
  success: boolean
  message: string
  linkType?: string
  linkedEmail?: string
  linkedGoogleAccount?: string
  actionLink?: string
  requiresOAuth?: boolean
  oauthUrl?: string
  error?: string
}

interface ValidateLinkingResponse {
  valid: boolean
  message?: string
  error?: string
  code?: string
  linkType?: string
  email?: string
  googleEmail?: string
}

interface UnlinkAccountRequest {
  linkType: 'email' | 'google'
  email?: string
  identityId?: string
}

interface UnlinkAccountResponse {
  success: boolean
  message: string
  unlinkedEmail?: string
  unlinkedIdentity?: string
  error?: string
}

interface UserLinkingStatus {
  id: string
  email: string
  identities: any[]
  hasGoogleIdentity: boolean
  hasEmailIdentity: boolean
  linkedEmails: string[]
  linkedGoogleAccounts: string[]
  canLinkEmail: boolean
  canLinkGoogle: boolean
}

export function useAccountLinking(user: User | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateLinking = async (request: Omit<LinkAccountRequest, 'password'>): Promise<ValidateLinkingResponse> => {
    try {
      const response = await fetch('/api/user/validate-linking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ...request,
        }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error validating linking:', error)
      return {
        valid: false,
        error: 'Failed to validate linking',
      }
    }
  }

  const linkAccount = async (request: LinkAccountRequest): Promise<LinkAccountResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      if (request.type === 'google') {
        // Use native Supabase linkIdentity for Google with localhost redirect
        const { data: linkData, error: linkError } = await supabase.auth.linkIdentity({ 
          provider: 'google',
          options: {
            redirectTo: 'http://localhost:3000/auth/callback'
          }
        })

        if (linkError) {
          setError(linkError.message)
          return {
            success: false,
            error: linkError.message,
          }
        }

        return {
          success: true,
          data: linkData,
        }
      } else if (request.type === 'email') {
        // Use native Supabase updateUser for email
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          email: request.email,
          password: request.password
        })

        if (updateError) {
          setError(updateError.message)
          return {
            success: false,
            error: updateError.message,
          }
        }

        return {
          success: true,
          data: updateData,
        }
      }

      return {
        success: false,
        error: 'Invalid link type',
      }
    } catch (error) {
      console.error('Error linking account:', error)
      const errorMessage = 'Failed to link account'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setIsLoading(false)
    }
  }

  const unlinkAccount = async (request: UnlinkAccountRequest): Promise<UnlinkAccountResponse> => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use native Supabase unlinkIdentity
      const { data: unlinkData, error: unlinkError } = await supabase.auth.unlinkIdentity(request.identity)

      if (unlinkError) {
        setError(unlinkError.message)
        return {
          success: false,
          error: unlinkError.message,
        }
      }

      return {
        success: true,
        data: unlinkData,
      }
    } catch (error) {
      console.error('Error unlinking account:', error)
      const errorMessage = 'Failed to unlink account'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getUserLinkingStatus = async (): Promise<UserLinkingStatus | null> => {
    if (!user) return null

    try {
      // Use native Supabase getUserIdentities
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
      
      if (identitiesError) {
        console.error('Failed to get user identities:', identitiesError)
        return null
      }

      return {
        identities: identities.identities || [],
        canLinkMore: true, // You can implement logic to check limits
      }
    } catch (error) {
      console.error('Error getting user linking status:', error)
      return null
    }
  }

  const initiateGoogleLinking = async () => {
    if (!user) return

    try {
      // Use Supabase's native linkIdentity method with localhost redirect
      const { data, error } = await supabase.auth.linkIdentity({ 
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback'
        }
      })

      if (error) {
        console.error('Error linking Google account:', error)
        return { error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error linking Google account:', error)
      return { error: 'Failed to link Google account' }
    }
  }

  return {
    isLoading,
    error,
    validateLinking,
    linkAccount,
    unlinkAccount,
    getUserLinkingStatus,
    initiateGoogleLinking,
    clearError: () => setError(null),
  }
}
