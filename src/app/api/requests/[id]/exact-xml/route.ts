import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateExactXml } from '@/lib/exact-xml'

// GET /api/requests/[id]/exact-xml - Generate eExact XML for Exact Globe import
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRoles = session.user.roles as string[]
    if (!userRoles.includes('FINANCE') && !userRoles.includes('INKOPER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supplierRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      select: {
        label: true,
        companyName: true,
        address: true,
        postalCode: true,
        city: true,
        country: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        chamberOfCommerceNumber: true,
        vatNumber: true,
        iban: true,
        bankName: true,
        glnNumber: true,
        invoiceEmail: true,
        invoiceAddress: true,
        invoicePostalCode: true,
        invoiceCity: true,
        paymentTerm: true,
        supplierType: true,
      },
    })

    if (!supplierRequest) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Label authorization
    const userLabels = session.user.labels as string[]
    if (!userLabels.includes(supplierRequest.label)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supplierRequest.companyName) {
      return NextResponse.json({ error: 'No supplier data available' }, { status: 400 })
    }

    const xml = generateExactXml(supplierRequest)

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('Error generating Exact XML:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
