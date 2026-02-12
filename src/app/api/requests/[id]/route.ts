import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuditAction, Status, SupplierType } from '@/types'
import { requiresIncoterm } from '@/lib/supplier-type-utils'
import {
  sendFinanceNotificationEmail,
  sendERPNotificationEmail,
  sendInvitationEmail,
  sendReminderEmail,
  sendCompletionEmail,
} from '@/lib/email'
import { formatUserName } from '@/lib/user-utils'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
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
      return NextResponse.json({ error: 'Aanvraag niet gevonden' }, { status: 404 })
    }

    return NextResponse.json(supplierRequest)
  } catch (error) {
    console.error('Error fetching request:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
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
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
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
          },
        },
      },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Aanvraag niet gevonden' }, { status: 404 })
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
            { error: 'Alleen afgebroken aanvragen kunnen worden heropend' },
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
        type ReminderRecipient = { email: string; name: string }
        let recipients: ReminderRecipient[] = []
        let reminderRole: 'supplier' | 'purchaser' | 'finance' | 'erp' = 'supplier'

        switch (existingRequest.status) {
          case 'INVITATION_SENT':
            // Supplier reminders always send (external party)
            recipients = [{ email: existingRequest.supplierEmail, name: existingRequest.supplierName }]
            reminderRole = 'supplier'
            break
          case 'AWAITING_PURCHASER':
            if (existingRequest.createdBy.receiveEmails) {
              recipients = [{ email: existingRequest.createdBy.email, name: formatUserName(existingRequest.createdBy) || 'Inkoper' }]
            }
            reminderRole = 'purchaser'
            break
          case 'AWAITING_FINANCE': {
            const financeUsers = await prisma.user.findMany({
              where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
              select: { email: true, firstName: true, middleName: true, lastName: true },
            })
            recipients = financeUsers.map(u => ({ email: u.email, name: formatUserName(u) || 'Finance' }))
            reminderRole = 'finance'
            break
          }
          case 'AWAITING_ERP': {
            const erpUsers = await prisma.user.findMany({
              where: { roles: { has: 'ERP' }, isActive: true, receiveEmails: true },
              select: { email: true, firstName: true, middleName: true, lastName: true },
            })
            recipients = erpUsers.map(u => ({ email: u.email, name: formatUserName(u) || 'ERP' }))
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
            { error: 'Alleen inkopers kunnen deze actie uitvoeren' },
            { status: 403 }
          )
        }

        // Type-aware validation: incoterm only required for Koop/O-kweker
        const submitType = (data.supplierType as string) || existingRequest.supplierType || 'KOOP'
        if (requiresIncoterm(submitType) && !data.incoterm) {
          return NextResponse.json(
            { error: 'Incoterm is verplicht voor dit leverancierstype' },
            { status: 400 }
          )
        }

        // Handle file uploads
        const filesToCreate: { fileName: string; fileType: string; filePath: string }[] = []
        const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

        if (formDataObj) {
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

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            ...data,
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
              ...data,
              supplierType: submitType,
              filesUploaded: filesToCreate.length,
            }),
          },
        })

        // Notify Finance users with receiveEmails enabled
        const financeUsersForNotify = await prisma.user.findMany({
          where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
          select: { email: true },
        })
        for (const fu of financeUsersForNotify) {
          await sendFinanceNotificationEmail({
            to: fu.email,
            supplierName: existingRequest.supplierName,
            requestId: id,
          })
        }

        return NextResponse.json(updated)
      }

      case 'finance-submit': {
        // FINANCE submits creditor number
        if (!session.user.roles.includes('FINANCE')) {
          return NextResponse.json(
            { error: 'Alleen Finance kan deze actie uitvoeren' },
            { status: 403 }
          )
        }

        if (!data.creditorNumber) {
          return NextResponse.json(
            { error: 'Crediteurnummer is verplicht' },
            { status: 400 }
          )
        }

        // Check for duplicate creditor number
        const existingCreditor = await prisma.supplierRequest.findFirst({
          where: {
            creditorNumber: data.creditorNumber,
            id: { not: id },
          },
        })

        if (existingCreditor) {
          return NextResponse.json(
            { error: 'Dit crediteurnummer is al in gebruik' },
            { status: 400 }
          )
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            creditorNumber: data.creditorNumber,
            status: Status.AWAITING_ERP,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.FINANCE_SUBMITTED,
            details: JSON.stringify({ creditorNumber: data.creditorNumber }),
          },
        })

        // Notify ERP users with receiveEmails enabled
        const erpUsersForNotify = await prisma.user.findMany({
          where: { roles: { has: 'ERP' }, isActive: true, receiveEmails: true },
          select: { email: true },
        })
        for (const eu of erpUsersForNotify) {
          await sendERPNotificationEmail({
            to: eu.email,
            supplierName: existingRequest.supplierName,
            requestId: id,
          })
        }

        return NextResponse.json(updated)
      }

      case 'erp-submit': {
        // ERP submits KBT code
        if (!session.user.roles.includes('ERP')) {
          return NextResponse.json(
            { error: 'Alleen ERP kan deze actie uitvoeren' },
            { status: 403 }
          )
        }

        if (!data.kbtCode) {
          return NextResponse.json(
            { error: 'KBT-code is verplicht' },
            { status: 400 }
          )
        }

        // Check for duplicate KBT code
        const existingKbt = await prisma.supplierRequest.findFirst({
          where: {
            kbtCode: data.kbtCode,
            id: { not: id },
          },
        })

        if (existingKbt) {
          return NextResponse.json(
            { error: 'Deze KBT-code is al in gebruik' },
            { status: 400 }
          )
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            kbtCode: data.kbtCode,
            status: Status.COMPLETED,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.ERP_SUBMITTED,
            details: JSON.stringify({ kbtCode: data.kbtCode }),
          },
        })

        // Send completion email to Finance users and Purchaser (respecting receiveEmails)
        const financeUsersForCompletion = await prisma.user.findMany({
          where: { roles: { has: 'FINANCE' }, isActive: true, receiveEmails: true },
          select: { email: true },
        })
        await sendCompletionEmail({
          financeEmails: financeUsersForCompletion.map(u => u.email),
          purchaserEmail: existingRequest.createdBy.receiveEmails ? existingRequest.createdBy.email : null,
          purchaserName: formatUserName(existingRequest.createdBy) || 'Inkoper',
          supplierName: existingRequest.supplierName,
          requestId: id,
          creditorNumber: existingRequest.creditorNumber || '',
          kbtCode: data.kbtCode as string,
        })

        return NextResponse.json(updated)
      }

      case 'change-type': {
        // INKOPER can change supplier type
        if (!session.user.roles.includes('INKOPER')) {
          return NextResponse.json(
            { error: 'Alleen inkopers kunnen het type wijzigen' },
            { status: 403 }
          )
        }

        const newType = data.supplierType as string
        const validTypes = Object.values(SupplierType)
        if (!newType || !validTypes.includes(newType as SupplierType)) {
          return NextResponse.json(
            { error: 'Ongeldig leverancierstype' },
            { status: 400 }
          )
        }

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
        return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
