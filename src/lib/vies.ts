// VIES VAT number validation utility
// https://ec.europa.eu/taxation_customs/vies/rest-api/

export interface ViesResult {
  isValid: boolean
  name: string
  address: string
  requestDate: string
  userError: string
  vatNumber: string
  countryCode: string
  requestIdentifier: string
}

// EU country codes that VIES supports
const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
  'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
  'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI', // XI = Northern Ireland
]

/**
 * Parse a VAT number into country code and number.
 * Strips spaces, dots, and dashes.
 * Returns null if the format is invalid.
 */
export function parseVatNumber(vatNumber: string): { countryCode: string; number: string } | null {
  // Strip whitespace, dots, dashes
  const cleaned = vatNumber.replace(/[\s.\-]/g, '').toUpperCase()

  if (cleaned.length < 4) return null

  const countryCode = cleaned.substring(0, 2)
  const number = cleaned.substring(2)

  if (!EU_COUNTRY_CODES.includes(countryCode)) return null
  if (!number) return null

  return { countryCode, number }
}

/**
 * Check a VAT number against the VIES API.
 * Returns the VIES result or null if the API is unreachable.
 */
export async function checkVat(vatNumber: string): Promise<ViesResult | null> {
  const parsed = parseVatNumber(vatNumber)
  if (!parsed) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${parsed.countryCode}/vat/${parsed.number}`,
      { signal: controller.signal }
    )

    clearTimeout(timeout)

    if (!response.ok) return null

    const data = await response.json()

    return {
      isValid: data.isValid === true,
      name: data.name || '',
      address: data.address || '',
      requestDate: data.requestDate || '',
      userError: data.userError || '',
      vatNumber: data.vatNumber || parsed.number,
      countryCode: parsed.countryCode,
      requestIdentifier: data.requestIdentifier || '',
    }
  } catch {
    // Network error, timeout, etc.
    return null
  }
}
