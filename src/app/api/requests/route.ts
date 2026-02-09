import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendInvitationEmail } from '@/lib/email'
import { AuditAction, Status } from '@/types'

// POST /api/requests - Create new request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    if (session.user.role !== 'INKOPER') {
      return NextResponse.json(
        { error: 'Alleen inkopers kunnen aanvragen aanmaken' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { supplierName, supplierEmail, region, selfFill } = body

    // Validate required fields
    if (!supplierName || !supplierEmail || !region) {
      return NextResponse.json(
        { error: 'Naam, email en regio zijn verplicht' },
        { status: 400 }
      )
    }

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
        { error: 'Er bestaat al een aanvraag voor deze leverancier (naam of email)' },
        { status: 400 }
      )
    }

    // Generate invitation token (valid for 1 week)
    const invitationToken = uuidv4()
    const invitationExpiresAt = new Date()
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7)

    // Determine initial status
    const status = selfFill ? Status.AWAITING_PURCHASER : Status.INVITATION_SENT

    // Create request
    const newRequest = await prisma.supplierRequest.create({
      data: {
        supplierName,
        supplierEmail,
        region,
        selfFill,
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
        }),
      },
    })

    // Send invitation email if not self-fill
    if (!selfFill) {
      await sendInvitationEmail({
        to: supplierEmail,
        supplierName,
        invitationToken,
        expiresAt: invitationExpiresAt,
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

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

// GET /api/requests - Get all requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const requests = await prisma.supplierRequest.findMany({
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
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
