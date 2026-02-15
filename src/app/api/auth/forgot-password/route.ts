import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendPasswordResetEmail } from '@/lib/email'
import type { Language } from '@/lib/i18n'
import { forgotPasswordSchema } from '@/lib/validations'

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }
    const { email } = parsed.data

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: 'If the email address is registered with us, you will receive an email with instructions.',
    })

    // Find active user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.isActive || !user.passwordHash) {
      // Don't reveal whether the user exists
      return successResponse
    }

    // Generate reset token (valid for 1 hour), reuse activationToken field
    const resetToken = uuidv4()
    const resetExpiresAt = new Date()
    resetExpiresAt.setHours(resetExpiresAt.getHours() + 1)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        activationToken: resetToken,
        activationExpiresAt: resetExpiresAt,
      },
    })

    await sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      resetToken,
      expiresAt: resetExpiresAt,
      language: (user.preferredLanguage || 'nl') as Language,
    })

    return successResponse
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
