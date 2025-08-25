
# PowerShell script: Convert all text files in the project to UTF-8 (no BOM)
# This will overwrite existing files. Backup if necessary.
# Usage: Run this script in PowerShell

$root = "$PSScriptRoot"

# Target extensions (add as needed)
$exts = @('*.js','*.ts','*.tsx','*.json','*.md','*.html','*.css','*.txt','*.mjs','*.sh','*.bat','*.conf','*.sql','*.yml','*.yaml')

# Recursively get all target files
$files = @()
foreach ($ext in $exts) {
    $files += Get-ChildItem -Path $root -Recurse -Include $ext -File
}

foreach ($file in $files) {
    try {
    # Read content and overwrite as UTF-8 (no BOM)
    $content = Get-Content -Path $file.FullName -Raw
    [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Converted: $($file.FullName)"
    } catch {
    Write-Warning "Failed: $($file.FullName) ($_ )"
    }
}

Write-Host "All files have been converted to UTF-8."
