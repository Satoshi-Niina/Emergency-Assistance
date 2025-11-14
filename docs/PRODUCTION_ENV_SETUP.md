# 本番環境の環境変数設定ガイド

## Azure Static Web Apps の環境変数

### フロントエンド設定
```
VITE_API_BASE_URL=https://your-app-service-name.azurewebsites.net/api
VITE_BACKEND_SERVICE_URL=https://your-app-service-name.azurewebsites.net
```

### バックエンド（Azure App Service）設定
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@server:5432/database
JWT_SECRET=your-strong-jwt-secret-here
SESSION_SECRET=your-strong-session-secret-here
FRONTEND_URL=https://your-static-web-app.azurestaticapps.net
CORS_ALLOW_ORIGINS=https://your-static-web-app.azurestaticapps.net
OPENAI_API_KEY=your-openai-api-key-here
```

## 修正内容のまとめ

### 1. API URL重複問題の修正
- `buildApiUrl` 関数を改善して `/api/api/emergency-flow/list` の重複を回避
- より堅牢なURL構築ロジックを実装

### 2. ビルド設定の最適化
- ファイル名にハッシュを追加してキャッシュ問題を回避
- 自動的な古いファイル削除（emptyOutDir: true）
- prebuildスクリプトでの確実なクリーニング

### 3. 開発サーバーの起動
- 統一サーバー（unified-hot-reload-server.js）でフロントエンドとバックエンドを同時起動
- ポート8080でアクセス可能
- ホットリロード対応

## 本番デプロイ時の注意点

1. **ビルドの必要性**: 必ず `npm run build` を実行してから本番デプロイ
2. **環境変数の設定**: Azure の設定画面で上記の環境変数を設定
3. **キャッシュクリア**: 新しいビルドファイルのハッシュにより、古いキャッシュは自動的に無効化
4. **API エンドポイント**: 本番環境では正しいAPI Base URLが設定されていることを確認

## 動作確認方法

### 開発環境
```bash
cd server
node unified-hot-reload-server.js
# ブラウザで http://localhost:8080 にアクセス
```

### 本番環境
- Azure Static Web Apps の URL にアクセス
- ブラウザのデベロッパーツールでAPI リクエストのURL を確認
- `/api/api/emergency-flow/list` ではなく `/api/emergency-flow/list` になっていることを確認
