'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import { useLanguage } from '@/lib/i18n-context'
import { LanguageSelector } from '@/components/ui/language-selector'
import Link from 'next/link'

const validSsoErrors = ['AccountNotFound', 'NoEmail', 'OAuthCallback', 'OAuthSignin']

function LoginForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSsoLoading, setIsSsoLoading] = useState(false)

  // Show SSO error from URL params
  const ssoError = searchParams.get('error')
  const ssoErrorMessage = ssoError && validSsoErrors.includes(ssoError) ? t(`auth.login.ssoErrors.${ssoError}`) : null

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
      setError(t('auth.login.errorGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <div className="flex justify-center">
          <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          {t('auth.login.title')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('auth.login.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ssoErrorMessage && (
          <Alert variant="destructive" className="mb-4">
            {ssoErrorMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.login.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.login.password')}</Label>
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
            {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
        </form>

        {process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === 'true' && (
          <>
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-sm text-muted-foreground">
                {t('common.or')}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isSsoLoading || isLoading}
              onClick={() => {
                setIsSsoLoading(true)
                signIn('azure-ad', { callbackUrl })
              }}
            >
              {isSsoLoading ? (
                t('auth.login.ssoLoading')
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  {t('auth.login.ssoButton')}
                </>
              )}
            </Button>
          </>
        )}

        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground font-medium mb-2">{t('demo.accounts')}</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Admin:</strong> admin@demo.nl / demo123</li>
                <li><strong>Inkoper:</strong> inkoper@demo.nl / demo123</li>
                <li><strong>Finance:</strong> finance@demo.nl / demo123</li>
                <li><strong>ERP:</strong> erp@demo.nl / demo123</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground font-medium mb-2">{t('demo.viewEmails')}</p>
              <p className="text-sm text-muted-foreground mb-1">
                <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  https://ethereal.email/login
                </a>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Email:</strong> dxubywxljl4roleu@ethereal.email</li>
                <li>{t('demo.passwordCreds')}</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10">
        <Suspense fallback={
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              {t('common.loading')}
            </CardContent>
          </Card>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
