# リポジトリクリーンアップ承認スクリプト
# このスクリプトは人間レビュー後にのみ実行してください

Write-Host "🧹 Emergency Assistance リポジトリクリーンアップ承認スクリプト" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 確認メッセージ
Write-Host "⚠️  警告: このスクリプトは以下のファイルを削除します：" -ForegroundColor Yellow
Write-Host "   - ログファイル (*.log)" -ForegroundColor Red
Write-Host "   - バックアップファイル (*.backup*)" -ForegroundColor Red
Write-Host "   - ビルド成果物 (dist/)" -ForegroundColor Red
Write-Host "   - テストファイル (test-*)" -ForegroundColor Red
Write-Host "   - 一時ファイル (*.tmp, *.bak)" -ForegroundColor Red
Write-Host ""

# ユーザー確認
$confirm = Read-Host "続行しますか？ (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ クリーンアップをキャンセルしました" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 削除候補ファイルの確認..." -ForegroundColor Green
if (-not (Test-Path "delete-candidates.txt")) {
    Write-Host "❌ delete-candidates.txt が見つかりません" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 削除予定ファイル一覧:" -ForegroundColor Green
Get-Content "delete-candidates.txt" | Where-Object { $_ -notmatch "^#" -and $_ -ne "" } | Select-Object -First 20
Write-Host "..."

$confirm2 = Read-Host "これらのファイルを削除しますか？ (yes/no)"
if ($confirm2 -ne "yes") {
    Write-Host "❌ クリーンアップをキャンセルしました" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🗑️  ファイル削除を開始..." -ForegroundColor Yellow

# ログファイルの削除
Write-Host "  - ログファイルを削除中..." -ForegroundColor Gray
Get-ChildItem -Path . -Recurse -Name "*.log" -File | Remove-Item -Force -ErrorAction SilentlyContinue

# バックアップファイルの削除
Write-Host "  - バックアップファイルを削除中..." -ForegroundColor Gray
Get-ChildItem -Path . -Recurse -Name "*backup*" -File | Remove-Item -Force -ErrorAction SilentlyContinue

# ビルド成果物の削除
Write-Host "  - ビルド成果物を削除中..." -ForegroundColor Gray
if (Test-Path "client/dist") { Remove-Item -Path "client/dist" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "server/dist") { Remove-Item -Path "server/dist" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "shared/dist") { Remove-Item -Path "shared/dist" -Recurse -Force -ErrorAction SilentlyContinue }

# 一時ファイルの削除
Write-Host "  - 一時ファイルを削除中..." -ForegroundColor Gray
Get-ChildItem -Path . -Recurse -Name "*.tmp" -File | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path . -Recurse -Name "*.bak" -File | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path . -Recurse -Name "*~" -File | Remove-Item -Force -ErrorAction SilentlyContinue

# TypeScriptビルド情報の削除
Write-Host "  - TypeScriptビルド情報を削除中..." -ForegroundColor Gray
Get-ChildItem -Path . -Recurse -Name "*.tsbuildinfo" -File | Remove-Item -Force -ErrorAction SilentlyContinue

# テストファイルの削除（要確認）
Write-Host "  - テストファイルを削除中..." -ForegroundColor Gray
Get-ChildItem -Path . -Name "test-*.js" -File | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path . -Name "test-*.ps1" -File | Remove-Item -Force -ErrorAction SilentlyContinue
if (Test-Path "public") {
    Get-ChildItem -Path "public" -Name "test-*.html" -File | Remove-Item -Force -ErrorAction SilentlyContinue
}

# ドラフトファイルの削除
Write-Host "  - ドラフトファイルを削除中..." -ForegroundColor Gray
$draftFiles = @("cleanup-commit.md", "final-deploy.txt", "force-deploy.txt", "frontend-trigger.txt", "trigger.txt")
foreach ($file in $draftFiles) {
    if (Test-Path $file) { Remove-Item -Path $file -Force -ErrorAction SilentlyContinue }
}

Write-Host ""
Write-Host "✅ クリーンアップが完了しました！" -ForegroundColor Green
Write-Host ""

# 最終確認
Write-Host "🔍 クリーンアップ後の状況確認..." -ForegroundColor Green
Write-Host "  - TypeScriptコンパイルチェック..." -ForegroundColor Gray
try {
    $tscResult = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ TypeScriptエラーなし" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  TypeScriptエラーが残存しています" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠️  TypeScriptチェックに失敗しました" -ForegroundColor Yellow
}

Write-Host "  - ESLintチェック..." -ForegroundColor Gray
try {
    $eslintResult = npx eslint . --ext .ts,.tsx,.js,.jsx --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ ESLintエラーなし" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  ESLintエラーが残存しています" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠️  ESLintチェックに失敗しました" -ForegroundColor Yellow
}

Write-Host "  - 依存関係チェック..." -ForegroundColor Gray
try {
    $depcheckResult = npx depcheck 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ 依存関係問題なし" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  依存関係問題が残存しています" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    ⚠️  依存関係チェックに失敗しました" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 リポジトリクリーンアップが完了しました！" -ForegroundColor Green
Write-Host "   次のステップ:" -ForegroundColor Cyan
Write-Host "   1. git add ." -ForegroundColor White
Write-Host "   2. git commit -m 'chore: repository cleanup'" -ForegroundColor White
Write-Host "   3. git push origin chore/repo-clean-$(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor White
Write-Host ""
