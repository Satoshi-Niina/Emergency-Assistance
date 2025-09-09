# GitHub Actions Secrets Configuration

このプロジェクトでは以下のSecretsをGitHub Actionsで設定してください：

## 必要なSecrets

### Database
- `DATABASE_URL`: PostgreSQL接続文字列
  ```
  postgresql://username:password@server:5432/database?sslmode=require
  ```

### Azure Storage
- `AZURE_STORAGE_CONNECTION_STRING`: Azure Blob Storage接続文字列

### Application
- `SESSION_SECRET`: セッション暗号化キー
- `JWT_SECRET`: JWT署名キー（使用している場合）
- `OPENAI_API_KEY`: OpenAI APIキー（使用している場合）

## GitHub Actionsでの設定方法

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. "New repository secret"をクリック
3. Name と Secret valueを入力して保存

## 環境変数の使用例（GitHub Actions）

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  AZURE_STORAGE_CONNECTION_STRING: ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
  SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
```

## セキュリティ注意事項

- **絶対に実際の認証情報をGitリポジトリにコミットしないでください**
- 定期的にパスワードを変更してください
- 不要になった認証情報は無効化してください
- ログに機密情報が含まれないよう注意してください
