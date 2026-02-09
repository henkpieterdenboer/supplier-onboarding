import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token en wachtwoord zijn verplicht' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Wachtwoord moet minimaal 6 tekens bevatten' },
        { status: 400 }
      )
    }

    // Find user by activation token (reused for password reset)
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Ongeldige of verlopen resetlink' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (user.activationExpiresAt && new Date() > new Date(user.activationExpiresAt)) {
      return NextResponse.json(
        { error: 'Deze resetlink is verlopen. Vraag een nieuwe aan.' },
        { status: 410 }
      )
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        activationToken: null,
        activationExpiresAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
