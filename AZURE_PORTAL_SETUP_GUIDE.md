# Azure Portal 設定確認・修正手順

## 1. App Service 基本設定の確認・修正

### 1.1 プラットフォーム設定
1. Azure Portal → App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
2. **設定** → **全般設定** をクリック
3. 以下の設定を確認・修正：

```
プラットフォーム: Linux
Node.js バージョン: 20.19.3
Always On: 有効
```

### 1.2 スタートアップコマンド設定
1. **設定** → **全般設定** を開く
2. **スタートアップコマンド** に以下を設定：

```
npm start
```

**重要**: `node production-server.js` ではなく `npm start` を使用

## 2. 環境変数の設定

### 2.1 App Settings の設定
1. **設定** → **アプリケーション設定** をクリック
2. **新しいアプリケーション設定** で以下を追加：

```
NODE_ENV = production
PORT = 8080
JWT_SECRET = emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET = emergency-assistance-session-secret-32chars-minimum
DATABASE_URL = postgresql://username:password@host:port/database?sslmode=require
FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
OPENAI_API_KEY = sk-your_openai_api_key_here
PG_SSL = require
```

### 2.2 既存設定の確認
- 古い設定があれば削除
- `web.config` 関連の設定があれば削除

## 3. セキュリティ設定

### 3.1 認証設定
1. **設定** → **認証** を開く
2. **EasyAuth** が無効になっていることを確認
3. 有効になっている場合は無効化

### 3.2 アクセス制限
1. **設定** → **アクセス制限** を開く
2. 一時的に **Allow all** に設定（復旧後にSWAのOutbound IPに制限）

## 4. 設定保存と再起動

### 4.1 設定の保存
1. すべての設定を **保存** する
2. 設定が正しく保存されたことを確認

### 4.2 App Service の再起動
1. **概要** ページに戻る
2. **再起動** をクリック
3. 再起動が完了するまで待機（約2-3分）

## 5. 設定確認

### 5.1 設定の最終確認
```
✅ プラットフォーム: Linux
✅ Node.js バージョン: 20.19.3
✅ Always On: 有効
✅ スタートアップコマンド: npm start
✅ 環境変数: すべて設定済み
✅ 認証: 無効
✅ アクセス制限: Allow all
```

### 5.2 ログストリームの確認
1. **監視** → **ログストリーム** を開く
2. 再起動後のログを確認
3. エラーがないことを確認

## 6. 次のステップ

Azure Portalでの設定が完了したら、GitHub Actionsでデプロイを実行してください。
