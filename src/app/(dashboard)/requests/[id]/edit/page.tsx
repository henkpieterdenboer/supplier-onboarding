'use client'

import { useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { FileTypeLabels, SupplierType, SupplierTypeLabels } from '@/types'
import {
  showFinancialSection,
  showDirectorSection,
  showAuctionSection,
  showBankUpload,
  requiresIncoterm,
} from '@/lib/supplier-type-utils'

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
  files: SupplierFile[]
}

export default function EditRequestPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [request, setRequest] = useState<Request | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [kvkFile, setKvkFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [bankDetailsFile, setBankDetailsFile] = useState<File | null>(null)

  const [supplierType, setSupplierType] = useState<string>('KOOP')

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
  })

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${params.id}`)
        if (!response.ok) throw new Error('Aanvraag niet gevonden')
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
        })
      } catch {
        setError('Aanvraag niet gevonden')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequest()
  }, [params.id])

  // Check permissions
  if (!session?.user?.roles?.includes('INKOPER')) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          U heeft geen toestemming om deze aanvraag te bewerken.
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-8">Laden...</div>
  }

  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">{error || 'Aanvraag niet gevonden'}</Alert>
      </div>
    )
  }

  if (request.status !== 'AWAITING_PURCHASER') {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="destructive">
          Deze aanvraag kan niet worden bewerkt in de huidige status.
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

  const canSubmit = incotermRequired
    ? !!formData.incoterm
    : true

  const handleTypeChange = async (newType: string) => {
    setSupplierType(newType)
    // Also persist the type change to the server
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const submitData = new FormData()
      submitData.append('data', JSON.stringify({
        action: 'purchaser-submit',
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

      const response = await fetch(`/api/requests/${params.id}`, {
        method: 'PATCH',
        body: submitData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Er is een fout opgetreden')
      }

      toast.success('Gegevens opgeslagen en doorgestuurd naar Finance')
      router.push(`/requests/${params.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}

        {/* Type Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Type leverancier</CardTitle>
            <CardDescription>
              Wijzig het type leverancier indien nodig
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={supplierType}
              onValueChange={handleTypeChange}
              disabled={isSaving}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SupplierTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Supplier Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Leveranciersgegevens</CardTitle>
            <CardDescription>
              {request.selfFill
                ? 'Vul de gegevens van de leverancier in'
                : 'Gegevens ingevuld door leverancier - controleer en pas aan indien nodig'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Bedrijfsnaam</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contactpersoon</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Telefoon</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="glnNumber">GLN-nummer</Label>
              <Input
                id="glnNumber"
                value={formData.glnNumber}
                onChange={(e) => setFormData({ ...formData, glnNumber: e.target.value })}
                disabled={isSaving}
              />
            </div>

            {/* Financial fields - Koop + O-kweker */}
            {showFinancial && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="chamberOfCommerceNumber">KvK nummer</Label>
                    <Input
                      id="chamberOfCommerceNumber"
                      value={formData.chamberOfCommerceNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, chamberOfCommerceNumber: e.target.value })
                      }
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">BTW nummer</Label>
                    <Input
                      id="vatNumber"
                      value={formData.vatNumber}
                      onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceEmail">Factuur email</Label>
                  <Input
                    id="invoiceEmail"
                    type="email"
                    value={formData.invoiceEmail}
                    onChange={(e) => setFormData({ ...formData, invoiceEmail: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceAddress">Factuuradres</Label>
                  <Input
                    id="invoiceAddress"
                    value={formData.invoiceAddress}
                    onChange={(e) => setFormData({ ...formData, invoiceAddress: e.target.value })}
                    disabled={isSaving}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoicePostalCode">Factuur postcode</Label>
                    <Input
                      id="invoicePostalCode"
                      value={formData.invoicePostalCode}
                      onChange={(e) => setFormData({ ...formData, invoicePostalCode: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceCity">Factuur plaats</Label>
                    <Input
                      id="invoiceCity"
                      value={formData.invoiceCity}
                      onChange={(e) => setFormData({ ...formData, invoiceCity: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceCurrency">Valuta</Label>
                    <Select
                      value={formData.invoiceCurrency}
                      onValueChange={(value) => setFormData({ ...formData, invoiceCurrency: value })}
                      disabled={isSaving}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Valuta" />
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
                <p className="text-sm font-medium text-gray-700">Bestuurder (ROW)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorName">Naam bestuurder</Label>
                    <Input
                      id="directorName"
                      value={formData.directorName}
                      onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorFunction">Functie</Label>
                    <Input
                      id="directorFunction"
                      value={formData.directorFunction}
                      onChange={(e) => setFormData({ ...formData, directorFunction: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="directorDateOfBirth">Geboortedatum</Label>
                    <Input
                      id="directorDateOfBirth"
                      type="date"
                      value={formData.directorDateOfBirth}
                      onChange={(e) => setFormData({ ...formData, directorDateOfBirth: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directorPassportNumber">Paspoortnummer</Label>
                    <Input
                      id="directorPassportNumber"
                      value={formData.directorPassportNumber}
                      onChange={(e) => setFormData({ ...formData, directorPassportNumber: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Auction fields - X-kweker only */}
            {showAuction && (
              <>
                <Separator />
                <p className="text-sm font-medium text-gray-700">Veilinggegevens</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auctionNumberRFH">Aanvoernummer RFH</Label>
                    <Input
                      id="auctionNumberRFH"
                      value={formData.auctionNumberRFH}
                      onChange={(e) => setFormData({ ...formData, auctionNumberRFH: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesSheetEmail">Salessheet email</Label>
                    <Input
                      id="salesSheetEmail"
                      type="email"
                      value={formData.salesSheetEmail}
                      onChange={(e) => setFormData({ ...formData, salesSheetEmail: e.target.value })}
                      disabled={isSaving}
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
                    disabled={isSaving}
                  />
                  <Label htmlFor="mandateRFH">Mandaat RFH</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyFloriday">API key Floriday</Label>
                  <Input
                    id="apiKeyFloriday"
                    value={formData.apiKeyFloriday}
                    onChange={(e) => setFormData({ ...formData, apiKeyFloriday: e.target.value })}
                    disabled={isSaving}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle>Documenten</CardTitle>
            <CardDescription>
              Upload KvK uittreksel, paspoort / ID{showBank ? ' en screenshot bankgegevens' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing files */}
            {request.files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bestaande bestanden</Label>
                <ul className="space-y-2">
                  {request.files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3">
                      <Badge variant="outline">
                        {FileTypeLabels[file.fileType as keyof typeof FileTypeLabels] || file.fileType}
                      </Badge>
                      <a
                        href={file.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {file.fileName}
                      </a>
                      <span className="text-xs text-gray-500">
                        {new Date(file.uploadedAt).toLocaleDateString('nl-NL')}
                      </span>
                    </li>
                  ))}
                </ul>
                <Separator />
              </div>
            )}

            {/* File uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kvk">
                  KvK uittreksel {request.files.some(f => f.fileType === 'KVK') ? '(vervangen)' : ''}
                </Label>
                <Input
                  id="kvk"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setKvkFile(e.target.files?.[0] || null)}
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passport">
                  Paspoort / ID {request.files.some(f => f.fileType === 'PASSPORT') ? '(vervangen)' : ''}
                </Label>
                <Input
                  id="passport"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>
            </div>

            {showBank && (
              <div className="space-y-2">
                <Label htmlFor="bankDetails">
                  Screenshot bankgegevens {request.files.some(f => f.fileType === 'BANK_DETAILS') ? '(vervangen)' : ''}
                </Label>
                <Input
                  id="bankDetails"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setBankDetailsFile(e.target.files?.[0] || null)}
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500">PDF, JPG of PNG (max 10MB)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Purchaser Data */}
        <Card>
          <CardHeader>
            <CardTitle>Aanvullende gegevens (Inkoper)</CardTitle>
            <CardDescription>
              Deze gegevens moeten door de inkoper worden toegevoegd
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {incotermRequired && (
                <div className="space-y-2">
                  <Label htmlFor="incoterm">Incoterm *</Label>
                  <Select
                    value={formData.incoterm}
                    onValueChange={(value: 'CIF' | 'FOB') =>
                      setFormData({ ...formData, incoterm: value })
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer incoterm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="FOB">FOB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="paymentTerm">Betalingstermijn</Label>
                <Select
                  value={formData.paymentTerm}
                  onValueChange={(value) => setFormData({ ...formData, paymentTerm: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer termijn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">14 dagen</SelectItem>
                    <SelectItem value="30">30 dagen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountManager">Accountmanager</Label>
              <Input
                id="accountManager"
                value={formData.accountManager}
                onChange={(e) => setFormData({ ...formData, accountManager: e.target.value })}
                disabled={isSaving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSaving}
          >
            Annuleren
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !canSubmit}
          >
            {isSaving ? 'Bezig...' : 'Opslaan en doorsturen naar Finance'}
          </Button>
        </div>
      </form>
    </div>
  )
}
