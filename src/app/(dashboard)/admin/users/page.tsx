import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.roles.includes('ADMIN')) {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      middleName: true,
      lastName: true,
      roles: true,
      isActive: true,
      receiveEmails: true,
      createdAt: true,
      passwordHash: true,
      activationToken: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Map to safe data (no passwordHash exposed)
  const safeUsers = users.map(({ passwordHash, activationToken, ...user }) => ({
    ...user,
    isActivated: !!passwordHash,
    hasPendingActivation: !!activationToken,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gebruikersbeheer</h1>
        <p className="text-gray-500">Beheer gebruikers en hun rechten</p>
      </div>

      <UsersTable users={safeUsers} />
    </div>
  )
}
