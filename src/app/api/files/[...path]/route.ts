import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// GET /api/files/[...path] - Serve uploaded files securely
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    const { path: pathSegments } = await params
    const requestedPath = pathSegments.join('/')

    // Look up the file in the database to verify it exists and get the stored path
    const file = await prisma.supplierFile.findFirst({
      where: {
        filePath: `/api/files/${requestedPath}`,
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 })
    }

    // Vercel Blob: fetch content server-side and proxy it (blob URLs never exposed to browser)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { list } = await import('@vercel/blob')
      const { blobs } = await list({ prefix: requestedPath })

      if (blobs.length > 0) {
        const blobUrl = blobs[0].url
        const response = await fetch(blobUrl)
        if (!response.ok) {
          return NextResponse.json({ error: 'Bestand niet gevonden in storage' }, { status: 404 })
        }

        const blobData = await response.arrayBuffer()
        const ext = path.extname(requestedPath).toLowerCase()
        const contentType = MIME_TYPES[ext] || response.headers.get('content-type') || 'application/octet-stream'
        const fileName = path.basename(requestedPath)

        return new NextResponse(blobData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${fileName}"`,
            'Cache-Control': 'private, no-store',
          },
        })
      }

      return NextResponse.json({ error: 'Bestand niet gevonden in storage' }, { status: 404 })
    }

    // Local development: serve from filesystem
    const filePath = path.join(process.cwd(), 'uploads', ...pathSegments)

    // Prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    const uploadsDir = path.resolve(path.join(process.cwd(), 'uploads'))
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Ongeldig pad' }, { status: 400 })
    }

    const fileBuffer = await readFile(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${path.basename(resolvedPath)}"`,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Bestand niet gevonden' }, { status: 404 })
    }
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
