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
 * Koop + O-kweker with ROW region only
 */
export function showDirectorSection(type: string, region: string): boolean {
  return (type === SupplierType.KOOP || type === SupplierType.O_KWEKER) && region === 'ROW'
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
 * Whether incoterm is required for purchaser submit
 * Koop + O-kweker: yes, X-kweker: no
 */
export function requiresIncoterm(type: string): boolean {
  return type === SupplierType.KOOP || type === SupplierType.O_KWEKER
}
