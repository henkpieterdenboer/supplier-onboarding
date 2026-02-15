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

function xmlElement(tag: string, value: string | null | undefined, attrs?: string): string {
  if (!value) return ''
  const attrStr = attrs ? ` ${attrs}` : ''
  return `      <${tag}${attrStr}>${escapeXml(value)}</${tag}>\n`
}

export function generateExactXml(request: SupplierRequestForXml): string {
  const hasFinancial = showFinancialSection(request.supplierType)

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n`
  xml += `<eExact xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="eExact-Schema.xsd">\n`
  xml += `  <Accounts>\n`
  xml += `    <Account type="C" code="" status="A">\n`

  // Basic fields
  xml += xmlElement('Name', request.companyName)
  xml += xmlElement('Phone', request.contactPhone)
  xml += xmlElement('Email', request.contactEmail)
  xml += xmlElement('VATNumber', request.vatNumber)
  xml += xmlElement('ChamberOfCommerce', request.chamberOfCommerceNumber)

  if (request.glnNumber) {
    xml += xmlElement('GLNNumber', request.glnNumber)
  }

  if (hasFinancial && request.invoiceEmail) {
    xml += xmlElement('InvoiceEmail', request.invoiceEmail)
  }

  // Payment condition
  if (request.paymentTerm) {
    xml += `      <PaymentCondition code="${escapeXml(request.paymentTerm)}" />\n`
  }

  // Addresses
  const hasMainAddress = request.address || request.postalCode || request.city || request.country
  const hasInvoiceAddress = hasFinancial && (request.invoiceAddress || request.invoicePostalCode || request.invoiceCity)

  if (hasMainAddress || hasInvoiceAddress) {
    xml += `      <Addresses>\n`

    // Main address (type V = Visit/Main)
    if (hasMainAddress) {
      xml += `        <Address type="V">\n`
      if (request.address) xml += `          <AddressLine1>${escapeXml(request.address)}</AddressLine1>\n`
      if (request.postalCode) xml += `          <PostalCode>${escapeXml(request.postalCode)}</PostalCode>\n`
      if (request.city) xml += `          <City>${escapeXml(request.city)}</City>\n`
      if (request.country) xml += `          <Country code="${escapeXml(request.country)}" />\n`
      xml += `        </Address>\n`
    }

    // Invoice address (type P = Postal/Invoice) - only if different from main
    if (hasInvoiceAddress) {
      xml += `        <Address type="P">\n`
      if (request.invoiceAddress) xml += `          <AddressLine1>${escapeXml(request.invoiceAddress)}</AddressLine1>\n`
      if (request.invoicePostalCode) xml += `          <PostalCode>${escapeXml(request.invoicePostalCode)}</PostalCode>\n`
      if (request.invoiceCity) xml += `          <City>${escapeXml(request.invoiceCity)}</City>\n`
      if (request.country) xml += `          <Country code="${escapeXml(request.country)}" />\n`
      xml += `        </Address>\n`
    }

    xml += `      </Addresses>\n`
  }

  // Contact
  if (request.contactName || request.contactPhone || request.contactEmail) {
    xml += `      <Contacts>\n`
    xml += `        <Contact>\n`

    if (request.contactName) {
      // Split contact name into first/last name (best effort)
      const nameParts = request.contactName.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      xml += `          <FirstName>${escapeXml(firstName)}</FirstName>\n`
      if (lastName) xml += `          <LastName>${escapeXml(lastName)}</LastName>\n`
    }

    if (request.contactPhone) xml += `          <Phone>${escapeXml(request.contactPhone)}</Phone>\n`
    if (request.contactEmail) xml += `          <Email>${escapeXml(request.contactEmail)}</Email>\n`
    xml += `        </Contact>\n`
    xml += `      </Contacts>\n`
  }

  // Bank account
  if (hasFinancial && (request.iban || request.bankName)) {
    xml += `      <BankAccounts>\n`
    xml += `        <BankAccount>\n`
    if (request.iban) xml += `          <IBAN>${escapeXml(request.iban)}</IBAN>\n`
    if (request.bankName) xml += `          <BankName>${escapeXml(request.bankName)}</BankName>\n`
    xml += `        </BankAccount>\n`
    xml += `      </BankAccounts>\n`
  }

  xml += `    </Account>\n`
  xml += `  </Accounts>\n`
  xml += `</eExact>\n`

  return xml
}
