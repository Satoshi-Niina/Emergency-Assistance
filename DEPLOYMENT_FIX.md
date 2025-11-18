# デプロイ修正とテスト手順

## 🔧 実施した修正

### 1. Dockerfileの改善
- **package.jsonの追加**: ルートのpackage.jsonをコンテナにコピー
- **ディレクトリ作成の強化**: 必要なディレクトリを事前作成（uploads, data, documents）
- **パーミッション修正**: `/tmp/uploads`を含むすべてのディレクトリに適切な権限を設定
- **ヘルスチェック追加**: Docker組み込みのヘルスチェック機能を有効化
- **エラートレース有効化**: `--trace-warnings`フラグを追加してエラーを詳細に表示

### 2. azure-server.mjsのエラーハンドリング強化
- **詳細なエラーログ**: エラーコード、メッセージ、スタックトレースをすべて出力
- **EACCESエラー対応**: ポートのパーミッションエラーを明示的に処理
- **グローバルエラーハンドラー**: uncaughtExceptionとunhandledRejectionを適切に処理
- **プロセス継続ロジック**: Azure App Serviceの自動再起動機能と連携

### 3. コミット情報
- **コミットハッシュ**: `0f42b262`
- **コミットメッセージ**: "fix: Improve Docker container startup with health checks and error handling"

## 📋 デプロイ状況の確認

### GitHub Actions
1. ブラウザで開く: https://github.com/Satoshi-Niina/Emergency-Assistance/actions
2. 最新のワークフロー実行を確認
3. すべてのステップが✅になるまで待つ（約5-10分）

### 確認すべきステップ
- ✅ Checkout code
- ✅ Build and push Docker image
- ✅ Configure Azure App Service for Docker
- ✅ Set Azure App Service Environment Variables
- ✅ Deploy to Azure Web App (Docker)
- ✅ Verify deployment health

## 🚀 デプロイ完了後のテスト手順

### ステップ1: App Serviceのステータス確認

```powershell
# App Serviceが起動しているか確認
az webapp show --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --query "state" --output tsv
```

**期待される出力**: `Running`

### ステップ2: ヘルスチェック

```powershell
# ヘルスエンドポイントをテスト
Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/health" -UseBasicParsing
```

**期待される結果**:
- ステータスコード: `200`
- レスポンス: `{"status":"ok","timestamp":"..."}`

### ステップ3: CORS設定の検証

```powershell
# OPTIONSプリフライトリクエストをテスト
$headers = @{
    'Origin' = 'https://witty-river-012f39e00.1.azurestaticapps.net'
    'Access-Control-Request-Method' = 'POST'
    'Access-Control-Request-Headers' = 'Content-Type'
}

Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" -Method OPTIONS -Headers $headers -UseBasicParsing
```

**期待される結果**:
- ステータスコード: `204`
- ヘッダーに `Access-Control-Allow-Origin: https://witty-river-012f39e00.1.azurestaticapps.net`が含まれる

### ステップ4: ログイン機能のテスト

```powershell
# ログインAPIをテスト
$body = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

$headers = @{
    'Content-Type' = 'application/json'
    'Origin' = 'https://witty-river-012f39e00.1.azurestaticapps.net'
}

Invoke-WebRequest -Uri "https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api/auth/login" -Method POST -Body $body -Headers $headers -UseBasicParsing
```

**期待される結果**:
- ステータスコード: `200`
- CORSヘッダーが正しく設定されている
- ログインに成功してトークンが返される

### ステップ5: ブラウザでのテスト

1. **フロントエンドにアクセス**:
   ```
   https://witty-river-012f39e00.1.azurestaticapps.net
   ```

2. **ログインを試行**:
   - ユーザー名: `admin`
   - パスワード: `admin`

3. **期待される動作**:
   - ✅ CORSエラーが発生しない
   - ✅ ログインに成功する
   - ✅ ダッシュボードにリダイレクトされる

4. **ブラウザのDevToolsで確認**:
   - `F12`キーを押して開発者ツールを開く
   - Networkタブで `/api/auth/login` リクエストを確認
   - Response Headersに `Access-Control-Allow-Origin` が含まれているか確認

## 🔍 トラブルシューティング

### まだ503エラーが出る場合

```powershell
# ログを確認
az webapp log tail --name Emergency-Assistance --resource-group rg-Emergencyassistant-app
```

**確認すべきポイント**:
- ✅ Dockerコンテナが起動しているか
- ✅ Node.jsアプリケーションがエラーを出していないか
- ✅ ポート8080でリッスンしているか
- ✅ データベース接続が成功しているか

### CORSエラーがまだ出る場合

```powershell
# CORS関連の環境変数を確認
az webapp config appsettings list --name Emergency-Assistance --resource-group rg-Emergencyassistant-app --query "[?contains(name, 'CORS') || contains(name, 'FRONTEND') || contains(name, 'STATIC')].{Name:name, Value:value}" --output table
```

**確認すべき環境変数**:
- `FRONTEND_URL`: `https://witty-river-012f39e00.1.azurestaticapps.net`
- `STATIC_WEB_APP_URL`: `https://witty-river-012f39e00.1.azurestaticapps.net`
- `CORS_ALLOW_ORIGINS`: フロントエンドURLを含む

### ログインが失敗する場合

```powershell
# ユーザーテーブルを確認（データベース接続が必要）
# または、App Serviceのログで認証エラーを確認
```

## 📊 モニタリング

### リアルタイムログ

Azure Portalで確認:
1. https://portal.azure.com にアクセス
2. `Emergency-Assistance` App Serviceを開く
3. 左メニュー → 「ログストリーム」

### Application Insights

メトリクスとエラーを確認:
1. Azure Portal → Application Insights
2. `Emergency-Assistance` を開く
3. 「ライブメトリック」で現在の状況を確認
4. 「失敗」タブでエラーを確認

## ✅ 成功の確認

すべてが正常に動作している場合:

- ✅ App Serviceが`Running`状態
- ✅ `/health`エンドポイントが200を返す
- ✅ ログイン画面からログインできる
- ✅ CORSエラーが発生しない
- ✅ ダッシュボードが正常に表示される

## 📝 メモ

### 今回の問題の原因
1. **Dockerコンテナの起動失敗** - 必要なファイルやディレクトリが不足していた可能性
2. **エラーハンドリング不足** - エラーが発生してもログに詳細が出力されなかった
3. **ヘルスチェックの欠如** - コンテナの状態を適切に監視できていなかった

### 今回の修正のポイント
1. **より堅牢なDockerfile** - すべての依存関係とディレクトリを確実にコピー
2. **詳細なエラーログ** - 問題が発生した際に原因を特定しやすくした
3. **ヘルスチェック** - Dockerとアプリケーションレベルで状態を監視

---

**作成日**: 2025-11-17
**最終更新**: デプロイ後
**ステータス**: デプロイ中 → テスト待ち
