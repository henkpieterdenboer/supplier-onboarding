import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types'

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Niet ingelogd' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !Object.values(Role).includes(role)) {
      return NextResponse.json(
        { error: 'Ongeldige rol' },
        { status: 400 }
      )
    }

    // Update user role in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role },
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('Error switching role:', error)
    return NextResponse.json(
      { error: 'Fout bij wisselen van rol' },
      { status: 500 }
    )
  }
}
