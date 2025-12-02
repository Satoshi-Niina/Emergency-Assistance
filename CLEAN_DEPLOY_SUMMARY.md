# 🎯 完全クリーンデプロイ設定完了

## 問題の原因

**以前の状態:**
- ❌ Server: デプロイステップが不完全で、古いファイルが残っていた
- ❌ Client: `dist/`フォルダがGitにコミットされ、古いビルドがデプロイされていた
- ❌ 何度も"Force deploy"していたが、実際には古いファイルで起動していた

## ✅ 修正内容

### 📦 **Client (Azure Static Web Apps)**

#### ビルドプロセス
1. **ローカル**: `git commit` 前に自動ビルド（pre-commit hook）
2. **GitHub Actions**: `client/**` 変更時に自動トリガー
3. **クリーンビルド**: 
   ```bash
   rm -rf dist  # 古いファイルを削除
   npm ci       # クリーンインストール
   npm run build
   ```
4. **プレースホルダー置換確認**: `replace-env.cjs`が正しく動作しているか検証

#### デプロイプロセス
```yaml
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    app_location: "client/dist"
    skip_app_build: true  # ビルド済みファイルをデプロイ
```

**Static Web Apps の自動クリーン機能:**
- Azure側が自動的に古いファイルを削除
- 新しいファイルのみデプロイ
- キャッシュも自動的にクリア

---

### 🖥️ **Server (Azure App Service)**

#### ビルドプロセス
1. **ローカル**: `git commit` 前に自動ビルド（pre-commit hook拡張版）
   ```powershell
   # server/ 変更時
   rm -rf dist
   npm run build
   ```

2. **GitHub Actions**:
   ```bash
   # Shared moduleをビルド
   cd shared && npm install && npm run build
   
   # Serverをビルド
   cd server
   rm -rf node_modules dist  # 完全クリーン
   npm ci --omit=dev         # 本番用依存関係のみ
   npm run build             # TypeScript → JavaScript
   
   # デプロイパッケージ作成
   zip -r server-deploy.zip \
     node_modules/ \
     dist/ \
     package.json \
     *.mjs \
     web.config
   ```

#### デプロイプロセス（完全クリーン）
```yaml
# 1. App Serviceを停止
az webapp stop

# 2. 古いファイルを削除（Kudu API）
curl -X DELETE .../site/wwwroot/node_modules
curl -X DELETE .../site/wwwroot/dist
curl -X DELETE .../site/wwwroot/*.js

# 3. 新しいzipをデプロイ
azure/webapps-deploy@v2
  package: server-deploy.zip

# 4. デプロイ検証
curl .../site/wwwroot/ | jq  # ファイル一覧確認

# 5. 環境変数設定
az webapp config appsettings set ...

# 6. App Serviceを起動
az webapp start
sleep 30  # ウォームアップ待機
```

---

## 🔄 デプロイフロー全体

### **開発者のワークフロー**
```powershell
# 1. コード変更
vi client/src/App.tsx
vi server/routes/api.ts

# 2. コミット（自動ビルド発火）
git add .
git commit -m "fix: 機能追加"
# → pre-commit hookが自動的に:
#    - client/ 変更 → npm run build
#    - server/ 変更 → npm run build

# 3. プッシュ
git push origin main
# → GitHub Actionsが自動的に:
#    - Client: Static Web Appsにデプロイ
#    - Server: App Serviceにクリーンデプロイ
```

### **GitHub Actions の動作**

#### Deploy Client
```
✅ client/** 変更検知
   ↓
✅ npm ci && npm run build
   ↓
✅ replace-env.cjs でプレースホルダー置換
   ↓
✅ Static Web Apps にアップロード
   ↓
✅ Azure側で自動キャッシュクリア
```

#### Deploy Server
```
✅ main ブランチへのプッシュ検知
   ↓
✅ shared/ をビルド
   ↓
✅ server/ をクリーンビルド
   ↓
✅ zip作成（node_modules含む）
   ↓
✅ App Service停止
   ↓
✅ 古いファイル削除（Kudu API）
   ↓
✅ 新しいzipデプロイ
   ↓
✅ デプロイ検証
   ↓
✅ 環境変数設定
   ↓
✅ App Service起動
   ↓
✅ ヘルスチェック
```

---

## 📊 検証項目

### **デプロイ後の確認**

#### 1. GitHub Actions確認
```
https://github.com/Satoshi-Niina/Emergency-Assistance/actions
```
- ✅ "Deploy Client" が成功
- ✅ "Deploy Server" が成功
- ✅ エラーログなし

#### 2. Client確認
```powershell
# runtime-config.jsの確認
Invoke-WebRequest -Uri "https://witty-river-012f39e00.1.azurestaticapps.net/runtime-config.js"

# プレースホルダーがないことを確認
# 期待値: window.runtimeConfig = {
#   API_BASE_URL: "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api"
# }
```

#### 3. Server確認
```powershell
# ヘルスチェック
Invoke-WebRequest -Uri "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/health"

# API動作確認
Invoke-WebRequest -Uri "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api/emergency-flow/list"
```

#### 4. ブラウザ確認
```
1. キャッシュクリア: Ctrl+Shift+Delete
2. ハードリロード: Ctrl+F5
3. URL: https://witty-river-012f39e00.1.azurestaticapps.net
4. ログイン: niina / pass
5. 応急復旧データ管理 → フロー管理
6. 画像が正しく表示されるか確認
```

---

## 🎉 期待される結果

### ✅ **完全なクリーンデプロイ**
- 古いファイルは完全に削除される
- 新しいファイルのみがデプロイされる
- キャッシュは自動的にクリアされる

### ✅ **自動化**
- ローカル: コミット前に自動ビルド
- GitHub: プッシュ後に自動デプロイ
- 手動操作不要

### ✅ **確実性**
- Client: Static Web Appsの自動クリーン機能
- Server: 停止 → 削除 → デプロイ → 起動の確実な手順

---

## 📝 今後の運用

### **通常のワークフロー**
```powershell
# コード変更
git add .
git commit -m "変更内容"  # 自動ビルド
git push origin main       # 自動デプロイ

# 5-10分待機
# → GitHub Actionsで確認
```

### **トラブルシューティング**
```powershell
# 手動でビルド確認
npm run pre-commit

# GitHub Actions再実行
# Actions → 失敗したワークフロー → Re-run jobs

# ローカルで動作確認
npm run dev
```

---

## 🔍 コミット履歴

```
99a742ed - fix: 完全なクリーンデプロイを実装 - 古いファイル削除、停止/起動、デプロイ検証を追加
40512a50 - fix: Azure App Serviceのゼロダウンタイムデプロイに最適化（停止処理を削除）
a5af2fc6 - fix: ビルド成果物をGitから除外し、自動ビルド＆デプロイを設定
```

---

**結論**: これで**確実に新しいファイルのみ**がデプロイされます 🎯
