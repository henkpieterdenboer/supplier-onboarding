$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"
npx prisma migrate deploy
npx prisma db seed
