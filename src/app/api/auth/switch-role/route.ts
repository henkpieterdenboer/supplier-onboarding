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
    const { roles } = body

    // Validate roles
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { error: 'Minimaal één rol is verplicht' },
        { status: 400 }
      )
    }

    const validRoles = Object.values(Role)
    if (!roles.every((r: string) => validRoles.includes(r as Role))) {
      return NextResponse.json(
        { error: 'Ongeldige rol' },
        { status: 400 }
      )
    }

    // Update user roles in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { roles },
    })

    return NextResponse.json({ success: true, roles })
  } catch (error) {
    console.error('Error switching role:', error)
    return NextResponse.json(
      { error: 'Fout bij wisselen van rol' },
      { status: 500 }
    )
  }
}
