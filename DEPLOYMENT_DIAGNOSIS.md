# デプロイ問題診断レポート

## 🔍 調査日時
2025年11月18日

## 📋 発見された問題点

### 1. APIエンドポイントパス重複問題

#### 問題の詳細
- クライアントの `buildApiUrl()` 関数で `/api` パスが重複する可能性
- `client/src/lib/api/config.ts` と `client/src/lib/api.ts` で異なるURL構築ロジック
- `history.tsx` で `/api/api/` のような重複を手動で修正している箇所

#### 影響範囲
- `/api/auth/login` → `/api/api/auth/login` のような誤ったパス
- 画像URLなどで同様の問題が発生

#### 根本原因
```typescript
// client/src/lib/api.ts
const getApiBaseUrl = (): string => {
    // 環境変数にすでに /api が含まれている場合の処理が不統一
    if (apiBaseUrl.includes('/api')) {
        return `${apiBaseUrl}${cleanPath}`;  // /api/api/... になる可能性
    }
}
```

### 2. CORS設定の複雑さと不安定性

#### 問題の詳細
- `azure-server.mjs` で複数のCORS処理が重複
  - アプリケーションレベルのカスタムミドルウェア
  - `cors()` ミドルウェア
  - レスポンスメソッド（send, json, end）のオーバーライド

#### 影響範囲
- OPTIONS プリフライトリクエストの処理が不安定
- Azure Static Web Apps からのリクエストでCORSエラー頻発

#### 根本原因
```javascript
// server/azure-server.mjs
// 🔥 レスポンス送信前に必ずCORSヘッダーを設定（複雑すぎる実装）
const originalSend = res.send;
const originalJson = res.json;
const originalEnd = res.end;
```

### 3. 環境変数の管理問題

#### 問題の詳細
- 開発環境と本番環境で異なる環境変数設定
- `.env` ファイルが存在しない（`.env.example` のみ）
- デプロイ先での環境変数が正しく読み込まれない可能性

#### 影響範囲
- API Base URLが環境によって不定
- CORS許可オリジンの設定ミス
- データベース接続の失敗

#### 必要な環境変数
**Azure App Service (サーバー):**
- `FRONTEND_URL`: Static Web Apps のURL
- `STATIC_WEB_APP_URL`: Static Web Apps のURL
- `CORS_ALLOW_ORIGINS`: 許可するオリジンのリスト
- `DATABASE_URL`: PostgreSQL接続文字列
- `AZURE_STORAGE_CONNECTION_STRING`: Blob Storage接続文字列
- `NODE_ENV=production`

**Azure Static Web Apps (クライアント):**
- `VITE_API_BASE_URL`: バックエンドAPIのURL

## 🛠️ 修正計画

### 優先度1: APIエンドポイントパス統一
1. `buildApiUrl()` 関数を簡素化
2. `/api` プレフィックスの処理を統一
3. 重複チェック機能を追加

### 優先度2: CORS設定の簡素化
1. アプリケーションレベルのCORS処理を削減
2. `cors` ミドルウェアに一本化
3. Azure Portal でのCORS設定を活用

### 優先度3: 環境変数の明確化
1. `.env.production` ファイルの作成
2. 環境変数検証スクリプトの追加
3. デプロイ前チェックリストの整備

## ✅ 次のステップ
1. API URL構築ロジックの修正
2. CORS設定の簡素化
3. 環境変数設定ガイドの作成
4. ローカルでの本番環境テスト
5. デプロイと動作確認
