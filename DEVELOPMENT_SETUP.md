# Emergency Assistance Development Setup Guide

## 環境設定完了 ✅

開発環境の設定が完了しました。以下の手順でアプリケーションを起動できます。

## 前提条件

- Node.js 18.0.0以上
- npm 8.0.0以上
- PostgreSQL (localhost:5432)

## 🚀 クイックスタート（推奨）

### 最も簡単な起動方法
```bash
# PowerShell版（推奨）
.\quick-start.ps1

# またはバッチファイル版
.\quick-start.bat
```

### 詳細な起動方法
```bash
# 完全な開発環境セットアップ
.\start-local-dev.ps1
```

## 📋 手動セットアップ

### 1. 依存関係のインストール
```bash
# 自動セットアップスクリプトを実行
.\setup-dev.bat
# または
powershell -ExecutionPolicy Bypass -File setup-dev.ps1
```

### 2. データベースの準備
PostgreSQLが起動していることを確認してください：
- ホスト: localhost:5432
- データベース: emergency_assistance
- ユーザー名: postgres
- パスワード: password

### 3. アプリケーションの起動

#### オプション1: 統合起動（推奨）
```bash
# PowerShell版
.\start-local-dev.ps1

# バッチファイル版
.\start-local.bat
```

#### オプション2: npmコマンドで起動
```bash
# フロントエンドとバックエンドを同時起動
npm run dev

# ローカル環境用
npm run dev:local
```

#### オプション3: 個別に起動
```bash
# ターミナル1: クライアント (React + Vite)
npm run dev:client

# ターミナル2: サーバー (Express)
npm run dev:server
```

## 🌐 アクセスURL

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:8000
- **ヘルスチェック**: http://localhost:8000/api/health

## 📝 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | クライアントとサーバーを起動 |
| `npm run dev:local` | ローカル環境用に起動 |
| `npm run build` | 全コンポーネントをビルド |
| `npm run clean` | ビルドファイルをクリーンアップ |
| `npm run typecheck` | TypeScript型チェック |
| `npm run lint` | ESLintでコードチェック |

## 🔧 トラブルシューティング

### PostgreSQL接続エラーの場合
1. PostgreSQLが起動しているか確認
2. データベース `emergency_assistance` が存在するか確認
3. 接続情報を確認（デフォルト: postgres/password@localhost:5432）

### ポートが使用中の場合
- クライアント: 5173番ポート
- サーバー: 8000番ポート

### 依存関係エラーの場合
```bash
# 全依存関係を再インストール
npm run install:all

# または個別に
cd client && npm install
cd ../server && npm install
cd ../shared && npm install
```

## 🚀 開発ワークフロー

1. **起動**: `.\quick-start.ps1` を実行
2. **コード変更**: ファイルを編集
3. **自動リロード**: 変更が自動的に反映
4. **テスト**: ブラウザで http://localhost:5173 にアクセス
5. **API確認**: http://localhost:8000/api/health でAPI動作確認

## 🔍 GitHub Actions CI/CD

プロジェクトには以下のGitHub Actionsワークフローが設定されています：

- **フロントエンド**: `.github/workflows/frontend.yml`
  - TypeScript型チェック
  - ESLintチェック
  - ビルドテスト
  - Azure Static Web Appsへのデプロイ

- **バックエンド**: `.github/workflows/backend.yml`
  - TypeScript型チェック
  - ESLintチェック
  - ヘルスチェック
  - Azure Web Appへのデプロイ

## 📁 プロジェクト構造

```
Emergency-Assistance/
├── client/                    # React + Vite フロントエンド
├── server/                    # Express バックエンド
├── shared/                    # 共通ライブラリ
├── knowledge-base/            # ナレッジベースデータ
├── .github/workflows/         # GitHub Actions CI/CD
│   ├── frontend.yml           # フロントエンド用ワークフロー
│   └── backend.yml            # バックエンド用ワークフロー
├── quick-start.ps1           # クイックスタートスクリプト
├── quick-start.bat           # クイックスタートバッチファイル
├── start-local-dev.ps1       # 詳細開発環境起動スクリプト
└── DEVELOPMENT_SETUP.md      # このファイル
```

## 🔒 セキュリティ注意事項

- 本番環境では必ず環境変数を適切に設定
- データベースパスワードを変更
- CORS設定を本番用に調整
- APIキーを環境変数で管理

## 🆘 サポート

問題が発生した場合は、以下を確認してください：

1. **ログファイルの確認**: 各ウィンドウのコンソール出力を確認
2. **ネットワーク接続の確認**: PostgreSQLとAPIエンドポイントの接続
3. **依存関係の再インストール**: `npm run install:all`
4. **ポートの確認**: 5173（フロントエンド）、8000（バックエンド）が使用可能か
5. **環境変数の確認**: 必要な環境変数が設定されているか

### よくある問題と解決方法

**Q: PostgreSQL接続エラー**
A: PostgreSQLサービスが起動しているか確認し、データベース `emergency_assistance` が存在するか確認

**Q: ポートが使用中エラー**
A: 他のプロセスがポートを使用していないか確認し、必要に応じてプロセスを終了

**Q: 依存関係エラー**
A: `npm run install:all` を実行して全依存関係を再インストール

**Q: TypeScriptエラー**
A: `npm run typecheck` で型エラーを確認し、必要に応じて修正
