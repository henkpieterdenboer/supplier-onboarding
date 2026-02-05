$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Install Prisma
npm install prisma @prisma/client

# Install NextAuth.js for authentication
npm install next-auth @auth/prisma-adapter

# Install other dependencies
npm install nodemailer uuid bcryptjs xlsx
npm install -D @types/nodemailer @types/uuid @types/bcryptjs

# Initialize Prisma with SQLite
npx prisma init --datasource-provider sqlite
