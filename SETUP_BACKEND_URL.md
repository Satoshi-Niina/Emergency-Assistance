# バックエンドURL設定ガイド

## 現在のバックエンドURL

```
https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
```

## GitHub Secretsの設定手順

### 1. GitHubリポジトリにアクセス

1. GitHubリポジトリを開く
2. **Settings** > **Secrets and variables** > **Actions** に移動

### 2. `VITE_BACKEND_SERVICE_URL` を設定

1. **New repository secret** をクリック
2. 以下の情報を入力：
   - **Name**: `VITE_BACKEND_SERVICE_URL`
   - **Secret**: `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net`
3. **Add secret** をクリック

### 3. 設定の確認

設定後、以下のように表示されます：

```
VITE_BACKEND_SERVICE_URL
https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net
```

## 動作確認

### デプロイ後の確認

1. フロントエンドをデプロイ（GitHub Actionsが自動実行）
2. ブラウザの開発者ツール（F12）を開く
3. **Console**タブで以下を確認：
   ```javascript
   window.BACKEND_SERVICE_URL
   // 出力: "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net"
   ```
4. **Network**タブでログインリクエストを確認：
   - リクエストURLが `https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login` になっているか確認

## トラブルシューティング

### エラー: "Backend call failure"

**原因**: `VITE_BACKEND_SERVICE_URL` が設定されていない、または間違っている

**解決方法**:
1. GitHub Secretsで `VITE_BACKEND_SERVICE_URL` が正しく設定されているか確認
2. デプロイワークフローのログで、バックエンドURLが正しく埋め込まれているか確認
3. ブラウザのコンソールで `window.BACKEND_SERVICE_URL` の値を確認

### エラー: CORSエラー

**原因**: バックエンドのCORS設定でフロントエンドのオリジンが許可されていない

**解決方法**:
1. バックエンドの環境変数 `STATIC_WEB_APP_URL` が正しく設定されているか確認
2. バックエンドのCORS設定で `*.azurestaticapps.net` が許可されているか確認（既に修正済み）

## 関連ドキュメント

- [GitHub Secrets設定ガイド](.github/GITHUB_SECRETS.md)
- [デプロイメントガイド](.github/DEPLOYMENT_GUIDE.md)

