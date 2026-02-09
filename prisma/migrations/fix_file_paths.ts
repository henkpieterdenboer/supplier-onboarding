import 'dotenv/config'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const result = await pool.query(
    `UPDATE "SupplierFile" SET "filePath" = REPLACE("filePath", '/uploads/', '/api/files/') WHERE "filePath" LIKE '/uploads/%'`
  )
  console.log(`Updated ${result.rowCount} file path(s)`)
  await pool.end()
}

main().catch(console.error)
