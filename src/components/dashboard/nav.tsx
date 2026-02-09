'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Role, RoleLabels } from '@/types'
import { LOGO_BASE64 } from '@/lib/logo-base64'

interface User {
  name?: string | null
  email?: string | null
  role: string
}

interface DashboardNavProps {
  user: User
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChangingRole, setIsChangingRole] = useState(false)

  const handleRoleChange = async (newRole: string) => {
    if (newRole === user.role || isChangingRole) return

    setIsChangingRole(true)
    try {
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        // Refresh the page to update the session
        router.refresh()
        window.location.reload()
      } else {
        console.error('Failed to switch role')
      }
    } catch (error) {
      console.error('Error switching role:', error)
    } finally {
      setIsChangingRole(false)
    }
  }

  const availableRoles = Object.values(Role)

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
  ]

  // Only show "Nieuwe aanvraag" for INKOPER role
  if (user.role === 'INKOPER') {
    navItems.push({ href: '/requests/new', label: 'Nieuwe aanvraag' })
  }

  // Only show "Gebruikersbeheer" for ADMIN role
  if (user.role === 'ADMIN') {
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
            {/* Demo: Role switcher dropdown */}
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-yellow-50 border-yellow-300 hover:bg-yellow-100"
                    disabled={isChangingRole}
                  >
                    <span className="text-xs text-yellow-700">Demo:</span>
                    <Badge variant="outline" className="ml-1">
                      {RoleLabels[user.role as keyof typeof RoleLabels] || user.role}
                    </Badge>
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
                    Rol wijzigen
                  </div>
                  <DropdownMenuSeparator />
                  {availableRoles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`cursor-pointer ${
                        user.role === role
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : ''
                      }`}
                    >
                      {RoleLabels[role as keyof typeof RoleLabels]}
                      {user.role === role && (
                        <svg
                          className="ml-auto h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
