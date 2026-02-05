$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Remove current prisma
npm uninstall prisma @prisma/client

# Install Prisma 5 (stable, simpler)
npm install prisma@5 @prisma/client@5

# Re-initialize
npx prisma init --datasource-provider sqlite
