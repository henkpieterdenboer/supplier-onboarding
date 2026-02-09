'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Role, RoleLabels } from '@/types'

interface User {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  role: string
  receiveEmails: boolean
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
  onSuccess: () => void
}

export function UserFormDialog({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) {
  const isEdit = !!user
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [middleName, setMiddleName] = useState(user?.middleName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [role, setRole] = useState(user?.role || 'INKOPER')
  const [receiveEmails, setReceiveEmails] = useState(user?.receiveEmails ?? true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const url = isEdit ? `/api/admin/users/${user.id}` : '/api/admin/users'
      const method = isEdit ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        firstName,
        middleName: middleName || null,
        lastName,
        role,
        receiveEmails,
      }

      if (!isEdit) {
        body.email = email
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Er is een fout opgetreden')
        return
      }

      onSuccess()
    } catch {
      setError('Er is een fout opgetreden')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Wijzig de gegevens van de gebruiker.'
              : 'Maak een nieuwe gebruiker aan. De gebruiker ontvangt een activatiemail.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Tussenvoegsel</Label>
              <Input
                id="middleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={isLoading}
                placeholder="bijv. van, de"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Achternaam *</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isEdit}
              placeholder="gebruiker@bedrijf.nl"
            />
            {isEdit && (
              <p className="text-xs text-gray-500">Email kan niet gewijzigd worden</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RoleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="receiveEmails"
              checked={receiveEmails}
              onChange={(e) => setReceiveEmails(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="receiveEmails" className="font-normal">
              Notificatie-emails ontvangen
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Bezig...' : isEdit ? 'Opslaan' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
