'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
  showBankUpload,
} from '@/lib/supplier-type-utils'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  region: string
  supplierType: string
  supplierSavedAt: string | null
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
  glnNumber: string | null
  invoiceEmail: string | null
  invoiceAddress: string | null
  invoicePostalCode: string | null
  invoiceCity: string | null
  invoiceCurrency: string | null
  directorName: string | null
  directorFunction: string | null
  directorDateOfBirth: string | null
  directorPassportNumber: string | null
  auctionNumberRFH: string | null
  salesSheetEmail: string | null
  mandateRFH: boolean | null
  apiKeyFloriday: string | null
}

export default function SupplierFormPage() {
  const params = useParams()
  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // Shared
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    glnNumber: '',
    // Financial (Koop + O-kweker)
    chamberOfCommerceNumber: '',
    vatNumber: '',
    iban: '',
    bankName: '',
    invoiceEmail: '',
    invoiceAddress: '',
    invoicePostalCode: '',
    invoiceCity: '',
    invoiceCurrency: '',
    // Director (Koop + O-kweker, ROW)
    directorName: '',
    directorFunction: '',
    directorDateOfBirth: '',
    directorPassportNumber: '',
    // Auction (X-kweker)
    auctionNumberRFH: '',
    salesSheetEmail: '',
    mandateRFH: false,
    apiKeyFloriday: '',
  })

  const [files, setFiles] = useState<{
    kvk: File | null
    passport: File | null
    bankDetails: File | null
  }>({
    kvk: null,
    passport: null,
    bankDetails: null,
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
            glnNumber: data.glnNumber || '',
            chamberOfCommerceNumber: data.chamberOfCommerceNumber || '',
            vatNumber: data.vatNumber || '',
            iban: data.iban || '',
            bankName: data.bankName || '',
            invoiceEmail: data.invoiceEmail || '',
            invoiceAddress: data.invoiceAddress || '',
            invoicePostalCode: data.invoicePostalCode || '',
            invoiceCity: data.invoiceCity || '',
            invoiceCurrency: data.invoiceCurrency || '',
            directorName: data.directorName || '',
            directorFunction: data.directorFunction || '',
            directorDateOfBirth: data.directorDateOfBirth || '',
            directorPassportNumber: data.directorPassportNumber || '',
            auctionNumberRFH: data.auctionNumberRFH || '',
            salesSheetEmail: data.salesSheetEmail || '',
            mandateRFH: data.mandateRFH || false,
            apiKeyFloriday: data.apiKeyFloriday || '',
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

  const handleFileChange = (type: 'kvk' | 'passport' | 'bankDetails', file: File | null) => {
    setFiles({ ...files, [type]: file })
  }

  const submitForm = async (action: 'save' | 'submit') => {
    setError('')
    if (action === 'save') {
      setIsSaving(true)
    } else {
      setIsSubmitting(true)
    }

    try {
      const submitData = new FormData()
      submitData.append('data', JSON.stringify({ ...formData, action }))

      if (files.kvk) submitData.append('kvk', files.kvk)
      if (files.passport) submitData.append('passport', files.passport)
      if (files.bankDetails) submitData.append('bankDetails', files.bankDetails)

      const response = await fetch(`/api/supplier/${params.token}`, {
        method: 'POST',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Er is een fout opgetreden')
      }

      if (action === 'save') {
        setIsSaved(true)
        toast.success('Gegevens opgeslagen! U ontvangt een email met de link om later verder te gaan.')
      } else {
        setIsSubmitted(true)
        toast.success('Gegevens succesvol verstuurd!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSaving(false)
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm('submit')
  }

  const handleSave = async () => {
    await submitForm('save')
  }

  const isDisabled = isSubmitting || isSaving

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

  if (error && !request) {
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

  if (isSaved) {
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
            <CardTitle className="text-blue-600">Gegevens opgeslagen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Uw gegevens zijn tussentijds opgeslagen. U ontvangt een email met een link
              om het formulier later af te ronden.
            </p>
            <p className="mt-4 text-sm text-gray-500">U kunt dit venster sluiten.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supplierType = request?.supplierType || 'KOOP'
  const region = request?.region || 'EU'
  const showFinancial = showFinancialSection(supplierType)
  const showDirector = showDirectorSection(supplierType, region)
  const showAuction = showAuctionSection(supplierType)
  const showBank = showBankUpload(supplierType)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Onboarding</h1>
          <p className="text-gray-500 mt-2">
            Welkom {request?.supplierName}. Vul hieronder uw bedrijfsgegevens in.
          </p>
        </div>

        {/* Saved before notice */}
        {request?.supplierSavedAt && (
          <Alert className="mb-6">
            U heeft eerder gegevens opgeslagen op{' '}
            {new Date(request.supplierSavedAt).toLocaleDateString('nl-NL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            . Uw eerdere gegevens zijn hieronder ingevuld.
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Company details - always shown */}
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
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  disabled={isDisabled}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postcode *</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    required
                    disabled={isDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Plaats *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    disabled={isDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    disabled={isDisabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="glnNumber">GLN-nummer</Label>
                <Input
                  id="glnNumber"
                  value={formData.glnNumber}
                  onChange={(e) => setFormData({ ...formData, glnNumber: e.target.value })}
                  disabled={isDisabled}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contactpersoon *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    required
                    disabled={isDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefoon *</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    required
                    disabled={isDisabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  required
                  disabled={isDisabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial section - Koop + O-kweker */}
          {showFinancial && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Financi&euml;le gegevens</CardTitle>
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
                        setFormData({ ...formData, chamberOfCommerceNumber: e.target.value })
                      }
                      required
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">BTW nummer *</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN *</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank *</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="invoiceEmail">Factuur email</Label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    value={formData.invoiceEmail}
                    onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                    disabled={isDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceAddress">Factuuradres</Label>
                  <Input
                    id="invoiceAddress"
                    value={formData.invoiceAddress}
                    onChange={(e) => setFormData({ ...formData, invoiceAddress: e.target.value })}
                    placeholder="Alleen invullen als dit afwijkt van het bedrijfsadres"
                    disabled={isDisabled}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoicePostalCode">Factuur postcode</Label>
                    <Input
                      id="invoicePostalCode"
                      value={formData.invoicePostalCode}
                      onChange={(e) => setFormData({ ...formData, invoicePostalCode: e.target.value })}
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceCity">Factuur plaats</Label>
                    <Input
                      id="invoiceCity"
                      value={formData.invoiceCity}
                      onChange={(e) => setFormData({ ...formData, invoiceCity: e.target.value })}
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceCurrency">Valuta</Label>
                  <Select
                    value={formData.invoiceCurrency}
                    onValueChange={(value) => setFormData({ ...formData, invoiceCurrency: value })}
                    disabled={isDisabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer valuta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP - Brits Pond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Director section - Koop + O-kweker, only ROW */}
          {showDirector && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Bestuurder</CardTitle>
                <CardDescription>
                  Gegevens van de bestuurder (verplicht voor leveranciers buiten de EU)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorName">Naam bestuurder *</Label>
                    <Input
                      id="directorName"
                      value={formData.directorName}
                      onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorFunction">Functie *</Label>
                    <Input
                      id="directorFunction"
                      value={formData.directorFunction}
                      onChange={(e) => setFormData({ ...formData, directorFunction: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorDateOfBirth">Geboortedatum *</Label>
                    <Input
                      id="directorDateOfBirth"
                      type="date"
                      value={formData.directorDateOfBirth}
                      onChange={(e) => setFormData({ ...formData, directorDateOfBirth: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorPassportNumber">Paspoortnummer *</Label>
                    <Input
                      id="directorPassportNumber"
                      value={formData.directorPassportNumber}
                      onChange={(e) => setFormData({ ...formData, directorPassportNumber: e.target.value })}
                      required
                      disabled={isDisabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auction section - X-kweker only */}
          {showAuction && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Veilinggegevens</CardTitle>
                <CardDescription>
                  Gegevens voor de veiling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auctionNumberRFH">Aanvoernummer RFH</Label>
                    <Input
                      id="auctionNumberRFH"
                      value={formData.auctionNumberRFH}
                      onChange={(e) => setFormData({ ...formData, auctionNumberRFH: e.target.value })}
                      disabled={isDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesSheetEmail">Salessheet email</Label>
                    <Input
                      id="salesSheetEmail"
                      type="email"
                      value={formData.salesSheetEmail}
                      onChange={(e) => setFormData({ ...formData, salesSheetEmail: e.target.value })}
                      disabled={isDisabled}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mandateRFH"
                    checked={formData.mandateRFH}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, mandateRFH: checked === true })
                    }
                    disabled={isDisabled}
                  />
                  <Label htmlFor="mandateRFH">Mandaat RFH</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKeyFloriday">API key Floriday</Label>
                  <Input
                    id="apiKeyFloriday"
                    value={formData.apiKeyFloriday}
                    onChange={(e) => setFormData({ ...formData, apiKeyFloriday: e.target.value })}
                    disabled={isDisabled}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
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
                  onChange={(e) => handleFileChange('kvk', e.target.files?.[0] || null)}
                  disabled={isDisabled}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passport">Paspoort / ID</Label>
                <Input
                  id="passport"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('passport', e.target.files?.[0] || null)}
                  disabled={isDisabled}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>

              {showBank && (
                <div className="space-y-2">
                  <Label htmlFor="bankDetails">Screenshot bankgegevens</Label>
                  <Input
                    id="bankDetails"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('bankDetails', e.target.files?.[0] || null)}
                    disabled={isDisabled}
                  />
                  <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isDisabled}
              className="flex-1"
            >
              {isSaving ? 'Bezig met opslaan...' : 'Opslaan en later verder'}
            </Button>
            <Button type="submit" disabled={isDisabled} className="flex-1">
              {isSubmitting ? 'Bezig met verzenden...' : 'Definitief versturen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
