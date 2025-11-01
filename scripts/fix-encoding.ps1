# UTF-8 (BOMなし) エンコーディング変換スクリプト
# プロジェクト内のすべてのTypeScriptファイルをUTF-8（BOMなし）で保存し直す

$ErrorActionPreference = "SilentlyContinue"

# UTF-8 (BOMなし) エンコーディング
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# 対象ディレクトリ
$directories = @(
    "server\src",
    "client\src", 
    "shared\src"
)

Write-Host "UTF-8 encoding conversion started..." -ForegroundColor Green

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "Processing: $dir" -ForegroundColor Yellow
        
        # TypeScriptファイルを取得
        $files = Get-ChildItem -Path $dir -Recurse -Filter "*.ts" -File
        
        foreach ($file in $files) {
            try {
                # ファイルを読み込み
                $content = Get-Content $file.FullName -Raw -Encoding UTF8
                
                # UTF-8 (BOMなし) で保存
                [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
                
                Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
            }
            catch {
                Write-Host "  ✗ $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "UTF-8 encoding conversion completed." -ForegroundColor Green