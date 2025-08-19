# Azure Static Web Apps APIキー設定手順

## 問題
GitHubアクションで以下のエラーが発生:
```
The content server has rejected the request with: BadRequest
Reason: No matching Static Web App was found or the api key was invalid.
```

## 解決手順

### 1. Azure ポータルでAPIキーを取得
1. [Azure Portal](https://portal.azure.com) にアクセス
2. リソースグループまたは「すべてのリソース」から `Emergencyassistance-swa` を検索
3. Static Web App リソースをクリック
4. 左側メニューから「概要」を選択
5. 「デプロイ トークンの管理」をクリック
6. デプロイ トークンをコピー

### 2. GitHubシークレットの設定
1. GitHub リポジトリ `Satoshi-Niina/Emergency-Assistance` にアクセス
2. 「Settings」タブをクリック
3. 左側メニューから「Secrets and variables」 → 「Actions」を選択
4. 「New repository secret」をクリック
5. 以下の情報を入力:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000`
   - Secret: 手順1でコピーしたデプロイ トークン
6. 「Add secret」をクリック

### 3. ワークフロー再実行
1. GitHubの「Actions」タブに移動
2. 失敗したワークフローを選択
3. 「Re-run jobs」をクリック

## 代替案: 新しいStatic Web Appリソースの作成

もし既存のリソースが見つからない場合:

1. Azure Portalで新しいStatic Web Appを作成
2. リソース名: `emergency-assistance-swa`
3. リージョン: 適切なリージョンを選択
4. デプロイ ソース: GitHub
5. リポジトリ設定:
   - Organization: Satoshi-Niina
   - Repository: Emergency-Assistance
   - Branch: main
6. アプリの場所: `/client`
   出力場所: `dist`

作成後、新しいAPIキーをGitHubシークレットに設定してください。
