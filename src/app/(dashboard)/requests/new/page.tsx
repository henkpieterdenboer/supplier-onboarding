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
import { Region, RegionLabels, SupplierType, SupplierTypeLabels } from '@/types'

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function NewRequestPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ id: string; emailPreviewUrl: string | null } | null>(null)

  const [formData, setFormData] = useState({
    supplierName: '',
    supplierEmail: '',
    region: 'EU' as Region,
    selfFill: false,
    supplierType: 'KOOP' as SupplierType,
  })

  // Only INKOPER can create new requests
  if (!session?.user?.roles?.includes('INKOPER')) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          U heeft geen toestemming om nieuwe aanvragen aan te maken.
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
        throw new Error(data.error || 'Er is een fout opgetreden')
      }

      toast.success(
        formData.selfFill
          ? 'Aanvraag aangemaakt. U kunt nu de gegevens invullen.'
          : 'Uitnodiging verstuurd naar de leverancier.'
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
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
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
            <CardTitle>Uitnodiging verstuurd</CardTitle>
            <CardDescription>
              De uitnodiging is aangemaakt en de email is verstuurd via de test SMTP-server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="font-medium text-amber-900">Test SMTP-server (Ethereal)</p>
              <p className="text-sm text-amber-800">
                In demo-modus worden emails verstuurd via Ethereal, een test SMTP-server.
                Klik op de onderstaande link om het verstuurde bericht te bekijken:
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
                <Button>Naar aanvraag</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Naar dashboard</Button>
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
          <CardTitle>Nieuwe leveranciersaanvraag</CardTitle>
          <CardDescription>
            Vul de basisgegevens in om een nieuwe leverancier te onboarden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">{error}</Alert>
            )}

            {/* Supplier Type Selector */}
            <div className="space-y-4">
              <Label>Type leverancier *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(SupplierTypeLabels).map(([value, label]) => (
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
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {value === 'KOOP' && 'Standaard leverancier'}
                      {value === 'X_KWEKER' && 'Veilingleverancier'}
                      {value === 'O_KWEKER' && 'Directe kweker'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierName">Naam leverancier *</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) =>
                  setFormData({ ...formData, supplierName: e.target.value })
                }
                placeholder="Bedrijfsnaam leverancier"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierEmail">Email leverancier *</Label>
              <Input
                id="supplierEmail"
                type="email"
                value={formData.supplierEmail}
                onChange={(e) =>
                  setFormData({ ...formData, supplierEmail: e.target.value })
                }
                placeholder="contact@leverancier.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Regio *</Label>
              <Select
                value={formData.region}
                onValueChange={(value: Region) =>
                  setFormData({ ...formData, region: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer regio" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RegionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label>Hoe wilt u doorgaan?</Label>
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
                  <div className="font-medium">Uitnodiging versturen</div>
                  <div className="text-sm text-gray-500 mt-1">
                    De leverancier ontvangt een email om zelf het formulier in te vullen
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
                  <div className="font-medium">Zelf invullen</div>
                  <div className="text-sm text-gray-500 mt-1">
                    U vult de gegevens namens de leverancier in
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
                Annuleren
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? 'Bezig...'
                  : formData.selfFill
                  ? 'Aanmaken en invullen'
                  : 'Uitnodiging versturen'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
