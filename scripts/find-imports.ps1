# Find files under client\src that contain import/export specifiers ending with .ts or .tsx
 $out = "scripts\tmp_replace_list.txt"
 if (Test-Path $out) { Remove-Item $out -Force }
 $root = (Get-Location).Path
 Get-ChildItem -Path client\src -Recurse -Include *.ts,*.tsx -File | ForEach-Object {
  $path = $_.FullName
  # Read file content once to avoid Select-String quoting issues
  $text = Get-Content -Raw -LiteralPath $path -ErrorAction SilentlyContinue
  if (!$text) { return }
  # Safe regex: look for .ts or .tsx immediately before a quote character
  $regex = '\\.(ts|tsx)("|\')'
  if ([Regex]::IsMatch($text, $regex)) {
    # convert to repository-relative path
    if ($path.StartsWith($root)) {
      $relative = $path.Substring($root.Length + 1)
    } else {
      $relative = $path
    }
    Add-Content -Path $out -Value $relative
  }
 }
 Write-Output "Wrote candidates to $out"
Write-Output "Wrote candidates to $out"
