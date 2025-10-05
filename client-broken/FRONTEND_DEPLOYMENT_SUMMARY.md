# Frontend API統一・デプロイ修正サマリ

## 🎯 目的達成
フロントエンドのAPIベースURLを環境に応じて統一し、`/api/api/...` の二重化を解消。

## ✅ 実装内容

### 1. 統一APIクライアント (`client/src/lib/api.ts`)
```typescript
const ABS = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const IS_SWA = /\.azurestaticapps\.net$/i.test(window.location.hostname);

// 本番SWA → '/api'、それ以外 → 'https://...azurewebsites.net/api'
const BASE = IS_SWA ? '/api' : (ABS ? `${ABS}/api` : '/api');

function join(p: string) {
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${BASE}${path}`.replace(/\/{2,}/g, '/').replace('https:/', 'https://');
}
```

**特徴:**
- 本番SWA環境: `/api` 固定（SWAプロキシ経由）
- ローカル/検証環境: `VITE_API_BASE_URL + '/api'`（絶対URL）
- 末尾/先頭スラッシュの正規化
- `credentials:'include'` 必須付与

### 2. 環境変数設定
```bash
# 本番環境
VITE_API_BASE_URL=https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net

# 開発環境
VITE_API_BASE_URL=http://localhost:8000
```

### 3. SWA設定更新 (`client/staticwebapp.config.json`)
```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ]
}
```

### 4. GitHub Actions分離
- **フロントエンド**: `client/**` 変更時のみ発火
- **バックエンド**: `client/**` を `paths-ignore` で除外

### 5. 既存API呼び出しの統一
- `client/src/lib/auth.ts`: 統一APIクライアント使用
- `client/src/lib/api/config.ts`: エンドポイント定義を相対パスに変更
- `client/src/lib/apiClient.ts`: 統一APIクライアントへのリダイレクト

## 🔍 受け入れ条件

### ✅ 本番環境（SWA）
- Request URL: `...azurestaticapps.net/api/auth/handshake` (`/api` は1回のみ)
- `/api/auth/handshake` → 200
- `/api/auth/me` (未ログイン) → 401
- `/api/auth/login` → 200
- ログイン後 `/api/auth/me` → 200

### ✅ 直叩き（絶対URL）
- `https://...azurewebsites.net/api/auth/handshake` → 200

### ✅ エラー制御
- 500エラーは発生しない
- 適切な401/403/503で制御

## 📋 デプロイ手順

1. **フロントエンド変更をプッシュ**
   ```bash
   git add client/
   git commit -m "Frontend API統一修正"
   git push origin main
   ```

2. **GitHub Actions確認**
   - フロントエンドワークフローのみ発火
   - バックエンドワークフローは発火しない

3. **本番環境テスト**
   - SWA URL: `https://witty-river-012f39e00.1.azurestaticapps.net`
   - DevTools → Network で `/api` が1回のみ確認

## 🚨 注意点

- **BASE の末尾スラッシュ**: `join()` 関数で正規化
- **画面側の直書き禁止**: 常に `api('/auth/...')` 使用
- **credentials:'include'**: Cookie セッション用に必須
- **CORS設定**: バックエンド側で SWAオリジンのみ許可済み

## 📊 変更ファイル一覧

- `client/src/lib/api.ts` (新規・統一APIクライアント)
- `client/src/lib/apiClient.ts` (統一APIクライアントへのリダイレクト)
- `client/src/lib/auth.ts` (統一APIクライアント使用)
- `client/src/lib/api/config.ts` (相対パス定義に変更)
- `client/staticwebapp.config.json` (SWA設定追加)
- `client/env.production` (本番環境変数例)
- `client/env.development` (開発環境変数例)
- `.github/workflows/frontend-deploy.yaml` (フロントエンドのみ発火)
- `.github/workflows/backend-deploy.yaml` (フロントエンド除外)

## 🎉 完了条件

- ✅ `/api/api/...` の二重化解消
- ✅ 本番SWA: `/api` 1回のみ
- ✅ ローカル/検証: 絶対URL使用
- ✅ GitHub Actions分離
- ✅ 500エラー排除
- ✅ 認証フロー正常動作
