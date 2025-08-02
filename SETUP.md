# PostgreSQL＋ストレージ対応 履歴管理システム セットアップ

## 概要

このシステムは、応急処置サポートの履歴（質問・回答・画像）をPostgreSQLで管理し、画像はローカルまたはAzure Blob Storageに保存する機能を提供します。

## システム構成

```
project-root/
├── server/
│   ├── db/
│   │   ├── db.ts               # PostgreSQL接続設定
│   │   └── schema.sql          # テーブル定義
│   ├── services/
│   │   ├── historyService.ts   # 履歴管理サービス
│   │   └── storageService.ts   # ストレージ管理サービス
│   ├── routes/
│   │   └── history.ts          # 履歴管理API
│   └── uploads/images/         # ローカル開発用ストレージ
└── scripts/
    └── init-db.js              # データベース初期化スクリプト
```

## 前提条件

- Node.js 18以上
- PostgreSQL 12以上
- npm または yarn

## セットアップ手順

### 1. 依存関係のインストール

```bash
# プロジェクトルートで実行
npm install

# PostgreSQLクライアントライブラリをインストール
npm install pg @types/pg

# Azure Blob Storage（本番環境用）
npm install @azure/storage-blob

# その他の必要なライブラリ
npm install csv-writer uuid dotenv
```

### 2. 環境変数の設定

```bash
# .envファイルをコピー
cp env.example .env

# .envファイルを編集
nano .env
```

#### 開発環境の設定例

```env
# PostgreSQL データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emergency_assistance
DB_USER=postgres
DB_PASSWORD=your_password_here

# ローカルストレージ設定
LOCAL_STORAGE_PATH=./server/uploads/images

# アプリケーション設定
NODE_ENV=development
PORT=3000

# API設定
VITE_API_BASE_URL=http://localhost:3000
```

#### 本番環境の設定例

```env
# PostgreSQL データベース設定
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=emergency_assistance
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Azure Blob Storage設定
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=emergency-assistance-images

# アプリケーション設定
NODE_ENV=production
PORT=3000
```

### 3. PostgreSQLのセットアップ

#### PostgreSQLのインストール（Ubuntu/Debian）

```bash
# PostgreSQLをインストール
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQLサービスを起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# postgresユーザーに切り替え
sudo -u postgres psql

# データベースユーザーを作成
CREATE USER your_user WITH PASSWORD 'your_password';

# データベースを作成
CREATE DATABASE emergency_assistance OWNER your_user;

# 権限を付与
GRANT ALL PRIVILEGES ON DATABASE emergency_assistance TO your_user;

# PostgreSQLを終了
\q
```

#### PostgreSQLのインストール（macOS）

```bash
# Homebrewでインストール
brew install postgresql

# PostgreSQLサービスを起動
brew services start postgresql

# データベースを作成
createdb emergency_assistance
```

### 4. データベースの初期化

```bash
# データベースを作成して初期化
node scripts/init-db.js init
```

このコマンドは以下を実行します：
- データベースの作成
- テーブルとビューの作成
- サンプルデータの挿入

### 5. アプリケーションの起動

```bash
# 開発サーバーを起動
npm run dev
```

## API エンドポイント

### 履歴管理API

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| POST | `/api/history/session` | 新しいセッションを作成 |
| POST | `/api/history/save` | チャット履歴を保存 |
| GET | `/api/history/list` | セッション一覧を取得 |
| GET | `/api/history/view/:sessionId` | セッション詳細と履歴を取得 |
| GET | `/api/history/export/:sessionId` | セッション履歴をCSVでエクスポート |
| PUT | `/api/history/:sessionId` | セッションを更新 |
| DELETE | `/api/history/:sessionId` | セッションを削除 |
| GET | `/api/history/statistics` | 統計情報を取得 |

### 使用例

#### セッション作成

```bash
curl -X POST http://localhost:3000/api/history/session \
  -H "Content-Type: application/json" \
  -d '{
    "title": "応急処置セッション",
    "machineType": "保守用車A型",
    "machineNumber": "MC-001"
  }'
```

#### 履歴保存

```bash
curl -X POST http://localhost:3000/api/history/save \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-uuid-here",
    "question": "発生した状況は？",
    "answer": "エンジンから異音が発生しています",
    "machineType": "保守用車A型",
    "machineNumber": "MC-001"
  }'
```

#### CSVエクスポート

```bash
curl -X GET http://localhost:3000/api/history/export/session-uuid-here \
  -o emergency_assistance_export.csv
```

## データベーススキーマ

### テーブル構造

#### chat_sessions（セッション管理）

| カラム | 型 | 説明 |
|--------|----|----|
| id | UUID | プライマリキー |
| title | VARCHAR(255) | セッションタイトル |
| machine_type | VARCHAR(100) | 機種 |
| machine_number | VARCHAR(100) | 機械番号 |
| status | VARCHAR(50) | ステータス（active/completed/archived） |
| metadata | JSONB | 追加メタデータ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

#### chat_history（履歴管理）

| カラム | 型 | 説明 |
|--------|----|----|
| id | UUID | プライマリキー |
| session_id | UUID | セッションID（外部キー） |
| question | TEXT | 質問内容 |
| answer | TEXT | 回答内容 |
| image_url | VARCHAR(500) | 画像URL |
| machine_type | VARCHAR(100) | 機種 |
| machine_number | VARCHAR(100) | 機械番号 |
| metadata | JSONB | 追加メタデータ |
| created_at | TIMESTAMP | 作成日時 |

#### knowledge（ナレッジ管理）

| カラム | 型 | 説明 |
|--------|----|----|
| id | UUID | プライマリキー |
| title | VARCHAR(255) | タイトル |
| content | TEXT | 内容 |
| tags | TEXT[] | タグ配列 |
| category | VARCHAR(100) | カテゴリ |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

## ストレージ設定

### 開発環境

- **タイプ**: ローカルファイルシステム
- **パス**: `./server/uploads/images/`
- **設定**: `LOCAL_STORAGE_PATH`環境変数で指定

### 本番環境

- **タイプ**: Azure Blob Storage
- **設定**: 
  - `AZURE_STORAGE_ACCOUNT_NAME`
  - `AZURE_STORAGE_ACCOUNT_KEY`
  - `AZURE_STORAGE_CONTAINER_NAME`

## トラブルシューティング

### データベース接続エラー

```bash
# 接続テスト
node -e "
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ 接続エラー:', err.message);
  } else {
    console.log('✅ 接続成功:', res.rows[0]);
  }
  pool.end();
});
"
```

### ストレージエラー

```bash
# ストレージディレクトリの確認
ls -la server/uploads/images/

# 権限の修正
chmod 755 server/uploads/images/
```

### ログの確認

```bash
# アプリケーションログを確認
tail -f logs/app.log

# データベースログを確認（PostgreSQL）
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 本番環境へのデプロイ

### 1. 環境変数の設定

本番環境用の環境変数を設定：

```env
NODE_ENV=production
DB_HOST=your-production-db-host
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
```

### 2. データベースの移行

```bash
# 本番データベースに接続してスキーマを実行
psql -h your-db-host -U your-user -d emergency_assistance -f server/db/schema.sql
```

### 3. アプリケーションのデプロイ

```bash
# 本番ビルド
npm run build

# 本番サーバーを起動
npm start
```

## セキュリティ考慮事項

1. **データベース接続**: 本番環境ではSSL接続を使用
2. **環境変数**: 機密情報は環境変数で管理
3. **ファイルアップロード**: ファイルサイズと形式の制限
4. **認証**: APIエンドポイントの認証機能を実装
5. **CORS**: 適切なCORS設定

## サポート

問題が発生した場合は、以下を確認してください：

1. ログファイルの確認
2. データベース接続の確認
3. 環境変数の設定確認
4. ファイル権限の確認

詳細なエラーメッセージと共に、GitHubのIssuesで報告してください。 