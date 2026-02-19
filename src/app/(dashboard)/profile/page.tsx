import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from '@/components/dashboard/profile-form'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      preferredLanguage: true,
      receiveEmails: true,
    },
  })

  if (!user) {
    return null
  }

  return (
    <ProfileForm
      initialLanguage={user.preferredLanguage || 'nl'}
      initialReceiveEmails={user.receiveEmails}
    />
  )
}
