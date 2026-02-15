import { NextRequest, NextResponse } from 'next/server'
import { checkVat, parseVatNumber } from '@/lib/vies'

// POST /api/vies - Check VAT number against VIES
// Public endpoint (no auth needed - used from supplier form)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vatNumber } = body

    if (!vatNumber || typeof vatNumber !== 'string') {
      return NextResponse.json(
        { error: 'VAT number is required' },
        { status: 400 }
      )
    }

    const parsed = parseVatNumber(vatNumber)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid VAT number format. Must start with a valid EU country code.' },
        { status: 400 }
      )
    }

    const result = await checkVat(vatNumber)

    if (!result) {
      return NextResponse.json(
        { error: 'VIES service is currently unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
