import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// POST /api/auth/activate - Activate account with token and password
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

    // Find user by activation token
    const user = await prisma.user.findUnique({
      where: { activationToken: token },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Ongeldige of verlopen activatielink' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (user.activationExpiresAt && new Date() > new Date(user.activationExpiresAt)) {
      return NextResponse.json(
        { error: 'Deze activatielink is verlopen. Neem contact op met de beheerder.' },
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
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
