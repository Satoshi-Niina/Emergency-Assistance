# デプロイメント修正チェックリスト

## 実施した修正

### 1. backend-deploy.yml の修正
- ✅ 最小サーバー生成を撤廃
- ✅ 本来のAPIコード全体をデプロイするように変更
- ✅ サーバー、共有ファイル、ナレッジベース、マイグレーションファイルを含む完全なパッケージ化
- ✅ npm run build でTypeScriptコンパイルを実行

### 2. DB疎通確認エンドポイントの実装
- ✅ `/db-ping` エンドポイントを追加
- ✅ `SELECT NOW()` クエリでDB接続確認
- ✅ エラー処理とレスポンス詳細情報を含む

### 3. データベース設定の改善
- ✅ Azure PostgreSQL対応のSSL設定
- ✅ 本番環境用のprepare: false設定
- ✅ 環境変数の詳細ログ出力

### 4. フロントエンド設定の改善
- ✅ Azure Static Web Apps → Azure App Service の正しい接続設定
- ✅ 本番環境用の VITE_API_BASE_URL 設定
- ✅ 型定義ファイル (vite-env.d.ts) を追加

## Azure App Settings で設定が必要な環境変数

### バックエンド (emergency-backend-webapp)
```
DATABASE_URL=postgresql://username:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
SESSION_SECRET=emergency-assistance-session-secret-production-2024
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### フロントエンド (Static Web Apps)
```
VITE_API_BASE_URL=https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net
```

## 疎通確認用エンドポイント

### 1. DB疎通確認
```
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/db-ping
```

### 2. API基本ヘルスチェック
```
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/health
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
```

### 3. データベースチェック
```
GET https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/db-check
```

## デプロイ後の確認手順

1. **バックエンドAPI確認**
   ```bash
   curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/health
   curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/db-ping
   ```

2. **フロントエンド確認**
   - Azure Static Web Apps にアクセス
   - ブラウザの開発者ツールでAPI接続ログを確認

3. **CORS設定確認**
   - フロントエンドからバックエンドAPIへのリクエストが正常に通るか確認

## トラブルシューティング

### データベース接続エラーの場合
1. DATABASE_URL の設定を確認
2. PostgreSQLサーバーのファイアウォール設定を確認
3. SSL証明書の設定を確認

### API接続エラーの場合
1. CORS設定を確認
2. VITE_API_BASE_URL の設定を確認
3. Azure App Service の起動状況を確認

### 環境変数設定の確認
1. Azure Portal → App Services → 設定 → 構成
2. 必要な環境変数がすべて設定されているか確認
