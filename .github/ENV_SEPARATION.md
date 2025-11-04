# 環境変数の分離について

GitHub Secretsは1つの場所（**Settings > Secrets and variables > Actions**）にまとまっていますが、**フロントエンドとバックエンドで自動的に分離されて使用されます**。

## 📦 GitHub Secrets（1つの場所）

すべてのシークレットは、GitHubリポジトリの **Settings > Secrets and variables > Actions** に設定します。

```
GitHub Secrets
├── VITE_API_BASE_URL                    ← フロントエンド用
├── DATABASE_URL                         ← バックエンド用
├── JWT_SECRET                           ← バックエンド用
├── SESSION_SECRET                       ← バックエンド用
├── FRONTEND_URL                         ← バックエンド用
├── AZURE_STORAGE_CONNECTION_STRING      ← バックエンド用
├── OPENAI_API_KEY                       ← バックエンド用
└── ...（その他）
```

## 🔄 ワークフローでの自動分離

### フロントエンドワークフロー（`deploy-client-azure.yml`）

**使用する環境変数**:
- `VITE_API_BASE_URL` のみ

**使用方法**:
```yaml
- name: Build client
  env:
    VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL || '/api' }}
  run: npm run build
```

**結果**:
- ビルド時に `VITE_API_BASE_URL` がJavaScriptコードに埋め込まれる
- ビルド後のファイルには環境変数の値が直接書き込まれる
- Azure Static Web Appsには設定不要（ビルド済みファイルをデプロイ）

**Azure Static Web Appsでの設定**:
- ❌ 不要（ビルド時に埋め込まれているため）

### バックエンドワークフロー（`deploy-server-azure.yml`）

**使用する環境変数**:
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `FRONTEND_URL`
- `AZURE_STORAGE_CONNECTION_STRING`
- `OPENAI_API_KEY`
- その他バックエンド用の環境変数

**使用方法**:
```yaml
- name: Set environment variables on Azure App Service
  run: |
    az webapp config appsettings set \
      --name ${{ secrets.AZURE_APP_SERVICE_NAME }} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
      --settings \
        DATABASE_URL="${{ secrets.DATABASE_URL }}" \
        JWT_SECRET="${{ secrets.JWT_SECRET }}" \
        SESSION_SECRET="${{ secrets.SESSION_SECRET }}" \
        FRONTEND_URL="${{ secrets.FRONTEND_URL }}" \
        ...
```

**結果**:
- すべてのバックエンド環境変数がAzure App ServiceのConfigurationに設定される
- 実行時にアプリケーションから `process.env.*` で読み込まれる

**Azure App Serviceでの設定**:
- ✅ 自動設定（ワークフローが自動的に設定）

## 📊 フロー図

```
┌─────────────────────────────────────┐
│   GitHub Secrets                   │
│   (1つの場所)                       │
│                                     │
│   • VITE_API_BASE_URL              │
│   • DATABASE_URL                   │
│   • JWT_SECRET                     │
│   • SESSION_SECRET                 │
│   • FRONTEND_URL                   │
│   • ...                            │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│ フロントエンド  │  │ バックエンド   │
│ ワークフロー   │  │ ワークフロー   │
└──────┬──────┘  └──────┬──────┘
       │                │
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ ビルド時に使用 │  │ Azure App    │
│             │  │ Serviceに   │
│ VITE_API_*  │  │ 設定        │
│             │  │             │
│ → JavaScript│  │ DATABASE_URL│
│   に埋め込み  │  │ JWT_SECRET  │
│             │  │ SESSION_*   │
│             │  │ FRONTEND_*  │
│             │  │ AZURE_*     │
│             │  │ OPENAI_*    │
│             │  │ ...         │
└─────────────┘  └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│Static Web App│  │App Service  │
│             │  │             │
│ 環境変数不要  │  │ 環境変数設定済 │
│ (埋め込み済)  │  │ (実行時使用)  │
└─────────────┘  └─────────────┘
```

## ✅ 分離の確認

### フロントエンド

**GitHub Secretsで設定**:
- `VITE_API_BASE_URL`

**ビルド時に**:
- `VITE_API_BASE_URL` が使用される
- 他の環境変数は使用されない

**デプロイ後**:
- Static Web Appsでは環境変数を設定する必要がない（ビルド時に埋め込まれているため）

### バックエンド

**GitHub Secretsで設定**:
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `FRONTEND_URL`
- `AZURE_STORAGE_CONNECTION_STRING`
- `OPENAI_API_KEY`
- その他

**デプロイ時に**:
- すべてのバックエンド環境変数がAzure App Serviceに設定される
- `VITE_API_BASE_URL` は使用されない（バックエンドでは不要）

**デプロイ後**:
- App ServiceのConfigurationで確認できる
- アプリケーション実行時に `process.env.*` で読み込まれる

## 🔍 確認方法

### フロントエンドの環境変数

**ビルドログで確認**:
1. GitHub Actions > フロントエンドワークフロー
2. **Build client** ステップのログを確認
3. `VITE_API_BASE_URL` が使用されていることを確認

**ビルド後のファイルで確認**:
- ビルド後のJavaScriptファイルに値が直接埋め込まれている

### バックエンドの環境変数

**Azure Portalで確認**:
1. Azure Portal > App Service
2. **Configuration** > **Application settings**
3. すべてのバックエンド環境変数が表示される

**ワークフローログで確認**:
1. GitHub Actions > バックエンドワークフロー
2. **Set environment variables on Azure App Service** ステップのログを確認
3. 設定された環境変数の一覧が表示される

## 📝 まとめ

| 項目 | フロントエンド | バックエンド |
|------|--------------|------------|
| **GitHub Secrets** | 1つの場所にまとまっている | 1つの場所にまとまっている |
| **使用する環境変数** | `VITE_API_BASE_URL` のみ | バックエンド用のすべて |
| **設定タイミング** | ビルド時 | デプロイ時 |
| **設定先** | JavaScriptコードに埋め込み | Azure App Service |
| **Azure Portalでの設定** | 不要 | 自動設定（ワークフローが実行） |
| **実行時の設定** | 不要（埋め込み済み） | 必要（App ServiceのConfiguration） |

## 🎯 重要なポイント

1. **GitHub Secretsは1つの場所**にまとまっていますが、各ワークフローが**必要な環境変数のみを使用**します

2. **フロントエンド**:
   - `VITE_API_BASE_URL` のみ使用
   - ビルド時にJavaScriptに埋め込まれる
   - Static Web Appsでは環境変数を設定する必要がない

3. **バックエンド**:
   - バックエンド用のすべての環境変数を使用
   - Azure App ServiceのConfigurationに自動設定される
   - 実行時に `process.env.*` で読み込まれる

4. **自動分離**:
   - ワークフローファイルで使用する環境変数が明確に分離されている
   - フロントエンドワークフローは `VITE_*` のみ
   - バックエンドワークフローはバックエンド用の環境変数のみ

## 参考

- [環境変数一覧](./ENVIRONMENT_VARIABLES.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE.md)
- [GitHub Secrets設定ガイド](./GITHUB_SECRETS.md)

