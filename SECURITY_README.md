# 機密情報の管理

## 🚨 重要な注意事項

このプロジェクトには機密情報が含まれている可能性があります。以下の手順に従って安全に管理してください。

## 🔒 環境変数の設定

### 1. ローカル開発環境
```bash
# local.env ファイルを作成（local.env.exampleをコピー）
cp local.env.example local.env

# 実際の値に変更
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/webappdb
JWT_SECRET=YOUR_ACTUAL_32_CHARACTER_JWT_SECRET
SESSION_SECRET=YOUR_ACTUAL_32_CHARACTER_SESSION_SECRET
OPENAI_API_KEY=sk-YOUR_ACTUAL_OPENAI_API_KEY
```

### 2. 本番環境（Azure App Service）
環境変数は既に適切に設定されています：
- `DATABASE_URL` - PostgreSQL接続文字列
- `JWT_SECRET` - JWT署名用秘密鍵
- `SESSION_SECRET` - セッション管理用秘密鍵
- `OPENAI_API_KEY` - OpenAI APIキー

## 🛡️ セキュリティチェックリスト

### ✅ 必須項目
- [ ] `local.env` ファイルが `.gitignore` に含まれている
- [ ] ハードコードされたパスワードが削除されている
- [ ] APIキーが環境変数で管理されている
- [ ] データベースパスワードが強力である
- [ ] JWT秘密鍵が32文字以上である

### 🔍 定期的な確認
- [ ] 不要なAPIキーの無効化
- [ ] パスワードの定期変更
- [ ] アクセスログの確認
- [ ] セキュリティアップデートの適用

## 📞 緊急時対応

### セキュリティインシデント発生時
1. 影響を受けたアカウントのパスワードを即座にリセット
2. 関連するAPIキーを無効化
3. セッションを強制終了
4. ログを確認して影響範囲を特定

### 連絡先
- システム管理者: [連絡先を設定]
- セキュリティチーム: [連絡先を設定]

## 📚 参考資料
- [セキュリティガイドライン](./SECURITY_GUIDELINES.md)
- [セキュリティガイド](./SECURITY.md)
- [セキュリティ修正サマリー](./SECURITY_FIX_SUMMARY.md)
