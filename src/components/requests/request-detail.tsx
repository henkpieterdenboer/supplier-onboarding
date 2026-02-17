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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Check, X, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import { formatUserName } from '@/lib/user-utils'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
} from '@/lib/supplier-type-utils'
import { useLanguage } from '@/lib/i18n-context'
import { getDateLocale, formatDate, formatTime } from '@/lib/i18n'
import { statusColors, supplierTypeColors, labelColors } from '@/lib/status-colors'

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

  const [isDeleting, setIsDeleting] = useState(false)

  const canEdit =
    (userRoles.includes('INKOPER') && request.status === 'AWAITING_PURCHASER') ||
    (userRoles.includes('FINANCE') && request.status === 'AWAITING_FINANCE') ||
    (userRoles.includes('ERP') && request.status === 'AWAITING_ERP')

  const canSelfFill = userRoles.includes('INKOPER') && request.status === 'INVITATION_SENT'
  const canDelete = userRoles.includes('ADMIN') && request.status === 'CANCELLED'
  const canCancel = request.status !== 'CANCELLED' && request.status !== 'COMPLETED'
  const canReopen = request.status === 'CANCELLED'
  const canResendInvitation = request.status === 'INVITATION_SENT'
  const canSendReminder =
    request.status !== 'COMPLETED' && request.status !== 'CANCELLED'

  const hasSecondaryActions = canResendInvitation || canSendReminder || canReopen || canCancel

  const handleSelfFill = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'self-fill' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || t('common.error'))
      toast.success(t('common.success'))
      router.push(`/requests/${request.id}/edit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/requests/${request.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || t('common.error'))
      }
      toast.success(t('common.success'))
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{request.supplierName}</h1>
            <Badge className={statusColors[request.status]}>
              {t(`enums.status.${request.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{request.supplierEmail}</p>
          {/* Compact metadata strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge className={supplierTypeColors[supplierType] || 'bg-muted text-muted-foreground'}>
                {t(`enums.supplierType.${supplierType}`)}
              </Badge>
              <Badge className={labelColors[request.label] || 'bg-muted text-muted-foreground'}>
                {t(`enums.label.${request.label}`)}
              </Badge>
            </div>
            <span>{t(`enums.region.${request.region}`)} · {request.selfFill ? t('requests.detail.basic.byPurchaser') : t('requests.detail.basic.bySupplier')}</span>
            <span>{formatUserName(request.createdBy) || request.createdBy.email} · {new Date(request.createdAt).toLocaleDateString(getDateLocale(language))}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canSelfFill && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isLoading}>
                  {t('requests.detail.actions.selfFill')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('requests.detail.actions.selfFill')}</DialogTitle>
                  <DialogDescription>
                    {t('requests.detail.actions.selfFillConfirm')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    onClick={handleSelfFill}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('requests.detail.actions.selfFill')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {canEdit && (
            <Link href={`/requests/${request.id}/edit`}>
              <Button>{t('requests.detail.actions.edit')}</Button>
            </Link>
          )}

          {canDelete && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" size="icon" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('requests.detail.actions.deleteTitle')}</DialogTitle>
                  <DialogDescription>
                    {t('requests.detail.actions.deleteMessage')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('requests.detail.actions.delete')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {hasSecondaryActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canResendInvitation && (
                  <DropdownMenuItem
                    onClick={() => handleAction('resend-invitation')}
                    disabled={isLoading}
                  >
                    {t('requests.detail.actions.resendInvitation')}
                  </DropdownMenuItem>
                )}
                {canSendReminder && (
                  <DropdownMenuItem
                    onClick={() => handleAction('send-reminder')}
                    disabled={isLoading}
                  >
                    {t('requests.detail.actions.sendReminder')}
                  </DropdownMenuItem>
                )}
                {canReopen && (
                  <DropdownMenuItem
                    onClick={() => handleAction('reopen')}
                    disabled={isLoading}
                  >
                    {t('requests.detail.actions.reopen')}
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          {t('requests.detail.actions.cancel')}
                        </DropdownMenuItem>
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
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t('requests.detail.tabs.details')}</TabsTrigger>
          <TabsTrigger value="audit">{t('requests.detail.tabs.audit')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Basic Info - removed, metadata is now in the header strip */}

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
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.companyName')}</Label>
                    <p className="font-medium">{request.companyName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.address')}</Label>
                    <p className="font-medium">{request.address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.postalCode')}</Label>
                    <p className="font-medium">{request.postalCode || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.city')}</Label>
                    <p className="font-medium">{request.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.country')}</Label>
                    <p className="font-medium">{request.country || '-'}</p>
                  </div>
                  {request.glnNumber && (
                    <div>
                      <Label className="text-muted-foreground">{t('requests.detail.supplier.glnNumber')}</Label>
                      <p className="font-medium">{request.glnNumber}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.contactName')}</Label>
                    <p className="font-medium">{request.contactName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.phone')}</Label>
                    <p className="font-medium">{request.contactPhone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.supplier.contactEmail')}</Label>
                    <p className="font-medium">{request.contactEmail || '-'}</p>
                  </div>
                </div>

                {/* Financial details - Koop + O-kweker */}
                {showFinancial && (request.chamberOfCommerceNumber || request.iban) && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-foreground">{t('requests.detail.financial.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">{t('requests.detail.financial.kvkNumber')}</Label>
                        <p className="font-medium">{request.chamberOfCommerceNumber || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('requests.detail.financial.vatNumber')}</Label>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{request.vatNumber || '-'}</p>
                          {request.region === 'EU' && request.vatNumber && (
                            <>
                              {localVatValid === true && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <Check className="h-4 w-4" />
                                  {t('requests.detail.financial.vies.valid')}
                                </span>
                              )}
                              {localVatValid === false && (
                                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                  <X className="h-4 w-4" />
                                  {t('requests.detail.financial.vies.invalid')}
                                </span>
                              )}
                              {localVatValid === null && (
                                <span className="text-xs text-muted-foreground">{t('requests.detail.financial.vies.notChecked')}</span>
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
                                  {isViesRechecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                  <div className="bg-muted rounded p-3 text-sm space-y-1">
                                    {viesData.name && (
                                      <div>
                                        <span className="text-muted-foreground">{t('requests.detail.financial.vies.companyName')}:</span>{' '}
                                        <span className="font-medium">{viesData.name}</span>
                                      </div>
                                    )}
                                    {viesData.address && (
                                      <div>
                                        <span className="text-muted-foreground">{t('requests.detail.financial.vies.address')}:</span>{' '}
                                        <span className="font-medium">{viesData.address}</span>
                                      </div>
                                    )}
                                    {localVatCheckedAt && (
                                      <div>
                                        <span className="text-muted-foreground">{t('requests.detail.financial.vies.checkedAt')}:</span>{' '}
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
                        <Label className="text-muted-foreground">{t('requests.detail.financial.iban')}</Label>
                        <p className="font-medium">{request.iban || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('requests.detail.financial.bank')}</Label>
                        <p className="font-medium">{request.bankName || '-'}</p>
                      </div>
                      {request.invoiceEmail && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.financial.invoiceEmail')}</Label>
                          <p className="font-medium">{request.invoiceEmail}</p>
                        </div>
                      )}
                      {request.invoiceAddress && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.financial.invoiceAddress')}</Label>
                          <p className="font-medium">{request.invoiceAddress}</p>
                        </div>
                      )}
                      {request.invoicePostalCode && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.financial.invoicePostalCode')}</Label>
                          <p className="font-medium">{request.invoicePostalCode}</p>
                        </div>
                      )}
                      {request.invoiceCity && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.financial.invoiceCity')}</Label>
                          <p className="font-medium">{request.invoiceCity}</p>
                        </div>
                      )}
                      {request.invoiceCurrency && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.financial.currency')}</Label>
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
                    <p className="text-sm font-medium text-foreground">{t('requests.detail.director.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">{t('requests.detail.director.name')}</Label>
                        <p className="font-medium">{request.directorName}</p>
                      </div>
                      {request.directorFunction && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.director.function')}</Label>
                          <p className="font-medium">{request.directorFunction}</p>
                        </div>
                      )}
                      {request.directorDateOfBirth && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.director.dob')}</Label>
                          <p className="font-medium">{request.directorDateOfBirth}</p>
                        </div>
                      )}
                      {request.directorPassportNumber && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.director.passport')}</Label>
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
                    <p className="text-sm font-medium text-foreground">{t('requests.detail.auction.title')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      {request.auctionNumberRFH && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.auction.auctionNumberRFH')}</Label>
                          <p className="font-medium">{request.auctionNumberRFH}</p>
                        </div>
                      )}
                      {request.salesSheetEmail && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.auction.salesSheetEmail')}</Label>
                          <p className="font-medium">{request.salesSheetEmail}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">{t('requests.detail.auction.mandateRFH')}</Label>
                        <p className="font-medium">{request.mandateRFH ? t('common.yes') : t('common.no')}</p>
                      </div>
                      {request.apiKeyFloriday && (
                        <div>
                          <Label className="text-muted-foreground">{t('requests.detail.auction.apiKeyFloriday')}</Label>
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
                        className="text-primary hover:underline"
                      >
                        {file.fileName}
                      </a>
                      <span className="text-sm text-muted-foreground">
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
                    <Label className="text-muted-foreground">{t('requests.detail.purchaser.incoterm')}</Label>
                    <p className="font-medium">{request.incoterm}</p>
                  </div>
                )}
                {request.paymentTerm && (
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.purchaser.paymentTerm')}</Label>
                    <p className="font-medium">{request.paymentTerm} {t('common.days')}</p>
                  </div>
                )}
                {request.accountManager && (
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.purchaser.accountManager')}</Label>
                    <p className="font-medium">{request.accountManager}</p>
                  </div>
                )}
                {request.commissionPercentage !== null && request.commissionPercentage !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">{t('requests.detail.purchaser.commission')}</Label>
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
                {/* Exact Globe XML URL - only visible for FINANCE */}
                {request.companyName && userRoles.includes('FINANCE') && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('requests.detail.finance.exactXml')}</Label>
                    <p className="text-xs text-muted-foreground">{t('requests.detail.finance.exactXmlDescription')}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `/api/requests/${request.id}/exact-xml`
                          const link = document.createElement('a')
                          link.href = url
                          link.download = `${request.supplierName?.replace(/[^a-zA-Z0-9]/g, '_') || request.id}.xml`
                          link.click()
                        }}
                      >
                        {t('requests.detail.finance.downloadXml')}
                      </Button>
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
                    <Label className="text-muted-foreground">{t('requests.detail.finance.creditorNumber')}</Label>
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
                  <p className="text-muted-foreground">{t('requests.detail.finance.waiting')}</p>
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
                    <Label className="text-muted-foreground">{t('requests.detail.erp.kbtCode')}</Label>
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
                  <p className="text-muted-foreground">{t('requests.detail.erp.waiting')}</p>
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
                <p className="text-muted-foreground">{t('requests.detail.audit.empty')}</p>
              ) : (
                <div className="space-y-0">
                  {request.auditLogs.map((log, index) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        {index < request.auditLogs.length - 1 && (
                          <div className="flex-1 w-px bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="font-medium text-sm">{t(`enums.auditAction.${log.action}`)}</p>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(new Date(log.createdAt), language)} {formatTime(new Date(log.createdAt), language)}
                          </time>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.user ? formatUserName(log.user) : t('requests.detail.audit.system')}
                        </p>
                        {log.details && (
                          <pre className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">
                            {log.details}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Demo mode: link to test email inbox when invitation is pending */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && request.status === 'INVITATION_SENT' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-foreground font-medium mb-2">{t('demo.viewEmails')}</p>
          <p className="text-sm text-muted-foreground mb-1">
            <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              https://ethereal.email/login
            </a>
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{t('demo.emailCreds')}</li>
            <li>{t('demo.passwordCreds')}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
