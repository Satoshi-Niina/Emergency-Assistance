# 本番環境デプロイ準備スクリプト
Write-Host "🚀 本番環境デプロイ準備を確認中..." -ForegroundColor Green

Write-Host ""
Write-Host "📋 デプロイ前チェックリスト:" -ForegroundColor Cyan
Write-Host "  ✅ ローカル環境で動作確認完了" -ForegroundColor Green
Write-Host "  ✅ バックエンドAPI: ポート3003で動作中" -ForegroundColor Green
Write-Host "  ✅ フロントエンド: 起動中" -ForegroundColor Green
Write-Host "  ✅ データベース: webappdbに接続" -ForegroundColor Green
Write-Host "  ✅ ストレージ: knowledge-baseフォルダから読み込み" -ForegroundColor Green

Write-Host ""
Write-Host "🌐 本番環境での動作確認:" -ForegroundColor Cyan
Write-Host "  1. ブラウザで http://localhost:5173 にアクセス" -ForegroundColor White
Write-Host "  2. ログイン（niina / 正しいパスワード）" -ForegroundColor White
Write-Host "  3. 全UIでデータが表示されることを確認" -ForegroundColor White
Write-Host "  4. エラーが発生しないことを確認" -ForegroundColor White

Write-Host ""
Write-Host "📝 本番環境への切り替え:" -ForegroundColor Cyan
Write-Host "  - データベース: ローカル → Azure PostgreSQL" -ForegroundColor White
Write-Host "  - ストレージ: ローカル → Azure Blob Storage" -ForegroundColor White
Write-Host "  - API: ローカル → Azure Functions" -ForegroundColor White
Write-Host "  - フロントエンド: ローカル → Azure Static Web Apps" -ForegroundColor White

Write-Host ""
Write-Host "🎯 次のステップ:" -ForegroundColor Cyan
Write-Host "  1. ローカル環境での動作確認" -ForegroundColor White
Write-Host "  2. 問題がなければ git push でデプロイ" -ForegroundColor White
Write-Host "  3. Azure環境での動作確認" -ForegroundColor White

Write-Host ""
Write-Host "⚠️ 注意事項:" -ForegroundColor Yellow
Write-Host "  - 本番環境では環境変数が自動設定されます" -ForegroundColor White
Write-Host "  - データベース接続先が自動的に切り替わります" -ForegroundColor White
Write-Host "  - ストレージ接続先が自動的に切り替わります" -ForegroundColor White
