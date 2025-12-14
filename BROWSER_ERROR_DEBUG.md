# ブラウザでの500エラー診断手順

## 問題
- CLIでのテストは成功（200 OK）
- ブラウザでは500エラーが表示される

## 原因の可能性

### 1. ブラウザキャッシュ
**最も可能性が高い**

#### 対処方法
1. **ハードリフレッシュ**
   - Chrome/Edge: `Ctrl + Shift + R` または `Ctrl + F5`
   - Firefox: `Ctrl + Shift + R`
   - Safari: `Cmd + Option + R`

2. **デベロッパーツールでキャッシュ無効化**
   - F12でデベロッパーツールを開く
   - Networkタブを選択
   - "Disable cache"にチェック
   - ページをリロード

3. **ブラウザキャッシュを完全クリア**
   - Chrome: `chrome://settings/clearBrowserData`
   - Edge: `edge://settings/clearBrowserData`
   - "キャッシュされた画像とファイル"を選択
   - "データを削除"

### 2. 静的ファイルのキャッシュ問題

#### 確認方法
デベロッパーツール（F12）を開いて：
1. Networkタブで`index.html`や`.js`ファイルを確認
2. `Status`列を確認：
   - `200 (from disk cache)` → キャッシュから読み込み
   - `200` → サーバーから取得
3. `Size`列を確認：
   - `(disk cache)` → 古いファイルの可能性

#### 対処方法
```powershell
# Azure App Serviceの静的ファイルキャッシュをクリア
az webapp restart --name emergency-assistantapp --resource-group rg-Emergencyassistant-app
```

### 3. CORSエラー

#### 確認方法
デベロッパーツール（F12）のConsoleタブで：
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

#### 対処方法（該当する場合のみ）
server/src/app.mjsのCORS設定を確認

### 4. 認証エラー

#### 確認方法
Networkタブで：
- Statusが`401 Unauthorized`
- Statusが`403 Forbidden`

## デバッグ手順

### ステップ1: デベロッパーツールで実際のエラーを確認

1. ブラウザで https://emergency-assistantapp.azurewebsites.net を開く
2. **F12**を押してデベロッパーツールを開く
3. **Network**タブを選択
4. **Disable cache**にチェック
5. ページをリロード（`Ctrl + R`）
6. エラーになっているリクエストを見つける
7. そのリクエストをクリックして詳細を確認：
   - **Headers**タブ: リクエスト/レスポンスヘッダー
   - **Response**タブ: 実際のエラーメッセージ
   - **Timing**タブ: タイムアウトの確認

### ステップ2: 実際のエラーレスポンスを確認

Networkタブでエラーになっているリクエストを右クリック：
- "Copy" → "Copy as cURL" を選択
- PowerShellで実行して同じエラーが再現するか確認

### ステップ3: Console タブでJavaScriptエラーを確認

- 赤いエラーメッセージがないか確認
- 特に`fetch`や`XMLHttpRequest`関連のエラー

## 現在の状況

### バックエンド（API）
✅ すべてのエンドポイントがCLIで正常動作
- `/api/knowledge-base/stats` → 200 OK
- `/api/settings/rag` → 200 OK
- `/api/ai-assist/settings` → 200 OK
- `/api/admin/dashboard` → 200 OK
- `/api/files/import` → 200 OK (Blobストレージに正常アップロード)

### フロントエンド（ブラウザ）
❌ 500エラーが表示される
→ **キャッシュの可能性が非常に高い**

## 推奨アクション

### 1. 即座に試す（最も簡単）
```
Ctrl + Shift + R （ハードリフレッシュ）
```

### 2. 確実に確認
1. F12でデベロッパーツールを開く
2. Networkタブで "Disable cache" にチェック
3. ページをリロード
4. エラーが出ているリクエストを確認

### 3. それでも解決しない場合
デベロッパーツールのNetworkタブで：
- エラーになっているリクエストの**Response**タブを確認
- 実際のエラーメッセージをコピーして共有

## Azure側の確認

もしブラウザでまだエラーが出る場合は、リアルタイムログで確認：

```powershell
# リアルタイムでログを監視
az webapp log tail --name emergency-assistantapp --resource-group rg-Emergencyassistant-app

# 別のターミナルでブラウザからアクセスしてエラーを発生させる
```
