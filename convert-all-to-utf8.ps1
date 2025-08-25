# PowerShellスクリプト: すべてのテキストファイルをUTF-8に一括変換
# 既存ファイルを上書きします。必要に応じてバックアップを取ってください。
# 使い方: PowerShellでこのスクリプトを実行

$root = "$PSScriptRoot"

# 対象拡張子（必要に応じて追加）
$exts = @('*.js','*.ts','*.tsx','*.json','*.md','*.html','*.css','*.txt','*.mjs','*.sh','*.bat','*.conf','*.sql','*.yml','*.yaml')

# すべての対象ファイルを再帰的に取得
$files = @()
foreach ($ext in $exts) {
    $files += Get-ChildItem -Path $root -Recurse -Include $ext -File
}

foreach ($file in $files) {
    try {
        # 既存のエンコーディングを自動判別してUTF-8で再保存
        $content = Get-Content -Path $file.FullName -Raw
        # UTF-8(BOMなし)で上書き保存
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "変換完了: $($file.FullName)"
    } catch {
        Write-Warning "変換失敗: $($file.FullName) ($_ )"
    }
}

Write-Host "すべての変換が完了しました。"
