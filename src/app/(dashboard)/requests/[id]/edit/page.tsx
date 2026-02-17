'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SupplierTypeLabels } from '@/types'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
  showBankUpload,
  requiresIncoterm,
} from '@/lib/supplier-type-utils'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale } from '@/lib/i18n'

interface SupplierFile {
  id: string
  fileName: string
  fileType: string
  filePath: string
  uploadedAt: string
}

interface Request {
  id: string
  status: string
  supplierName: string
  supplierEmail: string
  region: string
  selfFill: boolean
  supplierType: string
  label: string
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
  incoterm: string | null
  commissionPercentage: number | null
  paymentTerm: string | null
  accountManager: string | null
  creditorNumber: string | null
  files: SupplierFile[]
}

export default function EditRequestPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [kvkFile, setKvkFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [bankDetailsFile, setBankDetailsFile] = useState<File | null>(null)

  const [supplierType, setSupplierType] = useState<string>('KOOP')

  // VIES VAT validation state
  const [viesStatus, setViesStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'error' | 'invalid-format'>('idle')
  const [viesResult, setViesResult] = useState<{ name: string; address: string } | null>(null)
  const viesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkViesVat = useCallback(async (vatNumber: string) => {
    if (!vatNumber || vatNumber.replace(/[\s.\-]/g, '').length < 4) {
      setViesStatus('idle')
      setViesResult(null)
      return
    }

    setViesStatus('checking')
    try {
      const res = await fetch('/api/vies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vatNumber }),
      })

      if (res.status === 400) {
        setViesStatus('invalid-format')
        setViesResult(null)
        return
      }

      if (res.status === 503) {
        setViesStatus('error')
        setViesResult(null)
        return
      }

      if (!res.ok) {
        setViesStatus('error')
        setViesResult(null)
        return
      }

      const data = await res.json()
      if (data.isValid) {
        setViesStatus('valid')
        setViesResult({ name: data.name, address: data.address })
      } else {
        setViesStatus('invalid')
        setViesResult(null)
      }
    } catch {
      setViesStatus('error')
      setViesResult(null)
    }
  }, [])

  const handleVatChange = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, vatNumber: value }))
    if (viesTimerRef.current) clearTimeout(viesTimerRef.current)
    viesTimerRef.current = setTimeout(() => checkViesVat(value), 800)
  }, [checkViesVat])

  const [formData, setFormData] = useState({
    // Supplier data
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    glnNumber: '',
    chamberOfCommerceNumber: '',
    vatNumber: '',
    iban: '',
    bankName: '',
    invoiceEmail: '',
    invoiceAddress: '',
    invoicePostalCode: '',
    invoiceCity: '',
    invoiceCurrency: '',
    directorName: '',
    directorFunction: '',
    directorDateOfBirth: '',
    directorPassportNumber: '',
    auctionNumberRFH: '',
    salesSheetEmail: '',
    mandateRFH: false,
    apiKeyFloriday: '',
    // Purchaser additional data
    incoterm: '' as '' | 'CIF' | 'FOB',
    commissionPercentage: '',
    paymentTerm: '',
    accountManager: '',
    // Finance data
    creditorNumber: '',
  })

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${params.id}`)
        if (!response.ok) throw new Error(t('requests.edit.notFound'))
        const data = await response.json()
        setRequest(data)
        setSupplierType(data.supplierType || 'KOOP')

        setFormData({
          companyName: data.companyName || (data.selfFill ? data.supplierName : '') || '',
          address: data.address || '',
          postalCode: data.postalCode || '',
          city: data.city || '',
          country: data.country || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || (data.selfFill ? data.supplierEmail : '') || '',
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
          incoterm: data.incoterm || '',
          commissionPercentage:
            data.commissionPercentage !== null ? String(data.commissionPercentage) : '',
          paymentTerm: data.paymentTerm || '',
          accountManager: data.accountManager || '',
          creditorNumber: data.creditorNumber || '',
        })
      } catch {
        setError(t('requests.edit.notFound'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  }, [params.id])

  // Determine edit mode based on user role and request status
  const userRoles = session?.user?.roles || []
  const isInkoper = userRoles.includes('INKOPER')
  const isFinance = userRoles.includes('FINANCE')

  // Check permissions: INKOPER at AWAITING_PURCHASER, FINANCE at AWAITING_FINANCE
  const canEditAsInkoper = isInkoper && request?.status === 'AWAITING_PURCHASER'
  const canEditAsFinance = isFinance && request?.status === 'AWAITING_FINANCE'
  const canEditRequest = canEditAsInkoper || canEditAsFinance

  if (!session?.user) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          {t('requests.edit.noPermission')}
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>
  }

  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">{error || t('requests.edit.notFound')}</Alert>
      </div>
    )
  }

  if (!canEditRequest) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          {t('requests.edit.cannotEdit')}
        </Alert>
      </div>
    )
  }

  const region = request.region || 'EU'
  const showFinancial = showFinancialSection(supplierType)
  const showDirector = showDirectorSection(supplierType, region)
  const showAuction = showAuctionSection(supplierType)
  const showBank = showBankUpload(supplierType)
  const incotermRequired = requiresIncoterm(supplierType)

  const canSubmit = canEditAsInkoper
    ? (incotermRequired ? !!formData.incoterm : true)
    : (canEditAsFinance ? !!formData.creditorNumber : true)

  const handleTypeChange = async (newType: string) => {
    setSupplierType(newType)
    try {
      await fetch(`/api/requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-type', supplierType: newType }),
      })
    } catch {
      // silently fail, it will be sent again on submit
    }
  }

  const buildFormDataPayload = (action: string) => {
    const submitData = new FormData()
    submitData.append('data', JSON.stringify({
      action,
      ...formData,
      mandateRFH: formData.mandateRFH || null,
      commissionPercentage: formData.commissionPercentage
        ? parseFloat(formData.commissionPercentage)
        : null,
      supplierType,
    }))

    if (kvkFile) submitData.append('kvk', kvkFile)
    if (passportFile) submitData.append('passport', passportFile)
    if (bankDetailsFile) submitData.append('bankDetails', bankDetailsFile)

    return submitData
  }

  const buildJsonPayload = (action: string) => {
    return JSON.stringify({
      action,
      ...formData,
      mandateRFH: formData.mandateRFH || null,
      commissionPercentage: formData.commissionPercentage
        ? parseFloat(formData.commissionPercentage)
        : null,
      supplierType,
    })
  }

  const hasFileUploads = !!(kvkFile || passportFile || bankDetailsFile)

  const handleSaveOnly = async () => {
    setError('')
    setIsSaving(true)

    try {
      let response: Response

      if (canEditAsInkoper) {
        if (hasFileUploads) {
          response = await fetch(`/api/requests/${params.id}`, {
            method: 'PATCH',
            body: buildFormDataPayload('purchaser-save'),
          })
        } else {
          response = await fetch(`/api/requests/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: buildJsonPayload('purchaser-save'),
          })
        }
      } else {
        // Finance save
        response = await fetch(`/api/requests/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: buildJsonPayload('finance-save'),
        })
      }

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('common.error'))

      toast.success(t('requests.edit.successSave'))
      router.push(`/requests/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      let response: Response

      if (canEditAsInkoper) {
        if (hasFileUploads) {
          response = await fetch(`/api/requests/${params.id}`, {
            method: 'PATCH',
            body: buildFormDataPayload('purchaser-submit'),
          })
        } else {
          response = await fetch(`/api/requests/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: buildJsonPayload('purchaser-submit'),
          })
        }
      } else {
        // Finance submit
        response = await fetch(`/api/requests/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: buildJsonPayload('finance-submit'),
        })
      }

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('common.error'))

      toast.success(canEditAsFinance ? t('requests.edit.successSubmitERP') : t('requests.edit.successSubmit'))
      router.push(`/requests/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSaving || isSubmitting

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Label (read-only) */}
        {request.label && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('requests.detail.basic.label')}:</span>
            <Badge className={request.label === 'PFC' ? 'bg-pink-100 text-pink-800' : 'bg-indigo-100 text-indigo-800'}>
              {t(`enums.label.${request.label}`)}
            </Badge>
          </div>
        )}

        {/* Type Selector - only for INKOPER */}
        {canEditAsInkoper && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.supplierType')}</CardTitle>
              <CardDescription>
                {t('requests.edit.supplierTypeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={supplierType}
                onValueChange={handleTypeChange}
                disabled={busy}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SupplierTypeLabels).map(([value]) => (
                    <SelectItem key={value} value={value}>
                      {t(`enums.supplierType.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Creditor Number - Finance only */}
        {canEditAsFinance && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.creditorNumber')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="creditorNumber">{t('requests.edit.creditorNumber')} *</Label>
                <Input
                  id="creditorNumber"
                  value={formData.creditorNumber}
                  onChange={(e) => setFormData({ ...formData, creditorNumber: e.target.value })}
                  placeholder={t('requests.edit.creditorNumberPlaceholder')}
                  disabled={busy}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supplier Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('requests.edit.supplierDetails')}</CardTitle>
            <CardDescription>
              {request.selfFill
                ? t('requests.edit.supplierDetailsDescription')
                : t('requests.edit.supplierDetailsFilledDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('requests.edit.companyName')}</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">{t('requests.edit.contactName')}</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('requests.edit.address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={busy}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">{t('requests.edit.postalCode')}</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('requests.edit.city')}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">{t('requests.edit.country')}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">{t('requests.edit.phone')}</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">{t('requests.edit.contactEmail')}</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="glnNumber">{t('requests.edit.glnNumber')}</Label>
              <Input
                id="glnNumber"
                value={formData.glnNumber}
                onChange={(e) => setFormData({ ...formData, glnNumber: e.target.value })}
                disabled={busy}
              />
            </div>

            {/* Financial fields - Koop + O-kweker */}
            {showFinancial && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chamberOfCommerceNumber">{t('requests.edit.kvkNumber')}</Label>
                    <Input
                      id="chamberOfCommerceNumber"
                      value={formData.chamberOfCommerceNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, chamberOfCommerceNumber: e.target.value })
                      }
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">{t('requests.edit.vatNumber')}</Label>
                    <div className="relative">
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => handleVatChange(e.target.value)}
                        disabled={busy}
                      />
                      {region === 'EU' && viesStatus === 'checking' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                      {region === 'EU' && viesStatus === 'valid' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                          <Check className="h-5 w-5" />
                        </div>
                      )}
                      {region === 'EU' && viesStatus === 'invalid' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-600">
                          <X className="h-5 w-5" />
                        </div>
                      )}
                      {region === 'EU' && viesStatus === 'error' && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    {region === 'EU' && viesStatus === 'valid' && viesResult && (
                      <p className="text-xs text-green-600">{t('supplier.form.financial.viesValid')}: {viesResult.name}</p>
                    )}
                    {region === 'EU' && viesStatus === 'invalid' && (
                      <p className="text-xs text-red-600">{t('supplier.form.financial.viesInvalid')}</p>
                    )}
                    {region === 'EU' && viesStatus === 'error' && (
                      <p className="text-xs text-orange-500">{t('supplier.form.financial.viesUnavailable')}</p>
                    )}
                    {region === 'EU' && viesStatus === 'invalid-format' && (
                      <p className="text-xs text-red-600">{t('supplier.form.financial.viesInvalidFormat')}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">{t('requests.edit.iban')}</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t('requests.edit.bank')}</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceEmail">{t('requests.edit.invoiceEmail')}</Label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    value={formData.invoiceEmail}
                    onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceAddress">{t('requests.edit.invoiceAddress')}</Label>
                  <Input
                    id="invoiceAddress"
                    value={formData.invoiceAddress}
                    onChange={(e) => setFormData({ ...formData, invoiceAddress: e.target.value })}
                    disabled={busy}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoicePostalCode">{t('requests.edit.invoicePostalCode')}</Label>
                    <Input
                      id="invoicePostalCode"
                      value={formData.invoicePostalCode}
                      onChange={(e) => setFormData({ ...formData, invoicePostalCode: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceCity">{t('requests.edit.invoiceCity')}</Label>
                    <Input
                      id="invoiceCity"
                      value={formData.invoiceCity}
                      onChange={(e) => setFormData({ ...formData, invoiceCity: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceCurrency">{t('requests.edit.currency')}</Label>
                    <Select
                      value={formData.invoiceCurrency}
                      onValueChange={(value) => setFormData({ ...formData, invoiceCurrency: value })}
                      disabled={busy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('requests.edit.currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Director fields - Koop + O-kweker, ROW only */}
            {showDirector && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">{t('requests.edit.director')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorName">{t('requests.edit.directorName')}</Label>
                    <Input
                      id="directorName"
                      value={formData.directorName}
                      onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorFunction">{t('requests.edit.directorFunction')}</Label>
                    <Input
                      id="directorFunction"
                      value={formData.directorFunction}
                      onChange={(e) => setFormData({ ...formData, directorFunction: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorDateOfBirth">{t('requests.edit.directorDob')}</Label>
                    <Input
                      id="directorDateOfBirth"
                      type="date"
                      value={formData.directorDateOfBirth}
                      onChange={(e) => setFormData({ ...formData, directorDateOfBirth: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorPassportNumber">{t('requests.edit.directorPassport')}</Label>
                    <Input
                      id="directorPassportNumber"
                      value={formData.directorPassportNumber}
                      onChange={(e) => setFormData({ ...formData, directorPassportNumber: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Auction fields - X-kweker only */}
            {showAuction && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">{t('requests.edit.auctionDetails')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auctionNumberRFH">{t('requests.edit.auctionNumberRFH')}</Label>
                    <Input
                      id="auctionNumberRFH"
                      value={formData.auctionNumberRFH}
                      onChange={(e) => setFormData({ ...formData, auctionNumberRFH: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesSheetEmail">{t('requests.edit.salesSheetEmail')}</Label>
                    <Input
                      id="salesSheetEmail"
                      type="email"
                      value={formData.salesSheetEmail}
                      onChange={(e) => setFormData({ ...formData, salesSheetEmail: e.target.value })}
                      disabled={busy}
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
                    disabled={busy}
                  />
                  <Label htmlFor="mandateRFH">{t('requests.edit.mandateRFH')}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyFloriday">{t('requests.edit.apiKeyFloriday')}</Label>
                  <Input
                    id="apiKeyFloriday"
                    value={formData.apiKeyFloriday}
                    onChange={(e) => setFormData({ ...formData, apiKeyFloriday: e.target.value })}
                    disabled={busy}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('requests.edit.documents')}</CardTitle>
            <CardDescription>
              {t('requests.edit.documentsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing files */}
            {request.files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('requests.edit.existingFiles')}</Label>
                <ul className="space-y-2">
                  {request.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3">
                      <Badge variant="outline">
                        {t(`enums.fileType.${file.fileType}`)}
                      </Badge>
                      <a
                        href={file.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {file.fileName}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.uploadedAt).toLocaleDateString(getDateLocale(language))}
                      </span>
                    </li>
                  ))}
                </ul>
                <Separator />
              </div>
            )}

            {/* File uploads - only show for INKOPER (Finance doesn't need to upload files) */}
            {canEditAsInkoper && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kvk">
                      {t('requests.edit.kvkUpload')}
                    </Label>
                    <Input
                      id="kvk"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setKvkFile(e.target.files?.[0] || null)}
                      disabled={busy}
                    />
                    <p className="text-xs text-muted-foreground">{t('requests.edit.fileHint')}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passport">
                      {t('requests.edit.passportUpload')}
                    </Label>
                    <Input
                      id="passport"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                      disabled={busy}
                    />
                    <p className="text-xs text-muted-foreground">{t('requests.edit.fileHint')}</p>
                  </div>
                </div>

                {showBank && (
                  <div className="space-y-2">
                    <Label htmlFor="bankDetails">
                      {t('requests.edit.bankUpload')}
                    </Label>
                    <Input
                      id="bankDetails"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setBankDetailsFile(e.target.files?.[0] || null)}
                      disabled={busy}
                    />
                    <p className="text-xs text-muted-foreground">{t('requests.edit.fileHint')}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Purchaser Data */}
        <Card>
          <CardHeader>
            <CardTitle>{t('requests.edit.purchaserDetails')}</CardTitle>
            <CardDescription>
              {t('requests.edit.purchaserDetailsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {incotermRequired && (
                <div className="space-y-2">
                  <Label htmlFor="incoterm">{t('requests.edit.incoterm')}</Label>
                  <Select
                    value={formData.incoterm}
                    onValueChange={(value: 'CIF' | 'FOB') =>
                      setFormData({ ...formData, incoterm: value })
                    }
                    disabled={busy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('requests.edit.incotermPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="FOB">FOB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="paymentTerm">{t('requests.edit.paymentTerm')}</Label>
                <Select
                  value={formData.paymentTerm}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerm: value })}
                  disabled={busy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('requests.edit.paymentTermPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">{t('requests.edit.paymentTerm14')}</SelectItem>
                    <SelectItem value="30">{t('requests.edit.paymentTerm30')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountManager">{t('requests.edit.accountManager')}</Label>
              <Input
                id="accountManager"
                value={formData.accountManager}
                onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
                disabled={busy}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions: Save + Save & Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={busy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveOnly}
            disabled={busy}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('requests.edit.saveOnly')}
          </Button>
          <Button
            type="submit"
            disabled={busy || !canSubmit}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {canEditAsFinance ? t('requests.edit.submitToERP') : t('requests.edit.submitToFinance')}
          </Button>
        </div>
      </form>
    </div>
  )
}
