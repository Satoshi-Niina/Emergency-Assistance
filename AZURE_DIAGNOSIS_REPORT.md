# Azure環境診断レポート

## 🚨 発見された問題

### 1. バックエンドサーバーが503エラーで応答不可

**現象:**
- バックエンドURL: `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net`
- HTTPステータス: `503 Service Unavailable`
- 説明: サーバーが利用できない状態

**考えられる原因:**
1. **Node.jsアプリケーションの起動失敗**
   - 環境変数の不足（DATABASE_URL, JWT_SECRET, SESSION_SECRET など）
   - 依存関係（node_modules）の不足
   - サーバーコードのエラー

2. **Azure App Serviceの設定問題**
   - スタートアップコマンドが正しくない
   - アプリケーション設定が不足
   - プラットフォームの設定ミス

3. **データベース接続問題**
   - PostgreSQL接続文字列が無効
   - ファイアウォール設定
   - SSL接続の問題

## 📋 確認された設定状況

### GitHub Actions デプロイワークフロー
- ✅ `deploy-server-azure.yml` が存在
- ✅ Node.js 20での依存関係インストール
- ✅ Azure App Serviceへの ZIP デプロイ設定
- ⚠️ 環境変数の設定が GitHub Secrets に依存

### アプリケーション構造
- ✅ `server/index.js` エントリーポイント
- ✅ `server/azure-server.js` メインサーバーファイル
- ✅ Express.js ベースのサーバー設定
- ✅ CORS設定の実装

### 必要な環境変数
デプロイメント資料によると以下の環境変数が**必須**：

1. **データベース関連:**
   - `DATABASE_URL` - PostgreSQL接続文字列
   - `PG_SSL` - SSL設定（デフォルト: require）

2. **認証関連:**
   - `JWT_SECRET` - JWT署名用シークレット（32文字以上）
   - `SESSION_SECRET` - セッション管理用シークレット（32文字以上）

3. **URL設定:**
   - `FRONTEND_URL` - フロントエンドURL
   - `STATIC_WEB_APP_URL` - Static Web App URL

4. **Azure Storage:**
   - `AZURE_STORAGE_CONNECTION_STRING` - BLOBストレージ接続文字列
   - `AZURE_STORAGE_CONTAINER_NAME` - コンテナ名

## 🔧 推奨される修正手順

### 1. Azure App Serviceの設定確認
```bash
# Azure CLIでApp Serviceの設定を確認
az webapp config appsettings list --name Emergency-Assistance --resource-group [RESOURCE_GROUP_NAME]
```

### 2. 環境変数の設定
Azure Portalで以下を確認・設定：
- App Service > Configuration > Application settings
- 必要な環境変数がすべて設定されているか確認

### 3. ログの確認
Azure Portalで以下のログを確認：
- App Service > Log stream
- App Service > Diagnose and solve problems
- Monitor > Application Insights (設定されている場合)

### 4. スタートアップコマンドの確認
- App Service > Configuration > General settings
- Startup command: `node index.js`

### 5. Node.js版の確認
- Runtime version: Node.js 20 LTS

## 🎯 緊急対応策

### 1. ローカルテスト環境での確認
ローカル環境でAzure本番環境と同じ設定でテスト：
```bash
cd server
NODE_ENV=production node index.js
```

### 2. 最小限のテストサーバーデプロイ
問題の切り分けのため、データベース接続をバイパスした最小限のサーバーをテスト：
```javascript
// 環境変数: BYPASS_DB_FOR_LOGIN=true
```

### 3. デプロイの再実行
環境変数を設定後、GitHub Actionsワークフローの手動実行

## 📞 次のアクション

1. **即座に実行:**
   - Azure Portalでの環境変数確認
   - App Serviceログの確認
   - スタートアップコマンドの確認

2. **問題解決後:**
   - ヘルスチェックエンドポイントのテスト
   - データベース接続のテスト
   - ログイン機能のテスト

## 💡 ログイン問題の根本原因

現在のログイン問題は以下の順序で発生している可能性が高い：

1. **バックエンドサーバーが起動していない** (503エラー)
2. **フロントエンドからAPIに接続できない**
3. **ログイン機能が利用できない**
4. **コンソールログに何も表示されない** (API呼び出しが失敗するため)

まず**バックエンドサーバーの起動問題**を解決することが最優先です。

---

**作成日時:** 2025年1月8日  
**ステータス:** バックエンドサーバー停止中（503エラー）  
**優先度:** 最高（システム全体が利用不可）