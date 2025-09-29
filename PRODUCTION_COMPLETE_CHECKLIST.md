# 本番環境完全設定チェックリスト

## 🎯 目標
Azure App Service + Static Web Apps の完全な本番環境構築

## ✅ 事前準備完了項目
- [x] GitHub Secrets: `AZURE_WEBAPP_PUBLISH_PROFILE` 設定済み
- [x] `web.config` 削除済み（Linux環境では不要）
- [x] `package.json` の `start` スクリプト修正済み
- [x] デプロイワークフロー修正済み

## 🔧 Azure Portal 設定（必須）

### 1. 基本設定
```
プラットフォーム: Linux
Node.js バージョン: 20.19.3
Always On: 有効
```

### 2. スタートアップコマンド
```
npm start
```

### 3. 環境変数（App Settings）
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

### 4. セキュリティ設定
```
認証（EasyAuth）: 無効
アクセス制限: Allow all（一時的）
```

## 🚀 デプロイ実行

### 1. GitHub Actions でのデプロイ
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
```

## 🔍 本番環境確認

### 1. バックエンド（App Service）確認
```bash
# 基本接続テスト
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping
# 期待値: {"ok":true,"ping":"pong",...}

# ヘルスチェック
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
# 期待値: {"ok":true,"status":"healthy",...}

# API接続テスト
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/auth/handshake
# 期待値: {"ok":true,"mode":"session",...}
```

### 2. フロントエンド（Static Web Apps）確認
```bash
# フロントエンドアクセス
curl https://witty-river-012f39e00.1.azurestaticapps.net
# 期待値: HTMLページが返される

# API経由でのアクセス
curl https://witty-river-012f39e00.1.azurestaticapps.net/api/health
# 期待値: バックエンドのヘルスチェック結果
```

## 🎯 本番環境完成の確認項目

### ✅ バックエンド（App Service）
- [ ] `npm start` が正常に実行される
- [ ] Express サーバーが起動する
- [ ] ヘルスチェックエンドポイントが応答する
- [ ] API エンドポイントが応答する
- [ ] データベース接続が正常（設定されている場合）

### ✅ フロントエンド（Static Web Apps）
- [ ] フロントエンドページが表示される
- [ ] API 経由でバックエンドにアクセスできる
- [ ] 認証機能が動作する
- [ ] チャット機能が動作する

### ✅ 統合テスト
- [ ] フロントエンドからバックエンドへの API 呼び出しが成功
- [ ] 認証フローが正常に動作
- [ ] エラーハンドリングが適切に動作

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. `Cannot find package 'express'`
**原因**: `node_modules` が正しくインストールされていない
**解決**: Azure Portal でスタートアップコマンドを `npm start` に設定

#### 2. `Publish profile is invalid`
**原因**: 発行プロファイルが期限切れ
**解決**: 新しい発行プロファイルをダウンロードして GitHub Secrets を更新

#### 3. `Module not found`
**原因**: ESM モジュールの設定問題
**解決**: `package.json` の `"type": "module"` を確認

#### 4. フロントエンドが表示されない
**原因**: Static Web Apps の設定問題
**解決**: `staticwebapp.config.json` の設定を確認

## 📞 サポート

問題が発生した場合：
1. Azure Portal のログストリームを確認
2. GitHub Actions のログを確認
3. 上記のトラブルシューティングを参照
4. 必要に応じて設定を再確認

## 🎉 完成

すべての確認項目が ✅ になったら、本番環境は完全に動作しています！
