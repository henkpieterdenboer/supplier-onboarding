'use client'

import { useState, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Loader2, AlertTriangle } from 'lucide-react'

// --- Types ---

export type FormContext = 'supplier' | 'edit'

type TFunc = (key: string) => string

// Accepts any formData shape (string fields + possibly boolean/number for edit page extras)
type FormData = Record<string, string | boolean | number | null | undefined>

interface SectionProps {
  formData: FormData
  onChange: (field: string, value: string) => void
  disabled: boolean
  t: TFunc
  context: FormContext
}

interface RegistrationFieldsProps extends SectionProps {
  region: string
}

interface DirectorFieldsProps extends SectionProps {
  region: string
}

// --- Label resolvers ---

function companyLabel(t: TFunc, ctx: FormContext, key: string): string {
  return ctx === 'supplier' ? t(`supplier.form.company.${key}`) : t(`requests.edit.${key}`)
}

function financialLabel(t: TFunc, ctx: FormContext, key: string): string {
  return ctx === 'supplier' ? t(`supplier.form.financial.${key}`) : t(`requests.edit.${key}`)
}

function directorLabel(t: TFunc, ctx: FormContext, key: string): string {
  if (ctx === 'supplier') {
    const map: Record<string, string> = {
      directorName: 'name',
      directorFunction: 'function',
      directorDob: 'dob',
      directorPassport: 'passport',
    }
    return t(`supplier.form.director.${map[key] || key}`)
  }
  return t(`requests.edit.${key}`)
}

function auctionLabel(t: TFunc, ctx: FormContext, key: string): string {
  return ctx === 'supplier' ? t(`supplier.form.auction.${key}`) : t(`requests.edit.${key}`)
}

// Get string value from formData
function v(formData: FormData, field: string): string {
  return String(formData[field] ?? '')
}

// --- Section Components ---

/**
 * Company & contact fields: companyName, contactName, address, postalCode/city/country,
 * phone/contactEmail, glnNumber.
 */
export function CompanyFields({ formData, onChange, disabled, t, context }: SectionProps) {
  const l = (key: string) => companyLabel(t, context, key)

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">{l('companyName')}</Label>
          <Input
            id="companyName"
            value={v(formData, 'companyName')}
            onChange={(e) => onChange('companyName', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">{l('contactName')}</Label>
          <Input
            id="contactName"
            value={v(formData, 'contactName')}
            onChange={(e) => onChange('contactName', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{l('address')}</Label>
        <Input
          id="address"
          value={v(formData, 'address')}
          onChange={(e) => onChange('address', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postalCode">{l('postalCode')}</Label>
          <Input
            id="postalCode"
            value={v(formData, 'postalCode')}
            onChange={(e) => onChange('postalCode', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">{l('city')}</Label>
          <Input
            id="city"
            value={v(formData, 'city')}
            onChange={(e) => onChange('city', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">{l('country')}</Label>
          <Input
            id="country"
            value={v(formData, 'country')}
            onChange={(e) => onChange('country', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactPhone">{l('phone')}</Label>
          <Input
            id="contactPhone"
            value={v(formData, 'contactPhone')}
            onChange={(e) => onChange('contactPhone', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">{l('contactEmail')}</Label>
          <Input
            id="contactEmail"
            type="email"
            value={v(formData, 'contactEmail')}
            onChange={(e) => onChange('contactEmail', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="glnNumber">{l('glnNumber')}</Label>
        <Input
          id="glnNumber"
          value={v(formData, 'glnNumber')}
          onChange={(e) => onChange('glnNumber', e.target.value)}
          disabled={disabled}
        />
      </div>
    </>
  )
}

/**
 * Registration fields: KvK number + VAT number with built-in VIES check.
 * VIES state is managed internally.
 */
export function RegistrationFields({ formData, onChange, disabled, t, context, region }: RegistrationFieldsProps) {
  const l = (key: string) => financialLabel(t, context, key)

  // VIES state
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
      if (data.serviceUnavailable) {
        setViesStatus('error')
        setViesResult(null)
      } else if (data.isValid) {
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
    onChange('vatNumber', value)
    if (viesTimerRef.current) clearTimeout(viesTimerRef.current)
    viesTimerRef.current = setTimeout(() => checkViesVat(value), 800)
  }, [checkViesVat, onChange])

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="chamberOfCommerceNumber">{l('kvkNumber')}</Label>
        <Input
          id="chamberOfCommerceNumber"
          value={v(formData, 'chamberOfCommerceNumber')}
          onChange={(e) => onChange('chamberOfCommerceNumber', e.target.value)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">{l('kvkHint')}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="vatNumber">{l('vatNumber')}</Label>
        <div className="relative">
          <Input
            id="vatNumber"
            value={v(formData, 'vatNumber')}
            onChange={(e) => handleVatChange(e.target.value)}
            disabled={disabled}
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
  )
}

/**
 * Banking fields: IBAN, bank name, invoice currency.
 */
export function BankingFields({ formData, onChange, disabled, t, context }: SectionProps) {
  const l = (key: string) => financialLabel(t, context, key)

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="iban">{l('iban')}</Label>
        <Input
          id="iban"
          value={v(formData, 'iban')}
          onChange={(e) => onChange('iban', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bankName">{l('bank')}</Label>
        <Input
          id="bankName"
          value={v(formData, 'bankName')}
          onChange={(e) => onChange('bankName', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoiceCurrency">{l('currency')}</Label>
        <Select
          value={v(formData, 'invoiceCurrency')}
          onValueChange={(value) => onChange('invoiceCurrency', value)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('supplier.form.financial.currencyPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">{t('supplier.form.financial.currencyEUR')}</SelectItem>
            <SelectItem value="USD">{t('supplier.form.financial.currencyUSD')}</SelectItem>
            <SelectItem value="ZAR">{t('supplier.form.financial.currencyZAR')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/**
 * Invoice fields: invoiceEmail, invoiceAddress, invoicePostalCode, invoiceCity.
 */
export function InvoiceFields({ formData, onChange, disabled, t, context }: SectionProps) {
  const l = (key: string) => financialLabel(t, context, key)

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="invoiceEmail">{l('invoiceEmail')}</Label>
        <Input
          id="invoiceEmail"
          type="email"
          value={v(formData, 'invoiceEmail')}
          onChange={(e) => onChange('invoiceEmail', e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceAddress">{l('invoiceAddress')}</Label>
        <Input
          id="invoiceAddress"
          value={v(formData, 'invoiceAddress')}
          onChange={(e) => onChange('invoiceAddress', e.target.value)}
          placeholder={context === 'supplier' ? t('supplier.form.financial.invoiceAddressHint') : undefined}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoicePostalCode">{l('invoicePostalCode')}</Label>
          <Input
            id="invoicePostalCode"
            value={v(formData, 'invoicePostalCode')}
            onChange={(e) => onChange('invoicePostalCode', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceCity">{l('invoiceCity')}</Label>
          <Input
            id="invoiceCity"
            value={v(formData, 'invoiceCity')}
            onChange={(e) => onChange('invoiceCity', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  )
}

/**
 * Director fields: name, function, date of birth, passport number.
 */
export function DirectorFields({ formData, onChange, disabled, t, context, region }: DirectorFieldsProps) {
  const req = region === 'ROW' ? ' *' : ''
  const l = (key: string) => directorLabel(t, context, key) + req

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="directorName">{l('directorName')}</Label>
          <Input
            id="directorName"
            value={v(formData, 'directorName')}
            onChange={(e) => onChange('directorName', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="directorFunction">{l('directorFunction')}</Label>
          <Input
            id="directorFunction"
            value={v(formData, 'directorFunction')}
            onChange={(e) => onChange('directorFunction', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="directorDateOfBirth">{l('directorDob')}</Label>
          <Input
            id="directorDateOfBirth"
            type="date"
            value={v(formData, 'directorDateOfBirth')}
            onChange={(e) => onChange('directorDateOfBirth', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="directorPassportNumber">{l('directorPassport')}</Label>
          <Input
            id="directorPassportNumber"
            value={v(formData, 'directorPassportNumber')}
            onChange={(e) => onChange('directorPassportNumber', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  )
}

/**
 * Auction fields: auctionNumberRFH, salesSheetEmail, apiKeyFloriday.
 */
export function AuctionFields({ formData, onChange, disabled, t, context }: SectionProps) {
  const l = (key: string) => auctionLabel(t, context, key)

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="auctionNumberRFH">{l('auctionNumberRFH')}</Label>
          <Input
            id="auctionNumberRFH"
            value={v(formData, 'auctionNumberRFH')}
            onChange={(e) => onChange('auctionNumberRFH', e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salesSheetEmail">{l('salesSheetEmail')}</Label>
          <Input
            id="salesSheetEmail"
            type="email"
            value={v(formData, 'salesSheetEmail')}
            onChange={(e) => onChange('salesSheetEmail', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiKeyFloriday">{l('apiKeyFloriday')}</Label>
        <Input
          id="apiKeyFloriday"
          value={v(formData, 'apiKeyFloriday')}
          onChange={(e) => onChange('apiKeyFloriday', e.target.value)}
          disabled={disabled}
        />
      </div>
    </>
  )
}
