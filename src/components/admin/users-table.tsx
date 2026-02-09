'use client'

import { useState, useMemo } from 'react'
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
import { RoleLabels } from '@/types'
import { formatUserName } from '@/lib/user-utils'
import { UserFormDialog } from './user-form-dialog'

interface User {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  roles: string[]
  isActive: boolean
  receiveEmails: boolean
  createdAt: Date
  isActivated: boolean
  hasPendingActivation: boolean
}

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
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
      title: user.isActive ? 'Gebruiker deactiveren' : 'Gebruiker activeren',
      description: user.isActive
        ? `Weet u zeker dat u ${formatUserName(user)} (${user.email}) wilt deactiveren? De gebruiker kan dan niet meer inloggen.`
        : `Weet u zeker dat u ${formatUserName(user)} (${user.email}) wilt activeren?`,
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Input
            placeholder="Zoeken op naam of email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter op rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle rollen</SelectItem>
              {Object.entries(RoleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter op status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="active">Actief</SelectItem>
              <SelectItem value="inactive">Inactief</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          Nieuwe gebruiker
        </Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email ontvangen</TableHead>
              <TableHead>Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Geen gebruikers gevonden
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
                          {RoleLabels[role] || role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Actief</Badge>
                    ) : user.isActivated ? (
                      <Badge className="bg-red-100 text-red-800">Inactief</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Niet geactiveerd</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.receiveEmails ? (
                      <span className="text-green-600">Ja</span>
                    ) : (
                      <span className="text-gray-400">Nee</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Bewerken
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                      >
                        {user.isActive ? 'Deactiveren' : 'Activeren'}
                      </Button>
                      {!user.isActivated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendActivation(user)}
                          disabled={isLoading}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Activatiemail
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
        {filteredUsers.length} van {users.length} gebruikers
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
              Annuleren
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isLoading}
            >
              {isLoading ? 'Bezig...' : 'Bevestigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
