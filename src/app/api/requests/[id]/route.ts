import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuditAction, Status } from '@/types'
import {
  sendFinanceNotificationEmail,
  sendERPNotificationEmail,
  sendInvitationEmail,
  sendReminderEmail,
  sendCompletionEmail,
} from '@/lib/email'
import { formatUserName } from '@/lib/user-utils'
import { v4 as uuidv4 } from 'uuid'

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

    const body = await request.json()
    const { action, ...data } = body

    const existingRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      include: {
        createdBy: true,
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
        if (existingRequest.incoterm && existingRequest.commissionPercentage !== null) {
          newStatus = Status.AWAITING_FINANCE
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
        // Generate new token
        const invitationToken = uuidv4()
        const invitationExpiresAt = new Date()
        invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7)

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
        const { reminderTarget } = body

        // Determine recipient based on current status
        let reminderEmail = ''
        let reminderName = ''
        let reminderRole: 'supplier' | 'purchaser' | 'finance' | 'erp' = 'supplier'

        switch (existingRequest.status) {
          case 'INVITATION_SENT':
            reminderEmail = existingRequest.supplierEmail
            reminderName = existingRequest.supplierName
            reminderRole = 'supplier'
            break
          case 'AWAITING_PURCHASER':
            reminderEmail = existingRequest.createdBy.email
            reminderName = formatUserName(existingRequest.createdBy) || 'Inkoper'
            reminderRole = 'purchaser'
            break
          case 'AWAITING_FINANCE':
            // In real app, get Finance team email from settings
            reminderEmail = 'finance@demo.nl'
            reminderName = 'Finance Team'
            reminderRole = 'finance'
            break
          case 'AWAITING_ERP':
            // In real app, get ERP team email from settings
            reminderEmail = 'erp@demo.nl'
            reminderName = 'ERP Team'
            reminderRole = 'erp'
            break
        }

        if (reminderTarget) {
          reminderEmail = reminderTarget
        }

        await sendReminderEmail({
          to: reminderEmail,
          recipientName: reminderName,
          supplierName: existingRequest.supplierName,
          requestId: id,
          role: reminderRole,
          invitationToken: existingRequest.invitationToken || undefined,
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.REMINDER_SENT,
            details: JSON.stringify({
              email: reminderEmail,
              role: reminderRole,
            }),
          },
        })

        return NextResponse.json({ success: true })
      }

      case 'purchaser-submit': {
        // INKOPER submits after filling additional data
        if (session.user.role !== 'INKOPER') {
          return NextResponse.json(
            { error: 'Alleen inkopers kunnen deze actie uitvoeren' },
            { status: 403 }
          )
        }

        // Check for required fields
        if (!data.incoterm || data.commissionPercentage === undefined) {
          return NextResponse.json(
            { error: 'Incoterm en commissiepercentage zijn verplicht' },
            { status: 400 }
          )
        }

        const updated = await prisma.supplierRequest.update({
          where: { id },
          data: {
            ...data,
            status: Status.AWAITING_FINANCE,
          },
        })

        await prisma.auditLog.create({
          data: {
            requestId: id,
            userId: session.user.id,
            action: AuditAction.PURCHASER_SUBMITTED,
            details: JSON.stringify(data),
          },
        })

        // Notify Finance
        await sendFinanceNotificationEmail({
          to: 'finance@demo.nl', // In real app, get from settings
          supplierName: existingRequest.supplierName,
          requestId: id,
        })

        return NextResponse.json(updated)
      }

      case 'finance-submit': {
        // FINANCE submits creditor number
        if (session.user.role !== 'FINANCE') {
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

        // Notify ERP
        await sendERPNotificationEmail({
          to: 'erp@demo.nl', // In real app, get from settings
          supplierName: existingRequest.supplierName,
          requestId: id,
        })

        return NextResponse.json(updated)
      }

      case 'erp-submit': {
        // ERP submits KBT code
        if (session.user.role !== 'ERP') {
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

        // Send completion email to Finance and Purchaser
        await sendCompletionEmail({
          financeEmail: 'finance@demo.nl', // In real app, get from settings
          purchaserEmail: existingRequest.createdBy.email,
          purchaserName: formatUserName(existingRequest.createdBy) || 'Inkoper',
          supplierName: existingRequest.supplierName,
          requestId: id,
          creditorNumber: existingRequest.creditorNumber || '',
          kbtCode: data.kbtCode,
        })

        return NextResponse.json(updated)
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
