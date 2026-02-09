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
import { Status, StatusLabels, RegionLabels, FileTypeLabels } from '@/types'
import { formatUserName } from '@/lib/user-utils'

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
  // Purchaser fields
  incoterm: string | null
  commissionPercentage: number | null
  // Finance fields
  creditorNumber: string | null
  // ERP fields
  kbtCode: string | null
  // Invitation
  invitationToken: string | null
  invitationExpiresAt: Date | null
  invitationSentAt: Date | null
  supplierSubmittedAt: Date | null
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

export function RequestDetail({ request, userRoles, userId }: RequestDetailProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [creditorNumber, setCreditorNumber] = useState('')
  const [kbtCode, setKbtCode] = useState('')

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
        throw new Error(result.error || 'Er is een fout opgetreden')
      }

      toast.success('Actie succesvol uitgevoerd')

      // Redirect to dashboard after ERP submit (completion)
      if (action === 'erp-submit') {
        router.push('/dashboard')
      } else {
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Er is een fout opgetreden')
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
              {StatusLabels[request.status as Status] || request.status}
            </Badge>
          </div>
          <p className="text-gray-500">{request.supplierEmail}</p>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/requests/${request.id}/edit`}>
              <Button>Bewerken</Button>
            </Link>
          )}

          {canResendInvitation && (
            <Button
              variant="outline"
              onClick={() => handleAction('resend-invitation')}
              disabled={isLoading}
            >
              Uitnodiging opnieuw versturen
            </Button>
          )}

          {canSendReminder && (
            <Button
              variant="outline"
              onClick={() => handleAction('send-reminder')}
              disabled={isLoading}
            >
              Herinnering versturen
            </Button>
          )}

          {canCancel && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">Afbreken</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aanvraag afbreken?</DialogTitle>
                  <DialogDescription>
                    Weet u zeker dat u deze aanvraag wilt afbreken? U kunt de aanvraag
                    later weer heropenen.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction('cancel')}
                    disabled={isLoading}
                  >
                    Afbreken
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
              Heropenen
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Gegevens</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basisgegevens</CardTitle>
              <CardDescription>Gegevens ingevuld bij aanmaken aanvraag</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">Leverancier</Label>
                <p className="font-medium">{request.supplierName}</p>
              </div>
              <div>
                <Label className="text-gray-500">Email</Label>
                <p className="font-medium">{request.supplierEmail}</p>
              </div>
              <div>
                <Label className="text-gray-500">Regio</Label>
                <p className="font-medium">
                  {RegionLabels[request.region as keyof typeof RegionLabels] || request.region}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Aangemaakt door</Label>
                <p className="font-medium">
                  {formatUserName(request.createdBy) || request.createdBy.email}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Aangemaakt op</Label>
                <p className="font-medium">
                  {new Date(request.createdAt).toLocaleString('nl-NL')}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">Invulmethode</Label>
                <p className="font-medium">
                  {request.selfFill ? 'Door inkoper' : 'Door leverancier'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Details */}
          {(request.companyName || request.supplierSubmittedAt) && (
            <Card>
              <CardHeader>
                <CardTitle>Leveranciersgegevens</CardTitle>
                <CardDescription>
                  {request.supplierSubmittedAt
                    ? `Ingevuld op ${new Date(request.supplierSubmittedAt).toLocaleString('nl-NL')}`
                    : 'Ingevuld door inkoper'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Bedrijfsnaam</Label>
                  <p className="font-medium">{request.companyName || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Adres</Label>
                  <p className="font-medium">{request.address || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Postcode</Label>
                  <p className="font-medium">{request.postalCode || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Plaats</Label>
                  <p className="font-medium">{request.city || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Land</Label>
                  <p className="font-medium">{request.country || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Contactpersoon</Label>
                  <p className="font-medium">{request.contactName || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Telefoon</Label>
                  <p className="font-medium">{request.contactPhone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Contact email</Label>
                  <p className="font-medium">{request.contactEmail || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">KvK nummer</Label>
                  <p className="font-medium">{request.chamberOfCommerceNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">BTW nummer</Label>
                  <p className="font-medium">{request.vatNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">IBAN</Label>
                  <p className="font-medium">{request.iban || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Bank</Label>
                  <p className="font-medium">{request.bankName || '-'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          {request.files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bestanden</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {request.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-4">
                      <Badge variant="outline">
                        {FileTypeLabels[file.fileType as keyof typeof FileTypeLabels] ||
                          file.fileType}
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
                        {new Date(file.uploadedAt).toLocaleDateString('nl-NL')}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Purchaser Additional Info */}
          {(request.incoterm || request.commissionPercentage !== null) && (
            <Card>
              <CardHeader>
                <CardTitle>Aanvullende gegevens (Inkoper)</CardTitle>
                <CardDescription>
                  Gegevens toegevoegd door inkoper
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Incoterm</Label>
                  <p className="font-medium">{request.incoterm || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Commissiepercentage</Label>
                  <p className="font-medium">
                    {request.commissionPercentage !== null
                      ? `${request.commissionPercentage}%`
                      : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Finance Section */}
          {(request.creditorNumber || request.status === 'AWAITING_FINANCE') && (
            <Card>
              <CardHeader>
                <CardTitle>Finance</CardTitle>
                <CardDescription>
                  {request.creditorNumber
                    ? 'Crediteurnummer toegewezen'
                    : 'Wachten op crediteurnummer'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.creditorNumber ? (
                  <div>
                    <Label className="text-gray-500">Crediteurnummer</Label>
                    <p className="font-medium">{request.creditorNumber}</p>
                  </div>
                ) : userRoles.includes('FINANCE') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="creditorNumber">Crediteurnummer *</Label>
                      <Input
                        id="creditorNumber"
                        value={creditorNumber}
                        onChange={(e) => setCreditorNumber(e.target.value)}
                        placeholder="Voer crediteurnummer in"
                      />
                    </div>
                    <Button
                      onClick={() => handleAction('finance-submit', { creditorNumber })}
                      disabled={isLoading || !creditorNumber}
                    >
                      Opslaan
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Wachten op Finance</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ERP Section */}
          {(request.kbtCode || request.status === 'AWAITING_ERP') && (
            <Card>
              <CardHeader>
                <CardTitle>ERP</CardTitle>
                <CardDescription>
                  {request.kbtCode ? 'KBT-code toegewezen' : 'Wachten op KBT-code'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.kbtCode ? (
                  <div>
                    <Label className="text-gray-500">KBT-code</Label>
                    <p className="font-medium">{request.kbtCode}</p>
                  </div>
                ) : userRoles.includes('ERP') ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="kbtCode">KBT-code *</Label>
                      <Input
                        id="kbtCode"
                        value={kbtCode}
                        onChange={(e) => setKbtCode(e.target.value)}
                        placeholder="Voer KBT-code in"
                      />
                    </div>
                    <Button
                      onClick={() => handleAction('erp-submit', { kbtCode })}
                      disabled={isLoading || !kbtCode}
                    >
                      Opslaan
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Wachten op ERP</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Overzicht van alle acties op deze aanvraag</CardDescription>
            </CardHeader>
            <CardContent>
              {request.auditLogs.length === 0 ? (
                <p className="text-gray-500">Geen acties gevonden</p>
              ) : (
                <div className="space-y-4">
                  {request.auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-500">
                          {log.user
                            ? `Door ${formatUserName(log.user) || log.user.email}`
                            : 'Systeem'}
                        </p>
                        {log.details && (
                          <pre className="text-xs text-gray-400 mt-1 bg-gray-50 p-2 rounded">
                            {log.details}
                          </pre>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleString('nl-NL')}
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
