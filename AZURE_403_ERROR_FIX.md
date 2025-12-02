# Azure App Service 403 Forbidden エラーの修正手順

## 問題の状況
以下のAPIエンドポイントが403 Forbiddenエラーを返す:
- `/api/emergency-flow/list` ← 403エラー
- `/api/history/machine-data` ← 404エラー
- `/api/history/export-files` ← 404エラー

## 原因分析

### 1. `/api/emergency-flow/list`の403エラー
**原因:** Azure App ServiceのEasy Auth（認証機能）が有効になっている可能性が高い

**確認方法:**
1. Azure Portalにアクセス
2. App Service `emergency-assistantapp-gwgscxcca5cahyb9` を開く
3. 左メニュー > **認証** (Authentication) を選択
4. 「認証が有効かどうか」を確認

### 2. `/api/history/machine-data`と`/api/history/export-files`の404エラー
**原因:** これらのエンドポイントは`azure-server.mjs`に実装されている（1178行目と1220行目）ので、404は不正確。実際には403エラーが発生している可能性がある。

---

## 修正方法

### オプション1: Easy Authを完全に無効化（推奨）

#### Azure Portalでの操作:
1. Azure Portal > App Service > **認証** を開く
2. **認証を無効にする** をクリック
3. 保存

#### 期待される結果:
- すべてのAPIエンドポイントが認証なしでアクセス可能になる
- セッションベースの認証は`azure-server.mjs`で独自に実装されているため、セキュリティは維持される

---

### オプション2: APIパスを認証から除外

Easy Authを有効にしたまま、特定のパスを除外する場合:

#### Azure Portalでの操作:
1. Azure Portal > App Service > **認証** を開く
2. **詳細** タブを選択
3. **除外するパス** (Excluded paths) に以下を追加:
   ```
   /api/*
   ```
4. 保存

#### 期待される結果:
- `/api/`以下のすべてのエンドポイントが認証なしでアクセス可能になる
- 静的コンテンツやその他のパスはEasy Authで保護される

---

### オプション3: コードで明示的にEasy Authをバイパス（最終手段）

`azure-server.mjs`に以下のミドルウェアを追加（既に追加済みだが、効いていない可能性）:

```javascript
// Azure App Serviceの認証設定（Easy Auth）の確認
app.use((req, res, next) => {
  if (req.headers['x-ms-client-principal']) {
    console.warn('⚠️ Azure App Service Easy Auth is enabled');
    console.warn('⚠️ X-MS-CLIENT-PRINCIPAL header detected:', req.headers['x-ms-client-principal']);
    console.warn('⚠️ If you are getting 403 errors, disable Easy Auth in Azure Portal or exclude API endpoints');
  }
  next();
});

// すべてのAPIエンドポイントに認証バイパスを追加
app.use('/api/*', (req, res, next) => {
  // Easy Authヘッダーを削除してバイパス
  delete req.headers['x-ms-client-principal'];
  delete req.headers['x-ms-client-principal-id'];
  delete req.headers['x-ms-client-principal-idp'];
  next();
});
```

**注意:** この方法はApp Service側の設定が優先されるため、効果がない可能性が高い。

---

## 推奨される修正手順

### ステップ1: Azure Portalで確認
1. Azure Portal > App Service > **認証** を開く
2. 認証が有効かどうか確認
3. 有効な場合は **認証を無効にする** または **APIパスを除外**

### ステップ2: アプリケーション再起動
1. Azure Portal > App Service > **概要** を開く
2. **再起動** ボタンをクリック

### ステップ3: 動作確認
ブラウザでフロントエンドにアクセスして、以下のエラーが解消されていることを確認:
- `/api/emergency-flow/list` → 200 OK
- `/api/history/machine-data` → 200 OK  
- `/api/history/export-files` → 200 OK

---

## トラブルシューティング

### 問題: 修正後も403エラーが発生する
**原因:** ブラウザキャッシュまたはCDNキャッシュ

**対処法:**
1. ブラウザでハードリロード（Ctrl+Shift+R または Cmd+Shift+R）
2. ブラウザキャッシュをクリア
3. Azure CDNを使用している場合は、CDNキャッシュをパージ

### 問題: 404エラーが404のまま変わらない
**原因:** デプロイが完了していない、またはファイルが正しくデプロイされていない

**対処法:**
1. Azure Portal > App Service > **デプロイセンター** でデプロイステータスを確認
2. App Service の **SSH** または **Kudu** で実際のファイルを確認:
   ```bash
   cd /home/site/wwwroot/server
   ls -la azure-server.mjs
   grep "emergency-flow/list" azure-server.mjs
   ```

### 問題: CORSエラーが発生する
**原因:** CORS設定が正しくない

**対処法:**
`azure-server.mjs`のCORS設定を確認（160行目付近）:
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      FRONTEND_URL,
      STATIC_WEB_APP_URL,
      'http://localhost:5173',
      'http://localhost:5002',
      'http://localhost:3000'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400
};
```

---

## まとめ

**最も可能性の高い原因:** Azure App ServiceのEasy Authが有効になっている

**推奨される修正:** Azure PortalでEasy Authを無効化する

**修正後の確認:** ブラウザでアプリケーションにアクセスし、403エラーが解消されていることを確認

---

## 補足: App Serviceの診断ログを有効化

今後のデバッグのために、App Serviceの診断ログを有効化することを推奨:

1. Azure Portal > App Service > **App Service ログ** を開く
2. **アプリケーション ログ (ファイル システム)** を **オン**
3. **詳細なエラー メッセージ** を **オン**
4. **失敗した要求のトレース** を **オン**
5. 保存

これにより、エラーの詳細なログが `/home/LogFiles/` に保存されます。
