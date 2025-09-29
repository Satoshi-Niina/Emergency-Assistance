# Azure App Service Linux 環境 完全設定ガイド

## 根本的な問題の解決

### 問題の原因
1. **プラットフォームの矛盾**: Azure App Service Linux環境でWindows用の`web.config`を使用
2. **スタートアップ設定の不整合**: Linux環境では`package.json`の`start`スクリプトが使用される
3. **依存関係の解決失敗**: `node_modules`が正しくインストールされていない

### 解決策

## 1. Azure Portal での設定

### 1.1 基本設定
```
プラットフォーム: Linux
Node.js バージョン: 20.19.3
Always On: 有効
```

### 1.2 スタートアップコマンド
```
npm start
```
**重要**: `node production-server.js` ではなく `npm start` を使用

### 1.3 環境変数 (App Settings)
```
NODE_ENV=production
PORT=8080
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
SESSION_SECRET=your_session_secret_here_minimum_32_characters
DATABASE_URL=postgresql://username:password@host:port/database
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY=sk-your_openai_api_key_here
PG_SSL=require
```

## 2. ファイル構成

### 2.1 削除すべきファイル
- `web.config` (Windows IIS用、Linuxでは無効)

### 2.2 必要なファイル
- `package.json` (startスクリプトが重要)
- `production-server.js` (メインアプリケーションファイル)
- `node_modules/` (依存関係)

## 3. package.json の設定

```json
{
  "name": "emergency-assistance-server",
  "version": "1.0.0",
  "type": "module",
  "main": "production-server.js",
  "scripts": {
    "start": "node production-server.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "helmet": "^8.1.0",
    "morgan": "^1.10.1",
    "express-session": "^1.18.2",
    "cookie-parser": "^1.4.7",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "pg": "^8.16.3"
  }
}
```

## 4. デプロイプロセス

### 4.1 GitHub Actions での処理
1. `server`ディレクトリをクリーンアップ
2. `npm install --production` で依存関係をインストール
3. `package.json`の`start`スクリプトを確認
4. Azure App Serviceにデプロイ

### 4.2 Azure App Service での起動
1. `npm start` が実行される
2. `package.json`の`start`スクリプトが`node production-server.js`を実行
3. アプリケーションが起動

## 5. トラブルシューティング

### 5.1 ログの確認
```bash
# Azure Portal → App Service → Monitoring → Log stream
# 期待されるログ:
# npm start
# node production-server.js
# 🚀 Server running on 0.0.0.0:8080
```

### 5.2 よくあるエラー

**`Cannot find package 'express'`**:
- `node_modules`が存在しない
- `npm install`が実行されていない
- デプロイパッケージに`node_modules`が含まれていない

**`Module not found`**:
- ESMモジュールの設定問題
- `package.json`の`"type": "module"`を確認

**`Startup command failed`**:
- `package.json`の`start`スクリプトが正しくない
- スタートアップコマンドが`npm start`になっていない

## 6. ローカル環境への影響

### 6.1 ローカル開発
- ローカル環境には影響なし
- `tsx`を使用した開発環境は維持
- `npm run dev`でローカル開発可能

### 6.2 本番環境
- Azure App Service Linux環境でのみ適用
- `web.config`の削除は本番環境のみ
- ローカル環境では`web.config`は使用されない

## 7. 確認手順

### 7.1 デプロイ前の確認
```bash
# ローカルでテスト
cd server
npm install
npm start
# 正常に起動することを確認
```

### 7.2 デプロイ後の確認
```bash
# ヘルスチェック
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health

# Ping テスト
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping
```

## 8. 重要なポイント

1. **Linux環境では`web.config`は無効**
2. **`npm start`がスタートアップコマンド**
3. **`package.json`の`start`スクリプトが重要**
4. **`node_modules`が正しくインストールされている必要がある**
5. **ローカル環境には影響なし**
