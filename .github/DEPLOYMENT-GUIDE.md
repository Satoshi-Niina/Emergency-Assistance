# デプロイメントガイド

## Azure Static Web Apps - URL統一設定

### 問題
`deployment_environment` パラメータを設定すると、Azure Static Web Appsが複数のURLを生成してしまう。

**例**:
```yaml
deployment_environment: "production"
# → URL: happy-bush-083160b00-production.eastasia.3.azurestaticapps.net

deployment_environment: (なし)
# → URL: happy-bush-083160b00.3.azurestaticapps.net
```

### 解決策
**`deployment_environment` を設定しない** ことで、デフォルトURLのみを使用する。

### 正しい設定

```yaml
- name: Deploy to Azure Static Web Apps
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "client/dist"
    output_location: "."
    skip_app_build: true
    skip_api_build: true
    production_branch: "main"
    # ❌ deployment_environment: "production" ← 設定しない！
```

### デプロイURLの動的取得

ハードコードされたURLを使用せず、デプロイアクションの出力から取得：

```yaml
- name: Get deployed URL from action output
  id: get_url
  run: |
    DEPLOYED_URL="${{ steps.deploy.outputs.static_web_app_url }}"
    
    # フォールバック（出力がない場合）
    if [ -z "$DEPLOYED_URL" ]; then
      DEPLOYED_URL="https://happy-bush-083160b00.3.azurestaticapps.net"
    fi
    
    echo "deployed_url=$DEPLOYED_URL" >> $GITHUB_OUTPUT

- name: Verify deployment
  run: |
    APP_URL="${{ steps.get_url.outputs.deployed_url }}"
    echo "Verifying at: $APP_URL"
```

## Azure App Service - URL設定

### 特徴
- **単一URLのみ**: App Serviceは常に1つのURL（例: `emergency-assistantapp.azurewebsites.net`）
- **deployment_environment問題なし**: この問題はStatic Web Apps特有

### 設定
固定URLを使用（ハードコード可）：

```yaml
- name: Deploy to Azure App Service
  run: |
    az webapp deployment source config-zip \
      --name emergency-assistantapp \
      --resource-group rg-Emergencyassistant-app \
      --src deploy.zip
```

## ベストプラクティス

### 1. URL管理
- ✅ 環境変数化: `AZURE_STATIC_WEB_APP_URL` をGitHub Secretsに保存
- ✅ 動的取得: デプロイアクションの出力を使用
- ❌ ハードコード: ワークフローに直接書かない

### 2. キャッシュ対策
- ✅ `clean: true` で常に最新ソースを取得
- ✅ `git clean -ffdx` で未追跡ファイルを削除
- ✅ deployment-info.json でバージョン確認

### 3. デプロイ検証
- ✅ 90秒待機 + 10回リトライ
- ✅ コミットハッシュで確認
- ✅ ビルドタイムスタンプで確認

## トラブルシューティング

### 複数のURLが存在する場合

1. **現在のデプロイを確認**:
   ```bash
   # デフォルトURL
   curl https://happy-bush-083160b00.3.azurestaticapps.net/deployment-info.json
   
   # Production環境URL
   curl https://happy-bush-083160b00-production.eastasia.3.azurestaticapps.net/deployment-info.json
   ```

2. **古い環境を削除**:
   Azure Portalで Static Web App → Environments → 不要な環境を削除

3. **ワークフロー修正**:
   - `deployment_environment` を削除
   - クライアントファイルを変更してコミット
   - 新しいデプロイが正しいURLに配置される

### デプロイが反映されない場合

1. **GitHub Actionsログを確認**:
   - "Verify source is latest" → コミットハッシュを確認
   - "Build client" → ビルド成功を確認
   - "Deploy to Azure" → デプロイ成功を確認

2. **ブラウザキャッシュをクリア**:
   - Ctrl + Shift + R (Windows)
   - Cmd + Shift + R (Mac)

3. **Azure Static Web Appsを再起動**:
   ```bash
   az staticwebapp show --name happy-bush-083160b00 --resource-group rg-Emergencyassistant-app
   ```

## まとめ

| 項目 | 推奨設定 | 理由 |
|------|---------|------|
| deployment_environment | **設定しない** | 複数URL生成を防ぐ |
| URL取得方法 | **動的取得** | 環境変更に対応 |
| キャッシュ対策 | **clean: true + git clean** | 常に最新を保証 |
| 検証方法 | **deployment-info.json** | 確実なバージョン確認 |
