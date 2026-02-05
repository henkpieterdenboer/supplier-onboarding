$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Generate Prisma client
npx prisma generate

# Run seed
npx tsx prisma/seed.ts
