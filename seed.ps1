$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Install tsx for running TypeScript
npm install -D tsx

# Run seed
npx prisma db seed
