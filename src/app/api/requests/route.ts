import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendInvitationEmail } from '@/lib/email'
import { AuditAction, Status } from '@/types'
import type { Language } from '@/lib/i18n'
import { createRequestSchema } from '@/lib/validations'

// POST /api/requests - Create new request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.roles.includes('INKOPER')) {
      return NextResponse.json(
        { error: 'Only purchasers can create requests' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { supplierName, supplierEmail, region, selfFill, supplierType, supplierLanguage, label } = parsed.data

    // Validate label (must be in user's labels)
    const userLabels = session.user.labels || ['COLORIGINZ']
    const resolvedLabel = label && userLabels.includes(label)
      ? label
      : userLabels[0] || 'COLORIGINZ'

    // Check for duplicate supplier (name or email)
    const existing = await prisma.supplierRequest.findFirst({
      where: {
        OR: [
          { supplierName: { equals: supplierName } },
          { supplierEmail: { equals: supplierEmail } },
        ],
        status: { not: 'CANCELLED' },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A request already exists for this supplier (name or email)' },
        { status: 400 }
      )
    }

    // Generate invitation token (valid for 2 weeks)
    const invitationToken = uuidv4()
    const invitationExpiresAt = new Date()
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 14)

    // Determine initial status
    const status = selfFill ? Status.AWAITING_PURCHASER : Status.INVITATION_SENT

    // Create request
    const newRequest = await prisma.supplierRequest.create({
      data: {
        supplierName,
        supplierEmail,
        region,
        selfFill,
        supplierType,
        supplierLanguage,
        label: resolvedLabel,
        status,
        createdById: session.user.id,
        invitationToken: selfFill ? null : invitationToken,
        invitationExpiresAt: selfFill ? null : invitationExpiresAt,
        invitationSentAt: selfFill ? null : new Date(),
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        requestId: newRequest.id,
        userId: session.user.id,
        action: AuditAction.REQUEST_CREATED,
        details: JSON.stringify({
          supplierName,
          supplierEmail,
          region,
          selfFill,
          supplierType,
          label: resolvedLabel,
        }),
      },
    })

    // Send invitation email if not self-fill
    let emailPreviewUrl: string | null = null
    if (!selfFill) {
      emailPreviewUrl = await sendInvitationEmail({
        to: supplierEmail,
        supplierName,
        invitationToken,
        expiresAt: invitationExpiresAt,
        language: supplierLanguage as Language,
        label: resolvedLabel,
      })

      // Create audit log for invitation sent
      await prisma.auditLog.create({
        data: {
          requestId: newRequest.id,
          userId: session.user.id,
          action: AuditAction.INVITATION_SENT,
          details: JSON.stringify({
            email: supplierEmail,
            expiresAt: invitationExpiresAt.toISOString(),
          }),
        },
      })
    }

    return NextResponse.json({ ...newRequest, emailPreviewUrl }, { status: 201 })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// GET /api/requests - Get all requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Filter by user's labels
    const userLabels = session.user.labels || ['COLORIGINZ']
    const requests = await prisma.supplierRequest.findMany({
      where: {
        label: { in: userLabels },
      },
      include: {
        createdBy: {
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
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
