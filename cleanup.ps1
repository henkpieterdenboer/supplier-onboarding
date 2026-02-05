$env:Path = "C:\Users\Henk.Pieter.d_col\AppData\Local\nodejs;" + $env:Path
Set-Location "C:\HPProjects\SupplierFrom\supplier-onboarding"

# Remove temporary setup scripts
Remove-Item -Path "*.ps1" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup complete!"
