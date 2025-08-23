# Azure Static Web Apps へのデプロイ修正報告

## 問題の分析

1. **CORS エラー**: フロントエンドからバックエンドAPIへのアクセスでCORSエラーが発生
2. **404 エラー**: `/api/auth/login` エンドポイントが存在しない
3. **設定ミス**: 外部Azure App Serviceに向けていたAPIを内部API Functionsに変更が必要

## 実装した修正

### 1. Azure Functions API エンドポイントの作成

- `/api/auth/login/index.ts` - ログイン認証API
- `/api/auth/me/index.ts` - 認証状態確認API  
- `/api/health/index.ts` - ヘルスチェックAPI

### 2. CORS設定の改善

すべてのAPI FunctionsでCORSヘッダーを適切に設定：
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};
```

### 3. staticwebapp.config.json の修正

外部APIリダイレクトを削除し、内部API Functionsを使用するように設定変更。

### 4. フロントエンド API設定の修正

Azure Static Web Apps環境でのAPI URLを同一ドメインに設定：
```typescript
// Azure Static Web Apps でのAPI Functionsを使用
return window.location.origin; // 同じドメインのAPI Functionsを使用
```

### 5. 認証ユーザーの追加

テスト用ユーザーを追加：
- admin / password
- niina / 0077
- test / test
- demo / demo

## 次のステップ

1. **Azure Static Web Apps へ再デプロイ**
2. **API Functionsの動作確認**
3. **ログイン機能のテスト**

## テスト用認証情報

ユーザー名: `niina`  
パスワード: `0077`

または

ユーザー名: `test`  
パスワード: `test`
