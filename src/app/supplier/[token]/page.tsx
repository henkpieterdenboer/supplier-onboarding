'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, FileDown, Building2, Landmark, UserCheck, Gavel } from 'lucide-react'
import { getLabelConfig } from '@/lib/label-config'
import { LanguageSelector } from '@/components/ui/language-selector'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
  showBankUpload,
  getMissingRequiredFields,
} from '@/lib/supplier-type-utils'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'
import {
  CompanyFields,
  RegistrationFields,
  BankingFields,
  InvoiceFields,
  DirectorFields,
  AuctionFields,
} from '@/components/forms/supplier-form-fields'

interface Request {
  id: string
  supplierName: string
  supplierEmail: string
  region: string
  supplierType: string
  label: string
  supplierLanguage: string
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
  const { t, language, setLanguage } = useLanguage()
  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [error, setError] = useState('')

  const [useOtherInvoiceDetails, setUseOtherInvoiceDetails] = useState(false)
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
    apiKeyFloriday: '',
  })

  // Generic field change handler for shared components
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const [files, setFiles] = useState<{
    kvk: File | null
    passport: File | null
    bankDetails: File | null
    mandateRfh: File | null
  }>({
    kvk: null,
    passport: null,
    bankDetails: null,
    mandateRfh: null,
  })

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/supplier/${params.token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || t('supplier.form.invalidLinkTitle'))
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
            apiKeyFloriday: data.apiKeyFloriday || '',
          })
          // Show invoice section if any invoice fields were previously filled
          if (data.invoiceEmail || data.invoiceAddress || data.invoicePostalCode || data.invoiceCity) {
            setUseOtherInvoiceDetails(true)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('supplier.form.invalidLinkTitle'))
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token])

  // Set language based on supplier's preferred language
  useEffect(() => {
    if (request?.supplierLanguage) {
      setLanguage(request.supplierLanguage as Language)
    }
  }, [request?.supplierLanguage, setLanguage])

  const handleFileChange = (type: 'kvk' | 'passport' | 'bankDetails' | 'mandateRfh', file: File | null) => {
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
      if (files.mandateRfh) submitData.append('mandateRfh', files.mandateRfh)

      const response = await fetch(`/api/supplier/${params.token}`, {
        method: 'POST',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('common.error'))
      }

      if (action === 'save') {
        setIsSaved(true)
        toast.success(t('supplier.form.savedSuccess'))
      } else {
        setIsSubmitted(true)
        toast.success(t('supplier.form.submitSuccess'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSaving(false)
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check for missing required fields before submitting
    const missing = getMissingRequiredFields('supplier', formData, supplierType)
    if (missing.length > 0) {
      const fieldNames = missing.map(f => t(`validation.fieldNames.${f}`)).join(', ')
      toast.error(t('validation.missingFieldsTitle'), { description: fieldNames })
      return
    }

    await submitForm('submit')
  }

  const handleSave = async () => {
    await submitForm('save')
  }

  const isDisabled = isSubmitting || isSaving

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">{t('supplier.form.invalidLink')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('supplier.form.invalidLinkMessage')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const labelConfig = getLabelConfig(request?.label || 'COLORIGINZ')

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img
                src={labelConfig.logoPath}
                alt={`${labelConfig.name} Logo`}
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-green-600">{t('supplier.form.thankYou')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('supplier.form.thankYouMessage')}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{t('supplier.form.closeWindow')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSaved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img
                src={labelConfig.logoPath}
                alt={`${labelConfig.name} Logo`}
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-blue-600">{t('supplier.form.savedTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('supplier.form.savedMessage')}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{t('supplier.form.closeWindow')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const supplierType = request?.supplierType || 'KOOP'
  const region = request?.region || 'EU'
  const showFinancial = showFinancialSection(supplierType)
  const showDirector = showDirectorSection(supplierType)
  const showAuction = showAuctionSection(supplierType)
  const showBank = showBankUpload(supplierType)

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-end mb-2">
            <LanguageSelector />
          </div>
          <div className="flex justify-center mb-4">
            <img
              src={labelConfig.logoPath}
              alt={`${labelConfig.name} Logo`}
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('supplier.form.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('supplier.form.welcome', { supplierName: request?.supplierName || '' })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('supplier.form.requiredNote')}
          </p>
        </div>

        {/* Saved before notice */}
        {request?.supplierSavedAt && (
          <Alert className="mb-6">
            {t('supplier.form.savedNotice', {
              date: new Date(request.supplierSavedAt).toLocaleDateString(getDateLocale(language), {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            })}
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('supplier.form.company.title')}</CardTitle>
              <CardDescription>{t('supplier.form.company.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company & contact fields */}
              <CompanyFields
                formData={formData}
                onChange={handleFieldChange}
                disabled={isDisabled}
                t={t}
                context="supplier"
              />

              {/* Invoice details toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useOtherInvoiceDetails"
                  checked={useOtherInvoiceDetails}
                  onCheckedChange={(checked) => setUseOtherInvoiceDetails(checked === true)}
                  disabled={isDisabled}
                />
                <Label htmlFor="useOtherInvoiceDetails" className="text-sm font-normal cursor-pointer">
                  {t('supplier.form.useOtherInvoiceDetails')}
                </Label>
              </div>

              {useOtherInvoiceDetails && (
                <InvoiceFields
                  formData={formData}
                  onChange={handleFieldChange}
                  disabled={isDisabled}
                  t={t}
                  context="supplier"
                />
              )}

              {/* Financial fields - Koop + O-kweker */}
              {showFinancial && (
                <>
                  <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('supplier.form.financial.title')}
                    </h3>
                  </div>
                  <RegistrationFields
                    formData={formData}
                    onChange={handleFieldChange}
                    disabled={isDisabled}
                    t={t}
                    context="supplier"
                    region={region}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="kvk">{t('supplier.form.documents.kvk')}</Label>
                    <Input
                      id="kvk"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('kvk', e.target.files?.[0] || null)}
                      disabled={isDisabled}
                    />
                    <p className="text-xs text-muted-foreground">{t('supplier.form.fileHint')}</p>
                  </div>

                  <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Landmark className="h-4 w-4" />
                      {t('supplier.form.financial.bank')}
                    </h3>
                  </div>

                  <BankingFields
                    formData={formData}
                    onChange={handleFieldChange}
                    disabled={isDisabled}
                    t={t}
                    context="supplier"
                  />

                  {showBank && (
                    <div className="space-y-2">
                      <Label htmlFor="bankDetails">{t('supplier.form.documents.bank')}</Label>
                      <Input
                        id="bankDetails"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange('bankDetails', e.target.files?.[0] || null)}
                        disabled={isDisabled}
                      />
                      <p className="text-xs text-muted-foreground">{t('supplier.form.fileHint')}</p>
                    </div>
                  )}
                </>
              )}

              {/* Director fields - Koop + O-kweker */}
              {showDirector && (
                <>
                  <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      {t('supplier.form.director.title')}
                    </h3>
                  </div>
                  <DirectorFields
                    formData={formData}
                    onChange={handleFieldChange}
                    disabled={isDisabled}
                    t={t}
                    context="supplier"
                    region={region}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="passport">{t('supplier.form.documents.passport')}</Label>
                    <Input
                      id="passport"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('passport', e.target.files?.[0] || null)}
                      disabled={isDisabled}
                    />
                    <p className="text-xs text-muted-foreground">{t('supplier.form.fileHint')}</p>
                  </div>
                </>
              )}

              {/* Auction fields - X-kweker only */}
              {showAuction && (
                <>
                  <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Gavel className="h-4 w-4" />
                      {t('supplier.form.auction.title')}
                    </h3>
                  </div>
                  <AuctionFields
                    formData={formData}
                    onChange={handleFieldChange}
                    disabled={isDisabled}
                    t={t}
                    context="supplier"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <Label htmlFor="mandateRfh">{t('supplier.form.documents.mandate')}</Label>
                      <a
                        href="/rfh-incassovolmacht-template.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        {t('supplier.form.documents.mandateDownload')}
                      </a>
                    </div>
                    <Input
                      id="mandateRfh"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('mandateRfh', e.target.files?.[0] || null)}
                      disabled={isDisabled}
                    />
                    <p className="text-xs text-muted-foreground">{t('supplier.form.fileHint')}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Privacy consent */}
          <div className="flex items-start space-x-2 mb-6">
            <Checkbox
              id="privacyAccepted"
              checked={privacyAccepted}
              onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
              disabled={isDisabled}
              className="mt-0.5"
            />
            <Label htmlFor="privacyAccepted" className="text-sm text-muted-foreground leading-snug">
              {t('supplier.form.privacyLabel')}{' '}
              <a
                href={t('supplier.form.privacyUrl')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t('supplier.form.privacyLink')}
              </a>
            </Label>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isDisabled}
              className="flex-1"
            >
              {isSaving ? t('supplier.form.saving') : t('supplier.form.saveLater')}
            </Button>
            <Button type="submit" disabled={isDisabled || !privacyAccepted} className="flex-1">
              {isSubmitting ? t('supplier.form.submittingForm') : t('supplier.form.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
