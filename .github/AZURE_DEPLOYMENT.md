# Azure App Service デプロイ設定ガイド

このドキュメントでは、Azure App Serviceへのデプロイ設定とトラブルシューティング方法を説明します。

## デプロイ方式

このプロジェクトは**Oryx Build**を使用したデプロイ方式を採用しています。

- ZIP Deployは使用しません
- GitHub Actionsから`azure/webapps-deploy@v3`を使用して`package: .`をデプロイ
- Oryx Buildが自動的に`npm install`、`npm build`、`npm start`を実行

## アプリケーション設定（必須）

Azure Portalで以下の環境変数を設定してください：

### Azure Portalでの設定手順

1. Azure Portalにログイン
2. App Service（`Emergency-Assistance`）を選択
3. **設定** → **構成** → **アプリケーション設定** を開く
4. 以下の設定を追加または確認：

| 設定名 | 値 | 説明 |
|--------|-----|------|
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Oryx Buildを有効化 |
| `WEBSITE_NODE_DEFAULT_VERSION` | `20-lts` | Node.js 20 LTSを使用 |

### Azure CLIでの設定

```bash
az webapp config appsettings set \
  --name Emergency-Assistance \
  --resource-group <ResourceGroupName> \
  --settings \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_NODE_DEFAULT_VERSION=20-lts
```

## スタートアップコマンド設定

**重要**: Oryx Buildを使用する場合、スタートアップコマンドは**未指定でOK**です。

Oryxが自動的にルートの`package.json`の`start`スクリプトを実行します。

ルートの`package.json`には以下の`start`スクリプトが設定されています：

```json
{
  "scripts": {
    "start": "cd server && npm start"
  }
}
```

もし明示的に設定する場合は：

```bash
npm start
```

または：

```bash
bash -lc "npm start"
```

## ヘルスチェックエンドポイント

アプリケーションは以下のエンドポイントでヘルスチェックを提供しています：

- `GET /ping` - 軽量なpingエンドポイント（即座に`pong`を返す）
- `GET /health` - シンプルなヘルスチェック（即座に`OK`を返す）
- `GET /api/ping` - API用pingエンドポイント
- `GET /api/health` - 詳細なヘルスチェック（メモリ、DB状態など）

### エンドポイントの動作

- `/ping` と `/health` は**DB接続を待たずに即座に200を返します**
- `/api/health` は詳細情報を含みますが、DB接続エラーでも200を返します（DB状態は`not_initialized`として表示）

## トラブルシューティング

### 503 Service Unavailable エラー

**原因**:
- アプリケーションが起動していない
- スタートアップコマンドが正しく設定されていない
- ポート設定の問題

**解決方法**:
1. Azure Portal → App Service → **ログ ストリーム** で起動ログを確認
2. `listening on <PORT>` のメッセージが表示されているか確認
3. スタートアップコマンドが正しく設定されているか確認
4. 環境変数（特に`PORT`）が正しく設定されているか確認

### タイムアウトエラー

**原因**:
- アプリケーションの起動に時間がかかっている
- データベース接続の待機

**解決方法**:
1. ヘルスチェックの待機時間を延長（現在120秒）
2. `/ping`エンドポイントを使用（DB待機なし）
3. アプリケーションの起動ログを確認してボトルネックを特定

### ログの確認方法

1. **Azure Portal**:
   - App Service → **ログ ストリーム** でリアルタイムログを確認
   - **監視** → **ログ** で過去のログを確認

2. **確認すべきログメッセージ**:
   ```
   🚀 Azure Server running on 0.0.0.0:8080
   ✅ Server successfully started and listening for requests
   ```

3. **エラーログの例**:
   ```
   ❌ Server failed to start: <error message>
   ❌ FATAL ERROR loading azure-server.js: <error>
   ```

## 環境変数の確認

以下の環境変数が正しく設定されているか確認してください：

- `PORT` - ポート番号（通常は`8080`、Azureが自動設定）
- `NODE_ENV` - `production`
- `DATABASE_URL` - PostgreSQL接続文字列
- `JWT_SECRET` - JWT署名用シークレット
- `SESSION_SECRET` - セッション管理用シークレット
- `FRONTEND_URL` - フロントエンドURL

詳細は [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) を参照してください。

## デプロイ後の確認事項

1. ✅ スタートアップコマンドが正しく設定されている
2. ✅ 環境変数がすべて設定されている
3. ✅ `/ping`エンドポイントが200を返す
4. ✅ `/health`エンドポイントが200を返す
5. ✅ ログに`listening on <PORT>`が表示されている
6. ✅ フロントエンドからログインできる

## 関連ドキュメント

- [環境変数設定](./ENVIRONMENT_VARIABLES.md)
- [GitHub Secrets](./GITHUB_SECRETS.md)
- [デプロイワークフロー](./workflows/README.md)

