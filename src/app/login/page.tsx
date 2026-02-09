'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Supplier Onboarding
        </CardTitle>
        <CardDescription className="text-center">
          Log in om door te gaan
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

          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Bezig...' : 'Inloggen'}
          </Button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Wachtwoord vergeten?
            </Link>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-2">Demo accounts:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li><strong>Admin:</strong> admin@demo.nl / demo123</li>
            <li><strong>Inkoper:</strong> inkoper@demo.nl / demo123</li>
            <li><strong>Finance:</strong> finance@demo.nl / demo123</li>
            <li><strong>ERP:</strong> erp@demo.nl / demo123</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-2">Om verstuurde mails te kunnen zien:</p>
          <p className="text-sm text-gray-500 mb-1">
            <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              https://ethereal.email/login
            </a>
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li><strong>Email:</strong> dxubywxljl4roleu@ethereal.email</li>
            <li><strong>Wachtwoord:</strong> SbGwM71ZJusSNSQWr3</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            Laden...
          </CardContent>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
