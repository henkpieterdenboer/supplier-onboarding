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
      labels: ['COLORIGINZ', 'PFC'],
      passwordHash,
      isActive: true,
      preferredLanguage: 'nl',
    },
    {
      email: 'commercie@demo.nl',
      firstName: 'Demo',
      lastName: 'Commercie',
      roles: ['COMMERCIE'],
      labels: ['COLORIGINZ', 'PFC'],
      relationTypes: ['SUPPLIER', 'CUSTOMER'],
      passwordHash,
      isActive: true,
      preferredLanguage: 'nl',
    },
    {
      email: 'finance@demo.nl',
      firstName: 'Demo',
      lastName: 'Finance',
      roles: ['FINANCE'],
      labels: ['COLORIGINZ', 'PFC'],
      passwordHash,
      isActive: true,
      preferredLanguage: 'nl',
    },
    {
      email: 'erp@demo.nl',
      firstName: 'Demo',
      lastName: 'ERP',
      roles: ['ERP'],
      labels: ['COLORIGINZ', 'PFC'],
      passwordHash,
      isActive: true,
      preferredLanguage: 'nl',
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        labels: user.labels,
        passwordHash: user.passwordHash,
        isActive: user.isActive,
      },
      create: user,
    })
    console.log(`Created user: ${user.email}`)
  }

  // Get commercie user for creating demo requests
  const commercie = await prisma.user.findUnique({ where: { email: 'commercie@demo.nl' } })
  if (!commercie) {
    console.log('Commercie user not found, skipping demo requests')
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
        label: 'COLORIGINZ',
        supplierLanguage: 'nl',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        relationType: 'SUPPLIER',
        createdById: commercie.id,
      },
      {
        supplierName: 'Demo X-kweker',
        supplierEmail: 'xkweker@demo-supplier.nl',
        region: 'EU',
        supplierType: 'X_KWEKER',
        label: 'PFC',
        supplierLanguage: 'nl',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        relationType: 'SUPPLIER',
        createdById: commercie.id,
      },
      {
        supplierName: 'Demo O-kweker',
        supplierEmail: 'okweker@demo-supplier.nl',
        region: 'ROW',
        supplierType: 'O_KWEKER',
        label: 'COLORIGINZ',
        supplierLanguage: 'nl',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        relationType: 'SUPPLIER',
        createdById: commercie.id,
      },
      {
        supplierName: 'Demo Klant BV',
        supplierEmail: 'klant@demo-customer.nl',
        region: 'EU',
        supplierType: 'KOOP',
        label: 'COLORIGINZ',
        supplierLanguage: 'nl',
        selfFill: true,
        status: 'AWAITING_PURCHASER',
        relationType: 'CUSTOMER',
        createdById: commercie.id,
      },
    ]

    for (const req of demoRequests) {
      await prisma.supplierRequest.create({ data: req })
      console.log(`Created demo request: ${req.supplierName} (${req.supplierType}, ${req.relationType})`)
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
