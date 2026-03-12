import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { AuditAction, Status } from '@/types'
import {
  sendSupplierConfirmationEmail,
  sendPurchaserNotificationEmail,
  sendSupplierSaveEmail,
} from '@/lib/email'
import { formatUserName } from '@/lib/user-utils'
import type { Language } from '@/lib/i18n'
import { supplierFormSchema } from '@/lib/validations'
import { checkVat } from '@/lib/vies'
import { generateViesReport } from '@/lib/vies-pdf'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `File "${file.name}" exceeds 10MB limit`
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return `File "${file.name}" has invalid type (allowed: PDF, JPG, PNG)`
  return null
}

const uploadToBlob = async (fileName: string, file: File): Promise<string> => {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(fileName, file, { access: 'public', addRandomSuffix: false })
    return blob.url
  }
  return ''
}

// GET /api/customer/[token] - Validate token and get request info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const customerRequest = await prisma.supplierRequest.findUnique({
      where: { invitationToken: token },
      select: {
        id: true,
        supplierName: true,
        supplierEmail: true,
        region: true,
        status: true,
        relationType: true,
        label: true,
        invitationExpiresAt: true,
        supplierSavedAt: true,
        companyName: true,
        address: true,
        postalCode: true,
        city: true,
        country: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        chamberOfCommerceNumber: true,
        vatNumber: true,
        iban: true,
        bankName: true,
        glnNumber: true,
        invoiceEmail: true,
        invoiceAddress: true,
        invoicePostalCode: true,
        invoiceCity: true,
        invoiceCurrency: true,
        directorName: true,
        directorFunction: true,
        directorDateOfBirth: true,
        directorPassportNumber: true,
        supplierLanguage: true,
      },
    })

    if (!customerRequest) {
      return NextResponse.json(
        { error: 'Invalid link. Please contact us for a new invitation.' },
        { status: 404 }
      )
    }

    // Verify this is a customer request
    if (customerRequest.relationType !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Invalid link.' },
        { status: 404 }
      )
    }

    if (
      customerRequest.invitationExpiresAt &&
      new Date() > new Date(customerRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This link has expired. Please contact us for a new invitation.' },
        { status: 410 }
      )
    }

    if (customerRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'The form has already been submitted.' },
        { status: 400 }
      )
    }

    return NextResponse.json(customerRequest)
  } catch (error) {
    console.error('Error validating customer token:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/customer/[token] - Submit or save customer form
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const customerRequest = await prisma.supplierRequest.findUnique({
      where: { invitationToken: token },
      include: {
        createdBy: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            receiveEmails: true,
            preferredLanguage: true,
          },
        },
      },
    })

    if (!customerRequest) {
      return NextResponse.json(
        { error: 'Invalid link' },
        { status: 404 }
      )
    }

    // Verify this is a customer request
    if (customerRequest.relationType !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Invalid link' },
        { status: 404 }
      )
    }

    if (
      customerRequest.invitationExpiresAt &&
      new Date() > new Date(customerRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 410 }
      )
    }

    if (customerRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'The form has already been submitted' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const dataJson = formData.get('data') as string
    let rawData: unknown
    try {
      rawData = JSON.parse(dataJson)
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const parsed = supplierFormSchema.safeParse(rawData)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const data = parsed.data
    const action = data.action

    // Handle file uploads
    const filesToCreate: { fileName: string; fileType: string; filePath: string }[] = []
    const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

    // Validate all files before uploading
    const filesToValidate = [
      formData.get('kvk') as File | null,
      formData.get('passport') as File | null,
      formData.get('bankDetails') as File | null,
    ].filter((f): f is File => f !== null && f.size > 0)

    for (const file of filesToValidate) {
      const fileError = validateFile(file)
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 })
      }
    }

    const kvkFile = formData.get('kvk') as File | null
    if (kvkFile) {
      const fileName = `kvk_${Date.now()}_${kvkFile.name}`
      const filePath = `/api/files/${customerRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${customerRequest.id}/${fileName}`, kvkFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', customerRequest.id)
        await mkdir(uploadDir, { recursive: true })
        const buffer = Buffer.from(await kvkFile.arrayBuffer())
        const localPath = path.join(uploadDir, fileName)
        await writeFile(localPath, buffer)
      }

      filesToCreate.push({
        fileName: kvkFile.name,
        fileType: 'KVK',
        filePath,
      })
    }

    const passportFile = formData.get('passport') as File | null
    if (passportFile) {
      const fileName = `passport_${Date.now()}_${passportFile.name}`
      const filePath = `/api/files/${customerRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${customerRequest.id}/${fileName}`, passportFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', customerRequest.id)
        await mkdir(uploadDir, { recursive: true })
        const buffer = Buffer.from(await passportFile.arrayBuffer())
        const localPath = path.join(uploadDir, fileName)
        await writeFile(localPath, buffer)
      }

      filesToCreate.push({
        fileName: passportFile.name,
        fileType: 'PASSPORT',
        filePath,
      })
    }

    const bankFile = formData.get('bankDetails') as File | null
    if (bankFile) {
      const fileName = `bank_${Date.now()}_${bankFile.name}`
      const filePath = `/api/files/${customerRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${customerRequest.id}/${fileName}`, bankFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', customerRequest.id)
        await mkdir(uploadDir, { recursive: true })
        const buffer = Buffer.from(await bankFile.arrayBuffer())
        const localPath = path.join(uploadDir, fileName)
        await writeFile(localPath, buffer)
      }

      filesToCreate.push({
        fileName: bankFile.name,
        fileType: 'BANK_DETAILS',
        filePath,
      })
    }

    // Common data fields to update
    const updateData: Record<string, unknown> = {
      companyName: data.companyName || null,
      address: data.address || null,
      postalCode: data.postalCode || null,
      city: data.city || null,
      country: data.country || null,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      chamberOfCommerceNumber: data.chamberOfCommerceNumber || null,
      vatNumber: data.vatNumber || null,
      iban: data.iban || null,
      bankName: data.bankName || null,
      glnNumber: data.glnNumber || null,
      invoiceEmail: data.invoiceEmail || null,
      invoiceAddress: data.invoiceAddress || null,
      invoicePostalCode: data.invoicePostalCode || null,
      invoiceCity: data.invoiceCity || null,
      invoiceCurrency: data.invoiceCurrency || null,
      directorName: data.directorName || null,
      directorFunction: data.directorFunction || null,
      directorDateOfBirth: data.directorDateOfBirth || null,
      directorPassportNumber: data.directorPassportNumber || null,
    }

    if (action === 'save') {
      updateData.supplierSavedAt = new Date()

      await prisma.supplierRequest.update({
        where: { id: customerRequest.id },
        data: updateData,
      })

      for (const file of filesToCreate) {
        await prisma.supplierFile.create({
          data: {
            requestId: customerRequest.id,
            ...file,
          },
        })
      }

      await prisma.auditLog.create({
        data: {
          requestId: customerRequest.id,
          action: AuditAction.CUSTOMER_SAVED,
          details: JSON.stringify({ filesUploaded: filesToCreate.length }),
        },
      })

      // Send "continue later" email
      if (customerRequest.invitationExpiresAt) {
        await sendSupplierSaveEmail({
          to: customerRequest.supplierEmail,
          supplierName: customerRequest.supplierName,
          invitationToken: token,
          expiresAt: new Date(customerRequest.invitationExpiresAt),
          language: (customerRequest.supplierLanguage || 'nl') as Language,
          label: customerRequest.label,
          relationType: 'CUSTOMER',
        })
      }

      return NextResponse.json({ success: true, saved: true })
    } else {
      // Submit: validate required fields
      const baseRequired = ['companyName', 'address', 'postalCode', 'city', 'country', 'contactName', 'contactPhone', 'contactEmail']
      const financialRequired = ['chamberOfCommerceNumber', 'vatNumber', 'iban', 'bankName', 'invoiceCurrency']
      const missingFields: string[] = []

      for (const field of [...baseRequired, ...financialRequired]) {
        if (!data[field as keyof typeof data]) missingFields.push(field)
      }

      // Director fields required for ROW
      if (customerRequest.region === 'ROW') {
        const directorRequired = ['directorName', 'directorFunction', 'directorDateOfBirth', 'directorPassportNumber']
        for (const field of directorRequired) {
          if (!data[field as keyof typeof data]) missingFields.push(field)
        }
      }

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: `Required fields missing: ${missingFields.join(', ')}` },
          { status: 400 }
        )
      }

      // VIES check for EU customers with vatNumber
      let viesResultForPdf: Awaited<ReturnType<typeof checkVat>> = null
      if (customerRequest.region === 'EU' && data.vatNumber) {
        try {
          const viesResult = await checkVat(data.vatNumber)
          if (viesResult) {
            updateData.vatValid = viesResult.isValid
            updateData.vatCheckResponse = JSON.stringify(viesResult)
            updateData.vatCheckedAt = new Date()
            if (viesResult.isValid) {
              viesResultForPdf = viesResult
            }
          }
        } catch {
          // VIES failure should not block submission
        }
      }

      updateData.status = Status.AWAITING_PURCHASER
      updateData.supplierSubmittedAt = new Date()
      updateData.invitationToken = null

      await prisma.supplierRequest.update({
        where: { id: customerRequest.id },
        data: updateData,
      })

      for (const file of filesToCreate) {
        await prisma.supplierFile.create({
          data: {
            requestId: customerRequest.id,
            ...file,
          },
        })
      }

      // Generate VIES PDF report if valid
      if (viesResultForPdf && data.vatNumber) {
        try {
          const pdfBuffer = await generateViesReport({
            viesResult: viesResultForPdf,
            supplierName: customerRequest.supplierName,
            vatNumber: data.vatNumber,
            label: customerRequest.label,
          })

          const fileName = `vies_report_${Date.now()}.pdf`
          let filePath = `/api/files/${customerRequest.id}/${fileName}`

          if (process.env.BLOB_READ_WRITE_TOKEN) {
            const { put } = await import('@vercel/blob')
            const blob = await put(`${customerRequest.id}/${fileName}`, pdfBuffer, {
              access: 'public',
              addRandomSuffix: false,
            })
            filePath = blob.url
          }

          await prisma.supplierFile.create({
            data: {
              requestId: customerRequest.id,
              fileName: `VIES_Report_${viesResultForPdf.countryCode}${viesResultForPdf.vatNumber}.pdf`,
              fileType: 'VIES_REPORT',
              filePath,
            },
          })
        } catch (error) {
          console.error('Error generating VIES report on customer submit:', error)
        }
      }

      await prisma.auditLog.create({
        data: {
          requestId: customerRequest.id,
          action: AuditAction.CUSTOMER_SUBMITTED,
          details: JSON.stringify({
            filesUploaded: filesToCreate.length,
          }),
        },
      })

      // Send confirmation email to customer
      await sendSupplierConfirmationEmail({
        to: customerRequest.supplierEmail,
        supplierName: customerRequest.supplierName,
        language: (customerRequest.supplierLanguage || 'nl') as Language,
        label: customerRequest.label,
      })

      // Notify sales person (only if they want to receive emails)
      if (customerRequest.createdBy.receiveEmails) {
        await sendPurchaserNotificationEmail({
          to: customerRequest.createdBy.email,
          purchaserName: formatUserName(customerRequest.createdBy) || 'Verkoper',
          supplierName: customerRequest.supplierName,
          requestId: customerRequest.id,
          language: (customerRequest.createdBy.preferredLanguage || 'nl') as Language,
          label: customerRequest.label,
        })
      }

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Error processing customer submission:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your data' },
      { status: 500 }
    )
  }
}
