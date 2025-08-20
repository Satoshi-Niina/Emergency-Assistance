# GitHub シークレット更新ガイド

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
