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
import { useLanguage } from '@/lib/i18n-context'

interface User {
  id: string
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  roles: string[]
  receiveEmails: boolean
  preferredLanguage?: string
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
  onSuccess: () => void
}

export function UserFormDialog({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) {
  const { t } = useLanguage()
  const isEdit = !!user
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [middleName, setMiddleName] = useState(user?.middleName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [roles, setRoles] = useState<string[]>(user?.roles || ['INKOPER'])
  const [receiveEmails, setReceiveEmails] = useState(user?.receiveEmails ?? true)
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'nl')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRoleToggle = (role: string) => {
    setRoles((prev) => {
      if (prev.includes(role)) {
        // Don't allow removing the last role
        if (prev.length <= 1) return prev
        return prev.filter((r) => r !== role)
      }
      return [...prev, role]
    })
  }

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
        roles,
        receiveEmails,
        preferredLanguage,
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
        setError(data.error || t('common.error'))
        return
      }

      onSuccess()
    } catch {
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('admin.users.form.editTitle') : t('admin.users.form.newTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t('admin.users.form.editDescription')
              : t('admin.users.form.newDescription')}
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
              <Label htmlFor="firstName">{t('admin.users.form.firstName')}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">{t('admin.users.form.middleName')}</Label>
              <Input
                id="middleName"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={isLoading}
                placeholder={t('admin.users.form.middleNamePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">{t('admin.users.form.lastName')}</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('admin.users.form.email')}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading || isEdit}
              placeholder={t('admin.users.form.emailPlaceholder')}
            />
            {isEdit && (
              <p className="text-xs text-gray-500">{t('admin.users.form.emailReadonly')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('admin.users.form.roles')}</Label>
            <div className="space-y-2">
              {(['ADMIN', 'INKOPER', 'FINANCE', 'ERP'] as const).map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`role-${role}`}
                    checked={roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor={`role-${role}`} className="font-normal">
                    {t(`enums.role.${role}`)}
                  </Label>
                </div>
              ))}
            </div>
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
              {t('admin.users.form.receiveEmails')}
            </Label>
          </div>

          <div className="space-y-2">
            <Label>{t('admin.users.form.preferredLanguage')}</Label>
            <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t('admin.users.form.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('admin.users.form.submitting') : isEdit ? t('admin.users.form.save') : t('admin.users.form.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
