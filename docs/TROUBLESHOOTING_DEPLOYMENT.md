# デプロイエラー トラブルシューティングガイド

## エラー: "Failed to deploy web package to App Service"

このエラーが発生した場合、以下の点を確認してください。

## 1. Azure App Service の設定確認（最重要）

### SCM_DO_BUILD_DURING_DEPLOYMENT の確認

**必須設定**: `SCM_DO_BUILD_DURING_DEPLOYMENT=true`

1. Azure Portal > App Service > **構成（Configuration）** > **アプリケーション設定（Application settings）**
2. `SCM_DO_BUILD_DURING_DEPLOYMENT` を検索
3. 値が `true` になっているか確認
4. 設定されていない、または `false` になっている場合は、`true` に設定

### WEBSITE_RUN_FROM_PACKAGE の削除

**重要**: この設定が存在する場合は**削除**してください。

1. Azure Portal > App Service > **構成** > **アプリケーション設定**
2. `WEBSITE_RUN_FROM_PACKAGE` を検索
3. 存在する場合は、削除（×ボタンをクリック）

### WEBSITE_NODE_DEFAULT_VERSION の確認

**推奨設定**: `WEBSITE_NODE_DEFAULT_VERSION=20-lts`

1. Azure Portal > App Service > **構成** > **アプリケーション設定**
2. `WEBSITE_NODE_DEFAULT_VERSION` を確認
3. `20-lts` に設定されていない場合は設定

## 2. デプロイログの確認

### Kudu デプロイログの確認

1. Azure Portal > App Service > **高度なツール（Advanced Tools）** > **移動（Go）**
2. Kudu コンソールが開く
3. **Tools** > **Zip Push Deploy** または **Deployments** を選択
4. 最新のデプロイログを確認

### ログストリームの確認

1. Azure Portal > App Service > **ログストリーム（Log stream）**
2. デプロイ中のエラーメッセージを確認

## 3. よくある原因と対処法

### 原因1: package-lock.json が package.json と同期していない

**症状**: `npm ci` が失敗する

**対処法**:
```bash
# ローカルで実行
cd server
npm install
cd ../client
npm install
cd ..
npm install

# package-lock.json をコミット
git add server/package-lock.json client/package-lock.json package-lock.json
git commit -m "fix: update package-lock.json"
git push
```

### 原因2: SCM_DO_BUILD_DURING_DEPLOYMENT が false または未設定

**症状**: Oryx Build が実行されない

**対処法**: 上記「1. Azure App Service の設定確認」を参照

### 原因3: WEBSITE_RUN_FROM_PACKAGE が設定されている

**症状**: ZIP Deploy が失敗する

**対処法**: この設定を削除（上記「1. Azure App Service の設定確認」を参照）

### 原因4: ビルドエラー（vite: not found など）

**症状**: `npm run build` が失敗する

**対処法**:
1. ローカルで `npm run build` を実行してエラーを確認
2. `client/package-lock.json` が存在するか確認
3. `client/node_modules` が正しくインストールされているか確認

### 原因5: リソース不足

**症状**: デプロイ中にタイムアウトまたはメモリエラー

**対処法**:
1. Azure Portal > App Service > **概要** > **App Service プラン** を確認
2. 必要に応じてプランをスケールアップ

## 4. デプロイ成功の確認方法

### ログストリームでの確認

以下のメッセージが表示されれば成功：

```
✅ Server listening on port xxxx (env: production)
```

### ヘルスチェックエンドポイントでの確認

```bash
curl https://your-app.azurewebsites.net/live
# 期待: HTTP 200 OK
```

## 5. 緊急時の対処法

### 手動デプロイ（Azure CLI）

```bash
# Azure CLIでログイン
az login

# デプロイ
az webapp deployment source config-zip \
  --resource-group <ResourceGroupName> \
  --name <AppServiceName> \
  --src <path-to-zip-file>
```

### App Service の再起動

1. Azure Portal > App Service > **概要** > **再起動**
2. 再起動後、再度デプロイを試行

## 6. サポート情報の収集

問題が解決しない場合、以下の情報を収集してください：

1. **デプロイログ**: Kudu コンソール > Deployments > 最新のデプロイ > Log
2. **アプリケーションログ**: Azure Portal > App Service > **ログストリーム**
3. **設定情報**: Azure Portal > App Service > **構成** > **アプリケーション設定** のスクリーンショット
4. **GitHub Actions ログ**: GitHub > Actions > 最新のワークフロー実行 > ログ

## 7. チェックリスト

デプロイ前に以下を確認：

- [ ] `SCM_DO_BUILD_DURING_DEPLOYMENT=true` が設定されている
- [ ] `WEBSITE_RUN_FROM_PACKAGE` が削除されている
- [ ] `WEBSITE_NODE_DEFAULT_VERSION=20-lts` が設定されている
- [ ] `package-lock.json` が `package.json` と同期している
- [ ] ローカルで `npm run build` が成功する
- [ ] GitHub Secrets が正しく設定されている
- [ ] App Service のリソースが十分にある

