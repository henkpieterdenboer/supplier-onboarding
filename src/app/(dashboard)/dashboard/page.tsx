import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  // Fetch all requests
  const requests = await prisma.supplierRequest.findMany({
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overzicht van alle leveranciersaanvragen</p>
      </div>

      <DashboardContent stats={stats} requests={requests} userRole={session.user.role} />

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600 font-medium mb-2">Om verstuurde mails te kunnen zien:</p>
        <p className="text-sm text-gray-500 mb-1">
          <a href="https://ethereal.email/login" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            https://ethereal.email/login
          </a>
        </p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li><strong>Email:</strong> dxubywxljl4roleu@ethereal.email</li>
          <li><strong>Wachtwoord:</strong> SbGwM71ZJusSNSQWr3</li>
        </ul>
      </div>
    </div>
  )
}
