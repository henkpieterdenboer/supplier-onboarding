// Generates eExact XML for Exact Globe (desktop ERP) import.
// Format based on actual Globe export analysis (feb 2026):
// - type="S" (Supplier) — NOT "C" (that's Customer in Globe)
// - Addresses nested inside <Contact>, not under <Account>
// - BankAccounts nested inside <Creditor> with BankAccountType code="IBA" for IBAN
// - Country codes must be ISO 2-letter (NL, DE, ZA, etc.)
// - Globe validates VAT number checksums — invalid ones cause import rejection

import { showFinancialSection } from '@/lib/supplier-type-utils'

interface SupplierRequestForXml {
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
  paymentTerm: string | null
  creditorNumber: string | null
  supplierType: string
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Derive ISO 2-letter country code from IBAN (first 2 characters)
function countryFromIban(iban: string): string | null {
  const clean = iban.replace(/\s/g, '')
  if (clean.length >= 2 && /^[A-Z]{2}/.test(clean)) {
    return clean.substring(0, 2)
  }
  return null
}

export function generateExactXml(request: SupplierRequestForXml): string {
  const hasFinancial = showFinancialSection(request.supplierType)
  const code = request.creditorNumber || ''

  let xml = `<?xml version="1.0" ?>\n`
  xml += `<eExact xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="eExact-Schema.xsd">\n`
  xml += `<Accounts>\n`
  xml += ` <Account code="${escapeXml(code)}" status="A" type="S">\n`

  // Basic fields
  if (request.companyName) xml += `  <Name>${escapeXml(request.companyName)}</Name>\n`
  if (request.contactPhone) xml += `  <Phone>${escapeXml(request.contactPhone)}</Phone>\n`
  if (request.contactEmail) xml += `  <Email>${escapeXml(request.contactEmail)}</Email>\n`
  if (request.vatNumber) xml += `  <VATNumber>${escapeXml(request.vatNumber)}</VATNumber>\n`
  if (request.chamberOfCommerceNumber) xml += `  <ChamberOfCommerce>${escapeXml(request.chamberOfCommerceNumber)}</ChamberOfCommerce>\n`
  if (request.glnNumber) xml += `  <GLNNumber>${escapeXml(request.glnNumber)}</GLNNumber>\n`

  // Contact with addresses nested inside
  xml += `  <Contacts>\n`
  xml += `   <Contact default="1" status="A">\n`

  if (request.contactName) {
    const nameParts = request.contactName.trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
    if (lastName) xml += `    <LastName>${escapeXml(lastName)}</LastName>\n`
    xml += `    <FirstName>${escapeXml(firstName)}</FirstName>\n`
  }

  // Addresses inside Contact (Globe format)
  const hasMainAddress = request.address || request.postalCode || request.city || request.country
  const hasInvoiceAddress = hasFinancial && (request.invoiceAddress || request.invoicePostalCode || request.invoiceCity)

  if (hasMainAddress || hasInvoiceAddress) {
    xml += `    <Addresses>\n`

    // Main address (type V = Visit)
    if (hasMainAddress) {
      xml += `     <Address type="V" desc="">\n`
      xml += `      <AddressLine1>${escapeXml(request.address || '')}</AddressLine1>\n`
      xml += `      <PostalCode>${escapeXml(request.postalCode || '')}</PostalCode>\n`
      xml += `      <City>${escapeXml(request.city || '')}</City>\n`
      if (request.country) xml += `      <Country code="${escapeXml(request.country)}"/>\n`
      xml += `     </Address>\n`
    }

    // Invoice address (type P = Postal)
    if (hasInvoiceAddress) {
      xml += `     <Address type="P" desc="">\n`
      xml += `      <AddressLine1>${escapeXml(request.invoiceAddress || '')}</AddressLine1>\n`
      xml += `      <PostalCode>${escapeXml(request.invoicePostalCode || '')}</PostalCode>\n`
      xml += `      <City>${escapeXml(request.invoiceCity || '')}</City>\n`
      if (request.country) xml += `      <Country code="${escapeXml(request.country)}"/>\n`
      xml += `     </Address>\n`
    }

    xml += `    </Addresses>\n`
  }

  if (request.contactPhone) xml += `    <Phone>${escapeXml(request.contactPhone)}</Phone>\n`
  if (request.contactEmail) xml += `    <Email>${escapeXml(request.contactEmail)}</Email>\n`

  xml += `   </Contact>\n`
  xml += `  </Contacts>\n`

  // Creditor element with bank accounts inside
  xml += `  <Creditor number="${escapeXml(code)}" code="${escapeXml(code)}">\n`
  xml += `   <Currency code="EUR"/>\n`

  // Bank accounts inside Creditor (Globe format)
  if (hasFinancial && request.iban) {
    const iban = request.iban.replace(/\s/g, '')
    const ibanCountry = countryFromIban(iban)

    xml += `   <BankAccounts>\n`
    xml += `    <BankAccount code="${escapeXml(iban)}" default="1">\n`
    xml += `     <BankAccountType code="IBA" checktype="M">\n`
    xml += `      <Description>IBAN International Bank Account Number</Description>\n`
    xml += `     </BankAccountType>\n`
    xml += `     <Currency code="EUR"/>\n`
    xml += `     <Bank code="">\n`
    if (request.bankName) xml += `      <Name>${escapeXml(request.bankName)}</Name>\n`
    if (ibanCountry) xml += `      <Country code="${escapeXml(ibanCountry)}"/>\n`
    xml += `      <IBAN>${escapeXml(iban)}</IBAN>\n`
    xml += `     </Bank>\n`
    if (ibanCountry) {
      xml += `     <Address>\n`
      xml += `      <Country code="${escapeXml(ibanCountry)}"/>\n`
      xml += `     </Address>\n`
    }
    xml += `    </BankAccount>\n`
    xml += `   </BankAccounts>\n`
  }

  xml += `  </Creditor>\n`

  // Payment condition
  if (request.paymentTerm) {
    xml += `  <PaymentCondition code="${escapeXml(request.paymentTerm)}"/>\n`
  }

  xml += ` </Account>\n`
  xml += `</Accounts>\n`
  xml += `</eExact>\n`

  return xml
}
