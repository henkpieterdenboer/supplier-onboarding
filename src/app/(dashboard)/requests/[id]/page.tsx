import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { RequestDetail } from '@/components/requests/request-detail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RequestDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (!session) {
    return null
  }

  const request = await prisma.supplierRequest.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
        },
      },
      files: true,
      auditLogs: {
        include: {
          user: {
            select: {
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!request) {
    notFound()
  }

  // Check label authorization
  const userLabels = session.user.labels || ['COLORIGINZ']
  if (!userLabels.includes(request.label)) {
    notFound()
  }

  return <RequestDetail request={request} userRoles={session.user.roles} userId={session.user.id} />
}
