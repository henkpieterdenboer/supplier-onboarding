import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendActivationEmail } from '@/lib/email'
import type { Language } from '@/lib/i18n'
import { createUserSchema } from '@/lib/validations'

// GET /api/admin/users - List all users
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        roles: true,
        labels: true,
        isActive: true,
        receiveEmails: true,
        preferredLanguage: true,
        createdAt: true,
        passwordHash: true,
        activationToken: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Map to hide passwordHash but indicate if account is activated
    const mapped = users.map(({ passwordHash, activationToken, ...user }) => ({
      ...user,
      isActivated: !!passwordHash,
      hasPendingActivation: !!activationToken,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { email, firstName, middleName, lastName, roles, labels, receiveEmails, preferredLanguage } = parsed.data

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 400 }
      )
    }

    // Generate activation token (valid for 7 days)
    const activationToken = uuidv4()
    const activationExpiresAt = new Date()
    activationExpiresAt.setDate(activationExpiresAt.getDate() + 7)

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        middleName: middleName || null,
        lastName,
        roles,
        labels,
        receiveEmails,
        preferredLanguage,
        isActive: false,
        activationToken,
        activationExpiresAt,
      },
    })

    // Send activation email
    await sendActivationEmail({
      to: email,
      firstName,
      activationToken,
      expiresAt: activationExpiresAt,
      language: (preferredLanguage || 'nl') as Language,
    })

    // Audit log
    console.log(JSON.stringify({
      audit: true,
      action: 'USER_CREATED',
      targetUser: email,
      performedBy: session.user.email,
      details: { roles, labels },
      timestamp: new Date().toISOString(),
    }))

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
      receiveEmails: user.receiveEmails,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
