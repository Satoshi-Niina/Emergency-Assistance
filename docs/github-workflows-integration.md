# GitHub Actions ワークフロー統合完了

## ✅ 統合完了したワークフロー

### 📱 フロントエンド: `cliente-azure.yml`
- **用途**: Azure Static Web Apps へのクライアントデプロイ
- **対応環境**: Production + Staging
- **トリガー**: `main`, `develop` ブランチへのプッシュ + 手動実行
- **最適化**:
  - 環境別の自動設定
  - ビルド最適化
  - ヘルスチェック
  - バックエンド統合テスト

### 🖥️ サーバー: `server-azure.yml`
- **用途**: Azure App Service へのサーバーデプロイ
- **対応環境**: Production + Staging（別ジョブ）
- **トリガー**: `main`, `develop` ブランチへのプッシュ + 手動実行
- **最適化**:
  - タイムアウト対策（45分/30分）
  - 並列依存関係インストール
  - 本番用パッケージ最適化
  - Oryx ビルド最適化
  - 環境別ヘルスチェック

## 🗑️ 削除済みの旧ワークフロー

以下のファイルは統合により不要になったため削除済み：

- `client-azure.yml` → `cliente-azure.yml` に統合
- `server.yml` → `server-azure.yml` に統合
- `deploy-client-azure.yml` → `cliente-azure.yml` に統合
- `deploy-server-app-service.yml` → `server-azure.yml` に統合
- `deploy-server-app-service-optimized.yml` → `server-azure.yml` に統合
- `deploy-staging.yml` → `server-azure.yml` に統合

## 🔧 必要なGitHub Secrets

### Production
- `AZURE_WEBAPP_PUBLISH_PROFILE` - サーバー本番環境
- `AZURE_STATIC_WEB_APPS_API_TOKEN` - クライアント本番環境
- `VITE_BACKEND_SERVICE_URL` - バックエンドURL（オプション）
- `VITE_API_BASE_URL` - APIベースURL（オプション）

### Staging（オプション）
- `AZURE_WEBAPP_PUBLISH_PROFILE_STAGING` - サーバーステージング環境
- `AZURE_STATIC_WEB_APPS_API_TOKEN_STAGING` - クライアントステージング環境
- `VITE_BACKEND_SERVICE_URL_STAGING` - ステージングバックエンドURL

## 🚀 デプロイ方法

### 自動デプロイ
```bash
# Production デプロイ（main ブランチ）
git push origin main

# Staging デプロイ（develop ブランチ）
git push origin develop
```

### 手動デプロイ
1. GitHub > Actions タブ
2. ワークフロー選択（`Deploy Client` または `Deploy Server`）
3. "Run workflow" > 環境選択 > "Run workflow"

## ⚡ 主な改善点

1. **タイムアウト対策**: 30分→45分（サーバー本番）、30分（ステージング）
2. **統合管理**: 2つのファイルで全環境をカバー
3. **環境自動判定**: ブランチベースの環境切り替え
4. **最適化**: 並列処理、キャッシュ活用、パッケージ軽量化
5. **監視強化**: 詳細なヘルスチェックと統合テスト

## 📊 デプロイ時間の期待値

- **フロントエンド**: 5-10分
- **サーバー（本番）**: 15-25分（従来30分+）
- **サーバー（ステージング）**: 10-20分

## 🔍 トラブルシューティング

### デプロイ失敗時
1. GitHub Actions ログを確認
2. Azure Portal でアプリの状態確認
3. Kudu Console で詳細ログ確認
4. 必要に応じて `scripts/emergency-deploy.ps1` を使用

統合完了により、デプロイプロセスがより効率的で管理しやすくなりました！

## 🔄 更新履歴

- **2025/11/12**: ワークフローファイル統合完了、タイムアウト対策実装
