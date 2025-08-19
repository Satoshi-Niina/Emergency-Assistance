# Emergency-Assistance Azure Static Web App 新規作成手順

## 問題の根本原因

現在のエラー「No matching Static Web App was found or the api key was invalid」は、以下のいずれかが原因です：

1. Azure Static Web App リソース `Emergencyassistance-swa` が存在しない
2. API キーが期限切れまたは無効
3. リソース名が変更されている

## 解決策：新しい Static Web App の作成

### ステップ 1: Azure Portal でリソース作成

1. **Azure Portal にアクセス**

   - https://portal.azure.com

2. **Static Web App を作成**

   ```
   「リソースの作成」 → 「Static Web App」を検索 → 「作成」
   ```

3. **基本設定**

   ```
   サブスクリプション: お使いのサブスクリプション
   リソースグループ: 新規作成または既存の使用
   名前: emergency-assistance-frontend
   プラン: Free
   リージョン: Japan East (東日本) または適切なリージョン
   ```

4. **デプロイメント設定**

   ```
   デプロイソース: GitHub
   GitHub組織: Satoshi-Niina
   リポジトリ: Emergency-Assistance
   ブランチ: main
   ```

5. **ビルド設定**

   ```
   ビルドプリセット: Custom
   アプリの場所: /client
   APIの場所: (空のまま)
   出力場所: dist
   ```

6. **「確認および作成」→「作成」**

### ステップ 2: 新しい API キーを取得

1. **作成されたリソースにアクセス**
2. **「概要」→「デプロイ トークンの管理」**
3. **トークンをコピー**

### ステップ 3: GitHub ワークフローを更新

新しい API キーとリソース名に合わせてワークフローを更新する必要があります。

## 自動生成されるワークフロー

Azure Static Web App を作成すると、自動的に GitHub アクションワークフローが生成されます。
既存のワークフローと重複する可能性があるため、調整が必要です。

## 次のステップ

1. 上記手順で Static Web App を作成
2. 新しい API キーを確認
3. 必要に応じてワークフローファイル名を調整
4. GitHub シークレットを更新
