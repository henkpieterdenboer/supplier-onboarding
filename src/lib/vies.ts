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
  serviceUnavailable: boolean
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

    // 4xx = invalid number/format, return as invalid (not unavailable)
    if (response.status >= 400 && response.status < 500) {
      return {
        isValid: false,
        name: '',
        address: '',
        requestDate: '',
        userError: '',
        vatNumber: parsed.number,
        countryCode: parsed.countryCode,
        requestIdentifier: '',
        serviceUnavailable: false,
      }
    }

    // 5xx = actual service issue
    if (!response.ok) return null

    const data = await response.json()

    // VIES userError values:
    // "VALID" / "INVALID" = normal responses (not service issues)
    // "MS_UNAVAILABLE", "TIMEOUT", "MS_MAX_CONCURRENT_REQ" etc. = actual service issues
    const userError = data.userError || ''
    const normalResponses = ['', 'VALID', 'INVALID']
    const serviceUnavailable = !!(userError && !normalResponses.includes(userError) && data.isValid !== true)

    return {
      isValid: data.isValid === true,
      name: data.name || '',
      address: data.address || '',
      requestDate: data.requestDate || '',
      userError,
      vatNumber: data.vatNumber || parsed.number,
      countryCode: parsed.countryCode,
      requestIdentifier: data.requestIdentifier || '',
      serviceUnavailable,
    }
  } catch {
    // Network error, timeout, etc.
    return null
  }
}
