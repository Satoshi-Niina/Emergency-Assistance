# Azure App Service環境変数設定

## 必須の環境変数設定

Azure portalのApp Service設定で以下の環境変数を追加/確認してください：

### セッション設定
```
NODE_ENV=production
SESSION_SECRET=your-strong-session-secret-here
SESSION_PARTITIONED=true
```

### CORS設定
```
CORS_ORIGINS=https://witty-river-012f39e00.1.azurestaticapps.net
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### データベース接続（既存確認）
```
DATABASE_URL=postgresql://username:password@server/database
```

## 設定手順

1. Azure portalにログイン
2. App Service `emergencyassistance-sv-fbanemhrbshuf9bd` を開く
3. 左メニューの「構成」→「アプリケーション設定」
4. 上記の環境変数を追加/更新
5. 「保存」をクリック
6. アプリが自動的に再起動されます

## 認証問題の診断

現在の問題：
- `/api/auth/me` が 401 Unauthorized を返す
- セッションクッキーが異なるドメイン間で共有されていない可能性

修正内容：
1. CORS設定の詳細化（デバッグログ追加）
2. セッション設定の最適化（SameSite=None; Secure=true）
3. 認証エンドポイントでのデバッグログ追加
4. フロントエンドでのリクエスト設定詳細化

## 次のステップ

1. 環境変数設定後、アプリが再起動されるのを待つ
2. ブラウザでアクセスして動作確認
3. 開発者ツールのConsoleとNetworkタブでデバッグログを確認
4. 必要に応じてさらなる調整
