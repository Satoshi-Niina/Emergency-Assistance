# 🚨 Azure Static Web Apps API キー問題 - 即座解決ガイド

## 現在のエラー

```
The content server has rejected the request with: BadRequest
Reason: No matching Static Web App was found or the api key was invalid.
```

## 🎯 即座の解決策

### Option 1: Azure Portal で API キー更新 (5 分で完了)

#### ステップ 1: Azure Portal にアクセス

1. https://portal.azure.com を開く
2. 検索バーに「static web」と入力
3. 「Static Web Apps」サービスを選択

#### ステップ 2: リソースを見つける

- リソース名: `salmon-desert-065ec5000` または類似の名前を探す
- 見つからない場合は「すべてのリソース」で「static」で検索

#### ステップ 3: API キーを取得

```
リソースをクリック → 左メニュー「概要」 → 「デプロイ トークンの管理」 → トークンをコピー
```

#### ステップ 4: GitHub シークレット更新

1. GitHub リポジトリページに移動: https://github.com/Satoshi-Niina/Emergency-Assistance
2. 「Settings」タブ → 「Secrets and variables」 → 「Actions」
3. `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_DESERT_065EC5000` を見つけて「Update」
4. 新しい API キーを貼り付け → 「Update secret」

#### ステップ 5: ワークフロー再実行

1. 「Actions」タブ → 最新のワークフロー
2. 「Re-run jobs」 → 「Force Azure deployment」にチェック → 実行

### Option 2: 新しい Static Web App 作成 (10 分で完了)

#### ステップ 1: 新規作成

Azure Portal → 「リソースの作成」 → 「Static Web App」

#### ステップ 2: 設定

```
基本:
  名前: emergency-assistance-frontend
  リージョン: Japan East
  プラン: Free

GitHub デプロイ:
  GitHub アカウント: Satoshi-Niina
  組織: Satoshi-Niina
  リポジトリ: Emergency-Assistance
  ブランチ: main

ビルド:
  ビルドプリセット: Custom
  アプリの場所: /client
  出力場所: dist
```

#### ステップ 3: 作成完了

- 作成完了後、新しい API キーが自動生成される
- その API キーで GitHub シークレットを更新

### Option 3: 手動デプロイ (即座実行可能)

#### 現在のビルド成果物を使用

1. GitHub Actions → 最新のワークフロー → 「Artifacts」
2. `frontend-build-xxxxx` をダウンロード
3. ZIP を解凍

#### Azure Portal で手動アップロード

1. Static Web App リソース → 「概要」
2. 「参照」ボタンの横の「...」メニュー
3. 「Upload」を選択
4. 解凍したフォルダの中身をアップロード

## 🔧 現在のワークフロー設定

- **デフォルト**: ビルドのみ（エラー回避）
- **手動実行**: 「Force Azure deployment」でデプロイ試行可能
- **アーティファクト**: 毎回ビルド成果物を保存

## ⚡ 推奨順序

1. **Option 1** を最初に試す（最も簡単）
2. 失敗したら **Option 2** で新規作成
3. 緊急時は **Option 3** で即座デプロイ

## 📊 成功の確認

- Azure Portal で Static Web App の「概要」
- 「Browse」ボタンでサイトにアクセス
- ログイン機能をテスト

これらの手順で確実にエラーが解決されます！
