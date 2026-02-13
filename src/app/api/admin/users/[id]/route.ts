import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendActivationEmail } from '@/lib/email'
import type { Language } from '@/lib/i18n'

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    // Handle resend activation
    if (action === 'resend-activation') {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      if (user.passwordHash) {
        return NextResponse.json({ error: 'Account is already activated' }, { status: 400 })
      }

      const activationToken = uuidv4()
      const activationExpiresAt = new Date()
      activationExpiresAt.setDate(activationExpiresAt.getDate() + 7)

      await prisma.user.update({
        where: { id },
        data: { activationToken, activationExpiresAt },
      })

      await sendActivationEmail({
        to: user.email,
        firstName: user.firstName,
        activationToken,
        expiresAt: activationExpiresAt,
        language: (user.preferredLanguage || 'nl') as Language,
      })

      return NextResponse.json({ success: true })
    }

    // Handle toggle active status
    if (action === 'toggle-active') {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Prevent deactivating yourself
      if (user.id === session.user.id) {
        return NextResponse.json(
          { error: 'You cannot deactivate your own account' },
          { status: 400 }
        )
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive },
      })

      return NextResponse.json({
        id: updated.id,
        isActive: updated.isActive,
      })
    }

    // Regular update (name, roles, receiveEmails, preferredLanguage)
    const updateData: Record<string, unknown> = {}
    if (data.firstName !== undefined) updateData.firstName = data.firstName
    if (data.middleName !== undefined) updateData.middleName = data.middleName || null
    if (data.lastName !== undefined) updateData.lastName = data.lastName
    if (data.roles !== undefined) updateData.roles = data.roles
    if (data.receiveEmails !== undefined) updateData.receiveEmails = data.receiveEmails
    if (data.preferredLanguage !== undefined) updateData.preferredLanguage = data.preferredLanguage

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        roles: true,
        isActive: true,
        receiveEmails: true,
        preferredLanguage: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Soft delete (deactivate) user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete: set isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
