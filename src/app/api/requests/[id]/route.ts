import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuditAction, Status } from '@/types'
import { requiresIncoterm } from '@/lib/supplier-type-utils'
import {
  sendFinanceNotificationEmail,
  sendERPNotificationEmail,
  sendInvitationEmail,
  sendReminderEmail,
  sendCompletionEmail,
} from '@/lib/email'
import { formatUserName } from '@/lib/user-utils'
import type { Language } from '@/lib/i18n'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { purchaserSubmitSchema, financeSubmitSchema, erpSubmitSchema, changeTypeSchema } from '@/lib/validations'

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

// GET /api/requests/[id] - Get single request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
          },
        },
        files: true,
        auditLogs: {
          include: {
            user: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!supplierRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check label authorization
    const userLabels = session.user.labels || ['COLORIGINZ']
    if (!userLabels.includes(supplierRequest.label)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(supplierRequest)
  } catch (error) {
    console.error('Error fetching request:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// PATCH /api/requests/[id] - Update request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Support both JSON and FormData (for file uploads)
    let action: string
    let data: Record<string, unknown>
    let formDataObj: FormData | null = null

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      formDataObj = await request.formData()
      const dataJson = formDataObj.get('data') as string
      const parsed = JSON.parse(dataJson)
      action = parsed.action
      const { action: _, ...rest } = parsed
      data = rest
    } else {
      const body = await request.json()
      action = body.action
      const { action: _, ...rest } = body
      data = rest
    }

    const existingRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            receiveEmails: true,
            preferredLanguage: true,
          },
        },
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Handle different actions
    switch (action) {
      case 'cancel': {
        // Any role can cancel
        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: { status: Status.CANCELLED },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.REQUEST_CANCELLED,
          },
        })

        return NextResponse.json(updated)
      }

      case 'reopen': {
        // Any role can reopen a cancelled request
        if (existingRequest.status !== 'CANCELLED') {
          return NextResponse.json(
            { error: 'Only cancelled requests can be reopened' },
            { status: 400 }
          )
        }

        // Determine new status based on what's been filled
        let newStatus: string = Status.INVITATION_SENT
        if (existingRequest.supplierSubmittedAt || existingRequest.selfFill) {
          newStatus = Status.AWAITING_PURCHASER
        }
        // Check if purchaser has submitted (type-aware: incoterm only required for Koop/O-kweker)
        const needsIncoterm = requiresIncoterm(existingRequest.supplierType)
        const purchaserDone = needsIncoterm ? !!existingRequest.incoterm : true
        if (purchaserDone && (existingRequest.supplierSubmittedAt || existingRequest.selfFill) && newStatus === Status.AWAITING_PURCHASER) {
          // Only advance if purchaser actually submitted (status was AWAITING_FINANCE before cancel)
          if (existingRequest.incoterm || existingRequest.accountManager || existingRequest.paymentTerm) {
            newStatus = Status.AWAITING_FINANCE
          }
        }
        if (existingRequest.creditorNumber) {
          newStatus = Status.AWAITING_ERP
        }
        if (existingRequest.kbtCode) {
          newStatus = Status.COMPLETED
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: { status: newStatus },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.REQUEST_REOPENED,
            details: JSON.stringify({ newStatus }),
          },
        })

        return NextResponse.json(updated)
      }

      case 'resend-invitation': {
        // Generate new token (valid for 2 weeks)
        const invitationToken = uuidv4()
        const invitationExpiresAt = new Date()
        invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 14)

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            invitationToken,
            invitationExpiresAt,
            invitationSentAt: new Date(),
          },
        })

        await sendInvitationEmail({
          to: existingRequest.supplierEmail,
          supplierName: existingRequest.supplierName,
          invitationToken,
          expiresAt: invitationExpiresAt,
          language: (existingRequest.supplierLanguage || 'nl') as Language,
          label: existingRequest.label,
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.INVITATION_RESENT,
            details: JSON.stringify({
              email: existingRequest.supplierEmail,
              expiresAt: invitationExpiresAt.toISOString(),
            }),
          },
        })

        return NextResponse.json(updated)
      }

      case 'send-reminder': {
        // Determine recipients based on current status
        type ReminderRecipient = { email: string; name: string; language: Language }
        let recipients: ReminderRecipient[] = []
        let reminderRole: 'supplier' | 'purchaser' | 'finance' | 'erp' = 'supplier'

        switch (existingRequest.status) {
          case 'INVITATION_SENT':
            // Supplier reminders always send (external party)
            recipients = [{ email: existingRequest.supplierEmail, name: existingRequest.supplierName, language: (existingRequest.supplierLanguage || 'nl') as Language }]
            reminderRole = 'supplier'
            break
          case 'AWAITING_PURCHASER':
            if (existingRequest.createdBy.receiveEmails) {
              recipients = [{ email: existingRequest.createdBy.email, name: formatUserName(existingRequest.createdBy) || 'Inkoper', language: (existingRequest.createdBy.preferredLanguage || 'nl') as Language }]
            }
            reminderRole = 'purchaser'
            break
          case 'AWAITING_FINANCE': {
            const financeUsers = await prisma.user.findMany({
              where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
              select: { email: true, firstName: true, middleName: true, lastName: true, preferredLanguage: true },
            })
            recipients = financeUsers.map(u => ({ email: u.email, name: formatUserName(u) || 'Finance', language: (u.preferredLanguage || 'nl') as Language }))
            reminderRole = 'finance'
            break
          }
          case 'AWAITING_ERP': {
            const erpUsers = await prisma.user.findMany({
              where: { roles: { has: 'ERP' }, isActive: true, receiveEmails: true },
              select: { email: true, firstName: true, middleName: true, lastName: true, preferredLanguage: true },
            })
            recipients = erpUsers.map(u => ({ email: u.email, name: formatUserName(u) || 'ERP', language: (u.preferredLanguage || 'nl') as Language }))
            reminderRole = 'erp'
            break
          }
        }

        for (const recipient of recipients) {
          await sendReminderEmail({
            to: recipient.email,
            recipientName: recipient.name,
            supplierName: existingRequest.supplierName,
            requestId: id,
            role: reminderRole,
            invitationToken: existingRequest.invitationToken || undefined,
            language: recipient.language,
            label: existingRequest.label,
          })
        }

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.REMINDER_SENT,
            details: JSON.stringify({
              emails: recipients.map(r => r.email),
              role: reminderRole,
            }),
          },
        })

        return NextResponse.json({ success: true })
      }

      case 'purchaser-submit': {
        // INKOPER submits after filling additional data
        if (!session.user.roles.includes('INKOPER')) {
          return NextResponse.json(
            { error: 'Only purchasers can perform this action' },
            { status: 403 }
          )
        }

        if (existingRequest.status !== Status.AWAITING_PURCHASER) {
          return NextResponse.json(
            { error: 'This request is not awaiting purchaser action' },
            { status: 400 }
          )
        }

        // Validate purchaser data with Zod
        const parsedPurchaser = purchaserSubmitSchema.safeParse(data)
        if (!parsedPurchaser.success) {
          return NextResponse.json(
            { error: parsedPurchaser.error.issues[0]?.message || 'Invalid input' },
            { status: 400 }
          )
        }
        const validatedData = parsedPurchaser.data

        // Type-aware validation: incoterm only required for Koop/O-kweker
        const submitType = validatedData.supplierType || existingRequest.supplierType || 'KOOP'
        if (requiresIncoterm(submitType) && !validatedData.incoterm) {
          return NextResponse.json(
            { error: 'Incoterm is required for this supplier type' },
            { status: 400 }
          )
        }

        // Handle file uploads
        const filesToCreate: { fileName: string; fileType: string; filePath: string }[] = []
        const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

        if (formDataObj) {
          // Validate all files before uploading
          const filesToValidate = [
            formDataObj.get('kvk') as File | null,
            formDataObj.get('passport') as File | null,
            formDataObj.get('bankDetails') as File | null,
          ].filter((f): f is File => f !== null && f.size > 0)

          for (const file of filesToValidate) {
            const error = validateFile(file)
            if (error) {
              return NextResponse.json({ error }, { status: 400 })
            }
          }

          const kvkFile = formDataObj.get('kvk') as File | null
          if (kvkFile && kvkFile.size > 0) {
            const fileName = `kvk_${Date.now()}_${kvkFile.name}`
            const filePath = `/api/files/${id}/${fileName}`

            if (useVercelBlob) {
              await uploadToBlob(`${id}/${fileName}`, kvkFile)
            } else {
              const uploadDir = path.join(process.cwd(), 'uploads', id)
              await mkdir(uploadDir, { recursive: true })
              const buffer = Buffer.from(await kvkFile.arrayBuffer())
              await writeFile(path.join(uploadDir, fileName), buffer)
            }

            filesToCreate.push({ fileName: kvkFile.name, fileType: 'KVK', filePath })
          }

          const passportFile = formDataObj.get('passport') as File | null
          if (passportFile && passportFile.size > 0) {
            const fileName = `passport_${Date.now()}_${passportFile.name}`
            const filePath = `/api/files/${id}/${fileName}`

            if (useVercelBlob) {
              await uploadToBlob(`${id}/${fileName}`, passportFile)
            } else {
              const uploadDir = path.join(process.cwd(), 'uploads', id)
              await mkdir(uploadDir, { recursive: true })
              const buffer = Buffer.from(await passportFile.arrayBuffer())
              await writeFile(path.join(uploadDir, fileName), buffer)
            }

            filesToCreate.push({ fileName: passportFile.name, fileType: 'PASSPORT', filePath })
          }

          const bankDetailsFile = formDataObj.get('bankDetails') as File | null
          if (bankDetailsFile && bankDetailsFile.size > 0) {
            const fileName = `bank_${Date.now()}_${bankDetailsFile.name}`
            const filePath = `/api/files/${id}/${fileName}`

            if (useVercelBlob) {
              await uploadToBlob(`${id}/${fileName}`, bankDetailsFile)
            } else {
              const uploadDir = path.join(process.cwd(), 'uploads', id)
              await mkdir(uploadDir, { recursive: true })
              const buffer = Buffer.from(await bankDetailsFile.arrayBuffer())
              await writeFile(path.join(uploadDir, fileName), buffer)
            }

            filesToCreate.push({ fileName: bankDetailsFile.name, fileType: 'BANK_DETAILS', filePath })
          }
        }

        // Create file records
        for (const file of filesToCreate) {
          await prisma.supplierFile.create({
            data: {
              requestId: id,
              ...file,
            },
          })
        }

        // Build update data from validated fields (fall back to existing values)
        const purchaserData = {
          companyName: validatedData.companyName ?? existingRequest.companyName,
          address: validatedData.address ?? existingRequest.address,
          postalCode: validatedData.postalCode ?? existingRequest.postalCode,
          city: validatedData.city ?? existingRequest.city,
          country: validatedData.country ?? existingRequest.country,
          contactName: validatedData.contactName ?? existingRequest.contactName,
          contactPhone: validatedData.contactPhone ?? existingRequest.contactPhone,
          contactEmail: validatedData.contactEmail ?? existingRequest.contactEmail,
          chamberOfCommerceNumber: validatedData.chamberOfCommerceNumber ?? existingRequest.chamberOfCommerceNumber,
          vatNumber: validatedData.vatNumber ?? existingRequest.vatNumber,
          iban: validatedData.iban ?? existingRequest.iban,
          bankName: validatedData.bankName ?? existingRequest.bankName,
          glnNumber: validatedData.glnNumber ?? existingRequest.glnNumber,
          invoiceEmail: validatedData.invoiceEmail ?? existingRequest.invoiceEmail,
          invoiceAddress: validatedData.invoiceAddress ?? existingRequest.invoiceAddress,
          invoicePostalCode: validatedData.invoicePostalCode ?? existingRequest.invoicePostalCode,
          invoiceCity: validatedData.invoiceCity ?? existingRequest.invoiceCity,
          invoiceCurrency: validatedData.invoiceCurrency ?? existingRequest.invoiceCurrency,
          directorName: validatedData.directorName ?? existingRequest.directorName,
          directorFunction: validatedData.directorFunction ?? existingRequest.directorFunction,
          directorDateOfBirth: validatedData.directorDateOfBirth ?? existingRequest.directorDateOfBirth,
          directorPassportNumber: validatedData.directorPassportNumber ?? existingRequest.directorPassportNumber,
          incoterm: validatedData.incoterm ?? existingRequest.incoterm,
          commissionPercentage: validatedData.commissionPercentage ?? existingRequest.commissionPercentage,
          paymentTerm: validatedData.paymentTerm ?? existingRequest.paymentTerm,
          accountManager: validatedData.accountManager ?? existingRequest.accountManager,
          auctionNumberRFH: validatedData.auctionNumberRFH ?? existingRequest.auctionNumberRFH,
          salesSheetEmail: validatedData.salesSheetEmail ?? existingRequest.salesSheetEmail,
          mandateRFH: validatedData.mandateRFH ?? existingRequest.mandateRFH,
          apiKeyFloriday: validatedData.apiKeyFloriday ?? existingRequest.apiKeyFloriday,
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            ...purchaserData,
            supplierType: submitType,
            status: Status.AWAITING_FINANCE,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.PURCHASER_SUBMITTED,
            details: JSON.stringify({
              supplierType: submitType,
              filesUploaded: filesToCreate.length,
            }),
          },
        })

        // Notify Finance users with receiveEmails enabled
        const financeUsersForNotify = await prisma.user.findMany({
          where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
          select: { email: true, preferredLanguage: true },
        })
        for (const fu of financeUsersForNotify) {
          await sendFinanceNotificationEmail({
            to: fu.email,
            supplierName: existingRequest.supplierName,
            requestId: id,
            language: (fu.preferredLanguage || 'nl') as Language,
            label: existingRequest.label,
          })
        }

        return NextResponse.json(updated)
      }

      case 'finance-submit': {
        // FINANCE submits creditor number
        if (!session.user.roles.includes('FINANCE')) {
          return NextResponse.json(
            { error: 'Only Finance can perform this action' },
            { status: 403 }
          )
        }

        if (existingRequest.status !== Status.AWAITING_FINANCE) {
          return NextResponse.json(
            { error: 'This request is not awaiting Finance action' },
            { status: 400 }
          )
        }

        const parsedFinance = financeSubmitSchema.safeParse(data)
        if (!parsedFinance.success) {
          return NextResponse.json(
            { error: parsedFinance.error.issues[0]?.message || 'Invalid input' },
            { status: 400 }
          )
        }
        const { creditorNumber } = parsedFinance.data

        // Check for duplicate creditor number
        const existingCreditor = await prisma.supplierRequest.findFirst({
          where: {
            creditorNumber,
            id: { not: id },
          },
        })

        if (existingCreditor) {
          return NextResponse.json(
            { error: 'This creditor number is already in use' },
            { status: 400 }
          )
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            creditorNumber,
            status: Status.AWAITING_ERP,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.FINANCE_SUBMITTED,
            details: JSON.stringify({ creditorNumber }),
          },
        })

        // Notify ERP users with receiveEmails enabled
        const erpUsersForNotify = await prisma.user.findMany({
          where: { roles: { has: 'ERP' }, isActive: true, receiveEmails: true },
          select: { email: true, preferredLanguage: true },
        })
        for (const eu of erpUsersForNotify) {
          await sendERPNotificationEmail({
            to: eu.email,
            supplierName: existingRequest.supplierName,
            requestId: id,
            language: (eu.preferredLanguage || 'nl') as Language,
            label: existingRequest.label,
          })
        }

        return NextResponse.json(updated)
      }

      case 'erp-submit': {
        // ERP submits KBT code
        if (!session.user.roles.includes('ERP')) {
          return NextResponse.json(
            { error: 'Only ERP can perform this action' },
            { status: 403 }
          )
        }

        if (existingRequest.status !== Status.AWAITING_ERP) {
          return NextResponse.json(
            { error: 'This request is not awaiting ERP action' },
            { status: 400 }
          )
        }

        const parsedErp = erpSubmitSchema.safeParse(data)
        if (!parsedErp.success) {
          return NextResponse.json(
            { error: parsedErp.error.issues[0]?.message || 'Invalid input' },
            { status: 400 }
          )
        }
        const { kbtCode } = parsedErp.data

        // Check for duplicate KBT code
        const existingKbt = await prisma.supplierRequest.findFirst({
          where: {
            kbtCode,
            id: { not: id },
          },
        })

        if (existingKbt) {
          return NextResponse.json(
            { error: 'This KBT code is already in use' },
            { status: 400 }
          )
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            kbtCode,
            status: Status.COMPLETED,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.ERP_SUBMITTED,
            details: JSON.stringify({ kbtCode }),
          },
        })

        // Send completion email to Finance users and Purchaser (respecting receiveEmails)
        const financeUsersForCompletion = await prisma.user.findMany({
          where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
          select: { email: true, preferredLanguage: true },
        })
        await sendCompletionEmail({
          financeEmails: financeUsersForCompletion.map(u => u.email),
          purchaserEmail: existingRequest.createdBy.receiveEmails ? existingRequest.createdBy.email : null,
          purchaserName: formatUserName(existingRequest.createdBy) || 'Inkoper',
          supplierName: existingRequest.supplierName,
          requestId: id,
          creditorNumber: existingRequest.creditorNumber || '',
          kbtCode,
          language: (existingRequest.createdBy.preferredLanguage || 'nl') as Language,
          label: existingRequest.label,
        })

        return NextResponse.json(updated)
      }

      case 'change-type': {
        // INKOPER can change supplier type
        if (!session.user.roles.includes('INKOPER')) {
          return NextResponse.json(
            { error: 'Only purchasers can change the type' },
            { status: 403 }
          )
        }

        const parsedType = changeTypeSchema.safeParse(data)
        if (!parsedType.success) {
          return NextResponse.json(
            { error: parsedType.error.issues[0]?.message || 'Invalid supplier type' },
            { status: 400 }
          )
        }
        const { supplierType: newType } = parsedType.data

        const updatedType = await prisma.supplierRequest.update({
          where: { id },
          data: { supplierType: newType },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.SUPPLIER_TYPE_CHANGED,
            details: JSON.stringify({
              oldType: existingRequest.supplierType,
              newType,
            }),
          },
        })

        return NextResponse.json(updatedType)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
