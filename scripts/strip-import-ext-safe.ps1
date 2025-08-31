$root = Join-Path $PSScriptRoot "..\client\src"
$updated = 0
Get-ChildItem -Path $root -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $path = $_.FullName
    try {
        $lines = Get-Content -Encoding UTF8 -Raw $path -ErrorAction Stop -ReadCount 0 -Delimiter "`n" -ea Stop
        # Get-Content -Raw returns a single string; split into lines
        $arr = $lines -split "\r?\n"
    } catch { Write-Output "SKIP: $path (read error)"; return }
    $changed = $false
    for ($i=0; $i -lt $arr.Length; $i++) {
        $line = $arr[$i]
        if ($line -match '^\s*(import|export)\b' -or $line -match '\bfrom\s+["\'']') {
            $newLine = [regex]::Replace($line, '\\.(ts|tsx)(?=("|\'))', '')
            if ($newLine -ne $line) { $arr[$i] = $newLine; $changed = $true }
        }
    }
    if ($changed) {
        $content = $arr -join "`n"
        Set-Content -Path $path -Value $content -Encoding UTF8
        Write-Output "UPDATED: $path"
        $updated++
    $root = Join-Path $PSScriptRoot "..\client\src"
    $updated = 0

    "Running import extension strip on: $root"

    try {
        $items = Get-ChildItem -Path $root -Recurse -Include *.ts,*.tsx -File -ErrorAction Stop
    } catch {
        Write-Output "ERROR: cannot enumerate files under $root"
        exit 1
    }

    $pattern = "\\.(ts|tsx)(?=(['\"]))"

    foreach ($item in $items) {
        $path = $item.FullName
        try {
            $text = Get-Content -Path $path -Encoding UTF8 -Raw -ErrorAction Stop
        } catch {
            Write-Output "SKIP: $path (read error)"
            continue
        }

        if ($text -notmatch "\.(ts|tsx)") { continue }

        $arr = $text -split "`n"
        $changed = $false
        for ($i = 0; $i -lt $arr.Length; $i++) {
            $line = $arr[$i]
            if ($line -match '^\s*(import|export)\b' -or $line -match '\bfrom\s+') {
                $newLine = [regex]::Replace($line, $pattern, '')
                if ($newLine -ne $line) { $arr[$i] = $newLine; $changed = $true }
            }
        }

        if ($changed) {
            $content = $arr -join "`n"
            Set-Content -Path $path -Value $content -Encoding UTF8
            Write-Output "UPDATED: $path"
            $updated++
        }
    }

    Write-Output "TOTAL_UPDATED: $updated"
