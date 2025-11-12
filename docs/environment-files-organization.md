# Emergency Assistance System - 環境変数ファイル構成管理

## 現在の課題
- 複数の.envファイルに重複する設定が存在
- ローカル開発環境と本番環境の設定の混乱
- 環境変数定義の重複

## 推奨ファイル構成

### ローカル開発環境
```
root/
├── .env                          # メインの開発環境設定（サーバーが使用）
├── client/.env                   # クライアント専用設定（VITE_変数のみ）
└── server/ (root/.envを読み込み)     # 独立した.envファイルは不要
```

### テンプレートファイル（GitHub Actions & 開発に必須）
```
root/
├── .env.template                 # 全環境変数の完全テンプレート
└── client/.env.template          # クライアント専用テンプレート（CI/CDで必須）
```

### 本番環境（Azure App Service）
```
Azure App Service設定:
- 環境変数はAzureポータルで設定
- .envファイルはデプロイしない
- GitHub SecretsからCI/CD経由で値を設定
```

## ファイルの用途

### ✅ 保持するファイル:
1. **root/.env** - メインの開発環境変数
2. **client/.env** - フロントエンドVite変数のみ（VITE_API_BASE_URL等）
3. **root/.env.template** - 完全なドキュメント・テンプレート
4. **client/.env.template** - フロントエンドテンプレート（GitHub Actionsビルドで必須）
5. **server/.env.development** - サーバー開発設定（必要時）
6. **server/.env.production** - サーバー本番設定（必要時）

### ✅ 削除済みファイル:
1. ~~**server/.env**~~ - root/.envと重複していたため削除 ✅
2. ~~**server/.env.template**~~ - ルートテンプレートに統合済み ✅

## 環境変数読み込み順序

### サーバー（Node.js/Express）
1. `root/.env`ファイルを読み込み
2. 変数をprocess.envに読み込み
3. 全てのサーバーサイドコードでprocess.env.変数名を使用

### クライアント（Vite/React）
1. `client/.env`ファイルを読み込み
2. VITE_プレフィックス付き変数のみアクセス可能
3. ビルド時にクライアントバンドルに静的に埋め込み

## 本番デプロイプロセス

### GitHub Actions CI/CD要件
1. **client/.env.template**はGitHub Actionsで必須
   - クライアントビルド時のビルド時変数設定に使用
   - Viteは`npm run build`実行時に環境変数を読み込み
   - このファイルがないとクライアントビルドが失敗したり間違ったAPIエンドポイントを使用する可能性

### デプロイフロー
1. GitHub Actionsが両方の.env.templateファイルを読み込み
2. GitHub Secretsとワークフロー環境変数を使用
3. 適切なVITE_変数でクライアントをビルド
4. 環境設定と共にAzure App Serviceにデプロイ
5. Azure App Serviceがポータル設定の環境変数を使用

### client/.env.templateが重要な理由
- GitHub ActionsがCI/CD環境でクライアントをビルド
- ViteはVITE_API_BASE_URLなどのクライアント変数をビルド時に必要
- テンプレートで変数名の一貫性とドキュメント化を保証
- 環境設定不備によるビルド失敗を防止
