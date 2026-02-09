'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LOGO_BASE64 } from '@/lib/logo-base64'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er is een fout opgetreden')
        return
      }

      setSuccess(true)
    } catch {
      setError('Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Email verstuurd
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              Als het emailadres bij ons bekend is, ontvangt u een email met instructies om uw wachtwoord te herstellen.
            </Alert>
            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                Terug naar inloggen
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Wachtwoord vergeten
          </CardTitle>
          <CardDescription className="text-center">
            Vul uw emailadres in om een resetlink te ontvangen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="uw@email.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Bezig...' : 'Resetlink versturen'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:underline">
              Terug naar inloggen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
