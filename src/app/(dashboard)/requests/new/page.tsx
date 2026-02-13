'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Region, SupplierType, SupplierTypeLabels } from '@/types'
import { useLanguage } from '@/lib/i18n-context'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function NewRequestPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ id: string; emailPreviewUrl: string | null } | null>(null)

  const [formData, setFormData] = useState({
    supplierName: '',
    supplierEmail: '',
    region: 'EU' as Region,
    selfFill: false,
    supplierType: 'KOOP' as SupplierType,
    supplierLanguage: 'nl',
  })

  // Only INKOPER can create new requests
  if (!session?.user?.roles?.includes('INKOPER')) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          {t('requests.new.noPermission')}
        </Alert>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('common.error'))
      }

      toast.success(
        formData.selfFill
          ? t('requests.new.successSelfFill')
          : t('requests.new.successInvitation')
      )

      // Redirect to the request detail page or edit page if self-fill
      if (formData.selfFill) {
        router.push(`/requests/${data.id}/edit`)
      } else if (isDemoMode && data.emailPreviewUrl) {
        // In demo mode, show success screen with email preview link
        setSuccessData({ id: data.id, emailPreviewUrl: data.emailPreviewUrl })
      } else {
        router.push(`/requests/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  // Demo mode: show success screen with test email info
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('requests.new.successTitle')}</CardTitle>
            <CardDescription>
              {t('requests.new.successEtherealTitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="font-medium text-amber-900">{t('requests.new.successEtherealLabel')}</p>
              <p className="text-sm text-amber-800">
                {t('requests.new.successEtherealDescription')}
              </p>
              <a
                href={successData.emailPreviewUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-blue-700 underline break-all"
              >
                {successData.emailPreviewUrl}
              </a>
            </div>
            <div className="flex gap-4 pt-2">
              <Link href={`/requests/${successData.id}`}>
                <Button>{t('requests.new.goToRequest')}</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">{t('requests.new.goToDashboard')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('requests.new.title')}</CardTitle>
          <CardDescription>
            {t('requests.new.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">{error}</Alert>
            )}

            {/* Supplier Type Selector */}
            <div className="space-y-4">
              <Label>{t('requests.new.supplierType')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(SupplierTypeLabels).map(([value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, supplierType: value as SupplierType })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      formData.supplierType === value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={isLoading}
                  >
                    <div className="font-medium">{t(`enums.supplierType.${value}`)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {value === 'KOOP' && t('requests.new.typeKoop')}
                      {value === 'X_KWEKER' && t('requests.new.typeXKweker')}
                      {value === 'O_KWEKER' && t('requests.new.typeOKweker')}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierName">{t('requests.new.supplierName')}</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) =>
                  setFormData({ ...formData, supplierName: e.target.value })
                }
                placeholder={t('requests.new.supplierNamePlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierEmail">{t('requests.new.supplierEmail')}</Label>
              <Input
                id="supplierEmail"
                type="email"
                value={formData.supplierEmail}
                onChange={(e) =>
                  setFormData({ ...formData, supplierEmail: e.target.value })
                }
                placeholder={t('requests.new.supplierEmailPlaceholder')}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">{t('requests.new.region')}</Label>
              <Select
                value={formData.region}
                onValueChange={(value: Region) =>
                  setFormData({ ...formData, region: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('requests.new.regionPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(['EU', 'ROW'] as Region[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`enums.region.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!formData.selfFill && (
              <div className="space-y-2">
                <Label>{t('requests.new.supplierLanguage')}</Label>
                <p className="text-sm text-muted-foreground">{t('requests.new.supplierLanguageDescription')}</p>
                <Select value={formData.supplierLanguage} onValueChange={(value) => setFormData({...formData, supplierLanguage: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">{t('requests.new.languageNl')}</SelectItem>
                    <SelectItem value="en">{t('requests.new.languageEn')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t">
              <Label>{t('requests.new.howToContinue')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selfFill: false })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    !formData.selfFill
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <div className="font-medium">{t('requests.new.sendInvitation')}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {t('requests.new.sendInvitationDescription')}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, selfFill: true })}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.selfFill
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <div className="font-medium">{t('requests.new.selfFill')}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {t('requests.new.selfFillDescription')}
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                {t('requests.new.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('requests.new.submitting')
                  : formData.selfFill
                  ? t('requests.new.submit')
                  : t('requests.new.sendInvitation')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
