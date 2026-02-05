import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Type definitions for enums (used as strings in SQLite)
const Role = {
  INKOPER: 'INKOPER',
  FINANCE: 'FINANCE',
  ERP: 'ERP',
} as const

async function main() {
  // Hash the demo password
  const passwordHash = await bcrypt.hash('demo123', 10)

  // Create demo users
  const users = [
    {
      email: 'inkoper@demo.nl',
      name: 'Demo Inkoper',
      role: Role.INKOPER,
      passwordHash,
    },
    {
      email: 'finance@demo.nl',
      name: 'Demo Finance',
      role: Role.FINANCE,
      passwordHash,
    },
    {
      email: 'erp@demo.nl',
      name: 'Demo ERP',
      role: Role.ERP,
      passwordHash,
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
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
