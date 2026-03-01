import { jsPDF } from 'jspdf'
import type { SanctionsResult } from '@/lib/sanctions'
import { getLabelConfig } from '@/lib/label-config'

interface SanctionsReportInput {
  sanctionsResult: SanctionsResult
  companyName: string
  directorName: string | null
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
 * Generate a Sanctions Check Report PDF.
 * Returns a Buffer containing the PDF binary data.
 */
export async function generateSanctionsReport(input: SanctionsReportInput): Promise<Buffer> {
  const { sanctionsResult, companyName, directorName, label } = input
  const labelConfig = getLabelConfig(label)

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // --- Company logo ---
  const logo = await fetchLogoAsBase64(labelConfig.logoPath)
  if (logo) {
    const maxLogoWidth = 50
    const maxLogoHeight = 20
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
  doc.text('Sanctions Check Report', margin, y)
  y += 10

  // --- Subtitle with label name ---
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated for ${labelConfig.name}`, margin, y)
  y += 8

  // --- Overall result badge ---
  doc.setTextColor(0, 0, 0)
  const hasMatch = sanctionsResult.companyMatch || sanctionsResult.directorMatch
  const badgeText = hasMatch ? 'MATCH FOUND' : 'NO MATCH'
  const badgeColor: [number, number, number] = hasMatch ? [220, 38, 38] : [34, 139, 34]

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')

  const badgeH = 9
  const badgePadX = 5
  const textW = doc.getTextWidth(badgeText)
  const badgeW = textW + badgePadX * 2
  const capH = 14 * 0.3528 * 0.7
  const textBaseline = y + (badgeH + capH) / 2

  doc.setFillColor(...badgeColor)
  doc.roundedRect(margin, y, badgeW, badgeH, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(badgeText, margin + badgePadX, textBaseline)
  y += badgeH + 6

  // --- Horizontal line ---
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // --- Checked entities ---
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  doc.setFont('helvetica', 'bold')
  doc.text('Company:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(companyName, margin + 55, y)
  y += 6

  if (directorName) {
    doc.setFont('helvetica', 'bold')
    doc.text('Director:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(directorName, margin + 55, y)
    y += 6
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Checked At:', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(sanctionsResult.checkedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC', margin + 55, y)
  y += 10

  // --- Company results ---
  y = renderMatchSection(doc, 'Company Results', sanctionsResult.companyMatch, sanctionsResult.companyResults, margin, y, contentWidth)

  // --- Director results ---
  if (directorName && sanctionsResult.directorResults.length > 0) {
    y = renderMatchSection(doc, 'Director Results', sanctionsResult.directorMatch, sanctionsResult.directorResults, margin, y, contentWidth)
  } else if (directorName) {
    y += 2
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Director Results', margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('No matches found.', margin, y)
    y += 8
  }

  // --- Horizontal line ---
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // --- OpenSanctions reference ---
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text('OpenSanctions — International Sanctions & PEP Database', margin, y)
  y += 5

  const sanctionsUrl = 'https://www.opensanctions.org/'
  doc.setTextColor(37, 99, 235)
  doc.textWithLink(sanctionsUrl, margin, y, { url: sanctionsUrl })
  y += 8

  // --- Disclaimer ---
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  const disclaimer = 'This report was automatically generated based on the OpenSanctions API response. ' +
    'Match scores indicate similarity, not confirmed identity. Results with a score >= 0.70 are flagged as potential matches. ' +
    'For official verification, please consult the relevant sanctions authority directly.'
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth)
  doc.text(disclaimerLines, margin, y)

  // --- Footer ---
  const footerY = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(`Company: ${companyName}${directorName ? ` | Director: ${directorName}` : ''} | ${new Date().toISOString()}`, margin, footerY)

  // Return as Buffer
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

/**
 * Render a match section (Company or Director) with results table.
 */
function renderMatchSection(
  doc: jsPDF,
  title: string,
  hasMatch: boolean,
  results: SanctionsResult['companyResults'],
  margin: number,
  y: number,
  contentWidth: number,
): number {
  // Section title
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(title, margin, y)

  // Match indicator next to title
  const matchText = hasMatch ? 'MATCH' : 'CLEAR'
  const matchColor: [number, number, number] = hasMatch ? [220, 38, 38] : [34, 139, 34]
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const titleWidth = doc.getTextWidth(title)
  doc.setTextColor(...matchColor)

  // Set font size back to 11 to measure title correctly
  doc.setFontSize(11)
  const actualTitleWidth = doc.getTextWidth(title)
  doc.setFontSize(9)
  doc.text(matchText, margin + actualTitleWidth + 5, y)
  y += 7

  if (results.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('No matches found.', margin, y)
    y += 8
    return y
  }

  // Table header
  const colName = margin
  const colScore = margin + 80
  const colDatasets = margin + 100
  const colCountries = margin + contentWidth - 20

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  doc.text('Name', colName, y)
  doc.text('Score', colScore, y)
  doc.text('Datasets', colDatasets, y)
  doc.text('Countries', colCountries, y)
  y += 2

  // Header underline
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(margin, y, margin + contentWidth, y)
  y += 4

  // Table rows
  doc.setFontSize(9)
  for (const result of results) {
    doc.setFont('helvetica', 'normal')

    // Score color based on threshold
    const scoreColor: [number, number, number] = result.score >= 0.7 ? [220, 38, 38] : [100, 100, 100]

    doc.setTextColor(0, 0, 0)
    const nameLines = doc.splitTextToSize(result.name, 75)
    doc.text(nameLines, colName, y)

    doc.setTextColor(...scoreColor)
    doc.setFont('helvetica', 'bold')
    doc.text(`${(result.score * 100).toFixed(0)}%`, colScore, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    const datasetsText = result.datasets.slice(0, 2).join(', ')
    const datasetLines = doc.splitTextToSize(datasetsText, contentWidth - 105)
    doc.text(datasetLines, colDatasets, y)

    doc.text(result.countries.join(', ') || '-', colCountries, y)

    const rowHeight = Math.max(nameLines.length, datasetLines.length) * 4 + 3
    y += rowHeight
  }

  y += 4
  return y
}
