# PowerShellスクリプト: chat.tsxの文字化けを一括修正
$filePath = "c:\Users\Satoshi Niina\OneDrive\Desktop\system\Emergency-Assistance\client\src\pages\chat.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# よくある文字化けパターンの修正マップ
$replacements = @{
    # 未終了文字列の修正パターン
    "開姁E\);" = "開始');"
    "件でぁE\);" = "件です');"
    "忁E[^']*です、E\);" = "必要です');"
    "劁E\);" = "了');"
    "亁E\);" = "了');"
    "チE[^']*ージ" = "ッセージ"
    "めE[^']*取り" = "やり取り"
    "ChE[^']*ット" = "チャット"
    "エE[^']*ト" = "エクスポート"
    "冁E[^']*が" = "内容が"
    "琁E" = "理"
    "征E" = "得"
    "姁E" = "始"
    "劁E" = "了"
    "亁E" = "了"
    "慁E" = "態"
    "誁E" = "認"
    "宁E" = "定"
    "墁E" = "境"
    "頁E" = "頃"
    "ぁE" = "い"
}

# 各パターンを順次置換
foreach ($pattern in $replacements.GetEnumerator()) {
    $content = $content -replace $pattern.Key, $pattern.Value
}

# UTF-8 (no BOM)で保存
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host "文字化け修正が完了しました: $filePath"
