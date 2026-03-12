'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

import { toast } from 'sonner'
import { Loader2, FileDown, Trash2, Upload, Building2, Landmark, UserCheck, Gavel } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SupplierTypeLabels, RegionLabels } from '@/types'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
  showBankUpload,
  requiresIncoterm,
  getMissingRequiredFields,
} from '@/lib/supplier-type-utils'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale } from '@/lib/i18n'
import {
  CompanyFields,
  RegistrationFields,
  BankingFields,
  InvoiceFields,
  DirectorFields,
  AuctionFields,
} from '@/components/forms/supplier-form-fields'

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
  apiKeyFloriday: string | null
  incoterm: string | null
  commissionPercentage: number | null
  paymentTerm: string | null
  accountManager: string | null
  creditorNumber: string | null
  postingMatrixFilled: boolean | null
  allChecksCompleted: boolean | null
}

export default function EditRequestPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const { t, language } = useLanguage()

  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Instant file upload/delete state
  const [files, setFiles] = useState<SupplierFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  const [supplierType, setSupplierType] = useState<string>('KOOP')
  const [region, setRegion] = useState<string>('EU')
  const [useOtherInvoiceDetails, setUseOtherInvoiceDetails] = useState(false)

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
    apiKeyFloriday: '',
    // Purchaser additional data
    incoterm: '' as '' | 'CIF' | 'FOB' | 'CONSIGNMENT',
    commissionPercentage: '',
    paymentTerm: '',
    accountManager: '',
    // Finance data
    creditorNumber: '',
    postingMatrixFilled: false,
    allChecksCompleted: false,
  })

  // Generic field change handler for shared components
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${params.id}`)
        if (!response.ok) throw new Error(t('requests.edit.notFound'))
        const data = await response.json()
        setRequest(data)
        setFiles(data.files || [])
        setSupplierType(data.supplierType || 'KOOP')
        setRegion(data.region || 'EU')
        setUseOtherInvoiceDetails(
          !!(data.invoiceEmail || data.invoiceAddress || data.invoicePostalCode || data.invoiceCity || data.invoiceCurrency)
        )

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
          apiKeyFloriday: data.apiKeyFloriday || '',
          incoterm: data.incoterm || '',
          commissionPercentage:
            data.commissionPercentage !== null ? String(data.commissionPercentage) : '',
          paymentTerm: data.paymentTerm || '',
          accountManager: data.accountManager || '',
          creditorNumber: data.creditorNumber || '',
          postingMatrixFilled: data.postingMatrixFilled ?? false,
          allChecksCompleted: data.allChecksCompleted ?? false,
        })
      } catch {
        setError(t('requests.edit.notFound'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Instant file upload
  const handleFileUpload = async (file: File, fileType: string, inputElement: HTMLInputElement) => {
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fileType', fileType)

      const res = await fetch(`/api/requests/${params.id}/files`, {
        method: 'POST',
        body: fd,
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || t('requests.edit.uploadError'))

      setFiles(prev => [...prev, result])
      toast.success(t('requests.edit.uploadSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('requests.edit.uploadError'))
    } finally {
      setIsUploading(false)
      inputElement.value = ''
    }
  }

  // Instant file delete
  const handleFileDelete = async (fileId: string) => {
    setDeletingFileId(fileId)
    try {
      const res = await fetch(`/api/requests/${params.id}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || t('requests.edit.deleteError'))

      setFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success(t('requests.edit.deleteSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('requests.edit.deleteError'))
    } finally {
      setDeletingFileId(null)
    }
  }

  // Determine edit mode based on user role and request status
  const userRoles = session?.user?.roles || []
  const isCommerce = userRoles.includes('COMMERCIE')
  const isFinance = userRoles.includes('FINANCE')

  // Check permissions: COMMERCIE at AWAITING_PURCHASER, FINANCE at AWAITING_FINANCE
  const canEditAsCommerce = isCommerce && request?.status === 'AWAITING_PURCHASER'
  const canEditAsFinance = isFinance && request?.status === 'AWAITING_FINANCE'
  const canEditRequest = canEditAsCommerce || canEditAsFinance

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

  const showFinancial = showFinancialSection(supplierType)
  const showDirector = showDirectorSection(supplierType)
  const showAuction = showAuctionSection(supplierType)
  const showBank = showBankUpload(supplierType)
  const incotermRequired = requiresIncoterm(supplierType)
  const hasFileOfType = (type: string) => files.some(f => f.fileType === type)

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

  const handleRegionChange = async (newRegion: string) => {
    setRegion(newRegion)
    try {
      await fetch(`/api/requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-region', region: newRegion }),
      })
    } catch {
      // silently fail, it will be sent again on submit
    }
  }

  const buildJsonPayload = (action: string) => {
    return JSON.stringify({
      action,
      ...formData,
      // Clear invoice fields when "different invoice address" is unchecked
      ...(useOtherInvoiceDetails ? {} : {
        invoiceEmail: '',
        invoiceAddress: '',
        invoicePostalCode: '',
        invoiceCity: '',
        invoiceCurrency: '',
      }),
      commissionPercentage: formData.commissionPercentage
        ? parseFloat(formData.commissionPercentage)
        : null,
      supplierType,
    })
  }

  const handleSaveOnly = async () => {
    setError('')
    setIsSaving(true)

    try {
      const action = canEditAsCommerce ? 'purchaser-save' : 'finance-save'
      const response = await fetch(`/api/requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: buildJsonPayload(action),
      })

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

    // Check for missing required fields before submitting
    const context = canEditAsCommerce ? 'purchaser' : 'finance'
    const missing = getMissingRequiredFields(context, formData, supplierType, region)
    if (missing.length > 0) {
      const fieldNames = missing.map(f => t(`validation.fieldNames.${f}`)).join(', ')
      toast.error(t('validation.missingFieldsTitle'), { description: fieldNames })
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const action = canEditAsCommerce ? 'purchaser-submit' : 'finance-submit'
      const response = await fetch(`/api/requests/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: buildJsonPayload(action),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('common.error'))

      toast.success(canEditAsFinance ? t('requests.edit.successComplete') : t('requests.edit.successSubmitERP'))
      router.push(`/requests/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const busy = isSaving || isSubmitting

  // Render a file upload button that instantly uploads on change
  const renderFileInput = (id: string, fileType: string, label: string) => {
    const hasExisting = hasFileOfType(fileType)
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <input
          id={id}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file, fileType, e.target)
          }}
          disabled={busy || isUploading}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || isUploading}
            onClick={() => document.getElementById(id)?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {hasExisting ? t('requests.edit.addAnother') : t('requests.edit.chooseFile')}
          </Button>
          {isUploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">{t('requests.edit.fileHint')}</p>
      </div>
    )
  }

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

        {/* Type Selector - only for COMMERCIE */}
        {canEditAsCommerce && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.supplierType')}</CardTitle>
              <CardDescription>
                {t('requests.edit.supplierTypeDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2">
                  <Label>{t('requests.edit.supplierType')}</Label>
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
                </div>
                <div className="space-y-2">
                  <Label>{t('requests.edit.region')}</Label>
                  <Select
                    value={region}
                    onValueChange={handleRegionChange}
                    disabled={busy}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RegionLabels).map(([value]) => (
                        <SelectItem key={value} value={value}>
                          {t(`enums.region.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            {/* Company & contact fields */}
            <CompanyFields
              formData={formData}
              onChange={handleFieldChange}
              disabled={busy}
              t={t}
              context="edit"
            />

            {/* Invoice details toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useOtherInvoiceDetails"
                checked={useOtherInvoiceDetails}
                onCheckedChange={(checked) => setUseOtherInvoiceDetails(checked === true)}
                disabled={busy}
              />
              <Label htmlFor="useOtherInvoiceDetails" className="text-sm font-normal cursor-pointer">
                {t('requests.edit.useOtherInvoiceDetails')}
              </Label>
            </div>

            {useOtherInvoiceDetails && (
              <InvoiceFields
                formData={formData}
                onChange={handleFieldChange}
                disabled={busy}
                t={t}
                context="edit"
              />
            )}

            {/* Financial fields - Koop + O-kweker */}
            {showFinancial && (
              <>
                <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('requests.edit.registrationDetails')}
                  </h3>
                </div>
                <RegistrationFields
                  formData={formData}
                  onChange={handleFieldChange}
                  disabled={busy}
                  t={t}
                  context="edit"
                  region={region}
                />

                {canEditAsCommerce && renderFileInput('kvk', 'KVK', t('requests.edit.kvkUpload'))}

                <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    {t('requests.edit.bankDetails')}
                  </h3>
                </div>

                <BankingFields
                  formData={formData}
                  onChange={handleFieldChange}
                  disabled={busy}
                  t={t}
                  context="edit"
                />

                {canEditAsCommerce && showBank && renderFileInput('bankDetails', 'BANK_DETAILS', t('requests.edit.bankUpload'))}
              </>
            )}

            {/* Director fields - Koop + O-kweker */}
            {showDirector && (
              <>
                <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    {t('requests.edit.director')}
                  </h3>
                </div>
                <DirectorFields
                  formData={formData}
                  onChange={handleFieldChange}
                  disabled={busy}
                  t={t}
                  context="edit"
                  region={region}
                />
                {canEditAsCommerce && renderFileInput('passport', 'PASSPORT', t('requests.edit.passportUpload'))}
              </>
            )}

            {/* Auction fields - X-kweker only */}
            {showAuction && (
              <>
                <div className="mt-4 -mx-6 px-6 py-2.5 bg-muted/70 border-y border-border/50">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    {t('requests.edit.auctionDetails')}
                  </h3>
                </div>
                <AuctionFields
                  formData={formData}
                  onChange={handleFieldChange}
                  disabled={busy}
                  t={t}
                  context="edit"
                />
                {/* Mandate upload - instant */}
                {canEditAsCommerce && (
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
                        {t('requests.edit.mandateDownload')}
                      </a>
                    </div>
                    <input
                      id="mandateRfh"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, 'MANDATE_RFH', e.target)
                      }}
                      disabled={busy || isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy || isUploading}
                      onClick={() => document.getElementById('mandateRfh')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {hasFileOfType('MANDATE_RFH') ? t('requests.edit.addAnother') : t('requests.edit.chooseFile')}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t('requests.edit.fileHint')}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Files Card - shows all uploaded files with delete option */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.files')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((file) => (
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
                    {(canEditAsCommerce || canEditAsFinance) && (
                      <button
                        type="button"
                        onClick={() => handleFileDelete(file.id)}
                        disabled={deletingFileId === file.id || busy}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        title={t('common.delete')}
                      >
                        {deletingFileId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

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
                    onValueChange={(value: 'CIF' | 'FOB' | 'CONSIGNMENT') =>
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
                      <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
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

            <Separator />

            {renderFileInput('otherFile', 'OTHER', t('requests.edit.otherFileUpload'))}
          </CardContent>
        </Card>

        {/* Creditor Number - Finance only */}
        {canEditAsFinance && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.creditorNumber')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="postingMatrixFilled"
                  checked={formData.postingMatrixFilled}
                  onCheckedChange={(checked) => setFormData({ ...formData, postingMatrixFilled: checked === true })}
                  disabled={busy}
                />
                <Label htmlFor="postingMatrixFilled">
                  {t('requests.edit.postingMatrixFilled')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allChecksCompleted"
                  checked={formData.allChecksCompleted}
                  onCheckedChange={(checked) => setFormData({ ...formData, allChecksCompleted: checked === true })}
                  disabled={busy}
                />
                <Label htmlFor="allChecksCompleted">
                  {t('requests.edit.allChecksCompleted')}
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finance file upload */}
        {canEditAsFinance && (
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.edit.otherFileUpload')}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFileInput('financeFile', 'OTHER', t('requests.edit.otherFileUpload'))}
            </CardContent>
          </Card>
        )}

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
            variant="outline"
            onClick={handleSaveOnly}
            disabled={busy}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('requests.edit.saveOnly')}
          </Button>
          <Button
            type="submit"
            disabled={busy}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {canEditAsFinance ? t('requests.edit.submitComplete') : t('requests.edit.submitToERP')}
          </Button>
        </div>
      </form>
    </div>
  )
}
