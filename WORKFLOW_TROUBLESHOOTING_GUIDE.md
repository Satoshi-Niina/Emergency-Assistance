# GitHub Actions ワークフロー発火問題の解決策

## 現在の問題
1. **backend.yml が発火しない**
2. **フロントエンドもエラーが出ている**
3. **ワークフローが実行されない**

## 解決策

### 1. GitHub Actions の確認方法

#### 1.1 GitHub リポジトリでの確認
1. **GitHub リポジトリ** → **Actions** タブ
2. **Backend CI/CD** と **Frontend CI/CD** の実行状況を確認
3. **最新のコミット** でワークフローが実行されているか確認

#### 1.2 ワークフローの手動実行
1. **Actions** タブ → **Backend CI/CD** を選択
2. **「Run workflow」** をクリック
3. **「Run workflow」** をクリックして実行

### 2. ワークフローファイルの確認

#### 2.1 backend.yml の確認
```yaml
name: Backend CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

env:
  NODE_VERSION: '18'
  AZURE_WEBAPP_NAME: 'emergencyassistance-sv-fbanemhrbshuf9bd'
  AZURE_WEBAPP_PACKAGE_PATH: 'server'
  NODE_ENV: 'production'
```

#### 2.2 frontend.yml の確認
```yaml
name: Frontend CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

env:
  NODE_VERSION: '18'
```

### 3. トラブルシューティング手順

#### 3.1 ワークフローが発火しない場合
1. **ブランチ名を確認**: `main` ブランチにいるか確認
2. **ファイルパスを確認**: `.github/workflows/` ディレクトリにファイルがあるか確認
3. **YAML構文を確認**: インデントや構文エラーがないか確認
4. **手動実行を試行**: `workflow_dispatch` で手動実行

#### 3.2 フロントエンドエラーの場合
1. **package-lock.json の同期**: `npm install` で更新
2. **Node.js バージョン**: 18 に統一
3. **依存関係の確認**: `npm ci` の代わりに `npm install` を使用

### 4. 修正済みの内容

#### 4.1 Node.js バージョンの統一
- **backend.yml**: `NODE_VERSION: '18'`
- **frontend.yml**: `NODE_VERSION: '18'`

#### 4.2 環境変数の修正
- **WEBSITES_NODE_DEFAULT_VERSION**: `18.17.1`
- **NODEJS_VERSION**: `18.17.1`
- **NODE_VERSION**: `18.17.1`

#### 4.3 web.config の修正
- **nodeProcessCommandLine**: `node production-server.js`

### 5. 確認方法

#### 5.1 GitHub Actions での確認
1. **Actions** タブでワークフローの実行状況を確認
2. **緑色のチェックマーク** で成功を確認
3. **赤色のXマーク** で失敗を確認

#### 5.2 ログの確認
1. **失敗したワークフロー** をクリック
2. **各ステップ** のログを確認
3. **エラーメッセージ** を特定

### 6. 緊急対応

#### 6.1 手動デプロイ
```bash
# ローカルでビルド
npm run build

# Azure CLI でデプロイ
az webapp deployment source config-zip \
  --resource-group <resource-group> \
  --name <app-name> \
  --src <zip-file>
```

#### 6.2 ワークフローの無効化
1. **Actions** タブ → **Backend CI/CD** → **「...」** → **「Disable workflow」**
2. **手動でデプロイ** を実行
3. **問題解決後** にワークフローを再有効化

## 重要なポイント

- **Node.js 18 で統一**
- **ワークフローの手動実行**
- **ログの詳細確認**
- **段階的な問題解決**

## 推奨手順

1. **GitHub Actions でワークフローの実行状況を確認**
2. **手動でワークフローを実行**
3. **エラーログを詳細に確認**
4. **必要に応じて手動デプロイを実行**
