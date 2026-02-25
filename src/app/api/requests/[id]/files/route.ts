import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AuditAction } from '@/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return `File "${file.name}" exceeds 10MB limit`
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return `File "${file.name}" has invalid type (allowed: PDF, JPG, PNG)`
  return null
}

const uploadToBlob = async (fileName: string, file: File): Promise<string> => {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(fileName, file, { access: 'public', addRandomSuffix: false })
    return blob.url
  }
  return ''
}

// POST /api/requests/[id]/files - Upload a single file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isInkoper = session.user.roles.includes('INKOPER')
    const isFinance = session.user.roles.includes('FINANCE')
    if (!isInkoper && !isFinance) {
      return NextResponse.json({ error: 'Only purchasers or finance can upload files' }, { status: 403 })
    }

    const existingRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      select: { id: true, label: true, status: true },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const userLabels = (session.user.labels || ['COLORIGINZ']) as string[]
    if (!userLabels.includes(existingRequest.label)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedStatuses = ['AWAITING_PURCHASER', 'AWAITING_FINANCE']
    if (!allowedStatuses.includes(existingRequest.status)) {
      return NextResponse.json({ error: 'Files can only be uploaded when awaiting purchaser or finance action' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fileType = formData.get('fileType') as string | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!fileType) {
      return NextResponse.json({ error: 'File type is required' }, { status: 400 })
    }

    const validFileTypes = ['KVK', 'PASSPORT', 'BANK_DETAILS', 'MANDATE_RFH', 'OTHER']
    if (!validFileTypes.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const error = validateFile(file)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const prefix = fileType.toLowerCase()
    const storageName = `${prefix}_${Date.now()}_${file.name}`
    const filePath = `/api/files/${id}/${storageName}`

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await uploadToBlob(`${id}/${storageName}`, file)
    } else {
      const { writeFile, mkdir } = await import('fs/promises')
      const path = await import('path')
      const uploadDir = path.join(process.cwd(), 'uploads', id)
      await mkdir(uploadDir, { recursive: true })
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(uploadDir, storageName), buffer)
    }

    const supplierFile = await prisma.supplierFile.create({
      data: {
        requestId: id,
        fileName: file.name,
        fileType,
        filePath,
        uploadedById: session.user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        requestId: id,
        userId: session.user.id,
        action: AuditAction.FILE_UPLOADED,
        details: JSON.stringify({ fileName: file.name, fileType }),
      },
    })

    return NextResponse.json(supplierFile)
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}

// DELETE /api/requests/[id]/files - Delete a single file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isInkoper = session.user.roles.includes('INKOPER')
    const isFinance = session.user.roles.includes('FINANCE')
    if (!isInkoper && !isFinance) {
      return NextResponse.json({ error: 'Only purchasers or finance can delete files' }, { status: 403 })
    }

    const existingRequest = await prisma.supplierRequest.findUnique({
      where: { id },
      select: { id: true, label: true, status: true },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const userLabels = (session.user.labels || ['COLORIGINZ']) as string[]
    if (!userLabels.includes(existingRequest.label)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const allowedStatuses = ['AWAITING_PURCHASER', 'AWAITING_FINANCE']
    if (!allowedStatuses.includes(existingRequest.status)) {
      return NextResponse.json({ error: 'Files can only be deleted when awaiting purchaser or finance action' }, { status: 400 })
    }

    const body = await request.json()
    const { fileId } = body

    if (!fileId || typeof fileId !== 'string') {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const file = await prisma.supplierFile.findUnique({
      where: { id: fileId },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (file.requestId !== id) {
      return NextResponse.json({ error: 'File does not belong to this request' }, { status: 400 })
    }

    // Delete from storage
    if (process.env.BLOB_READ_WRITE_TOKEN && file.filePath.startsWith('http')) {
      try {
        const { del } = await import('@vercel/blob')
        await del(file.filePath)
      } catch (e) {
        console.error('Error deleting blob file:', e)
      }
    }

    await prisma.supplierFile.delete({ where: { id: fileId } })

    await prisma.auditLog.create({
      data: {
        requestId: id,
        userId: session.user.id,
        action: AuditAction.FILE_DELETED,
        details: JSON.stringify({ fileName: file.fileName, fileType: file.fileType }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
