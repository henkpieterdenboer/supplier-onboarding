import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import dotenv from 'dotenv'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import ws from 'ws'

// Required for Node.js environments
neonConfig.webSocketConstructor = ws

// --- Parse env files without polluting process.env ---

const projectRoot = path.resolve(__dirname, '..')

const envLocal = dotenv.parse(fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf-8'))
const envFile = dotenv.parse(fs.readFileSync(path.join(projectRoot, '.env'), 'utf-8'))

const sourceUrl = envLocal.DATABASE_URL   // productie (ep-ancient-shadow)
const targetUrl = envFile.DATABASE_URL    // test/demo (ep-summer-wildflower)

if (!sourceUrl || !targetUrl) {
  console.error('DATABASE_URL not found in .env.local (source) or .env (target)')
  process.exit(1)
}

// Safety: refuse to run if source and target are the same
if (sourceUrl === targetUrl) {
  console.error('Source and target DATABASE_URL are identical — aborting!')
  process.exit(1)
}

// --- Create Prisma clients ---

function createClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

const source = createClient(sourceUrl)
const target = createClient(targetUrl)

// --- Confirmation prompt ---

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// --- Demo users (same as prisma/seed.ts) ---

async function upsertDemoUsers(db: PrismaClient) {
  const passwordHash = await bcrypt.hash('demo123', 10)

  const users = [
    { email: 'admin@demo.nl', firstName: 'Demo', lastName: 'Admin', roles: ['ADMIN'], passwordHash, isActive: true },
    { email: 'inkoper@demo.nl', firstName: 'Demo', lastName: 'Inkoper', roles: ['INKOPER'], passwordHash, isActive: true },
    { email: 'finance@demo.nl', firstName: 'Demo', lastName: 'Finance', roles: ['FINANCE'], passwordHash, isActive: true },
    { email: 'erp@demo.nl', firstName: 'Demo', lastName: 'ERP', roles: ['ERP'], passwordHash, isActive: true },
  ]

  for (const user of users) {
    await db.user.upsert({
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
    console.log(`  Upserted demo user: ${user.email}`)
  }
}

// --- Main ---

async function main() {
  console.log('=== Test-DB Sync Script ===')
  console.log(`Source (productie): ${sourceUrl.replace(/:[^:@]+@/, ':***@')}`)
  console.log(`Target (test/demo): ${targetUrl.replace(/:[^:@]+@/, ':***@')}`)
  console.log()

  const ok = await confirm('This will DELETE all data in the test-DB and replace it with production data + demo users. Continue? (y/N) ')
  if (!ok) {
    console.log('Aborted.')
    process.exit(0)
  }

  console.log()

  // 1. Read all data from production
  console.log('[1/4] Reading production data...')
  const users = await source.user.findMany()
  const requests = await source.supplierRequest.findMany()
  const files = await source.supplierFile.findMany()
  const auditLogs = await source.auditLog.findMany()

  console.log(`  Users: ${users.length}`)
  console.log(`  SupplierRequests: ${requests.length}`)
  console.log(`  SupplierFiles: ${files.length}`)
  console.log(`  AuditLogs: ${auditLogs.length}`)
  console.log()

  // 2. Clear test-DB (respect foreign keys: children first)
  console.log('[2/4] Clearing test-DB...')
  await target.auditLog.deleteMany()
  console.log('  Deleted AuditLogs')
  await target.supplierFile.deleteMany()
  console.log('  Deleted SupplierFiles')
  await target.supplierRequest.deleteMany()
  console.log('  Deleted SupplierRequests')
  await target.user.deleteMany()
  console.log('  Deleted Users')
  console.log()

  // 3. Write production data to test-DB (parents first)
  console.log('[3/4] Writing production data to test-DB...')

  if (users.length > 0) {
    await target.user.createMany({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        middleName: u.middleName,
        lastName: u.lastName,
        roles: u.roles,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
        receiveEmails: u.receiveEmails,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        activationToken: u.activationToken,
        activationExpiresAt: u.activationExpiresAt,
      })),
    })
    console.log(`  Inserted ${users.length} Users`)
  }

  if (requests.length > 0) {
    await target.supplierRequest.createMany({
      data: requests.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        createdById: r.createdById,
        supplierName: r.supplierName,
        supplierEmail: r.supplierEmail,
        region: r.region,
        selfFill: r.selfFill,
        companyName: r.companyName,
        address: r.address,
        postalCode: r.postalCode,
        city: r.city,
        country: r.country,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        contactEmail: r.contactEmail,
        chamberOfCommerceNumber: r.chamberOfCommerceNumber,
        vatNumber: r.vatNumber,
        iban: r.iban,
        bankName: r.bankName,
        incoterm: r.incoterm,
        commissionPercentage: r.commissionPercentage,
        creditorNumber: r.creditorNumber,
        kbtCode: r.kbtCode,
        invitationToken: r.invitationToken,
        invitationExpiresAt: r.invitationExpiresAt,
        invitationSentAt: r.invitationSentAt,
        supplierSubmittedAt: r.supplierSubmittedAt,
      })),
    })
    console.log(`  Inserted ${requests.length} SupplierRequests`)
  }

  if (files.length > 0) {
    await target.supplierFile.createMany({
      data: files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileType: f.fileType,
        filePath: f.filePath,
        uploadedAt: f.uploadedAt,
        requestId: f.requestId,
        uploadedById: f.uploadedById,
      })),
    })
    console.log(`  Inserted ${files.length} SupplierFiles`)
  }

  if (auditLogs.length > 0) {
    await target.auditLog.createMany({
      data: auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt,
        requestId: a.requestId,
        userId: a.userId,
      })),
    })
    console.log(`  Inserted ${auditLogs.length} AuditLogs`)
  }

  console.log()

  // 4. Upsert demo users
  console.log('[4/4] Upserting demo users...')
  await upsertDemoUsers(target)
  console.log()

  // Summary
  const finalUsers = await target.user.count()
  const finalRequests = await target.supplierRequest.count()
  const finalFiles = await target.supplierFile.count()
  const finalLogs = await target.auditLog.count()

  console.log('=== Sync complete ===')
  console.log(`  Users: ${finalUsers} (incl. demo users)`)
  console.log(`  SupplierRequests: ${finalRequests}`)
  console.log(`  SupplierFiles: ${finalFiles}`)
  console.log(`  AuditLogs: ${finalLogs}`)
}

main()
  .catch((e) => {
    console.error('Sync failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await source.$disconnect()
    await target.$disconnect()
  })
