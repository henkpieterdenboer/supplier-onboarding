'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { LOGO_BASE64 } from '@/lib/logo-base64'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  region: string
  companyName: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  chamberOfCommerceNumber: string | null
  vatNumber: string | null
  iban: string | null
  bankName: string | null
}

export default function SupplierFormPage() {
  const params = useParams()
  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    chamberOfCommerceNumber: '',
    vatNumber: '',
    iban: '',
    bankName: '',
  })

  const [files, setFiles] = useState<{ kvk: File | null; passport: File | null }>({
    kvk: null,
    passport: null,
  })

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/supplier/${params.token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Ongeldige of verlopen link')
        }

        setRequest(data)

        // Pre-fill form with any existing data
        if (data) {
          setFormData({
            companyName: data.companyName || data.supplierName || '',
            address: data.address || '',
            postalCode: data.postalCode || '',
            city: data.city || '',
            country: data.country || '',
            contactName: data.contactName || '',
            contactPhone: data.contactPhone || '',
            contactEmail: data.contactEmail || data.supplierEmail || '',
            chamberOfCommerceNumber: data.chamberOfCommerceNumber || '',
            vatNumber: data.vatNumber || '',
            iban: data.iban || '',
            bankName: data.bankName || '',
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ongeldige of verlopen link')
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [params.token])

  const handleFileChange = (type: 'kvk' | 'passport', file: File | null) => {
    setFiles({ ...files, [type]: file })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('data', JSON.stringify(formData))

      if (files.kvk) {
        submitData.append('kvk', files.kvk)
      }
      if (files.passport) {
        submitData.append('passport', files.passport)
      }

      const response = await fetch(`/api/supplier/${params.token}`, {
        method: 'POST',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Er is een fout opgetreden')
      }

      setIsSubmitted(true)
      toast.success('Gegevens succesvol verstuurd!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Laden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Link ongeldig</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <p className="mt-4 text-sm text-gray-500">
              De link is mogelijk verlopen of al gebruikt. Neem contact op met uw
              contactpersoon voor een nieuwe link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img
                src={LOGO_BASE64}
                alt="Coloriginz Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-green-600">Bedankt!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Uw gegevens zijn succesvol verstuurd. U ontvangt binnenkort een
              bevestigingsmail.
            </p>
            <p className="mt-4 text-sm text-gray-500">U kunt dit venster sluiten.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Onboarding</h1>
          <p className="text-gray-500 mt-2">
            Welkom {request?.supplierName}. Vul hieronder uw bedrijfsgegevens in.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bedrijfsgegevens</CardTitle>
              <CardDescription>Vul de gegevens van uw bedrijf in</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Bedrijfsnaam *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postcode *</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Plaats *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contactpersoon *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefoon *</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  required
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Financiële gegevens</CardTitle>
              <CardDescription>
                Vul uw bedrijfs- en bankgegevens in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chamberOfCommerceNumber">KvK nummer *</Label>
                  <Input
                    id="chamberOfCommerceNumber"
                    value={formData.chamberOfCommerceNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        chamberOfCommerceNumber: e.target.value,
                      })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">BTW nummer *</Label>
                  <Input
                    id="vatNumber"
                    value={formData.vatNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, vatNumber: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN *</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) =>
                      setFormData({ ...formData, iban: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Documenten</CardTitle>
              <CardDescription>Upload de gevraagde documenten</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kvk">KvK uittreksel</Label>
                <Input
                  id="kvk"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    handleFileChange('kvk', e.target.files?.[0] || null)
                  }
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passport">Paspoort / ID</Label>
                <Input
                  id="passport"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) =>
                    handleFileChange('passport', e.target.files?.[0] || null)
                  }
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Bezig met verzenden...' : 'Gegevens versturen'}
          </Button>
        </form>
      </div>
    </div>
  )
}
