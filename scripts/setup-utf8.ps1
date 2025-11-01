# UTF-8 Encoding Configuration for Emergency Assistance Project
# This script sets up UTF-8 encoding for the project

Write-Host "Setting up UTF-8 encoding..." -ForegroundColor Green

# Set console output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set PowerShell output encoding to UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set default parameter values for encoding
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Set code page to UTF-8
chcp 65001 | Out-Null

# Set environment variables for UTF-8
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:PYTHONIOENCODING = "utf-8"

Write-Host "UTF-8 encoding setup completed!" -ForegroundColor Green
Write-Host "You can now run: npm run dev" -ForegroundColor Yellow
