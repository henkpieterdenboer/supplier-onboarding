'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { FileTypeLabels } from '@/types'

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
  incoterm: string | null
  commissionPercentage: number | null
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
    chamberOfCommerceNumber: '',
    vatNumber: '',
    iban: '',
    bankName: '',
    // Purchaser additional data
    incoterm: '' as '' | 'CIF' | 'FOB',
    commissionPercentage: '',
  })

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${params.id}`)
        if (!response.ok) throw new Error('Aanvraag niet gevonden')
        const data = await response.json()
        setRequest(data)

        // Populate form with existing data
        // When selfFill is true and no data has been entered yet, pre-fill with initial request data
        setFormData({
          companyName: data.companyName || (data.selfFill ? data.supplierName : '') || '',
          address: data.address || '',
          postalCode: data.postalCode || '',
          city: data.city || '',
          country: data.country || '',
          contactName: data.contactName || '',
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || (data.selfFill ? data.supplierEmail : '') || '',
          chamberOfCommerceNumber: data.chamberOfCommerceNumber || '',
          vatNumber: data.vatNumber || '',
          iban: data.iban || '',
          bankName: data.bankName || '',
          incoterm: data.incoterm || '',
          commissionPercentage:
            data.commissionPercentage !== null ? String(data.commissionPercentage) : '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const submitData = new FormData()
      submitData.append('data', JSON.stringify({
        action: 'purchaser-submit',
        ...formData,
        commissionPercentage: formData.commissionPercentage
          ? parseFloat(formData.commissionPercentage)
          : null,
      }))

      if (kvkFile) submitData.append('kvk', kvkFile)
      if (passportFile) submitData.append('passport', passportFile)

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
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contactpersoon</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chamberOfCommerceNumber">KvK nummer</Label>
                <Input
                  id="chamberOfCommerceNumber"
                  value={formData.chamberOfCommerceNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      chamberOfCommerceNumber: e.target.value,
                    })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">BTW nummer</Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vatNumber: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, bankName: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section */}
        <Card>
          <CardHeader>
            <CardTitle>Documenten</CardTitle>
            <CardDescription>
              Upload KvK uittreksel en paspoort / ID
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
              <div className="space-y-2">
                <Label htmlFor="commissionPercentage">Commissiepercentage *</Label>
                <Input
                  id="commissionPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.commissionPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, commissionPercentage: e.target.value })
                  }
                  placeholder="Bijv. 2.5"
                  disabled={isSaving}
                />
              </div>
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
            disabled={isSaving || !formData.incoterm || !formData.commissionPercentage}
          >
            {isSaving ? 'Bezig...' : 'Opslaan en doorsturen naar Finance'}
          </Button>
        </div>
      </form>
    </div>
  )
}
