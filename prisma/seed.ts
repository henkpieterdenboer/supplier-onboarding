import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Hash the demo password
  const passwordHash = await bcrypt.hash('demo123', 10)

  // Create demo users
  const users = [
    {
      email: 'admin@demo.nl',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ADMIN',
      passwordHash,
      isActive: true,
    },
    {
      email: 'inkoper@demo.nl',
      firstName: 'Demo',
      lastName: 'Inkoper',
      role: 'INKOPER',
      passwordHash,
      isActive: true,
    },
    {
      email: 'finance@demo.nl',
      firstName: 'Demo',
      lastName: 'Finance',
      role: 'FINANCE',
      passwordHash,
      isActive: true,
    },
    {
      email: 'erp@demo.nl',
      firstName: 'Demo',
      lastName: 'ERP',
      role: 'ERP',
      passwordHash,
      isActive: true,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
      },
      create: user,
    })
    console.log(`Created user: ${user.email}`)
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
