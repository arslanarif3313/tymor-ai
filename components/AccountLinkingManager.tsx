'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { useAccountLinking } from '@/hooks/useAccountLinking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  Chrome, 
  Plus, 
  Trash2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AccountLinkingManagerProps {
  user: User
  onUpdate?: () => void
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

export default function AccountLinkingManager({ user, onUpdate }: AccountLinkingManagerProps) {
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

  const [linkingStatus, setLinkingStatus] = useState<UserLinkingStatus | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [linkType, setLinkType] = useState<'email' | 'google'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationResult, setValidationResult] = useState<any>(null)

  // Load user linking status on mount
  useEffect(() => {
    loadLinkingStatus()
  }, [user])

  const loadLinkingStatus = async () => {
    const status = await getUserLinkingStatus()
    setLinkingStatus(status)
  }

  const handleValidateEmail = async () => {
    if (!email) return

    const result = await validateLinking({ linkType: 'email', email })
    setValidationResult(result)
  }

  const handleValidateGoogle = async () => {
    const result = await validateLinking({ linkType: 'google', googleEmail: 'placeholder' })
    setValidationResult(result)
  }

  const handleLinkEmail = async () => {
    if (!email) return

    const result = await linkAccount({ linkType: 'email', email, password })
    
    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      })
      setIsDialogOpen(false)
      setEmail('')
      setPassword('')
      setValidationResult(null)
      loadLinkingStatus()
      onUpdate?.()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to link email',
        variant: 'destructive',
      })
    }
  }

  const handleLinkGoogle = async () => {
    const result = await linkAccount({ linkType: 'google' })
    
    if (result.success && result.requiresOAuth) {
      // Redirect to OAuth flow
      const redirectUrl = initiateGoogleLinking()
      if (redirectUrl) {
        window.location.href = redirectUrl
      }
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to initiate Google linking',
        variant: 'destructive',
      })
    }
  }

  const handleUnlinkEmail = async (emailToUnlink: string) => {
    const result = await unlinkAccount({ linkType: 'email', email: emailToUnlink })
    
    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      })
      loadLinkingStatus()
      onUpdate?.()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to unlink email',
        variant: 'destructive',
      })
    }
  }

  const handleUnlinkGoogle = async (identityId: string) => {
    const result = await unlinkAccount({ linkType: 'google', identityId })
    
    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      })
      loadLinkingStatus()
      onUpdate?.()
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to unlink Google account',
        variant: 'destructive',
      })
    }
  }

  if (!linkingStatus) {
    return <div>Loading account linking status...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            Account Linking
          </CardTitle>
          <CardDescription>
            Link multiple email addresses and Google accounts to your profile for flexible sign-in options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Account */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Primary Account</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Mail className="h-4 w-4" />
              <span className="text-sm">{linkingStatus.email}</span>
              <Badge variant="secondary">Primary</Badge>
            </div>
          </div>

          <Separator />

          {/* Linked Emails */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Linked Email Addresses</Label>
              {linkingStatus.canLinkEmail && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Link Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link Email Account</DialogTitle>
                      <DialogDescription>
                        Add an additional email address to your account for flexible sign-in.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password for new account"
                        />
                      </div>
                      {validationResult && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {validationResult.valid ? (
                              <span className="text-green-600">{validationResult.message}</span>
                            ) : (
                              <span className="text-red-600">{validationResult.error}</span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleValidateEmail}
                          variant="outline"
                          size="sm"
                        >
                          Validate
                        </Button>
                        <Button 
                          onClick={handleLinkEmail}
                          disabled={!validationResult?.valid || isLoading}
                          size="sm"
                        >
                          {isLoading ? 'Linking...' : 'Link Email'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="space-y-2">
              {linkingStatus.linkedEmails.map((email, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{email}</span>
                    <Badge variant="outline">Linked</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlinkEmail(email)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {linkingStatus.linkedEmails.length === 0 && (
                <p className="text-sm text-muted-foreground">No linked email addresses</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Google Accounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Google Accounts</Label>
              {linkingStatus.canLinkGoogle && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleLinkGoogle}
                  disabled={isLoading}
                >
                  <Chrome className="h-4 w-4 mr-1" />
                  Link Google
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {linkingStatus.hasGoogleIdentity && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Chrome className="h-4 w-4" />
                  <span className="text-sm">Google Account (Primary)</span>
                  <Badge variant="secondary">Primary</Badge>
                </div>
              )}
              {linkingStatus.linkedGoogleAccounts.map((googleEmail, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Chrome className="h-4 w-4" />
                    <span className="text-sm">{googleEmail}</span>
                    <Badge variant="outline">Linked</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnlinkGoogle('placeholder-id')}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!linkingStatus.hasGoogleIdentity && linkingStatus.linkedGoogleAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">No Google accounts linked</p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
