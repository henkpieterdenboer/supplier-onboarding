'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/lib/i18n-context'

interface ProfileFormProps {
  initialLanguage: string
  initialReceiveEmails: boolean
}

export function ProfileForm({ initialLanguage, initialReceiveEmails }: ProfileFormProps) {
  const { t, setLanguage: setAppLanguage } = useLanguage()

  // Settings state
  const [preferredLanguage, setPreferredLanguage] = useState(initialLanguage)
  const [receiveEmails, setReceiveEmails] = useState(initialReceiveEmails)
  const [savingSettings, setSavingSettings] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage, receiveEmails }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('profile.settingsError'))
      }

      // Update the app language to match
      setAppLanguage(preferredLanguage as 'nl' | 'en' | 'es')
      toast.success(t('profile.settingsSaved'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('profile.settingsError'))
    } finally {
      setSavingSettings(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordTooShort'))
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.error === 'Current password is incorrect') {
          throw new Error(t('profile.currentPasswordWrong'))
        }
        throw new Error(data.error || t('profile.passwordError'))
      }

      toast.success(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('profile.passwordError'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.description')}</p>
      </div>

      <div className="grid gap-6">
        {/* Settings card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.settings')}</CardTitle>
            <CardDescription>{t('profile.settingsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.language')}</Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">{t('profile.languageNl')}</SelectItem>
                  <SelectItem value="en">{t('profile.languageEn')}</SelectItem>
                  <SelectItem value="es">{t('profile.languageEs')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="receiveEmails"
                checked={receiveEmails}
                onCheckedChange={(checked) => setReceiveEmails(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="receiveEmails" className="cursor-pointer">
                  {t('profile.receiveEmails')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('profile.receiveEmailsDescription')}
                </p>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? t('profile.savingSettings') : t('profile.saveSettings')}
            </Button>
          </CardContent>
        </Card>

        {/* Password card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.changePassword')}</CardTitle>
            <CardDescription>{t('profile.changePasswordDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('profile.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('profile.newPasswordPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('profile.confirmPasswordPlaceholder')}
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? t('profile.savingPassword') : t('profile.savePassword')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
