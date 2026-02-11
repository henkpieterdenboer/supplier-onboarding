import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { AuditAction, Status } from '@/types'
import {
  sendSupplierConfirmationEmail,
  sendPurchaserNotificationEmail,
} from '@/lib/email'
import { formatUserName } from '@/lib/user-utils'

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
        invitationExpiresAt: true,
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
      },
    })

    if (!supplierRequest) {
      return NextResponse.json(
        { error: 'Ongeldige link. Neem contact op voor een nieuwe uitnodiging.' },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (
      supplierRequest.invitationExpiresAt &&
      new Date() > new Date(supplierRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'Deze link is verlopen. Neem contact op voor een nieuwe uitnodiging.' },
        { status: 410 }
      )
    }

    // Check if already submitted
    if (supplierRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'Het formulier is al ingevuld.' },
        { status: 400 }
      )
    }

    return NextResponse.json(supplierRequest)
  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// POST /api/supplier/[token] - Submit supplier form
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
          },
        },
      },
    })

    if (!supplierRequest) {
      return NextResponse.json(
        { error: 'Ongeldige link' },
        { status: 404 }
      )
    }

    if (
      supplierRequest.invitationExpiresAt &&
      new Date() > new Date(supplierRequest.invitationExpiresAt)
    ) {
      return NextResponse.json(
        { error: 'Deze link is verlopen' },
        { status: 410 }
      )
    }

    if (supplierRequest.status !== 'INVITATION_SENT') {
      return NextResponse.json(
        { error: 'Het formulier is al ingevuld' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const dataJson = formData.get('data') as string
    const data = JSON.parse(dataJson)

    // Handle file uploads - use Vercel Blob in production, local storage in development
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

    // Update request with supplier data
    const updated = await prisma.supplierRequest.update({
      where: { id: supplierRequest.id },
      data: {
        companyName: data.companyName,
        address: data.address,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        chamberOfCommerceNumber: data.chamberOfCommerceNumber,
        vatNumber: data.vatNumber,
        iban: data.iban,
        bankName: data.bankName,
        status: Status.AWAITING_PURCHASER,
        supplierSubmittedAt: new Date(),
        invitationToken: null, // Invalidate token after use
      },
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
    })

    // Notify purchaser (only if they want to receive emails)
    if (supplierRequest.createdBy.receiveEmails) {
      await sendPurchaserNotificationEmail({
        to: supplierRequest.createdBy.email,
        purchaserName: formatUserName(supplierRequest.createdBy) || 'Inkoper',
        supplierName: supplierRequest.supplierName,
        requestId: supplierRequest.id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing supplier submission:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het verwerken van uw gegevens' },
      { status: 500 }
    )
  }
}
