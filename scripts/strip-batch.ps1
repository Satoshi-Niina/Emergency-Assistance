param(
  [int]$count = 10
)
$root = (Get-Location).Path
$input = Join-Path $root "scripts\tmp_replace_list.txt"
if (!(Test-Path $input)) { Write-Output "No list file: $input"; exit 1 }
$lines = Get-Content -LiteralPath $input | Select-Object -Unique
$selected = $lines | Select-Object -First $count
if (!$selected -or $selected.Count -eq 0) { Write-Output "No files to process"; exit 0 }
$processed = @()
foreach ($f in $selected) {
  if (!(Test-Path $f)) { Write-Output "Missing: $f"; continue }
  $bak = "$f.bak"
  if (!(Test-Path $bak)) { Copy-Item -LiteralPath $f -Destination $bak -Force }
  $text = Get-Content -Raw -LiteralPath $f
  # Replace module specifiers ending with .ts or .tsx in import/export lines only
  $new = $text -replace "(from\s+['\"'])([^'\"']+?)\.(ts|tsx)(['\"'])", '$1$2$4'
  if ($new -ne $text) {
    Set-Content -LiteralPath $f -Value $new
    $processed += $f
    Write-Output "Updated: $f"
  } else {
    Write-Output "No change: $f"
  }
}
if ($processed.Count -gt 0) {
  git add -- $processed
  git commit -m "client: strip .ts/.tsx from import paths (batch auto)" || Write-Output "git commit failed"
  Write-Output ("Committed {0} files" -f $processed.Count)
} else {
  Write-Output "No files changed"
}
# Remove processed files from the list
$remaining = $lines | Where-Object { $processed -notcontains $_ }
$remaining | Set-Content -LiteralPath $input
Write-Output "Remaining: $($remaining.Count) files in $input"
