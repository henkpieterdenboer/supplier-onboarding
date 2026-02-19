'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Check, ChevronDown, ExternalLink, Menu, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Role, RoleLabels } from '@/types'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import { useLanguage } from '@/lib/i18n-context'
import { LanguageSelector } from '@/components/ui/language-selector'

interface User {
  name?: string | null
  email?: string | null
  roles: string[]
}

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const [isChangingRole, setIsChangingRole] = useState(false)
  const [emailProvider, setEmailProvider] = useState<'ethereal' | 'resend'>('ethereal')
  const [demoEmail, setDemoEmail] = useState<string>('')
  const [demoEmailInput, setDemoEmailInput] = useState<string>('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      fetch('/api/email-provider')
        .then((res) => res.json())
        .then((data) => {
          if (data.provider) setEmailProvider(data.provider)
          if (data.demoEmail) {
            setDemoEmail(data.demoEmail)
            setDemoEmailInput(data.demoEmail)
          }
        })
        .catch(() => {})
    }
  }, [])

  const handleEmailProviderChange = async (newProvider: 'ethereal' | 'resend') => {
    try {
      const response = await fetch('/api/email-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      })
      if (response.ok) {
        setEmailProvider(newProvider)
      }
    } catch (error) {
      console.error('Error switching email provider:', error)
    }
  }

  const handleDemoEmailSave = async () => {
    try {
      const response = await fetch('/api/email-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoEmail: demoEmailInput || null }),
      })
      if (response.ok) {
        setDemoEmail(demoEmailInput)
        setEmailSaved(true)
        setTimeout(() => setEmailSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving demo email:', error)
    }
  }

  const handleRoleToggle = async (role: string) => {
    if (isChangingRole) return

    setIsChangingRole(true)
    try {
      let newRoles: string[]
      if (user.roles.includes(role)) {
        // Remove role (but keep at least one)
        if (user.roles.length <= 1) return
        newRoles = user.roles.filter((r) => r !== role)
      } else {
        // Add role
        newRoles = [...user.roles, role]
      }

      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles: newRoles }),
      })

      if (response.ok) {
        // Refresh the page to update the session
        router.refresh()
        window.location.reload()
      } else {
        console.error('Failed to switch roles')
      }
    } catch (error) {
      console.error('Error switching roles:', error)
    } finally {
      setIsChangingRole(false)
    }
  }

  const availableRoles = Object.values(Role)

  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard') },
  ]

  // Show "Nieuwe aanvraag" for INKOPER role
  if (user.roles.includes('INKOPER')) {
    navItems.push({ href: '/requests/new', label: t('nav.newRequest') })
  }

  // Show "Gebruikersbeheer" for ADMIN role
  if (user.roles.includes('ADMIN')) {
    navItems.push({ href: '/admin/users', label: t('nav.userManagement') })
  }

  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Mobile hamburger menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <img src={LOGO_BASE64} alt="Logo" className="h-8 w-auto" />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 px-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`text-sm font-medium transition-colors ${
                        pathname === item.href
                          ? 'bg-accent text-accent-foreground rounded-md px-3 py-2'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md px-3 py-2'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-3">
              <img src={LOGO_BASE64} alt="Logo" className="h-8 w-auto" />
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-accent text-accent-foreground rounded-md px-3 py-1.5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md px-3 py-1.5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Demo: Role switcher dropdown with checkboxes */}
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (<>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                    disabled={isChangingRole}
                  >
                    <span className="text-xs text-yellow-700">{t('demo.label')}</span>
                    <div className="flex gap-1 ml-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {RoleLabels[role as keyof typeof RoleLabels] || role}
                        </Badge>
                      ))}
                    </div>
                    <ChevronDown className="h-3 w-3 text-yellow-700" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    {t('demo.changeRoles')}
                  </div>
                  <DropdownMenuSeparator />
                  {availableRoles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={(e) => {
                        e.preventDefault()
                        handleRoleToggle(role)
                      }}
                      className={`cursor-pointer ${
                        user.roles.includes(role)
                          ? 'bg-accent text-accent-foreground font-medium'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Checkbox
                          checked={user.roles.includes(role)}
                          onCheckedChange={() => handleRoleToggle(role)}
                          aria-label={RoleLabels[role as keyof typeof RoleLabels]}
                        />
                        {RoleLabels[role as keyof typeof RoleLabels]}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                  >
                    <span className="text-xs text-yellow-700">{t('demo.emailLabel')}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        emailProvider === 'resend'
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {emailProvider === 'resend' ? t('demo.emailResend') : t('demo.emailEthereal')}
                    </Badge>
                    <ChevronDown className="h-3 w-3 text-yellow-700" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    {t('demo.emailProvider')}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleEmailProviderChange('ethereal')}
                    className={`cursor-pointer ${emailProvider === 'ethereal' ? 'bg-accent font-medium' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {emailProvider === 'ethereal' ? <Check className="h-4 w-4" /> : <div className="w-4" />}
                      <span className="flex-1">{t('demo.emailEtherealLong')}</span>
                      <a
                        href="https://ethereal.email/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleEmailProviderChange('resend')}
                    className={`cursor-pointer ${emailProvider === 'resend' ? 'bg-accent font-medium' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {emailProvider === 'resend' ? <Check className="h-4 w-4" /> : <div className="w-4" />}
                      {t('demo.emailResendLong')}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                    {t('demo.emailRecipient')}
                  </div>
                  <div className="px-2 pb-2">
                    <Input
                      type="email"
                      value={demoEmailInput}
                      onChange={(e) => setDemoEmailInput(e.target.value)}
                      placeholder={t('demo.emailPlaceholder')}
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        e.stopPropagation()
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-1.5 h-7 text-xs"
                      onClick={handleDemoEmailSave}
                    >
                      {emailSaved ? t('demo.emailSaved') : t('demo.emailSave')}
                    </Button>
                    {demoEmail && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        Actief: {demoEmail}
                      </p>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>)}

            <LanguageSelector />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <span className="text-sm">{user.name || user.email}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {user.email}
                </div>
                <DropdownMenuItem
                  onClick={() => router.push('/profile')}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-2" />
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-red-600 cursor-pointer"
                >
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
