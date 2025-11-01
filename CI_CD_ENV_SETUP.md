# GitHub Actions用 環境変数・CI/CD自動化まとめ

## 1. 必要な環境変数一覧（GitHub Secrets推奨）

### フロントエンド（client, Vite/React）
- `VITE_API_BASE_URL` : APIのベースURL（例: https://your-production-domain.com/api）

### バックエンド（server, Node.js/Express/Docker）
- `NODE_ENV` : production
- `PORT` : 8080 など
- `API_BASE_URL` : https://your-production-domain.com/api
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` : DB接続情報
- `JWT_SECRET` : JWT署名用シークレット
- `AZURE_STORAGE_CONNECTION_STRING`, `BLOB_CONTAINER` : Azureストレージ用
- `OPENAI_API_KEY` : OpenAI連携時のみ
- `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` : CORS/レートリミット
- `LOG_LEVEL`, `LOG_FILE_PATH` : ログ設定

> これらはGitHubの「Settings > Secrets and variables > Actions」に登録し、workflow内で `${{ secrets.XXX }}` で参照してください。

---

## 2. フロントエンド（client）CI/CDの流れ
- `.github/workflows/furontend.yml` で `Azure/static-web-apps-deploy@v1` を利用
- `app_location: "client"` でclientディレクトリをビルド・デプロイ
- `env:` セクションで `VITE_API_BASE_URL` などを `${{ secrets.VITE_API_BASE_URL }}` で渡す

### 例: furontend.yml修正イメージ
```yaml
jobs:
  build_and_deploy_job:
    # ...省略...
    steps:
      - uses: actions/checkout@v3
      # ...省略...
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "client"
          api_location: "server/src/api"
          output_location: "dist"
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
```

---

## 3. バックエンド（server）CI/CDの流れ
- `.github/workflows/backend.yml` で `docker/build-push-action@v5` でイメージビルド＆push
- `azure/webapps-deploy@v2` でAzure App Serviceにデプロイ
- DBやストレージ等の機密情報は `secrets` で渡す

### 例: backend.yml修正イメージ
```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: satoshi-niina/emergency-assistance-backend
  NODE_ENV: production
  PORT: 8080
  API_BASE_URL: ${{ secrets.API_BASE_URL }}
  DB_HOST: ${{ secrets.DB_HOST }}
  DB_PORT: ${{ secrets.DB_PORT }}
  DB_NAME: ${{ secrets.DB_NAME }}
  DB_USER: ${{ secrets.DB_USER }}
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
  BLOB_CONTAINER: ${{ secrets.BLOB_CONTAINER }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  CORS_ORIGIN: ${{ secrets.CORS_ORIGIN }}
  RATE_LIMIT_WINDOW_MS: ${{ secrets.RATE_LIMIT_WINDOW_MS }}
  RATE_LIMIT_MAX_REQUESTS: ${{ secrets.RATE_LIMIT_MAX_REQUESTS }}
  LOG_LEVEL: ${{ secrets.LOG_LEVEL }}
  LOG_FILE_PATH: ${{ secrets.LOG_FILE_PATH }}
```

---

## 4. 補足
- 必要な環境変数は `.env.production` などのサンプルを参考に追加・整理してください。
- シークレット値は絶対にリポジトリに直接コミットしないでください。
- AzureやDBの接続情報は漏洩リスクが高いため、必ずGitHub Secrets経由で渡してください。

---

以上を参考に、CI/CD自動化・環境変数管理を安全に行ってください。
