$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Add essential shadcn/ui components
npx shadcn@latest add button input label card table badge dialog select textarea form alert dropdown-menu separator tabs toast sonner -y
