'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatUserName } from '@/lib/user-utils'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
} from '@/lib/supplier-type-utils'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale } from '@/lib/i18n'

interface AuditLog {
  id: string
  action: string
  details: string | null
  createdAt: Date
  user: {
    firstName: string
    middleName: string | null
    lastName: string
    email: string
  } | null
}

interface SupplierFile {
  id: string
  fileName: string
  fileType: string
  filePath: string
  uploadedAt: Date
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
  createdAt: Date
  updatedAt: Date
  createdBy: {
    id: string
    firstName: string
    middleName: string | null
    lastName: string
    email: string
  }
  // Supplier fields
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
  // Financial
  invoiceEmail: string | null
  invoiceAddress: string | null
  invoicePostalCode: string | null
  invoiceCity: string | null
  invoiceCurrency: string | null
  // Director
  directorName: string | null
  directorFunction: string | null
  directorDateOfBirth: string | null
  directorPassportNumber: string | null
  // Auction
  auctionNumberRFH: string | null
  salesSheetEmail: string | null
  mandateRFH: boolean | null
  apiKeyFloriday: string | null
  // VIES
  vatValid: boolean | null
  vatCheckResponse: string | null
  vatCheckedAt: Date | null
  // Purchaser fields
  incoterm: string | null
  commissionPercentage: number | null
  paymentTerm: string | null
  accountManager: string | null
  // Finance fields
  creditorNumber: string | null
  // ERP fields
  kbtCode: string | null
  // Invitation
  invitationToken: string | null
  invitationExpiresAt: Date | null
  invitationSentAt: Date | null
  supplierSubmittedAt: Date | null
  supplierSavedAt: Date | null
  // Relations
  files: SupplierFile[]
  auditLogs: AuditLog[]
}

interface RequestDetailProps {
  request: Request
  userRoles: string[]
  userId: string
}

const statusColors: Record<string, string> = {
  INVITATION_SENT: 'bg-yellow-100 text-yellow-800',
  AWAITING_PURCHASER: 'bg-orange-100 text-orange-800',
  AWAITING_FINANCE: 'bg-blue-100 text-blue-800',
  AWAITING_ERP: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const supplierTypeColors: Record<string, string> = {
  KOOP: 'bg-slate-100 text-slate-800',
  X_KWEKER: 'bg-emerald-100 text-emerald-800',
  O_KWEKER: 'bg-cyan-100 text-cyan-800',
}

const labelColors: Record<string, string> = {
  COLORIGINZ: 'bg-indigo-100 text-indigo-800',
  PFC: 'bg-pink-100 text-pink-800',
}

export function RequestDetail({ request, userRoles, userId }: RequestDetailProps) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [creditorNumber, setCreditorNumber] = useState('')
  const [kbtCode, setKbtCode] = useState('')
  const [isViesRechecking, setIsViesRechecking] = useState(false)
  const [viesExpanded, setViesExpanded] = useState(false)
  const [localVatValid, setLocalVatValid] = useState<boolean | null>(request.vatValid)
  const [localVatCheckResponse, setLocalVatCheckResponse] = useState<string | null>(request.vatCheckResponse)
  const [localVatCheckedAt, setLocalVatCheckedAt] = useState<Date | null>(request.vatCheckedAt)

  const handleViesRecheck = async () => {
    setIsViesRechecking(true)
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vies-recheck' }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('common.error'))
      }

      setLocalVatValid(result.viesResult?.isValid ?? null)
      setLocalVatCheckResponse(result.vatCheckResponse ?? null)
      setLocalVatCheckedAt(result.vatCheckedAt ? new Date(result.vatCheckedAt) : null)
      toast.success(t('common.success'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsViesRechecking(false)
    }
  }

  const supplierType = request.supplierType || 'KOOP'
  const region = request.region || 'EU'
  const showFinancial = showFinancialSection(supplierType)
  const showDirector = showDirectorSection(supplierType, region)
  const showAuction = showAuctionSection(supplierType)

  const handleAction = async (action: string, data?: Record<string, unknown>) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || t('common.error'))
      }

      toast.success(t('common.success'))

      // Redirect to dashboard after ERP submit (completion)
      if (action === 'erp-submit') {
        router.push('/dashboard')
      } else {
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const canEdit =
    (userRoles.includes('INKOPER') && request.status === 'AWAITING_PURCHASER') ||
    (userRoles.includes('FINANCE') && request.status === 'AWAITING_FINANCE') ||
    (userRoles.includes('ERP') && request.status === 'AWAITING_ERP')

  const canCancel = request.status !== 'CANCELLED' && request.status !== 'COMPLETED'
  const canReopen = request.status === 'CANCELLED'
  const canResendInvitation = request.status === 'INVITATION_SENT'
  const canSendReminder =
    request.status !== 'COMPLETED' && request.status !== 'CANCELLED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{request.supplierName}</h1>
            <Badge className={statusColors[request.status]}>
              {t(`enums.status.${request.status}`)}
            </Badge>
            <Badge className={supplierTypeColors[supplierType] || 'bg-gray-100 text-gray-800'}>
              {t(`enums.supplierType.${supplierType}`)}
            </Badge>
            <Badge className={labelColors[request.label] || 'bg-gray-100 text-gray-800'}>
              {t(`enums.label.${request.label}`)}
            </Badge>
          </div>
          <p className="text-gray-500">{request.supplierEmail}</p>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/requests/${request.id}/edit`}>
              <Button>{t('requests.detail.actions.edit')}</Button>
            </Link>
          )}

          {canResendInvitation && (
            <Button
              variant="outline"
              onClick={() => handleAction('resend-invitation')}
              disabled={isLoading}
            >
              {t('requests.detail.actions.resendInvitation')}
            </Button>
          )}

          {canSendReminder && (
            <Button
              variant="outline"
              onClick={() => handleAction('send-reminder')}
              disabled={isLoading}
            >
              {t('requests.detail.actions.sendReminder')}
            </Button>
          )}

          {canCancel && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">{t('requests.detail.actions.cancel')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('requests.detail.actions.cancelTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('requests.detail.actions.cancelMessage')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction('cancel')}
                    disabled={isLoading}
                  >
                    {t('requests.detail.actions.cancel')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canReopen && (
            <Button
              variant="outline"
              onClick={() => handleAction('reopen')}
              disabled={isLoading}
            >
              {t('requests.detail.actions.reopen')}
            </Button>
          )}
        </div>
      </div>

      {/* Demo mode: link to test email inbox when invitation is pending */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && request.status === 'INVITATION_SENT' && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 font-medium mb-2">{t('demo.viewEmails')}</p>
          <p className="text-sm text-gray-500 mb-1">
            <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              https://ethereal.email/login
            </a>
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>{t('demo.emailCreds')}</li>
            <li>{t('demo.passwordCreds')}</li>
          </ul>
        </div>
      )}

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t('requests.detail.tabs.details')}</TabsTrigger>
          <TabsTrigger value="audit">{t('requests.detail.tabs.audit')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.detail.basic.title')}</CardTitle>
              <CardDescription>{t('requests.detail.basic.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.supplier')}</Label>
                <p className="font-medium">{request.supplierName}</p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.email')}</Label>
                <p className="font-medium">{request.supplierEmail}</p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.type')}</Label>
                <p className="font-medium">
                  {t(`enums.supplierType.${supplierType}`)}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.label')}</Label>
                <p className="font-medium">
                  {t(`enums.label.${request.label}`)}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.region')}</Label>
                <p className="font-medium">
                  {t(`enums.region.${request.region}`)}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.createdBy')}</Label>
                <p className="font-medium">
                  {formatUserName(request.createdBy) || request.createdBy.email}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.createdAt')}</Label>
                <p className="font-medium">
                  {new Date(request.createdAt).toLocaleString(getDateLocale(language))}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('requests.detail.basic.fillMethod')}</Label>
                <p className="font-medium">
                  {request.selfFill ? t('requests.detail.basic.byPurchaser') : t('requests.detail.basic.bySupplier')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Details */}
          {(request.companyName || request.supplierSubmittedAt) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('requests.detail.supplier.title')}</CardTitle>
                <CardDescription>
                  {request.supplierSubmittedAt
                    ? `${t('requests.detail.supplier.submittedAt')} ${new Date(request.supplierSubmittedAt).toLocaleString(getDateLocale(language))}`
                    : t('requests.detail.supplier.filledByPurchaser')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.companyName')}</Label>
                    <p className="font-medium">{request.companyName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.address')}</Label>
                    <p className="font-medium">{request.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.postalCode')}</Label>
                    <p className="font-medium">{request.postalCode || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.city')}</Label>
                    <p className="font-medium">{request.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.country')}</Label>
                    <p className="font-medium">{request.country || '-'}</p>
                  </div>
                  {request.glnNumber && (
                    <div>
                      <Label className="text-gray-500">{t('requests.detail.supplier.glnNumber')}</Label>
                      <p className="font-medium">{request.glnNumber}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.contactName')}</Label>
                    <p className="font-medium">{request.contactName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.phone')}</Label>
                    <p className="font-medium">{request.contactPhone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.supplier.contactEmail')}</Label>
                    <p className="font-medium">{request.contactEmail || '-'}</p>
                  </div>
                </div>

                {/* Financial details - Koop + O-kweker */}
                {showFinancial && (request.chamberOfCommerceNumber || request.iban) && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-gray-700">{t('requests.detail.financial.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.financial.kvkNumber')}</Label>
                        <p className="font-medium">{request.chamberOfCommerceNumber || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.financial.vatNumber')}</Label>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{request.vatNumber || '-'}</p>
                          {request.region === 'EU' && request.vatNumber && (
                            <>
                              {localVatValid === true && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  {t('requests.detail.financial.vies.valid')}
                                </span>
                              )}
                              {localVatValid === false && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  {t('requests.detail.financial.vies.invalid')}
                                </span>
                              )}
                              {localVatValid === null && (
                                <span className="text-xs text-gray-400">{t('requests.detail.financial.vies.notChecked')}</span>
                              )}
                            </>
                          )}
                        </div>
                        {request.region === 'EU' && request.vatNumber && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                              {(userRoles.includes('INKOPER') || userRoles.includes('FINANCE')) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleViesRecheck}
                                  disabled={isViesRechecking}
                                >
                                  {isViesRechecking
                                    ? t('requests.detail.financial.vies.rechecking')
                                    : t('requests.detail.financial.vies.recheck')}
                                </Button>
                              )}
                              {localVatCheckResponse && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViesExpanded(!viesExpanded)}
                                >
                                  {t('requests.detail.financial.vies.details')} {viesExpanded ? '▲' : '▼'}
                                </Button>
                              )}
                            </div>
                            {viesExpanded && localVatCheckResponse && (() => {
                              try {
                                const viesData = JSON.parse(localVatCheckResponse)
                                return (
                                  <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
                                    {viesData.name && (
                                      <div>
                                        <span className="text-gray-500">{t('requests.detail.financial.vies.companyName')}:</span>{' '}
                                        <span className="font-medium">{viesData.name}</span>
                                      </div>
                                    )}
                                    {viesData.address && (
                                      <div>
                                        <span className="text-gray-500">{t('requests.detail.financial.vies.address')}:</span>{' '}
                                        <span className="font-medium">{viesData.address}</span>
                                      </div>
                                    )}
                                    {localVatCheckedAt && (
                                      <div>
                                        <span className="text-gray-500">{t('requests.detail.financial.vies.checkedAt')}:</span>{' '}
                                        <span className="font-medium">{new Date(localVatCheckedAt).toLocaleString(getDateLocale(language))}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              } catch {
                                return null
                              }
                            })()}
                          </div>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.financial.iban')}</Label>
                        <p className="font-medium">{request.iban || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.financial.bank')}</Label>
                        <p className="font-medium">{request.bankName || '-'}</p>
                      </div>
                      {request.invoiceEmail && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.financial.invoiceEmail')}</Label>
                          <p className="font-medium">{request.invoiceEmail}</p>
                        </div>
                      )}
                      {request.invoiceAddress && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.financial.invoiceAddress')}</Label>
                          <p className="font-medium">{request.invoiceAddress}</p>
                        </div>
                      )}
                      {request.invoicePostalCode && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.financial.invoicePostalCode')}</Label>
                          <p className="font-medium">{request.invoicePostalCode}</p>
                        </div>
                      )}
                      {request.invoiceCity && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.financial.invoiceCity')}</Label>
                          <p className="font-medium">{request.invoiceCity}</p>
                        </div>
                      )}
                      {request.invoiceCurrency && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.financial.currency')}</Label>
                          <p className="font-medium">{request.invoiceCurrency}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Director details - Koop + O-kweker, ROW */}
                {showDirector && request.directorName && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-gray-700">{t('requests.detail.director.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.director.name')}</Label>
                        <p className="font-medium">{request.directorName}</p>
                      </div>
                      {request.directorFunction && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.director.function')}</Label>
                          <p className="font-medium">{request.directorFunction}</p>
                        </div>
                      )}
                      {request.directorDateOfBirth && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.director.dob')}</Label>
                          <p className="font-medium">{request.directorDateOfBirth}</p>
                        </div>
                      )}
                      {request.directorPassportNumber && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.director.passport')}</Label>
                          <p className="font-medium">{request.directorPassportNumber}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Auction details - X-kweker */}
                {showAuction && (request.auctionNumberRFH || request.salesSheetEmail) && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-gray-700">{t('requests.detail.auction.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {request.auctionNumberRFH && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.auction.auctionNumberRFH')}</Label>
                          <p className="font-medium">{request.auctionNumberRFH}</p>
                        </div>
                      )}
                      {request.salesSheetEmail && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.auction.salesSheetEmail')}</Label>
                          <p className="font-medium">{request.salesSheetEmail}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-gray-500">{t('requests.detail.auction.mandateRFH')}</Label>
                        <p className="font-medium">{request.mandateRFH ? t('common.yes') : t('common.no')}</p>
                      </div>
                      {request.apiKeyFloriday && (
                        <div>
                          <Label className="text-gray-500">{t('requests.detail.auction.apiKeyFloriday')}</Label>
                          <p className="font-medium">{request.apiKeyFloriday}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {request.files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('requests.detail.files.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {request.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-4">
                      <Badge variant="outline">
                        {t(`enums.fileType.${file.fileType}`)}
                      </Badge>
                      <a
                        href={file.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {file.fileName}
                      </a>
                      <span className="text-sm text-gray-500">
                        {new Date(file.uploadedAt).toLocaleDateString(getDateLocale(language))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Purchaser Additional Info */}
          {(request.incoterm || request.paymentTerm || request.accountManager) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('requests.detail.purchaser.title')}</CardTitle>
                <CardDescription>
                  {t('requests.detail.purchaser.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {request.incoterm && (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.purchaser.incoterm')}</Label>
                    <p className="font-medium">{request.incoterm}</p>
                  </div>
                )}
                {request.paymentTerm && (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.purchaser.paymentTerm')}</Label>
                    <p className="font-medium">{request.paymentTerm} {t('common.days')}</p>
                  </div>
                )}
                {request.accountManager && (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.purchaser.accountManager')}</Label>
                    <p className="font-medium">{request.accountManager}</p>
                  </div>
                )}
                {request.commissionPercentage !== null && request.commissionPercentage !== undefined && (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.purchaser.commission')}</Label>
                    <p className="font-medium">{request.commissionPercentage}%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Finance Section */}
          {(request.creditorNumber || request.status === 'AWAITING_FINANCE') && (
            <Card>
              <CardHeader>
                <CardTitle>{t('requests.detail.finance.title')}</CardTitle>
                <CardDescription>
                  {request.creditorNumber
                    ? t('requests.detail.finance.creditorAssigned')
                    : t('requests.detail.finance.waitingForCreditor')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exact Globe XML URL */}
                {request.companyName && (userRoles.includes('FINANCE') || userRoles.includes('INKOPER')) && (
                  <div className="space-y-2">
                    <Label className="text-gray-500">{t('requests.detail.finance.exactXml')}</Label>
                    <p className="text-xs text-gray-400">{t('requests.detail.finance.exactXmlDescription')}</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/requests/${request.id}/exact-xml` : `/api/requests/${request.id}/exact-xml`}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/api/requests/${request.id}/exact-xml`
                          navigator.clipboard.writeText(url)
                          toast.success(t('requests.detail.finance.urlCopied'))
                        }}
                      >
                        {t('requests.detail.finance.copyUrl')}
                      </Button>
                    </div>
                  </div>
                )}

                {request.creditorNumber ? (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.finance.creditorNumber')}</Label>
                    <p className="font-medium">{request.creditorNumber}</p>
                  </div>
                ) : userRoles.includes('FINANCE') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="creditorNumber">{t('requests.detail.finance.creditorNumber')} *</Label>
                      <Input
                        id="creditorNumber"
                        value={creditorNumber}
                        onChange={(e) => setCreditorNumber(e.target.value)}
                        placeholder={t('requests.detail.finance.enterCreditor')}
                      />
                    </div>
                    <Button
                      onClick={() => handleAction('finance-submit', { creditorNumber })}
                      disabled={isLoading || !creditorNumber}
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">{t('requests.detail.finance.waiting')}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ERP Section */}
          {(request.kbtCode || request.status === 'AWAITING_ERP') && (
            <Card>
              <CardHeader>
                <CardTitle>{t('requests.detail.erp.title')}</CardTitle>
                <CardDescription>
                  {request.kbtCode ? t('requests.detail.erp.kbtAssigned') : t('requests.detail.erp.waitingForKbt')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.kbtCode ? (
                  <div>
                    <Label className="text-gray-500">{t('requests.detail.erp.kbtCode')}</Label>
                    <p className="font-medium">{request.kbtCode}</p>
                  </div>
                ) : userRoles.includes('ERP') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="kbtCode">{t('requests.detail.erp.kbtCode')} *</Label>
                      <Input
                        id="kbtCode"
                        value={kbtCode}
                        onChange={(e) => setKbtCode(e.target.value)}
                        placeholder={t('requests.detail.erp.enterKbt')}
                      />
                    </div>
                    <Button
                      onClick={() => handleAction('erp-submit', { kbtCode })}
                      disabled={isLoading || !kbtCode}
                    >
                      {t('common.save')}
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">{t('requests.detail.erp.waiting')}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>{t('requests.detail.audit.title')}</CardTitle>
              <CardDescription>{t('requests.detail.audit.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {request.auditLogs.length === 0 ? (
                <p className="text-gray-500">{t('requests.detail.audit.empty')}</p>
              ) : (
                <div className="space-y-4">
                  {request.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{t(`enums.auditAction.${log.action}`)}</p>
                        <p className="text-sm text-gray-500">
                          {log.user
                            ? `${t('requests.detail.audit.by')} ${formatUserName(log.user) || log.user.email}`
                            : t('requests.detail.audit.system')}
                        </p>
                        {log.details && (
                          <pre className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded">
                            {log.details}
                          </pre>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString(getDateLocale(language))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
