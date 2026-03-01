import { jsPDF } from 'jspdf'
import type { ViesResult } from '@/lib/vies'
import { getLabelConfig } from '@/lib/label-config'

interface ViesReportInput {
  viesResult: ViesResult
  supplierName: string
  vatNumber: string
  label: string
}

/**
 * Fetch a logo from a public URL and return as base64 data URL for jsPDF.
 * Returns null if the fetch fails.
 */
async function fetchLogoAsBase64(logoPath: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
    const url = `${appUrl}${logoPath}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/png'
    const format = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG'
    const dataUrl = `data:${contentType};base64,${base64}`

    return { dataUrl, format }
  } catch {
    return null
  }
}

/**
 * Generate a VIES VAT Validation Report PDF.
 * Returns a Buffer containing the PDF binary data.
 */
export async function generateViesReport(input: ViesReportInput): Promise<Buffer> {
  const { viesResult, supplierName, vatNumber, label } = input
  const labelConfig = getLabelConfig(label)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // --- Company logo ---
  const logo = await fetchLogoAsBase64(labelConfig.logoPath)
  if (logo) {
    // Scale logo to max 50mm wide, proportional height
    const maxLogoWidth = 50
    const maxLogoHeight = 20
    // Use a reasonable aspect ratio based on known configs
    const aspectRatio = labelConfig.emailLogoWidth / labelConfig.emailLogoHeight
    let logoWidth = maxLogoWidth
    let logoHeight = logoWidth / aspectRatio
    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight
      logoWidth = logoHeight * aspectRatio
    }
    doc.addImage(logo.dataUrl, logo.format, margin, y, logoWidth, logoHeight)
    y += logoHeight + 5
  }

  // --- Title ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('VIES VAT Validation Report', margin, y)
  y += 10

  // --- Subtitle with label name ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated for ${labelConfig.name}`, margin, y)
  y += 4
  doc.text(`Supplier: ${supplierName}`, margin, y)
  y += 8

  // --- Result badge ---
  doc.setTextColor(0, 0, 0)
  const isValid = viesResult.isValid
  const badgeText = isValid ? 'VALID' : 'INVALID'
  const badgeColor: [number, number, number] = isValid ? [34, 139, 34] : [220, 38, 38]

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')

  const badgeH = 9
  const badgePadX = 5
  const textW = doc.getTextWidth(badgeText)
  const badgeW = textW + badgePadX * 2
  // Cap-height ~35% of font size in mm (14pt * 0.3528mm/pt * 0.7)
  const capH = 14 * 0.3528 * 0.7
  const textBaseline = y + (badgeH + capH) / 2

  // Draw badge background
  doc.setFillColor(...badgeColor)
  doc.roundedRect(margin, y, badgeW, badgeH, 2, 2, 'F')

  // Draw badge text centered
  doc.setTextColor(255, 255, 255)
  doc.text(badgeText, margin + badgePadX, textBaseline)
  y += badgeH + 6

  // --- Horizontal line ---
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // --- Data fields ---
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  const fields: [string, string][] = [
    ['VAT Number', `${viesResult.countryCode}${viesResult.vatNumber}`],
    ['Country Code', viesResult.countryCode],
    ['Company Name (VIES)', viesResult.name || '-'],
    ['Address (VIES)', viesResult.address || '-'],
    ['Request Date', viesResult.requestDate || '-'],
    ['Consultation Number', viesResult.requestIdentifier || '-'],
    ['Checked At', new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'],
  ]

  for (const [fieldLabel, value] of fields) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${fieldLabel}:`, margin, y)

    doc.setFont('helvetica', 'normal')
    // Handle multiline addresses
    const labelWidth = 55
    const valueLines = doc.splitTextToSize(value, contentWidth - labelWidth)
    doc.text(valueLines, margin + labelWidth, y)
    y += Math.max(valueLines.length * 5, 6)
  }

  y += 6

  // --- Horizontal line ---
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // --- EU VIES reference ---
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('European Commission - VIES VAT Number Validation', margin, y)
  y += 5

  // Link to VIES web checker
  const viesUrl = 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation'
  doc.setTextColor(37, 99, 235)
  doc.textWithLink(viesUrl, margin, y, { url: viesUrl })
  y += 8

  // --- Disclaimer ---
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  const disclaimer = 'This report was automatically generated based on the VIES API response. ' +
    'For official verification, please use the European Commission VIES web service directly.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth)
  doc.text(disclaimerLines, margin, y)

  // --- Footer with input VAT number ---
  const footerY = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Input: ${vatNumber} | ${new Date().toISOString()}`, margin, footerY)

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
