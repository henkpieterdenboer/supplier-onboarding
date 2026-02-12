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
      roles: ['ADMIN'],
      passwordHash,
      isActive: true,
    },
    {
      email: 'inkoper@demo.nl',
      firstName: 'Demo',
      lastName: 'Inkoper',
      roles: ['INKOPER'],
      passwordHash,
      isActive: true,
    },
    {
      email: 'finance@demo.nl',
      firstName: 'Demo',
      lastName: 'Finance',
      roles: ['FINANCE'],
      passwordHash,
      isActive: true,
    },
    {
      email: 'erp@demo.nl',
      firstName: 'Demo',
      lastName: 'ERP',
      roles: ['ERP'],
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
        roles: user.roles,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
      },
      create: user,
    })
    console.log(`Created user: ${user.email}`)
  }

  // Get inkoper user for creating demo requests
  const inkoper = await prisma.user.findUnique({ where: { email: 'inkoper@demo.nl' } })
  if (!inkoper) {
    console.log('Inkoper user not found, skipping demo requests')
    return
  }

  // Create demo requests per type (only if none exist)
  const existingRequests = await prisma.supplierRequest.count()
  if (existingRequests === 0) {
    const demoRequests = [
      {
        supplierName: 'Demo Koop Leverancier',
        supplierEmail: 'koop@demo-supplier.nl',
        region: 'EU',
        supplierType: 'KOOP',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        createdById: inkoper.id,
      },
      {
        supplierName: 'Demo X-kweker',
        supplierEmail: 'xkweker@demo-supplier.nl',
        region: 'EU',
        supplierType: 'X_KWEKER',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        createdById: inkoper.id,
      },
      {
        supplierName: 'Demo O-kweker',
        supplierEmail: 'okweker@demo-supplier.nl',
        region: 'ROW',
        supplierType: 'O_KWEKER',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        createdById: inkoper.id,
      },
    ]

    for (const req of demoRequests) {
      await prisma.supplierRequest.create({ data: req })
      console.log(`Created demo request: ${req.supplierName} (${req.supplierType})`)
    }
  } else {
    console.log(`Skipping demo requests (${existingRequests} requests already exist)`)
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
