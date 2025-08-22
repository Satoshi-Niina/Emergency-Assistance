# GitHub Secrets 更新ガイド - Function App デプロイメント

このドキュメントでは、新しい Function App デプロイメントワークフロー用に GitHub Secrets を更新する方法を説明します。

## 🎯 新しいデプロイメント戦略

**GitHub Actions + Azure Function App** による自動デプロイメントを設定します。

## 🆕 新規追加が必要な Secrets

以下の Secrets を新たに追加してください：

### `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`

**説明**: Function App の発行プロファイル  
**取得方法**:

1. Azure Portal で Function App `emergency-backend-api-v2` を開く
2. 「概要」→「発行プロファイルの取得」をクリック
3. ダウンロードしたファイルの内容全体をコピー
4. GitHub Secrets に貼り付け

### `FRONTEND_URL`

**値**: `https://witty-river-012f39e00.1.azurestaticapps.net`

### `JWT_SECRET`

**値**: `emergency-assistance-jwt-secret-2025`

### `SESSION_SECRET`

**値**: `emergency-assistance-session-secret-2025-azure`

## 🔄 既存 Secrets の確認が必要

以下の Secrets が既に存在することを確認してください：

### `AZURE_CREDENTIALS`

**現在の値**: Service Principal 認証情報（JSON 形式）
**確認方法**: GitHub リポジトリ Settings > Secrets and variables > Actions

### `DATABASE_URL`

**期待される値**: `postgresql://satoshi_niina@emergencyassistance-db.postgres.database.azure.com:5432/webappdb?sslmode=require`

### `OPENAI_API_KEY`

**期待される値**: `sk-proj-...` で始まる API キー

## 📋 設定手順

### 1. 発行プロファイルの取得

```bash
# Azure CLIでも取得可能
az functionapp deployment list-publishing-profiles \
  --name emergency-backend-api-v2 \
  --resource-group rg-Emergencyassistant-app
```

### 2. GitHub Secrets の設定

1. GitHub リポジトリ `https://github.com/Satoshi-Niina/Emergency-Assistance` を開く
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** → **Actions** をクリック
4. **New repository secret** をクリックして新しい Secrets を追加

### 3. 設定完了後のテスト

```bash
# ワークフローの手動実行でテスト
# GitHub Actions タブで「Deploy Function App to Azure」を選択
# 「Run workflow」をクリック
```

## 🚀 デプロイメント実行

Secrets の設定完了後：

1. `api/` ディレクトリに変更をコミット・プッシュ
2. または、GitHub Actions で手動実行

### 手動実行方法

1. GitHub リポジトリの **Actions** タブを開く
2. **Deploy Function App to Azure** ワークフローを選択
3. **Run workflow** をクリック
4. ターゲット Function App を選択（デフォルト: `emergency-backend-api-v2`）
5. **Run workflow** を実行

## ⚠️ 重要な注意事項

### セキュリティ

- Service Principal には最小権限のみ付与
- 発行プロファイルは定期的に更新
- API キーは定期的にローテーション

### デプロイメント前の確認

- [ ] すべての Secrets が正しく設定されている
- [ ] Function App `emergency-backend-api-v2` が存在している
- [ ] データベース接続が有効

### トラブルシューティング

- **認証エラー**: `AZURE_CREDENTIALS`の形式確認
- **デプロイエラー**: 発行プロファイルの再取得
- **設定エラー**: 各環境変数の値確認

## 📊 成功の確認方法

デプロイメント成功後、以下のエンドポイントをテスト：

```bash
# 基本接続テスト
curl https://emergency-backend-api-v2.azurewebsites.net/

# 認証エンドポイントテスト
curl https://emergency-backend-api-v2.azurewebsites.net/api/auth/me

# OPTIONS リクエストテスト
curl -X OPTIONS https://emergency-backend-api-v2.azurewebsites.net/api/auth/login
```

## 📋 現在の Azure リソース状況

### 🆕 新しい Function App (使用中)

- **リソース名**: `emergency-backend-api-v2`
- **URL**: https://emergency-backend-api-v2.azurewebsites.net
- **状態**: ✅ 作成済み（デプロイ待ち）
- **プラン**: Windows Consumption Plan

### 🔄 フロントエンド (稼働中)

- **リソース名**: `Emergencyassistance-swa`
- **URL**: https://witty-river-012f39e00.1.azurestaticapps.net
- **状態**: ✅ 稼働中（URL 更新済み）

### 📊 データベース (稼働中)

- **リソース名**: `emergencyassistance-db`
- **ホスト**: emergencyassistance-db.postgres.database.azure.com
- **状態**: ✅ 稼働中（4 ユーザー確認済み）

## 🔧 削除対象の古い Secrets

以下の古い Secrets は削除可能です（オプション）：

- `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` (古いトークン)
- 旧 Function App 関連の設定

## 📞 サポート

問題が発生した場合：

1. GitHub Actions の実行ログを確認
2. Azure Portal で Function App のログを確認
3. このガイドのトラブルシューティングセクションを参照

## 🎯 次のステップ

1. **GitHub Secrets の設定** （最優先）
2. **ワークフローの手動実行**
3. **エンドポイントの動作確認**
4. **フロントエンドでのログインテスト**

## 🔑 必要なシークレットの設定

Azure 環境が正常に動作するため、以下の GitHub シークレットを設定する必要があります。

### 1. GitHub リポジトリでの設定方法

1. https://github.com/Satoshi-Niina/Emergency-Assistance にアクセス
2. "Settings" タブをクリック
3. 左メニューから "Secrets and variables" > "Actions" を選択
4. "New repository secret" をクリック

### 2. 設定が必要なシークレット

#### ✅ 更新済み - Static Web App デプロイトークン

```
名前: AZURE_STATIC_WEB_APPS_API_TOKEN_WITTY_RIVER_012F39E00
値: efcc57004d1768537c7c7e656ddccf9e21c4a14ff704af369654bb36b565a4dd01-acc6f52a-c206-46a2-862d-959e9917e9e80002922012f39e00
```

#### ✅ 更新済み - バックエンド API URL

```
名前: VITE_API_BASE_URL
値: https://emergency-backend-api-efg6gaawcjdmaggy.japanwest-01.azurewebsites.net
```

### 3. 現在の Azure リソース状況

#### フロントエンド (Azure Static Web Apps)

- **リソース名**: `Emergencyassistance-swa`
- **URL**: https://witty-river-012f39e00.1.azurestaticapps.net
- **状態**: ✅ 稼働中
- **リソースグループ**: `rg-Emergencyassistant-app`

#### バックエンド (Azure Functions)

- **リソース名**: `emergency-backend-api`
- **URL**: https://emergency-backend-api-efg6gaawcjdmaggy.japanwest-01.azurewebsites.net
- **状態**: ✅ 稼働中 (起動済み)
- **リソースグループ**: `rg-Emergencyassistant-app`

#### データベース (PostgreSQL)

- **リソース名**: `emergencyassistance-db`
- **ホスト**: emergencyassistance-db.postgres.database.azure.com
- **状態**: ✅ 稼働中 (起動済み)
- **リソースグループ**: `rg-Emergencyassistant-app`

#### ストレージ (Azure Storage)

- **リソース名**: `rgemergencyassistanb25b`
- **状態**: ✅ 稼働中
- **リソースグループ**: `rg-Emergencyassistant-app`

### 4. 削除が必要な古いシークレット

以下の古いシークレットは削除してください：

- `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` (古いトークン)

### 5. デプロイ手順

上記のシークレットを設定後：

1. GitHub リポジトリの "Actions" タブに移動
2. "Frontend Build & Azure Deploy" ワークフローを手動実行
3. "Run workflow" をクリックして実行

### 6. 確認方法

デプロイ完了後、以下の URL でアプリケーションにアクセス可能：

- **フロントエンド**: https://witty-river-012f39e00.1.azurestaticapps.net
- **バックエンド API**: https://emergency-backend-api-efg6gaawcjdmaggy.japanwest-01.azurewebsites.net

### 7. トラブルシューティング

#### Functions App が動作しない場合

1. 環境変数の設定を確認
2. データベース接続文字列の設定
3. アプリケーションログの確認

#### Static Web App のデプロイに失敗する場合

1. API トークンが正しく設定されているか確認
2. リポジトリの権限設定を確認
3. ビルド設定の確認

## 🎯 **即座に必要なアクション**

### 1. GitHub シークレットの更新（最優先）

以下のシークレットを GitHub リポジトリの設定で**今すぐ**更新してください：

#### ✅ **新しい API トークン（必須）**

```
名前: AZURE_STATIC_WEB_APPS_API_TOKEN_WITTY_RIVER_012F39E00
値: efcc57004d1768537c7c7e656ddccf9e21c4a14ff704af369654bb36b565a4dd01-acc6f52a-c206-46a2-862d-959e9917e9e80002922012f39e00
```

#### ✅ **新しいバックエンド URL（必須）**

```
名前: VITE_API_BASE_URL
値: https://emergency-backend-app.azurewebsites.net
```

#### ❌ **削除が必要な古いシークレット**

- `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` (削除してください)

### 2. GitHub で設定する手順

1. **リポジトリにアクセス**: https://github.com/Satoshi-Niina/Emergency-Assistance
2. **Settings タブ** → **Secrets and variables** → **Actions**
3. **新しいシークレットを追加**:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_WITTY_RIVER_012F39E00`
   - `VITE_API_BASE_URL`
4. **古いシークレットを削除**:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000`

### 3. ワークフロー実行

シークレット設定後：

1. **Actions** タブに移動
2. **"Frontend Build & Azure Deploy"** を手動実行
3. **Run workflow** をクリック

## � **現在の状況サマリー**

## 🔧 追加で必要な修正

### Functions App の環境変数設定

バックエンドが正常に動作するには、以下の環境変数の設定が必要です：

- `DATABASE_URL`: PostgreSQL 接続文字列
- `JWT_SECRET`: JWT 署名用のシークレット
- `SESSION_SECRET`: セッション管理用のシークレット
- `OPENAI_API_KEY`: OpenAI API キー（オプション）

これらは Azure Portal の Functions App の設定画面で行うか、Azure CLI で設定できます。
