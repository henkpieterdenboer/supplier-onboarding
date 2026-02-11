'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Role, RoleLabels } from '@/types'
import { LOGO_BASE64 } from '@/lib/logo-base64'

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
  const [isChangingRole, setIsChangingRole] = useState(false)
  const [emailProvider, setEmailProvider] = useState<'ethereal' | 'resend'>('ethereal')
  const [isChangingProvider, setIsChangingProvider] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      fetch('/api/email-provider')
        .then((res) => res.json())
        .then((data) => {
          if (data.provider) setEmailProvider(data.provider)
        })
        .catch(() => {})
    }
  }, [])

  const handleEmailProviderToggle = async () => {
    if (isChangingProvider) return
    setIsChangingProvider(true)
    try {
      const newProvider = emailProvider === 'ethereal' ? 'resend' : 'ethereal'
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
    } finally {
      setIsChangingProvider(false)
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
    { href: '/dashboard', label: 'Dashboard' },
  ]

  // Show "Nieuwe aanvraag" for INKOPER role
  if (user.roles.includes('INKOPER')) {
    navItems.push({ href: '/requests/new', label: 'Nieuwe aanvraag' })
  }

  // Show "Gebruikersbeheer" for ADMIN role
  if (user.roles.includes('ADMIN')) {
    navItems.push({ href: '/admin/users', label: 'Gebruikersbeheer' })
  }

  return (
    <header className="bg-slate-300 border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
              <img src={LOGO_BASE64} alt="Logo" className="h-8 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-gray-900 ${
                    pathname === item.href
                      ? 'text-gray-900'
                      : 'text-gray-500'
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
                    className="flex items-center gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                    disabled={isChangingRole}
                  >
                    <span className="text-xs text-yellow-700">Demo:</span>
                    <div className="flex gap-1 ml-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {RoleLabels[role as keyof typeof RoleLabels] || role}
                        </Badge>
                      ))}
                    </div>
                    <svg
                      className="h-3 w-3 text-yellow-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">
                    Rollen wijzigen
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
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="checkbox"
                          checked={user.roles.includes(role)}
                          readOnly
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {RoleLabels[role as keyof typeof RoleLabels]}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                onClick={handleEmailProviderToggle}
                disabled={isChangingProvider}
              >
                <span className="text-xs text-yellow-700">Mail:</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    emailProvider === 'resend'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                >
                  {emailProvider === 'resend' ? 'Demomail' : 'Ethereal'}
                </Badge>
              </Button>
            </>)}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <span className="text-sm">{user.name || user.email}</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-red-600 cursor-pointer"
                >
                  Uitloggen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
