import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'

const COOKIE_NAME = 'email-provider'
const VALID_PROVIDERS = ['ethereal', 'resend'] as const

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return new NextResponse(null, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const provider = cookieStore.get(COOKIE_NAME)?.value || 'ethereal'

  return NextResponse.json({ provider })
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return new NextResponse(null, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { provider } = body

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Ongeldige provider. Kies "ethereal" of "resend".' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, provider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    })

    return NextResponse.json({ success: true, provider })
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige request body' },
      { status: 400 }
    )
  }
}
