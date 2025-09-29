# 🚀 本番環境完全デプロイ実行手順

## 📋 事前確認（必須）

### ✅ 完了済み項目
- [x] GitHub Secrets: `AZURE_WEBAPP_PUBLISH_PROFILE` 設定済み
- [x] `web.config` 削除済み
- [x] `package.json` の `start` スクリプト修正済み
- [x] デプロイワークフロー修正済み

## 🔧 Azure Portal 設定（5分）

### 1. 基本設定
1. Azure Portal → App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
2. **設定** → **全般設定** をクリック
3. 以下の設定を確認・修正：

```
プラットフォーム: Linux
Node.js バージョン: 20.19.3
Always On: 有効
スタートアップコマンド: npm start
```

### 2. 環境変数設定
1. **設定** → **アプリケーション設定** をクリック
2. 以下の環境変数を設定：

```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your_openai_api_key_here
PG_SSL=require
```

### 3. セキュリティ設定
1. **設定** → **認証** を開く
2. **EasyAuth** が無効になっていることを確認
3. **設定** → **アクセス制限** を開く
4. 一時的に **Allow all** に設定

### 4. 設定保存と再起動
1. すべての設定を **保存**
2. **概要** ページで **再起動** をクリック
3. 再起動完了まで待機（約2-3分）

## 🚀 GitHub Actions デプロイ実行（10分）

### 1. デプロイ実行
1. GitHub リポジトリの **Actions** タブを開く
2. **Backend CI/CD** ワークフローを選択
3. **Run workflow** をクリック
4. デプロイの進行状況を監視

### 2. 期待されるログ
```
✅ Express found in copied node_modules
✅ CORS found in copied node_modules
✅ PG found in copied node_modules
✅ Deploy to Azure Web App: Success
✅ All health checks passed!
🚀 Application is ready for production use
```

## 🔍 本番環境確認（2分）

### 1. 自動テスト実行
```bash
node scripts/test-production-complete.js
```

### 2. 手動確認
```bash
# バックエンド確認
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health

# フロントエンド確認
curl https://witty-river-012f39e00.1.azurestaticapps.net
curl https://witty-river-012f39e00.1.azurestaticapps.net/api/health
```

## 🎯 成功の確認

### ✅ バックエンド（App Service）
- [ ] `npm start` が正常に実行される
- [ ] Express サーバーが起動する
- [ ] ヘルスチェックエンドポイントが応答する
- [ ] API エンドポイントが応答する

### ✅ フロントエンド（Static Web Apps）
- [ ] フロントエンドページが表示される
- [ ] API 経由でバックエンドにアクセスできる
- [ ] 認証機能が動作する

### ✅ 統合テスト
- [ ] フロントエンドからバックエンドへの API 呼び出しが成功
- [ ] 認証フローが正常に動作

## 🚨 トラブルシューティング

### よくある問題

#### 1. `Cannot find package 'express'`
**解決**: Azure Portal でスタートアップコマンドを `npm start` に設定

#### 2. `Publish profile is invalid`
**解決**: 新しい発行プロファイルをダウンロードして GitHub Secrets を更新

#### 3. フロントエンドが表示されない
**解決**: Static Web Apps の設定を確認

## 🎉 完成

すべての確認項目が ✅ になったら、本番環境は完全に動作しています！

**アクセスURL:**
- フロントエンド: https://witty-river-012f39e00.1.azurestaticapps.net
- バックエンド: https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net
