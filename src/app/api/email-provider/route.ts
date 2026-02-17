import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'

const PROVIDER_COOKIE = 'email-provider'
const EMAIL_COOKIE = 'demo-email-target'
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
  const provider = cookieStore.get(PROVIDER_COOKIE)?.value || 'ethereal'
  const demoEmail = cookieStore.get(EMAIL_COOKIE)?.value || null

  return NextResponse.json({ provider, demoEmail })
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
    const { provider, demoEmail } = body

    // At least one field must be provided
    if (provider === undefined && demoEmail === undefined) {
      return NextResponse.json(
        { error: 'Geef minimaal provider of demoEmail mee.' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    }

    // Update provider cookie if provided
    if (provider !== undefined) {
      if (!VALID_PROVIDERS.includes(provider)) {
        return NextResponse.json(
          { error: 'Ongeldige provider. Kies "ethereal" of "resend".' },
          { status: 400 }
        )
      }
      cookieStore.set(PROVIDER_COOKIE, provider, cookieOptions)
    }

    // Update demo email cookie if provided
    if (demoEmail !== undefined) {
      if (demoEmail && typeof demoEmail === 'string' && demoEmail.trim()) {
        cookieStore.set(EMAIL_COOKIE, demoEmail.trim(), cookieOptions)
      } else {
        // Empty/null → remove cookie
        cookieStore.delete(EMAIL_COOKIE)
      }
    }

    const currentProvider = provider || cookieStore.get(PROVIDER_COOKIE)?.value || 'ethereal'
    const currentEmail = cookieStore.get(EMAIL_COOKIE)?.value || null

    return NextResponse.json({ success: true, provider: currentProvider, demoEmail: currentEmail })
  } catch {
    return NextResponse.json(
      { error: 'Ongeldige request body' },
      { status: 400 }
    )
  }
}
