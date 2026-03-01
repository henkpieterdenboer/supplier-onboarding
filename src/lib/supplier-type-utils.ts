import { SupplierType } from '@/types'

/**
 * Show Financial section (invoice details, KvK, BTW, IBAN, bank)
 * Koop + O-kweker: yes, X-kweker: no
 */
export function showFinancialSection(type: string): boolean {
  return type === SupplierType.KOOP || type === SupplierType.O_KWEKER
}

/**
 * Show Director section (name, function, date of birth, passport)
 * Koop + O-kweker (all regions)
 */
export function showDirectorSection(type: string): boolean {
  return type === SupplierType.KOOP || type === SupplierType.O_KWEKER
}

/**
 * Show Auction section (auction number, salessheet email, mandate, API key)
 * X-kweker only
 */
export function showAuctionSection(type: string): boolean {
  return type === SupplierType.X_KWEKER
}

/**
 * Show Bank details upload (screenshot bankgegevens)
 * Koop + O-kweker: yes, X-kweker: no
 */
export function showBankUpload(type: string): boolean {
  return type === SupplierType.KOOP || type === SupplierType.O_KWEKER
}

/**
 * Show RFH mandate upload (incassovolmacht)
 * X-kweker only
 */
export function showMandateUpload(type: string): boolean {
  return type === SupplierType.X_KWEKER
}

/**
 * Whether incoterm is required for purchaser submit
 * Koop + O-kweker: yes, X-kweker: no
 */
export function requiresIncoterm(type: string): boolean {
  return type === SupplierType.KOOP || type === SupplierType.O_KWEKER
}

/**
 * Get list of missing required field names for a given context.
 * Returns field keys (matching validation.fieldNames in translations).
 */
export function getMissingRequiredFields(
  context: 'supplier' | 'purchaser' | 'erp' | 'finance',
  data: Record<string, unknown>,
  supplierType: string,
  region?: string
): string[] {
  const missing: string[] = []
  const isEmpty = (key: string) => !data[key]

  if (context === 'supplier' || context === 'purchaser') {
    // Base fields always required
    const baseFields = ['companyName', 'address', 'postalCode', 'city', 'country', 'contactName', 'contactPhone', 'contactEmail']
    for (const field of baseFields) {
      if (isEmpty(field)) missing.push(field)
    }

    // Financial fields for Koop/O-kweker
    if (showFinancialSection(supplierType)) {
      const financialFields = ['chamberOfCommerceNumber', 'vatNumber', 'iban', 'bankName', 'invoiceCurrency']
      for (const field of financialFields) {
        if (isEmpty(field)) missing.push(field)
      }
    }

    // Director fields for Koop/O-kweker ROW only
    if (showDirectorSection(supplierType) && region === 'ROW') {
      const directorFields = ['directorName', 'directorFunction', 'directorDateOfBirth', 'directorPassportNumber']
      for (const field of directorFields) {
        if (isEmpty(field)) missing.push(field)
      }
    }
  }

  // Purchaser-specific: incoterm
  if (context === 'purchaser') {
    if (requiresIncoterm(supplierType) && isEmpty('incoterm')) {
      missing.push('incoterm')
    }
  }

  // Finance: creditorNumber + postingMatrixFilled + allChecksCompleted
  if (context === 'finance') {
    if (isEmpty('creditorNumber')) missing.push('creditorNumber')
    if (data.postingMatrixFilled !== true) missing.push('postingMatrixFilled')
    if (data.allChecksCompleted !== true) missing.push('allChecksCompleted')
  }

  // ERP: kbtCode
  if (context === 'erp') {
    if (isEmpty('kbtCode')) missing.push('kbtCode')
  }

  return missing
}
