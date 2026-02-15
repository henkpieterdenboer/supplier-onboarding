'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatUserName } from '@/lib/user-utils'
import { useLanguage } from '@/lib/i18n-context'
import { UserFormDialog } from './user-form-dialog'

interface User {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  roles: string[]
  labels: string[]
  isActive: boolean
  receiveEmails: boolean
  preferredLanguage?: string
  createdAt: Date
  isActivated: boolean
  hasPendingActivation: boolean
}

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [users, setUsers] = useState(initialUsers)

  // Sync state when server component re-renders with new data
  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    action: () => Promise<void>
  }>({ open: false, title: '', description: '', action: async () => {} })
  const [isLoading, setIsLoading] = useState(false)

  const filteredUsers = useMemo(() => {
    let result = [...users]

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (u) =>
          formatUserName(u).toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      )
    }

    if (roleFilter !== 'all') {
      result = result.filter((u) => u.roles.includes(roleFilter))
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter((u) => u.isActive)
      } else if (statusFilter === 'inactive') {
        result = result.filter((u) => !u.isActive)
      }
    }

    return result
  }, [users, search, roleFilter, statusFilter])

  const handleToggleActive = async (user: User) => {
    setConfirmDialog({
      open: true,
      title: user.isActive ? t('admin.users.table.confirmDeactivate') : t('admin.users.table.confirmActivate'),
      description: user.isActive
        ? t('admin.users.table.confirmDeactivateMessage', { name: formatUserName(user), email: user.email })
        : t('admin.users.table.confirmActivateMessage', { name: formatUserName(user), email: user.email }),
      action: async () => {
        const response = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle-active' }),
        })

        if (response.ok) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id ? { ...u, isActive: !u.isActive } : u
            )
          )
        }
      },
    })
  }

  const handleResendActivation = async (user: User) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend-activation' }),
      })

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, hasPendingActivation: true } : u
          )
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setIsCreateOpen(false)
    router.refresh()
  }

  const handleEditSuccess = () => {
    setEditingUser(null)
    router.refresh()
  }

  const handleConfirmAction = async () => {
    setIsLoading(true)
    try {
      await confirmDialog.action()
    } finally {
      setIsLoading(false)
      setConfirmDialog({ open: false, title: '', description: '', action: async () => {} })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.users.title')}</h1>
        <p className="text-gray-500">{t('admin.users.description')}</p>
      </div>

    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Input
            placeholder={t('admin.users.table.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t('admin.users.table.filterRole')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.users.table.allRoles')}</SelectItem>
              {(['ADMIN', 'INKOPER', 'FINANCE', 'ERP'] as const).map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`enums.role.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t('admin.users.table.filterStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.users.table.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('admin.users.table.active')}</SelectItem>
              <SelectItem value="inactive">{t('admin.users.table.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          {t('admin.users.table.newUser')}
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('admin.users.table.name')}</TableHead>
              <TableHead>{t('admin.users.table.email')}</TableHead>
              <TableHead>{t('admin.users.table.role')}</TableHead>
              <TableHead>{t('admin.users.table.labels')}</TableHead>
              <TableHead>{t('admin.users.table.status')}</TableHead>
              <TableHead>{t('admin.users.table.receiveEmail')}</TableHead>
              <TableHead>{t('admin.users.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {t('admin.users.table.empty')}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {formatUserName(user)}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {t(`enums.role.${role}`)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(user.labels || []).map((label) => (
                        <Badge key={label} variant="outline">
                          {t(`enums.label.${label}`)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-800">{t('admin.users.table.statusActive')}</Badge>
                    ) : user.isActivated ? (
                      <Badge className="bg-red-100 text-red-800">{t('admin.users.table.statusInactive')}</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">{t('admin.users.table.statusNotActivated')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.receiveEmails ? (
                      <span className="text-green-600">{t('common.yes')}</span>
                    ) : (
                      <span className="text-gray-400">{t('common.no')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        {t('admin.users.table.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                      >
                        {user.isActive ? t('admin.users.table.deactivate') : t('admin.users.table.activate')}
                      </Button>
                      {!user.isActivated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendActivation(user)}
                          disabled={isLoading}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {t('admin.users.table.resendActivation')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        {t('admin.users.table.count', { filtered: filteredUsers.length, total: users.length })}
      </div>

      {/* Create user dialog */}
      <UserFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit user dialog */}
      {editingUser && (
        <UserFormDialog
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, title: '', description: '', action: async () => {} })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, title: '', description: '', action: async () => {} })}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isLoading}
            >
              {isLoading ? t('common.submitting') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
