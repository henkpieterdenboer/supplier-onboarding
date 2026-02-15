import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { activateSchema } from '@/lib/validations'

// POST /api/auth/activate - Activate account with token and password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = activateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { token, password } = parsed.data

    // Find user by activation token
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired activation link' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (user.activationExpiresAt && new Date() > new Date(user.activationExpiresAt)) {
      return NextResponse.json(
        { error: 'This activation link has expired. Please contact the administrator.' },
        { status: 410 }
      )
    }

    // Hash password and activate account
    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        isActive: true,
        activationToken: null,
        activationExpiresAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error activating account:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
