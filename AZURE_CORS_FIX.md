# Azure App Service CORS設定修正ガイド

## 問題
Azure Static Web Apps (`https://witty-river-012f39e00.1.azurestaticapps.net`) から Azure App Service (`https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net`) へのAPIリクエストがCORSエラーで失敗する。

```
Access to fetch at 'https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login'
from origin 'https://witty-river-012f39e00.1.azurestaticapps.net' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 修正内容

### 1. サーバーコードの修正 ✅ 完了
- `server/azure-server.mjs` のCORSヘッダー設定を強化
- `res.setHeader()` → `res.header()` に変更
- OPTIONSリクエスト処理を改善
- `Vary: Origin` ヘッダーを追加

### 2. web.config の修正 ✅ 完了
- `server/web.config` にCORSヘッダーを追加
- IIS/Azure App Service レベルでCORS設定を適用

### 3. Azure Portal での設定 【要実施】

#### Azure App Service のCORS設定

1. **Azure Portal** にアクセス
2. **App Service** を開く: `emergency-assistance-bfckhjejb3fbf9du`
3. 左メニューから **CORS** を選択
4. 以下のオリジンを追加:
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```
5. **「資格情報を許可する」** にチェック ✅
6. **保存** をクリック

#### 環境変数の確認

左メニューから **構成** → **アプリケーション設定** を開き、以下を確認:

```
FRONTEND_URL = https://witty-river-012f39e00.1.azurestaticapps.net
STATIC_WEB_APP_URL = https://witty-river-012f39e00.1.azurestaticapps.net
NODE_ENV = production
```

### 4. デプロイと確認

#### コードのデプロイ
```powershell
# 変更をコミット
git add server/azure-server.mjs server/web.config
git commit -m "fix: Azure App Service CORS設定を強化"
git push origin main
```

#### デプロイ確認
GitHub Actions でデプロイが完了するまで待つ（約5-10分）

#### 動作確認
1. ブラウザで `https://witty-river-012f39e00.1.azurestaticapps.net` を開く
2. ログインを試行
3. ブラウザの開発者ツールで以下を確認:
   - ネットワークタブで `/api/auth/login` のOPTIONSリクエスト
   - レスポンスヘッダーに `Access-Control-Allow-Origin` が含まれているか
   - ステータスコードが `204 No Content` (OPTIONS) → `200 OK` (POST) となっているか

## トラブルシューティング

### まだCORSエラーが出る場合

1. **Azure Portal でCORS設定を確認**
   - `https://witty-river-012f39e00.1.azurestaticapps.net` が追加されているか
   - 「資格情報を許可する」がONになっているか

2. **App Service を再起動**
   ```
   Azure Portal → App Service → 概要 → 再起動
   ```

3. **ログを確認**
   ```
   Azure Portal → App Service → ログストリーム
   ```

   以下のログを探す:
   ```
   🔍 OPTIONS (preflight) request from: https://witty-river-012f39e00.1.azurestaticapps.net
   ✅ OPTIONS request approved for origin: https://witty-river-012f39e00.1.azurestaticapps.net
   ```

4. **curlで直接テスト**
   ```bash
   curl -X OPTIONS \
     -H "Origin: https://witty-river-012f39e00.1.azurestaticapps.net" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -i \
     https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login
   ```

   期待されるレスポンス:
   ```
   HTTP/1.1 204 No Content
   Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
   Access-Control-Allow-Headers: Content-Type, Authorization, ...
   Access-Control-Allow-Credentials: true
   ```

### Azure Portal でCORS設定ができない場合

web.config の設定が優先されるため、以下を確認:

1. `server/web.config` の `<customHeaders>` セクションが正しいか
2. App Service の再起動
3. デプロイログで web.config が正しくデプロイされているか確認

### それでも解決しない場合

コード内で全てのレスポンスに明示的にCORSヘッダーを追加:

```javascript
// server/azure-server.mjs の最上部のミドルウェアに追加
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://witty-river-012f39e00.1.azurestaticapps.net');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
```

## 参考資料
- [Azure App Service CORS設定](https://learn.microsoft.com/ja-jp/azure/app-service/app-service-web-tutorial-rest-api)
- [Express CORS設定](https://expressjs.com/en/resources/middleware/cors.html)
