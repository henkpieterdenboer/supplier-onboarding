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

// Dynamic import for Vercel Blob (only used in production)
const uploadToBlob = async (fileName: string, file: File): Promise<string> => {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(fileName, file, { access: 'public', addRandomSuffix: false })
    return blob.url
  }
  return ''
}

// GET /api/supplier/[token] - Validate token and get request info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const supplierRequest = await prisma.supplierRequest.findUnique({
      where: { invitationToken: token },
      select: {
        id: true,
        supplierName: true,
        supplierEmail: true,
        region: true,
        status: true,
        supplierType: true,
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
        auctionNumberRFH: true,
        salesSheetEmail: true,
        mandateRFH: true,
        apiKeyFloriday: true,
        supplierLanguage: true,
      },
    })

    if (!supplierRequest) {
      return NextResponse.json(
        { error: 'Invalid link. Please contact us for a new invitation.' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (
      supplierRequest.invitationExpiresAt &&
      new Date() > new Date(supplierRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This link has expired. Please contact us for a new invitation.' },
        { status: 410 }
      )
    }

    // Check if already submitted (but allow re-access when saved)
    if (supplierRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'The form has already been submitted.' },
        { status: 400 }
      )
    }

    return NextResponse.json(supplierRequest)
  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/supplier/[token] - Submit or save supplier form
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token first
    const supplierRequest = await prisma.supplierRequest.findUnique({
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

    if (!supplierRequest) {
      return NextResponse.json(
        { error: 'Invalid link' },
        { status: 404 }
      )
    }

    if (
      supplierRequest.invitationExpiresAt &&
      new Date() > new Date(supplierRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'This link has expired' },
        { status: 410 }
      )
    }

    if (supplierRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'The form has already been submitted' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const dataJson = formData.get('data') as string
    const data = JSON.parse(dataJson)

    // Determine action: 'save' or 'submit' (default: 'submit' for backward compat)
    const action = data.action || 'submit'

    // Handle file uploads
    const filesToCreate: { fileName: string; fileType: string; filePath: string }[] = []
    const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

    const kvkFile = formData.get('kvk') as File | null
    if (kvkFile) {
      const fileName = `kvk_${Date.now()}_${kvkFile.name}`
      const filePath = `/api/files/${supplierRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${supplierRequest.id}/${fileName}`, kvkFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', supplierRequest.id)
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
      const filePath = `/api/files/${supplierRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${supplierRequest.id}/${fileName}`, passportFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', supplierRequest.id)
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
      const filePath = `/api/files/${supplierRequest.id}/${fileName}`

      if (useVercelBlob) {
        await uploadToBlob(`${supplierRequest.id}/${fileName}`, bankFile)
      } else {
        const uploadDir = path.join(process.cwd(), 'uploads', supplierRequest.id)
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
      // Financial fields (Koop + O-kweker)
      invoiceEmail: data.invoiceEmail || null,
      invoiceAddress: data.invoiceAddress || null,
      invoicePostalCode: data.invoicePostalCode || null,
      invoiceCity: data.invoiceCity || null,
      invoiceCurrency: data.invoiceCurrency || null,
      // Director fields (Koop + O-kweker, ROW)
      directorName: data.directorName || null,
      directorFunction: data.directorFunction || null,
      directorDateOfBirth: data.directorDateOfBirth || null,
      directorPassportNumber: data.directorPassportNumber || null,
      // Auction fields (X-kweker)
      auctionNumberRFH: data.auctionNumberRFH || null,
      salesSheetEmail: data.salesSheetEmail || null,
      mandateRFH: data.mandateRFH ?? null,
      apiKeyFloriday: data.apiKeyFloriday || null,
    }

    if (action === 'save') {
      // Save: update fields, keep token valid, do NOT change status
      updateData.supplierSavedAt = new Date()

      await prisma.supplierRequest.update({
        where: { id: supplierRequest.id },
        data: updateData,
      })

      // Create file records
      for (const file of filesToCreate) {
        await prisma.supplierFile.create({
          data: {
            requestId: supplierRequest.id,
            ...file,
          },
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          requestId: supplierRequest.id,
          action: AuditAction.SUPPLIER_SAVED,
          details: JSON.stringify({ filesUploaded: filesToCreate.length }),
        },
      })

      // Send "continue later" email
      if (supplierRequest.invitationExpiresAt) {
        await sendSupplierSaveEmail({
          to: supplierRequest.supplierEmail,
          supplierName: supplierRequest.supplierName,
          invitationToken: token,
          expiresAt: new Date(supplierRequest.invitationExpiresAt),
          language: (supplierRequest.supplierLanguage || 'nl') as Language,
        })
      }

      return NextResponse.json({ success: true, saved: true })
    } else {
      // Submit: existing behavior — status change, invalidate token
      updateData.status = Status.AWAITING_PURCHASER
      updateData.supplierSubmittedAt = new Date()
      updateData.invitationToken = null // Invalidate token after use

      await prisma.supplierRequest.update({
        where: { id: supplierRequest.id },
        data: updateData,
      })

      // Create file records
      for (const file of filesToCreate) {
        await prisma.supplierFile.create({
          data: {
            requestId: supplierRequest.id,
            ...file,
          },
        })
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          requestId: supplierRequest.id,
          action: AuditAction.SUPPLIER_SUBMITTED,
          details: JSON.stringify({
            filesUploaded: filesToCreate.length,
          }),
        },
      })

      // Send confirmation email to supplier
      await sendSupplierConfirmationEmail({
        to: supplierRequest.supplierEmail,
        supplierName: supplierRequest.supplierName,
        language: (supplierRequest.supplierLanguage || 'nl') as Language,
      })

      // Notify purchaser (only if they want to receive emails)
      if (supplierRequest.createdBy.receiveEmails) {
        await sendPurchaserNotificationEmail({
          to: supplierRequest.createdBy.email,
          purchaserName: formatUserName(supplierRequest.createdBy) || 'Inkoper',
          supplierName: supplierRequest.supplierName,
          requestId: supplierRequest.id,
          language: (supplierRequest.createdBy.preferredLanguage || 'nl') as Language,
        })
      }

      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Error processing supplier submission:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your data' },
      { status: 500 }
    )
  }
}
