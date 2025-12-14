# Emergency Assistance System - 取り扱い説明書

## 📋 目次

1. [概要](#概要)
2. [システム要件](#システム要件)
3. [初期セットアップ](#初期セットアップ)
4. [基本的な使い方](#基本的な使い方)
5. [開発環境の起動](#開発環境の起動)
6. [本番環境へのデプロイ](#本番環境へのデプロイ)
7. [トラブルシューティング](#トラブルシューティング)
8. [よくある質問](#よくある質問)

---

## 概要

Emergency Assistance Systemは、緊急時の支援を効率的に管理するためのフルスタックWebアプリケーションです。

### 主な機能

- **認証システム**: セキュアなログイン・セッション管理
- **AIアシスタント**: OpenAI連携による支援対応
- **履歴管理**: 支援履歴の記録・検索
- **ナレッジベース**: 技術情報・トラブルシューティング情報の管理
- **ファイル管理**: Azure Blob Storageを使用した画像・ドキュメント管理

### システム構成

```
┌──────────────────────┐
│   フロントエンド       │  React + Vite + TypeScript
│   (Static Web App)    │  TailwindCSS + Shadcn UI
└──────────┬───────────┘
           │
           │ HTTP/REST API
           │
┌──────────▼───────────┐
│   バックエンド         │  Node.js + Express
│   (App Service)       │  ESM (ES Modules)
└──────────┬───────────┘
           │
           ├─────────────┐
           │             │
┌──────────▼────┐ ┌─────▼──────────┐
│ PostgreSQL DB │ │ Azure Blob     │
│ (Turso SQLite)│ │ Storage        │
└───────────────┘ └────────────────┘
```

---

## システム要件

### 必須環境

- **Node.js**: v20.0.0以上
- **npm**: v10.0.0以上
- **Git**: 最新版
- **Docker**: 最新版（Docker環境を使用する場合）
- **PowerShell**: 5.1以上（Windows）

### 推奨環境

- **OS**: Windows 10/11, macOS, Linux
- **メモリ**: 4GB以上
- **ストレージ**: 10GB以上の空き容量

---

## 初期セットアップ

### 1. リポジトリのクローン

```powershell
git clone https://github.com/Satoshi-Niina/Emergency-Assistance.git
cd Emergency-Assistance
```

### 2. 環境変数の設定

1. `env.example`をコピーして`.env`ファイルを作成:

```powershell
Copy-Item env.example .env
```

2. `.env`ファイルを編集し、必要な値を設定:

```bash
# 基本設定
NODE_ENV=development
PORT=8080
API_BASE_URL=/api

# データベース（Turso SQLite）
DATABASE_URL=file:./local.db
DATABASE_AUTH_TOKEN=

# Azure Blob Storage（オプション：本番環境で必要）
AZURE_STORAGE_CONNECTION_STRING=
BLOB_CONTAINER_NAME=knowledge-base

# OpenAI API（AIアシスタント機能を使う場合）
OPENAI_API_KEY=your-api-key-here

# セッション管理
SESSION_SECRET=change-this-to-a-random-string
```

### 3. 依存関係のインストール

```powershell
# ルートの依存関係をインストール
npm install

# サーバーの依存関係をインストール
cd server
npm install
cd ..

# クライアントの依存関係をインストール
cd client
npm install
cd ..
```

---

## 基本的な使い方

### システムの起動方法

#### 方法1: Docker環境（推奨）

最も簡単で、本番環境との整合性が保証されます。

```powershell
# インタラクティブメニューを表示
.\start-docker.ps1
```

メニューオプション:
- **1**: 本番環境シミュレーション（デプロイ前の確認用）
- **2**: 開発環境（ホットリロード有効）
- **3**: コンテナの停止
- **4**: 完全クリーンアップ（イメージ削除）

または、直接コマンドで起動:

```powershell
# 開発環境（ホットリロード）
npm run docker:dev

# 本番環境シミュレーション
npm run docker:prod

# バックグラウンドで起動
npm run docker:dev:detach
npm run docker:prod:detach

# ログの確認
npm run docker:logs
npm run docker:logs:dev

# 停止
npm run docker:stop

# 完全削除（ボリューム含む）
npm run docker:clean
```

#### 方法2: ローカル環境（非Docker）

```powershell
# 開発サーバーを起動（ホットリロード付き）
npm run dev

# または、ポート8080が使用中の場合は自動クリーンアップ
npm run dev:clean
```

### アクセス方法

起動後、ブラウザで以下のURLにアクセス:

- **開発環境**: http://localhost:8080
- **API エンドポイント**: http://localhost:8080/api
- **ヘルスチェック**: http://localhost:8080/api/health

### 初回ログイン

デフォルトの管理者アカウント:
- **ユーザー名**: `admin`
- **パスワード**: `admin123`（初回ログイン後に変更を推奨）

> ⚠️ **セキュリティ警告**: 本番環境では必ずパスワードを変更してください。

---

## 開発環境の起動

### 開発モードで起動

```powershell
# 統合開発サーバー（フロントエンド + バックエンド）
npm run dev
```

これにより、以下が自動的に起動します:
- バックエンドサーバー: http://localhost:8080
- フロントエンドVite開発サーバー（プロキシ経由）

### 個別起動

```powershell
# サーバーのみ
npm run dev:server

# クライアントのみ（別ターミナルで）
npm run dev:client
```

### ホットリロード

開発環境では、コードの変更が自動的に反映されます:
- **フロントエンド**: Viteによる高速HMR（Hot Module Replacement）
- **バックエンド**: サーバー自動再起動

---

## 本番環境へのデプロイ

### 自動デプロイ（GitHub Actions）

1. GitHub にコードをプッシュ:

```powershell
git add .
git commit -m "your commit message"
git push origin main
```

2. GitHub Actionsが自動的に:
   - Dockerイメージをビルド
   - テストを実行
   - Azure Container Registryにプッシュ
   - Azure App Serviceにデプロイ

### 手動デプロイ

#### クライアントのビルド

```powershell
npm run build:client
```

ビルドされたファイルは `client/dist` に出力されます。

#### サーバーのデプロイ

サーバーはビルド不要（ESM直接実行）です。以下のコマンドで本番モードで起動:

```powershell
npm run start:prod
```

### デプロイ前チェック

```powershell
# デプロイ前の自動チェック
npm run pre-deploy

# ビルドチェック
npm run deploy-check

# セキュリティチェック
npm run security:check-rsc
```

---

## トラブルシューティング

### ポート8080が使用中

```powershell
# ポート8080を使用しているプロセスを終了
.\scripts\kill-port-8080.ps1

# または、自動クリーンアップ付きで起動
npm run dev:clean
```

### データベース接続エラー

1. `.env`ファイルの`DATABASE_URL`を確認
2. データベースファイルのパーミッションを確認
3. データベースを再初期化:

```powershell
# データベーステーブルの確認
node server/check-table-structure.mjs

# 管理者ユーザーの再作成
node server/scripts/seed-admin-user.sql
```

### Azure Blob Storage接続エラー

1. `.env`ファイルの`AZURE_STORAGE_CONNECTION_STRING`を確認
2. コンテナ名を確認:

```bash
BLOB_CONTAINER_NAME=knowledge-base
```

3. 接続テスト:

```powershell
node server/test-blob-connection.mjs
```

4. 診断ツール:

```powershell
npm --prefix server run diagnose:blob
```

### Docker起動エラー

```powershell
# すべてのコンテナを停止
npm run docker:stop

# 完全クリーンアップ
npm run docker:clean

# 再起動
npm run docker:dev
```

### ビルドエラー

```powershell
# キャッシュをクリア
npm run clean

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

cd client
rm -rf node_modules package-lock.json
npm install
cd ..

cd server
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

## よくある質問

### Q1: 開発環境と本番環境の違いは？

**開発環境**:
- ホットリロード有効
- 詳細なログ出力
- CORSの制限が緩い
- デバッグ機能有効

**本番環境**:
- 最適化されたコード
- 簡潔なログ
- 厳格なセキュリティ設定
- 圧縮・キャッシング有効

### Q2: 環境変数はどこで管理する？

- **ローカル開発**: `.env`ファイル
- **Docker環境**: `docker-compose.yml` / `docker-compose.dev.yml`
- **Azure本番環境**: Azure Portalの「構成」→「アプリケーション設定」

### Q3: データベースのバックアップ方法は？

```powershell
# SQLiteデータベースをコピー
Copy-Item server/local.db server/local.db.backup

# または、エクスポート
node scripts/export-database.mjs
```

### Q4: ログはどこで確認できる？

- **開発環境**: コンソール出力
- **Docker環境**: `npm run docker:logs` または `npm run docker:logs:dev`
- **本番環境（Azure）**: Azure Portalの「ログストリーム」

### Q5: AIアシスタント機能を有効化するには？

`.env`ファイルに OpenAI API キーを設定:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Q6: パスワードをリセットするには？

```powershell
# パスワードハッシュを生成
node scripts/generate-password-hash.js

# 全ユーザーのパスワードをリセット
node server/reset-passwords.mjs

# 特定ユーザーのパスワードを検索
node server/find-password.mjs
```

### Q7: 画像をBlob Storageにアップロードするには？

```powershell
# 画像を一括アップロード
node scripts/upload-images-to-blob.mjs
```

### Q8: Azure環境の認証状態を確認するには？

```powershell
# Azure認証ステータスをチェック
.\scripts\check-azure-auth-status.ps1

# データベース接続をチェック
.\scripts\check-azure-database.ps1
```

---

## サポート

問題が解決しない場合:

1. **ログを確認**: エラーメッセージの詳細を確認
2. **ドキュメントを参照**: `knowledge-base/`フォルダ内の資料
3. **Issue報告**: GitHubリポジトリでIssueを作成

---

## 付録

### 便利なスクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run start:prod` | 本番モードで起動 |
| `npm run docker:dev` | Docker開発環境起動 |
| `npm run docker:prod` | Docker本番環境起動 |
| `npm run build:client` | クライアントビルド |
| `npm run pre-deploy` | デプロイ前チェック |
| `npm run security:check-rsc` | セキュリティチェック |

### ディレクトリ構成

```
Emergency-Assistance/
├── client/              # フロントエンド（React + Vite）
│   ├── src/            # ソースコード
│   ├── public/         # 静的ファイル
│   └── dist/           # ビルド出力
├── server/             # バックエンド（Node.js + Express）
│   ├── src/            # ソースコード
│   │   ├── api/       # APIエンドポイント
│   │   ├── config/    # 設定ファイル
│   │   ├── infra/     # インフラ層（DB, Blob等）
│   │   └── routes/    # ルート定義
│   └── scripts/       # ユーティリティスクリプト
├── scripts/            # プロジェクト全体のスクリプト
├── knowledge-base/     # ナレッジベース
└── .env               # 環境変数（要作成）
```

---

**最終更新**: 2025年12月11日  
**バージョン**: 1.0.2
