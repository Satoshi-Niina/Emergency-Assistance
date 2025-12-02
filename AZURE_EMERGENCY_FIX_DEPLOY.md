# Azure App Service - 緊急修正とデプロイ手順

## 問題の要約

### エラー内容
```
1. /api/emergency-flow/list → 403 Forbidden
2. /api/history/machine-data → 404 (実際には403の可能性)
3. /api/history/export-files → 404 (実際には403の可能性)
```

### 根本原因
**Azure App ServiceのEasy Auth（認証機能）が有効になっており、すべてのAPIリクエストが認証によってブロックされている**

---

## 即座に実行すべき修正手順

### ステップ1: Azure Portal でEasy Authを無効化（最優先）

1. **Azure Portalにアクセス**
   - https://portal.azure.com

2. **App Serviceを開く**
   - リソース: `emergency-assistantapp-gwgscxcca5cahyb9`
   - または、検索バーで「emergency-assistantapp」と入力

3. **認証設定を開く**
   - 左メニュー > **設定** セクション > **認証**
   - または、英語の場合: **Settings** > **Authentication**

4. **認証を確認**
   - 現在の状態を確認: 「認証が有効」かどうか
   - 認証プロバイダー（Microsoft、Google、Facebookなど）が設定されているか

5. **認証を無効化**
   - **オプション1（推奨）:** 完全に無効化
     - 「App Service認証」を **オフ** に設定
     - 保存ボタンをクリック
   
   - **オプション2:** APIパスを除外
     - 「App Service認証」は **オン** のまま
     - **詳細** タブを選択
     - 「除外するパス」に `/api/*` を追加
     - 保存ボタンをクリック

6. **App Serviceを再起動**
   - 左メニュー > **概要** > **再起動** ボタンをクリック
   - 再起動完了まで約1-2分待機

---

### ステップ2: 修正されたコードをデプロイ

#### 2-1. ローカルで変更を確認

修正内容:
- `azure-server.mjs` にEasy Auth検出の強化されたデバッグログを追加
- `/api/emergency-flow/list` エンドポイントに詳細なログを追加

#### 2-2. Gitでコミット&プッシュ

```powershell
# 変更をステージング
git add server/azure-server.mjs
git add AZURE_403_ERROR_FIX.md
git add AZURE_EMERGENCY_FIX_DEPLOY.md

# コミット
git commit -m "fix: Add enhanced Easy Auth detection and debug logs for 403 errors"

# プッシュ
git push origin main
```

#### 2-3. Azure App Serviceに自動デプロイ

GitHub ActionsまたはAzure DevOpsが設定されている場合、自動的にデプロイされます。

**手動デプロイが必要な場合:**

```powershell
# Azure CLIでデプロイ
az webapp deployment source config-zip `
  --resource-group rg-emergency-assistantapp `
  --name emergency-assistantapp-gwgscxcca5cahyb9 `
  --src ./deployment-package.zip
```

---

### ステップ3: 動作確認

#### 3-1. ブラウザでフロントエンドにアクセス

URL: https://witty-river-012f39e00.1.azurestaticapps.net/

#### 3-2. ブラウザの開発者ツールを開く

- Windows/Linux: `F12` または `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

#### 3-3. コンソールでエラーを確認

**修正前（エラー）:**
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
❌ APIエラー: 403 Forbidden
```

**修正後（成功）:**
```
✅ フロー一覧取得成功
✅ 履歴データ取得成功
```

#### 3-4. ネットワークタブで確認

1. **Network** タブを開く
2. ページをリロード（Ctrl+R または Cmd+R）
3. 以下のリクエストを確認:
   - `/api/emergency-flow/list` → **200 OK** ✅
   - `/api/history/machine-data` → **200 OK** ✅
   - `/api/history/export-files` → **200 OK** ✅

---

### ステップ4: Azure App Service のログを確認

#### 4-1. ログストリームを開く

1. Azure Portal > App Service > **ログ ストリーム**
2. または、英語の場合: **Log stream**

#### 4-2. デバッグログを確認

**Easy Auth が無効化されている場合（正常）:**
```
[api/emergency-flow/list] ✅ エンドポイントに到達しました
🔍 BLOBストレージからフロー取得
✅ BLOBから X 件のフロー取得
```

**Easy Auth がまだ有効な場合（エラー）:**
```
❌❌❌ CRITICAL: AZURE APP SERVICE EASY AUTH DETECTED ❌❌❌
❌ Path: /api/emergency-flow/list
❌ Easy Authが有効になっているため、APIエンドポイントが403 Forbiddenを返します
```

#### 4-3. Kudu コンソールでログファイルを確認

1. Azure Portal > App Service > **高度なツール** > **移動**
2. または、直接アクセス: https://emergency-assistantapp-gwgscxcca5cahyb9.scm.azurewebsites.net/
3. **Debug console** > **CMD** または **PowerShell** を選択
4. ログファイルに移動:
   ```
   cd D:\home\LogFiles\Application
   type *.txt
   ```

---

## トラブルシューティング

### 問題1: Easy Authを無効化したのに403エラーが続く

**原因:** ブラウザキャッシュ、App Serviceキャッシュ、または設定の反映遅延

**解決方法:**
1. ブラウザでハードリロード（Ctrl+Shift+R または Cmd+Shift+R）
2. ブラウザのキャッシュとCookieをクリア
3. App Serviceを再起動
4. 5-10分待って再試行

### 問題2: 404エラーが404のまま

**原因:** デプロイが完了していない、または`azure-server.mjs`が正しくデプロイされていない

**解決方法:**
1. Azure Portal > App Service > **デプロイセンター** でデプロイステータスを確認
2. Kuduコンソールでファイルを確認:
   ```bash
   cd D:\home\site\wwwroot\server
   dir azure-server.mjs
   findstr "emergency-flow/list" azure-server.mjs
   ```
3. ファイルが存在しない、または古い場合は再デプロイ

### 問題3: BLOBストレージエラー

**エラーメッセージ:**
```
BLOBストレージが設定されていません
BLOBサービスクライアントが利用できません
```

**解決方法:**
1. Azure Portal > App Service > **構成** > **アプリケーション設定**
2. 以下の環境変数を確認:
   - `AZURE_STORAGE_CONNECTION_STRING` が設定されているか
   - `AZURE_STORAGE_CONTAINER_NAME` が `knowledge` に設定されているか
3. 設定が正しい場合は、App Serviceを再起動

### 問題4: CORSエラー

**エラーメッセージ:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決方法:**
1. `azure-server.mjs`のCORS設定を確認（160行目付近）
2. フロントエンドのURLが`allowedOrigins`に含まれているか確認
3. 必要に応じて、環境変数 `FRONTEND_URL` と `STATIC_WEB_APP_URL` を確認

---

## 最終確認チェックリスト

- [ ] Azure PortalでEasy Authが無効化されている
- [ ] App Serviceが再起動されている
- [ ] 修正されたコードがデプロイされている
- [ ] ブラウザでハードリロード実行済み
- [ ] `/api/emergency-flow/list` が 200 OK を返す
- [ ] `/api/history/machine-data` が 200 OK を返す
- [ ] `/api/history/export-files` が 200 OK を返す
- [ ] フロントエンドでフロー一覧が正しく表示される
- [ ] コンソールにエラーメッセージが表示されない

---

## サポート情報

### Azure App Service の診断ツール

1. **診断と問題の解決**
   - Azure Portal > App Service > **診断と問題の解決**
   - 「HTTP 4XX エラー」で検索
   - 403エラーの詳細を確認

2. **アプリケーション ログ**
   - Azure Portal > App Service > **App Service ログ**
   - アプリケーション ログ (ファイル システム) を **オン**
   - 詳細なエラー メッセージを **オン**
   - 保存して再起動

### 関連ドキュメント

- [Azure App Service 認証の概要](https://learn.microsoft.com/ja-jp/azure/app-service/overview-authentication-authorization)
- [Azure App Service での CORS サポート](https://learn.microsoft.com/ja-jp/azure/app-service/app-service-web-tutorial-rest-api)

---

## 緊急時の一時的な回避策

どうしてもすぐに修正できない場合、以下の一時的な回避策を試してください:

### 回避策1: ローカルサーバーを使用

```powershell
# サーバーフォルダに移動
cd server

# ローカルサーバーを起動
npm run dev
```

フロントエンドの `.env` を編集:
```
VITE_API_BASE_URL=http://localhost:3000
```

### 回避策2: Azure Static Web Appsの統合API機能を使用

Static Web AppsにAPI機能を追加し、Azure App Serviceをバイパスします（高度な変更が必要）。

---

**作成日:** 2025年12月2日  
**更新日:** 2025年12月2日  
**バージョン:** 1.0  
**ステータス:** 緊急修正手順
