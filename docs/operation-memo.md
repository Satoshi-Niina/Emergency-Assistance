# 運用メモ

本番環境の運用に関する重要な情報をまとめています。

## CORS設定

### FRONTEND_URL の推奨設定

フロントエンドのドメインを `FRONTEND_URL` 環境変数に設定することで、CORS設定が固定されます。

**設定場所**: Azure Portal > App Service > 構成 > アプリケーション設定

**設定例**:
```
FRONTEND_URL=https://your-frontend.azurestaticapps.net
STATIC_WEB_APP_URL=https://your-frontend.azurestaticapps.net
```

**注意**:
- 複数のフロントエンドドメインがある場合は、カンマ区切りで指定可能
- 本番環境では、必ず実際のフロントエンドURLを設定してください
- 開発環境では `http://localhost:8080` などが使用されます

## 静的ファイルのキャッシュ方針

### client/dist のキャッシュ設定

`server/azure-server.js` で以下の設定が適用されています：

```javascript
app.use(express.static(join(__dirname, '../client/dist'), {
  maxAge: '7d',        // 7日間キャッシュ
  etag: true,          // ETagによるキャッシュ検証
  lastModified: true,   // Last-Modifiedヘッダー
  immutable: true       // 不変ファイルとして扱う
}));
```

**運用上の注意**:
- 静的ファイル（JS、CSS、画像など）は7日間キャッシュされます
- ファイルを変更した場合は、`npm run build` を再実行してビルドを更新してください
- ビルド後、自動的に新しいファイルがデプロイされます
- ブラウザキャッシュをクリアする必要がある場合は、ビルド時にファイル名にハッシュが含まれるため、自動的に新しいファイルが読み込まれます

## Oryx Build ログの確認ポイント

GitHub Actions のログで、以下の順序で処理が実行されることを確認してください：

### 1. Oryx Build の開始

```
Running oryx build...
```

### 2. 依存関係のインストール

```
npm install
```

**確認ポイント**:
- エラーなく完了する
- `package-lock.json` が使用される

### 3. クライアントのビルド

```
npm run build
```

**確認ポイント**:
- `client/dist` ディレクトリが生成される
- ビルドエラーがない

### 4. サーバーの起動

```
npm start
```

**確認ポイント**:
- `server/azure-server.js` が実行される
- ログに起動メッセージが表示される

## Blue-Green デプロイ時の注意点

### /ready エンドポイントの活用

Blue-Green デプロイでは、新しい環境が完全に準備できてからトラフィックを切り替えます。

**手順**:
1. 新しい環境にデプロイ
2. `/ready` エンドポイントで準備完了を確認
3. トラフィックを新しい環境に切り替え
4. 古い環境を停止

**確認コマンド**:
```bash
# 新しい環境の準備確認
curl -H "x-health-token: $HEALTH_TOKEN" https://new-environment.azurewebsites.net/ready

# 期待される応答
# {"status":"ok","missing":[],"timestamp":"..."}
```

### ロールバック時の注意

- ロールバックが必要な場合、前のバージョンに戻す前に `/ready` で確認
- データベースマイグレーションが含まれる場合、ロールバック時の互換性を確認

## 再デプロイ時の注意点

### 1. 環境変数の確認

再デプロイ前に、以下の環境変数が設定されているか確認：

- [ ] `NODE_ENV=production`
- [ ] `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- [ ] `HEALTH_TOKEN`（設定している場合）
- [ ] `FRONTEND_URL`（CORS設定用）
- [ ] `DATABASE_URL`（データベース使用時）
- [ ] `AZURE_STORAGE_CONNECTION_STRING`（ストレージ使用時）

### 2. ビルドキャッシュのクリア

問題が発生した場合、Oryx Build のキャッシュをクリア：

1. Azure Portal > App Service > 「高度なツール（Advanced Tools）」> 「移動（Go）」
2. Kudu コンソールで `D:\home\site\wwwroot` を確認
3. 必要に応じて、App Service を再起動

### 3. ログの確認

再デプロイ後、必ず以下を確認：

- [ ] Azure Log Stream で起動メッセージが表示される
- [ ] `/live` エンドポイントが200で応答する
- [ ] `/ready` エンドポイントが200で応答する（`HEALTH_TOKEN` 設定時は認証付き）

## 監視とアラート

### /live エンドポイントの活用

`/live` エンドポイントは、常時監視用に使用してください。

**推奨設定**:
- Azure Monitor の可用性テストで `/live` を監視
- 応答時間が長い場合や、200以外のステータスコードが返る場合にアラート

**監視設定例**:
```
URL: https://your-app.azurewebsites.net/live
期待されるステータスコード: 200
タイムアウト: 30秒
チェック間隔: 1分
```

### /ready エンドポイントの活用

`/ready` エンドポイントは、デプロイ完了確認やBlue-Green切替時に使用してください。

**使用タイミング**:
- CI/CDパイプラインでのデプロイ完了確認
- Blue-Greenデプロイ時の準備完了確認
- 手動での動作確認

## パフォーマンス最適化

### 1. 静的ファイルの配信

- `client/dist` は7日間キャッシュされるため、初回アクセス後の読み込みが高速
- CDN（Azure Front Door など）を使用する場合は、さらに高速化可能

### 2. データベース接続プール

- 接続プールの設定は `server/azure-server.js` で最適化済み
- 必要に応じて、環境変数で調整可能

### 3. ログレベルの調整

本番環境では、`morgan` のログレベルが `tiny` に設定されています：

```javascript
app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
```

開発環境では `dev` レベルで詳細なログが出力されます。

## セキュリティ

### HEALTH_TOKEN の管理

- `HEALTH_TOKEN` は推測されにくい長い文字列を使用
- 定期的にローテーション（更新）することを推奨
- GitHub Secrets と App Service の環境変数で同じ値を使用

### セッション管理

- セッションシークレットは環境変数 `SESSION_SECRET` で設定
- 本番環境では、必ず強力なシークレットを設定してください

## トラブルシューティング

### よくある問題と対処法

#### 1. デプロイが失敗する

**原因**: Oryx Build のエラー

**対処**:
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true` が設定されているか確認
- GitHub Actions のログでエラーメッセージを確認
- `package.json` の `engines.node` が `>=20.0.0` になっているか確認

#### 2. ヘルスチェックが失敗する

**原因**: サーバーが起動していない、またはエンドポイントが応答しない

**対処**:
- Azure Log Stream で起動メッセージを確認
- `/live` エンドポイントが応答するか確認
- `HEALTH_TOKEN` を設定している場合、GitHub Secrets と一致しているか確認

#### 3. 静的ファイルが読み込めない

**原因**: `client/dist` が生成されていない、またはパスが間違っている

**対処**:
- `npm run build` が成功しているか確認
- `client/dist` ディレクトリが存在するか確認
- デプロイログでビルドが成功しているか確認

## 定期メンテナンス

### 推奨作業

- **週次**: ログの確認、エラーの有無をチェック
- **月次**: Secrets のローテーション検討、依存関係の更新確認
- **四半期**: セキュリティアップデートの適用、パフォーマンスレビュー

### バックアップ

- データベースのバックアップ設定（PostgreSQL使用時）
- 環境変数のエクスポート（設定のバックアップ）

