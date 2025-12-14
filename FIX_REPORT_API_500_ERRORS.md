# API 500エラー修正レポート

## 問題の概要
本番環境で複数のAPIエンドポイントが500エラーを返している。
ローカル環境では正常に動作するが、本番環境でのみ発生。

## 発生しているエラー
```
Failed to load resource: the server responded with a status of 500 ()
api/knowledge-base/stats:1   Failed to load resource: the server responded with a status of 500 ()
api/settings/rag:1   Failed to load resource: the server responded with a status of 500 ()
api/ai-assist/settings:1   Failed to load resource: the server responded with a status of 500 ()
api/admin/dashboard:1   Failed to load resource: the server responded with a status of 500 ()
api/files/import:1   Failed to load resource: the server responded with a status of 500 ()
```

## 実施した修正

### 1. エラーハンドリングの強化
すべてのAPIエンドポイントに詳細なエラーログとハンドリングを追加：

- **server/src/api/files/index.mjs**
  - リクエスト情報（method, path, url）のログ出力を追加
  - エラーオブジェクトに詳細情報（message, stack, path）を含める
  - HTTPメソッドのエクスポート追加: `['get', 'post', 'put', 'delete', 'options']`

- **server/src/api/knowledge-base/index.mjs**
  - リクエスト情報のログ出力を追加
  - エラーレスポンスに詳細情報を含める
  - HTTPメソッドのエクスポート追加: `['get', 'post']`

- **server/src/api/admin/index.mjs**
  - HTTPメソッドのエクスポート更新: `['get', 'post']`

- **server/src/api/ai-assist/index.mjs**
  - HTTPメソッドのエクスポート更新: `['get', 'post']`

- **server/src/api/settings/index.mjs**
  - HTTPメソッドのエクスポート更新: `['get', 'post', 'put', 'delete']`

### 2. ルーティングミドルウェアの改善
**server/src/app.mjs**

- 動的ルート読み込み時のエラーハンドリング強化
- すべてのAPIハンドラーをtry-catchでラップ
- エラー発生時にnext(error)を呼び出してエラーハンドラーに転送
- ルート読み込み成功/失敗の視覚的なログ出力（✅/❌）
- グローバルエラーハンドラーの改善
  - ヘッダー送信済みチェックの追加
  - リクエストコンテキスト（path, method, url）をエラーログに含める

## 次のステップ

### 本番環境へのデプロイ

修正したコードは既にGitHubにコミット・プッシュ済み：
```
Commit: 0092e8fd - "fix: Improve error handling for API endpoints to fix 500 errors in production"
```

本番環境にデプロイするには以下の方法があります：

#### 方法1: GitHub Actions（推奨）
1. GitHub Actionsワークフローを設定
2. mainブランチへのプッシュで自動デプロイ

#### 方法2: Azure CLIでZipデプロイ
```powershell
# 1. プロジェクトルートでデプロイパッケージを作成
cd c:\Users\Satoshi Niina\OneDrive\Desktop\system\Emergency-Assistance
Remove-Item deploy.zip -ErrorAction SilentlyContinue
Compress-Archive -Path server\* -DestinationPath deploy.zip -Force

# 2. Azureにデプロイ
az webapp deploy --resource-group rg-Emergencyassistant-app --name emergency-assistantapp --src-path deploy.zip --type zip
```

#### 方法3: Kudu REST APIでデプロイ
```powershell
# 1. 認証情報を取得（すでに取得済み）
$user = '$emergency-assistantapp'
$password = 'zWHNX62ynntEniM1GLkHzZM94auEs6ipQkoYStrLYXLe3MjqQDDjcsebr10E'
$url = 'https://emergency-assistantapp.scm.azurewebsites.net/api/zipdeploy'

# 2. デプロイパッケージをアップロード
$base64AuthInfo = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$user:$password"))
Invoke-RestMethod -Uri $url -Headers @{Authorization=("Basic {0}" -f $base64AuthInfo)} -Method POST -InFile deploy.zip -ContentType "multipart/form-data"
```

## 検証方法

デプロイ後、以下のエンドポイントをテスト：

```powershell
$baseUrl = "https://emergency-assistantapp.azurewebsites.net"

# 1. knowledge-base/stats
Invoke-WebRequest "$baseUrl/api/knowledge-base/stats" -UseBasicParsing

# 2. settings/rag
Invoke-WebRequest "$baseUrl/api/settings/rag" -UseBasicParsing

# 3. ai-assist/settings
Invoke-WebRequest "$baseUrl/api/ai-assist/settings" -UseBasicParsing

# 4. admin/dashboard
Invoke-WebRequest "$baseUrl/api/admin/dashboard" -UseBasicParsing

# 5. files/import (POST)
$body = @{ fileName = "test.txt"; fileSize = 100 } | ConvertTo-Json
Invoke-WebRequest "$baseUrl/api/files/import" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

## ログの確認

デプロイ後、エラーが発生した場合のログ確認方法：

```powershell
# リアルタイムログストリーム
az webapp log tail --name emergency-assistantapp --resource-group rg-Emergencyassistant-app

# ログのダウンロード
az webapp log download --name emergency-assistantapp --resource-group rg-Emergencyassistant-app --log-file latest-logs.zip
```

## 追加の調査事項

もし問題が解決しない場合、以下を確認：

1. **環境変数の確認**
   ```powershell
   az webapp config appsettings list --name emergency-assistantapp --resource-group rg-Emergencyassistant-app
   ```

2. **ノードモジュールの確認**
   - 本番環境に必要な依存関係がインストールされているか
   - package.jsonとpackage-lock.jsonが同期しているか

3. **ミドルウェアの順序**
   - CORS、body-parser、session などのミドルウェアが正しい順序で登録されているか

4. **データベース接続**
   - PostgreSQLデータベースへの接続が本番環境で正常に確立されているか
   - 接続文字列が正しく設定されているか

## まとめ

修正内容はローカルリポジトリにコミット済みで、GitHubにプッシュ済みです。
次は本番環境にデプロイし、修正が反映されることを確認してください。

修正により、以下が改善されました：
- ✅ すべてのAPIエンドポイントで詳細なエラーログが出力される
- ✅ ハンドラー内の未処理エラーがグローバルエラーハンドラーに転送される
- ✅ エラーレスポンスにリクエストコンテキストが含まれる
- ✅ デバッグが容易になる
