import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  // Fetch requests filtered by user's labels
  const userLabels = session.user.labels || ['COLORIGINZ']
  const requests = await prisma.supplierRequest.findMany({
    where: {
      label: { in: userLabels },
    },
    include: {
      createdBy: {
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
  })

  // Calculate stats
  const stats = {
    total: requests.length,
    waitingSupplier: requests.filter((r) => r.status === 'INVITATION_SENT').length,
    waitingPurchaser: requests.filter((r) => r.status === 'AWAITING_PURCHASER').length,
    waitingFinance: requests.filter((r) => r.status === 'AWAITING_FINANCE').length,
    waitingERP: requests.filter((r) => r.status === 'AWAITING_ERP').length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
    cancelled: requests.filter((r) => r.status === 'CANCELLED').length,
  }

  return (
    <div className="space-y-6">
      <DashboardContent stats={stats} requests={requests} userRoles={session.user.roles} userLabels={userLabels} />
    </div>
  )
}
