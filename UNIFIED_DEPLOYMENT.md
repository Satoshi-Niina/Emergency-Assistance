# 開発環境とデプロイの統一化

## 概要

ローカル開発とAzure本番環境で**同じサーバーコード**（`server/azure-server.mjs`）を使用します。
環境変数で動作を切り替えるため、コードの二重管理が不要になります。

## ローカル開発のセットアップ

### 1. 環境変数の設定

`.env.example`をコピーして`.env`を作成：

```bash
cp .env.example .env
```

`.env`を編集してローカル開発用の値を設定：

```env
NODE_ENV=development
PORT=8080
FRONTEND_URL=http://localhost:5173
STORAGE_MODE=local
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. サーバーの起動

```bash
npm run dev
```

クライアント（Vite）は別途起動：

```bash
cd client
npm run dev
```

## Azure本番環境のセットアップ

### 1. Azure App Serviceの環境変数

Azure Portal → App Service → 構成 → アプリケーション設定で以下を設定：

```
NODE_ENV=production
DATABASE_URL=<PostgreSQL接続文字列>
PG_SSL=require
SESSION_SECRET=<ランダムな文字列>
JWT_SECRET=<ランダムな文字列>
OPENAI_API_KEY=<OpenAI APIキー>
FRONTEND_URL=<Static Web Apps URL>
STATIC_WEB_APP_URL=<Static Web Apps URL>
CORS_ALLOW_ORIGINS=<Static Web Apps URL>,http://localhost:5173
AZURE_STORAGE_CONNECTION_STRING=<Azure Storage接続文字列>
AZURE_STORAGE_CONTAINER_NAME=knowledge
STORAGE_MODE=hybrid
LOCAL_EXPORT_DIR=/app/knowledge-base/exports
FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
WEBSITES_PORT=8080
```

### 2. GitHub Secretsの設定

GitHub Repository → Settings → Secrets and variables → Actions で設定：

- `AZURE_CREDENTIALS`: Azureサービスプリンシパル
- `ACR_LOGIN_SERVER`: Azure Container Registry URL
- `ACR_USERNAME`: ACRユーザー名
- `ACR_PASSWORD`: ACRパスワード
- `AZURE_RESOURCE_GROUP`: リソースグループ名
- `DATABASE_URL`: PostgreSQL接続文字列
- その他必要な環境変数

### 3. デプロイ

```bash
git add .
git commit -m "your message"
git push origin main
```

GitHub Actionsが自動的にビルド・デプロイを実行します。

## サーバーコードの統一

### ローカル開発（以前）
- `server/unified-hot-reload-server.js`を使用
- SQLiteデータベース
- ローカルファイルシステム

### ローカル開発（現在）
- `server/azure-server.mjs`を使用
- SQLiteデータベース
- ローカルファイルシステム
- **本番と同じコード**

### Azure本番環境
- `server/azure-server.mjs`を使用
- PostgreSQLデータベース
- Azure BLOB Storage
- **ローカルと同じコード**

## 環境による動作の違い

`azure-server.mjs`は環境変数に応じて自動的に動作を切り替えます：

| 機能 | ローカル | 本番 |
|------|---------|------|
| データベース | SQLite（自動作成） | PostgreSQL |
| ファイルストレージ | ローカルFS | Azure BLOB |
| .env読み込み | あり | なし（Azure設定） |
| ホットリロード | なし | なし |

## トラブルシューティング

### ローカルでエラーが出る場合

1. `.env`ファイルが存在するか確認
2. `node_modules`を再インストール：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. ポート8080が使用されていないか確認

### デプロイ後にAPIエラーが出る場合

1. Azure App Serviceの環境変数が正しく設定されているか確認
2. ログを確認：
   ```bash
   az webapp log tail --name <app-name> --resource-group <resource-group>
   ```
3. PostgreSQLへの接続を確認
4. BLOB Storageの接続を確認

## チーム開発のベストプラクティス

1. **環境変数は`.env`に保存、Gitにコミットしない**
   - `.gitignore`に`.env`が含まれていることを確認

2. **新しい環境変数を追加した場合**
   - `.env.example`も更新する
   - チームに共有する
   - Azure App Serviceの設定も更新する

3. **APIエンドポイントを追加した場合**
   - `server/azure-server.mjs`のみを編集
   - ローカルでテスト
   - デプロイして本番で確認

4. **データベーススキーマを変更した場合**
   - マイグレーションスクリプトを作成
   - ローカルと本番の両方で実行
