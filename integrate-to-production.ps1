# 本番環境統合スクリプト
# PowerShell用

Write-Host "🚀 本番環境統合開始..." -ForegroundColor Green

# 1. バックアップ作成
Write-Host "📦 バックアップ作成中..." -ForegroundColor Yellow
$backupBranch = "backup-before-integration-$(Get-Date -Format 'yyyyMMdd')"
git checkout -b $backupBranch
git push origin $backupBranch
Write-Host "✅ バックアップ完了: $backupBranch" -ForegroundColor Green

# 2. メインブランチに戻る
git checkout main

# 3. 修正ファイルの段階的コミット
Write-Host "📝 修正ファイルのコミット中..." -ForegroundColor Yellow

# フロントエンドの修正
git add client/src/pages/chat.tsx
git commit -m "feat: AI支援の段階的応急処置フロー実装 - 1つの質問のみ表示"

# バックエンドの修正
git add server/local-server.js
git commit -m "feat: AI支援プロンプト改善と後処理関数追加 - 厳格な1質問制限"

# ナレッジベースの修正
git add knowledge-base/railway-maintenance-ai-prompt.json
git commit -m "feat: AI支援プロンプトのフレンドリー化と一問一答形式"

# 4. 不要なファイルの削除
Write-Host "🧹 不要なファイルの削除中..." -ForegroundColor Yellow
if (Test-Path "client/src/lib/structured-diagnostic-manager.ts") {
    Remove-Item "client/src/lib/structured-diagnostic-manager.ts"
    git add -A
    git commit -m "cleanup: 不要なstructured-diagnostic-manager.ts削除"
}

# 5. ドキュメントの追加
git add *.md
git commit -m "docs: 本番統合手順書と修正内容ドキュメント追加"

# 6. 本番環境へのプッシュ
Write-Host "🚀 本番環境へのプッシュ中..." -ForegroundColor Yellow
git push origin main

Write-Host "✅ 本番環境統合完了！" -ForegroundColor Green
Write-Host "📋 次のステップ:" -ForegroundColor Cyan
Write-Host "1. 本番環境でのテスト実行" -ForegroundColor White
Write-Host "2. AI支援機能の動作確認" -ForegroundColor White
Write-Host "3. ログの監視" -ForegroundColor White
Write-Host "4. エラーがないか確認" -ForegroundColor White

# 7. テスト用のAPI呼び出し
Write-Host "🧪 APIテスト実行中..." -ForegroundColor Yellow
try {
    $testBody = @{
        text = "テスト"
        aiSupportMode = $true
        simpleMode = $true
    } | ConvertTo-Json
    $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/chatgpt" -Method POST -ContentType "application/json" -Body $testBody -TimeoutSec 10
    Write-Host "✅ APIテスト成功" -ForegroundColor Green
} catch {
    Write-Host "⚠️ APIテスト失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "本番環境で手動テストが必要です" -ForegroundColor Yellow
}

Write-Host "🎉 統合プロセス完了！" -ForegroundColor Green
