$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Remove old generated folder and config
Remove-Item -Path "src\generated" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma.config.ts" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma\migrations" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma\dev.db" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "prisma\dev.db-journal" -Force -ErrorAction SilentlyContinue

# Run migration with Prisma 5
npx prisma migrate dev --name init

# Generate client
npx prisma generate
