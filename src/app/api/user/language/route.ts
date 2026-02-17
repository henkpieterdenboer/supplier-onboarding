import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { language } = body

  if (language !== 'nl' && language !== 'en' && language !== 'es') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredLanguage: language },
  })

  return NextResponse.json({ success: true })
}
