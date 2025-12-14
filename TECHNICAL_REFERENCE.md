# Emergency Assistance System - 技術資料

## 📋 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [技術スタック](#技術スタック)
3. [プロジェクト構造](#プロジェクト構造)
4. [API仕様](#api仕様)
5. [データベース設計](#データベース設計)
6. [認証・セキュリティ](#認証セキュリティ)
7. [ストレージ管理](#ストレージ管理)
8. [開発ガイドライン](#開発ガイドライン)
9. [デプロイメント](#デプロイメント)
10. [スクリプトリファレンス](#スクリプトリファレンス)

---

## アーキテクチャ概要

### システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                        クライアント層                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Vite                        │  │
│  │  - TailwindCSS 4.x (スタイリング)                     │  │
│  │  - Shadcn UI (UIコンポーネント)                       │  │
│  │  - TanStack Query (状態管理・キャッシング)            │  │
│  │  - React Router (ルーティング)                        │  │
│  │  - Axios (HTTP通信)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API (JSON)
                      │ WebSocket (リアルタイム通信)
┌─────────────────────▼───────────────────────────────────────┐
│                      サーバー層                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Node.js 20+ + Express 4.x (ESM)                     │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │  │
│  │  │  Routes    │ │  Services  │ │Middleware  │       │  │
│  │  │  Layer     │ │  Layer     │ │  Layer     │       │  │
│  │  └────────────┘ └────────────┘ └────────────┘       │  │
│  │                                                       │  │
│  │  - Express Session (セッション管理)                   │  │
│  │  - Helmet (セキュリティヘッダー)                      │  │
│  │  - CORS (クロスオリジン制御)                          │  │
│  │  - Compression (レスポンス圧縮)                       │  │
│  │  - Morgan (ログ記録)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────┬───────────────────────────┘
          │                       │
          │                       │
┌─────────▼────────┐    ┌─────────▼──────────────┐
│  データ層         │    │  外部サービス層         │
│                  │    │                        │
│ ┌──────────────┐ │    │ ┌────────────────────┐ │
│ │ Turso SQLite │ │    │ │ Azure Blob Storage │ │
│ │ (PostgreSQL  │ │    │ │  - 画像ストレージ   │ │
│ │  互換)       │ │    │ │  - ドキュメント     │ │
│ └──────────────┘ │    │ └────────────────────┘ │
│                  │    │                        │
│ - Drizzle ORM    │    │ ┌────────────────────┐ │
│ - 型安全クエリ    │    │ │ OpenAI API         │ │
│                  │    │ │  - GPT-4           │ │
│                  │    │ │  - AIアシスタント  │ │
│                  │    │ └────────────────────┘ │
└──────────────────┘    └────────────────────────┘
```

### データフロー

```
[ブラウザ] 
    ↓ (1) HTTPリクエスト
[Expressミドルウェアチェーン]
    ├→ CORS検証
    ├→ セッション検証
    ├→ 認証チェック
    └→ ボディパース
    ↓ (2) ルーティング
[ルートハンドラー]
    ↓ (3) ビジネスロジック
[サービス層]
    ├→ (4a) DB操作 (Drizzle ORM)
    ├→ (4b) Blob Storage操作
    └→ (4c) OpenAI API呼び出し
    ↓ (5) レスポンス生成
[クライアント]
    └→ (6) UI更新 (React)
```

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|-----|----------|------|
| React | 18.3.1 | UIフレームワーク |
| TypeScript | 5.7.3 | 型安全性 |
| Vite | 5.4.21 | ビルドツール・開発サーバー |
| TailwindCSS | 4.1.17 | スタイリング |
| Shadcn UI | latest | UIコンポーネントライブラリ |
| TanStack Query | 5.81.2 | サーバー状態管理 |
| React Router | 7.6.3 | クライアントルーティング |
| Axios | 1.10.0 | HTTP通信 |
| Zustand | 5.0.2 | クライアント状態管理 |
| React Hook Form | 7.54.2 | フォーム管理 |
| Zod | 3.24.1 | バリデーション |

### バックエンド

| 技術 | バージョン | 用途 |
|-----|----------|------|
| Node.js | 20+ | ランタイム |
| Express | 4.21.2 | Webフレームワーク |
| Drizzle ORM | 0.44.4 | ORM |
| Turso SQLite | - | データベース（PostgreSQL互換） |
| @azure/storage-blob | 12.20.0 | Blob Storage SDK |
| @azure/identity | 4.0.1 | Azure認証 |
| OpenAI | 4.104.0 | AI API |
| bcryptjs | 2.4.3 | パスワードハッシング |
| jsonwebtoken | 9.0.2 | JWT生成・検証 |
| express-session | 1.18.2 | セッション管理 |
| helmet | 8.1.0 | セキュリティヘッダー |
| cors | 2.8.5 | CORS制御 |
| compression | 1.7.4 | レスポンス圧縮 |
| morgan | 1.10.1 | ログ記録 |
| multer | 1.4.5-lts.1 | ファイルアップロード |

### インフラ・DevOps

| 技術 | 用途 |
|-----|------|
| Docker | コンテナ化 |
| Docker Compose | ローカル開発環境 |
| Azure App Service | ホスティング（サーバー） |
| Azure Static Web Apps | ホスティング（クライアント） |
| Azure Container Registry | Dockerイメージレジストリ |
| Azure Blob Storage | ファイルストレージ |
| GitHub Actions | CI/CD |

---

## プロジェクト構造

### ディレクトリ構成詳細

```
Emergency-Assistance/
│
├── client/                          # フロントエンド
│   ├── src/
│   │   ├── components/             # Reactコンポーネント
│   │   │   ├── ui/                # Shadcn UIコンポーネント
│   │   │   ├── forms/             # フォームコンポーネント
│   │   │   ├── layout/            # レイアウトコンポーネント
│   │   │   └── shared/            # 共有コンポーネント
│   │   ├── hooks/                 # カスタムReact Hooks
│   │   ├── lib/                   # ユーティリティ関数
│   │   ├── pages/                 # ページコンポーネント
│   │   ├── services/              # API通信サービス
│   │   ├── store/                 # Zustand状態管理
│   │   ├── types/                 # TypeScript型定義
│   │   ├── App.tsx                # アプリケーションルート
│   │   └── main.tsx               # エントリーポイント
│   ├── public/                    # 静的ファイル
│   ├── index.html                 # HTMLテンプレート
│   ├── vite.config.js             # Vite設定
│   ├── tailwind.config.ts         # TailwindCSS設定
│   ├── tsconfig.json              # TypeScript設定
│   └── package.json               # 依存関係
│
├── server/                          # バックエンド
│   ├── src/
│   │   ├── api/                   # APIエンドポイント（自動ルーティング）
│   │   │   ├── admin/            # 管理機能 (/api/admin)
│   │   │   ├── ai-assist/        # AIアシスタント (/api/ai-assist)
│   │   │   ├── chatgpt/          # ChatGPT統合 (/api/chatgpt)
│   │   │   ├── chats/            # チャット履歴 (/api/chats)
│   │   │   ├── data/             # データ管理 (/api/data)
│   │   │   ├── data-processor/   # データ処理 (/api/data-processor)
│   │   │   ├── db/               # データベース操作 (/api/db)
│   │   │   ├── documents/        # ドキュメント (/api/documents)
│   │   │   ├── emergency-flow/   # 緊急フロー (/api/emergency-flow)
│   │   │   ├── files/            # ファイル管理 (/api/files)
│   │   │   ├── flows/            # フロー管理 (/api/flows)
│   │   │   ├── health/           # ヘルスチェック (/api/health)
│   │   │   ├── images/           # 画像管理 (/api/images)
│   │   │   ├── knowledge/        # ナレッジ検索 (/api/knowledge)
│   │   │   ├── knowledge-base/   # KB管理 (/api/knowledge-base)
│   │   │   ├── machines/         # マシン情報 (/api/machines)
│   │   │   ├── settings/         # 設定管理 (/api/settings)
│   │   │   ├── tech-support/     # 技術サポート (/api/tech-support)
│   │   │   ├── troubleshooting/  # トラブルシュート (/api/troubleshooting)
│   │   │   └── users/            # ユーザー管理 (/api/users)
│   │   │
│   │   ├── config/               # 設定ファイル
│   │   │   ├── env.mjs          # 環境変数管理
│   │   │   ├── cors.mjs         # CORS設定
│   │   │   ├── session.mjs      # セッション設定
│   │   │   └── security.mjs     # セキュリティ設定
│   │   │
│   │   ├── infra/                # インフラ層
│   │   │   ├── db.mjs           # データベース接続
│   │   │   ├── blob.mjs         # Blob Storage接続
│   │   │   └── openai.mjs       # OpenAI接続
│   │   │
│   │   ├── routes/               # 手動ルート定義
│   │   │   ├── auth.mjs         # 認証ルート (/api/auth)
│   │   │   ├── health.mjs       # ヘルスチェック (/health, /ready)
│   │   │   ├── history.mjs      # 履歴管理 (/api/history)
│   │   │   └── diag.mjs         # 診断ツール (/api/_diag)
│   │   │
│   │   └── app.mjs               # Expressアプリ初期化
│   │
│   ├── azure-server.mjs           # 本番サーバーエントリーポイント
│   ├── dev-server.mjs             # 開発サーバー
│   ├── unified-hot-reload-server.js # ホットリロード開発サーバー
│   ├── package.json               # 依存関係
│   └── tsconfig.build.json        # TypeScript設定
│
├── shared/                         # 共有コード
│   ├── schema.ts                  # 共有型定義（Zod）
│   ├── schema.d.ts                # 型定義エクスポート
│   └── package.json
│
├── scripts/                        # プロジェクト全体のスクリプト
│   ├── check-azure-auth-status.ps1      # Azure認証確認
│   ├── check-azure-database.ps1         # DB接続確認
│   ├── check-build-before-push.js       # デプロイ前チェック
│   ├── check-rsc-vulnerabilities.mjs    # セキュリティチェック
│   ├── check-user-passwords.mjs         # パスワード確認
│   ├── clean.mjs                        # クリーンアップ
│   ├── cleanup-env-vars.ps1             # 環境変数クリーンアップ
│   ├── clear-chat-db.mjs                # チャットDB初期化
│   ├── generate-password-hash.js        # パスワードハッシュ生成
│   ├── kill-port-8080.ps1               # ポート解放
│   ├── pre-commit.ps1                   # コミット前チェック
│   ├── pre-deploy-check.mjs             # デプロイ前検証
│   ├── seed-admin-user.sql              # 管理者ユーザー作成
│   └── upload-images-to-blob.mjs        # 画像アップロード
│
├── knowledge-base/                 # ナレッジベース
│   ├── documents/                 # マークダウンドキュメント
│   ├── images/                    # 画像ファイル
│   ├── data/                      # 構造化データ
│   ├── troubleshooting/           # トラブルシューティング情報
│   └── exports/                   # エクスポートファイル
│
├── docker-compose.yml              # 本番Docker Compose設定
├── docker-compose.dev.yml          # 開発Docker Compose設定
├── Dockerfile                      # Dockerイメージ定義
├── .env.example                    # 環境変数テンプレート
├── package.json                    # ルート依存関係
└── tsconfig.json                   # TypeScript設定（ルート）
```

### モジュール構造

#### ESM (ES Modules) の採用

このプロジェクトは完全にESMで構築されています:

```javascript
// ✅ 正しい (ESM)
import express from 'express';
export const app = express();

// ❌ 使用しない (CommonJS)
const express = require('express');
module.exports = app;
```

**ファイル拡張子**:
- `.mjs`: ES Module JavaScript（明示的）
- `.ts`: TypeScript（コンパイル後ESM）
- `.js`: CommonJS（レガシー、段階的に削除中）

---

## API仕様

### ベースURL

- **ローカル開発**: `http://localhost:8080/api`
- **本番環境**: `https://your-app.azurewebsites.net/api`

### 認証方式

セッションベース認証 + Cookie

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  "message": "ログイン成功"
}
```

以降のリクエストでは自動的にセッションCookieが送信されます。

### 主要エンドポイント

#### ヘルスチェック

```http
GET /health
GET /ready
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2025-12-11T00:00:00.000Z",
  "uptime": 12345,
  "environment": "production"
}
```

#### 認証 (`/api/auth`)

| メソッド | エンドポイント | 説明 | 認証 |
|---------|--------------|------|-----|
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/me` | 現在のユーザー情報 | 必要 |
| POST | `/api/auth/refresh` | セッション更新 | 必要 |

#### ユーザー管理 (`/api/users`)

| メソッド | エンドポイント | 説明 | 認証 |
|---------|--------------|------|-----|
| GET | `/api/users` | ユーザー一覧 | 必要(管理者) |
| GET | `/api/users/:id` | ユーザー詳細 | 必要 |
| POST | `/api/users` | ユーザー作成 | 必要(管理者) |
| PUT | `/api/users/:id` | ユーザー更新 | 必要 |
| DELETE | `/api/users/:id` | ユーザー削除 | 必要(管理者) |

#### チャット (`/api/chatgpt`)

```http
POST /api/chatgpt
Content-Type: application/json
Authorization: Session Cookie

{
  "message": "緊急時の対応手順を教えてください",
  "context": {
    "conversationId": "uuid-here",
    "previousMessages": []
  }
}

Response:
{
  "response": "緊急時の対応手順は以下の通りです...",
  "conversationId": "uuid-here",
  "timestamp": "2025-12-11T00:00:00.000Z"
}
```

#### ナレッジベース (`/api/knowledge-base`)

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/knowledge-base` | KB記事一覧 |
| GET | `/api/knowledge-base/:id` | KB記事詳細 |
| POST | `/api/knowledge-base/search` | KB検索（Fuse.js） |
| POST | `/api/knowledge-base` | KB記事作成 |
| PUT | `/api/knowledge-base/:id` | KB記事更新 |
| DELETE | `/api/knowledge-base/:id` | KB記事削除 |

#### 画像管理 (`/api/images`)

```http
POST /api/images/upload
Content-Type: multipart/form-data

FormData:
- file: [画像ファイル]
- category: "troubleshooting"

Response:
{
  "url": "https://storage.blob.core.windows.net/knowledge-base/images/uuid.png",
  "filename": "uuid.png",
  "size": 12345,
  "contentType": "image/png"
}
```

#### ファイル管理 (`/api/files`)

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/files` | ファイル一覧 |
| GET | `/api/files/:id` | ファイルダウンロード |
| POST | `/api/files/upload` | ファイルアップロード |
| DELETE | `/api/files/:id` | ファイル削除 |

### エラーレスポンス

統一されたエラー形式:

```json
{
  "error": "error_code",
  "message": "エラーメッセージ（人間可読）",
  "details": {
    "field": "validation error details"
  },
  "timestamp": "2025-12-11T00:00:00.000Z"
}
```

**HTTPステータスコード**:
- `200`: 成功
- `201`: 作成成功
- `400`: バリデーションエラー
- `401`: 認証エラー
- `403`: 権限エラー
- `404`: リソースが見つからない
- `500`: サーバーエラー

---

## データベース設計

### スキーマ概要

Drizzle ORMを使用した型安全なスキーマ定義:

```typescript
// server/db/schema/users.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

### 主要テーブル

#### `users` テーブル

| カラム | 型 | 制約 | 説明 |
|-------|---|-----|------|
| id | SERIAL | PRIMARY KEY | ユーザーID |
| username | TEXT | NOT NULL, UNIQUE | ユーザー名 |
| password | TEXT | NOT NULL | bcryptハッシュ化パスワード |
| email | TEXT | | メールアドレス |
| role | TEXT | NOT NULL, DEFAULT 'user' | 役割 (admin/user) |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

#### `chat_history` テーブル

| カラム | 型 | 制約 | 説明 |
|-------|---|-----|------|
| id | SERIAL | PRIMARY KEY | 履歴ID |
| user_id | INTEGER | FOREIGN KEY → users(id) | ユーザーID |
| conversation_id | UUID | NOT NULL | 会話ID |
| message | TEXT | NOT NULL | ユーザーメッセージ |
| response | TEXT | NOT NULL | AIレスポンス |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

#### `knowledge_base` テーブル

| カラム | 型 | 制約 | 説明 |
|-------|---|-----|------|
| id | SERIAL | PRIMARY KEY | KB記事ID |
| title | TEXT | NOT NULL | タイトル |
| content | TEXT | NOT NULL | 内容（Markdown） |
| category | TEXT | | カテゴリ |
| tags | TEXT[] | | タグ配列 |
| author_id | INTEGER | FOREIGN KEY → users(id) | 作成者ID |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

#### `files` テーブル

| カラム | 型 | 制約 | 説明 |
|-------|---|-----|------|
| id | SERIAL | PRIMARY KEY | ファイルID |
| filename | TEXT | NOT NULL | ファイル名 |
| original_name | TEXT | NOT NULL | 元のファイル名 |
| blob_url | TEXT | NOT NULL | Blob Storage URL |
| content_type | TEXT | | MIMEタイプ |
| size | INTEGER | | ファイルサイズ（バイト） |
| uploader_id | INTEGER | FOREIGN KEY → users(id) | アップロード者ID |
| created_at | TIMESTAMP | DEFAULT NOW() | アップロード日時 |

### データベース操作例

```javascript
// server/src/infra/db.mjs
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN
});

export const db = drizzle(client);

// クエリ例
import { users } from './db/schema/users';
import { eq } from 'drizzle-orm';

// SELECT
const user = await db.select().from(users).where(eq(users.id, 1));

// INSERT
await db.insert(users).values({
  username: 'newuser',
  password: hashedPassword,
  role: 'user'
});

// UPDATE
await db.update(users)
  .set({ email: 'new@example.com' })
  .where(eq(users.id, 1));

// DELETE
await db.delete(users).where(eq(users.id, 1));
```

---

## 認証・セキュリティ

### セッション管理

```javascript
// server/src/config/session.mjs
import session from 'express-session';
import MemoryStore from 'memorystore';

const MemoryStoreSession = MemoryStore(session);

export const createSessionMiddleware = () => {
  return session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24時間
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS環境でのみtrue
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      sameSite: 'lax'
    }
  });
};
```

### パスワードハッシング

```javascript
import bcrypt from 'bcryptjs';

// ハッシュ化
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(plainPassword, salt);

// 検証
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### 認証ミドルウェア

```javascript
// server/src/middleware/auth.mjs
export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'unauthorized',
      message: '認証が必要です'
    });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.session?.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      error: 'forbidden',
      message: '管理者権限が必要です'
    });
  }
  next();
};
```

### セキュリティヘッダー (Helmet)

```javascript
// server/src/config/security.mjs
import helmet from 'helmet';

export const createSecurityMiddleware = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.openai.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
};
```

### CORS設定

```javascript
// server/src/config/cors.mjs
export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ALLOW_ORIGINS?.split(',') || ['*'];
    
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

---

## ストレージ管理

### Azure Blob Storage

```javascript
// server/src/infra/blob.mjs
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  
  // マネージドIDを使用
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const credential = new DefaultAzureCredential();
  return new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
};

export const containerName = process.env.BLOB_CONTAINER_NAME || 'knowledge-base';
```

### ファイルアップロード

```javascript
// server/src/api/images/index.mjs
import multer from 'multer';
import { getBlobServiceClient, containerName } from '../../infra/blob.mjs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  }
});

export default function (app) {
  app.post('/api/images/upload', upload.single('file'), async (req, res) => {
    try {
      const blobClient = getBlobServiceClient();
      const containerClient = blobClient.getContainerClient(containerName);
      
      const blobName = `images/${Date.now()}-${req.file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.upload(req.file.buffer, req.file.size, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        }
      });
      
      res.json({
        url: blockBlobClient.url,
        filename: blobName,
        size: req.file.size,
        contentType: req.file.mimetype
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'upload_failed', message: error.message });
    }
  });
}
```

### ローカルストレージ（フォールバック）

開発環境ではローカルファイルシステムを使用:

```javascript
// server/uploads/ ディレクトリに保存
const storage = multer.diskStorage({
  destination: './server/uploads',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
```

---

## 開発ガイドライン

### コーディング規約

#### TypeScript/JavaScript

```typescript
// ✅ 良い例
import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export const UserProfile: React.FC<{ userId: number }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user?.username}</div>;
};

// ❌ 悪い例
export default function UserProfile(props) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/users/' + props.userId)
      .then(res => res.json())
      .then(data => setUser(data));
  });
  return <div>{user && user.username}</div>;
}
```

#### 命名規則

- **ファイル名**: kebab-case (例: `user-profile.tsx`)
- **コンポーネント**: PascalCase (例: `UserProfile`)
- **関数・変数**: camelCase (例: `fetchUser`, `isLoading`)
- **定数**: UPPER_SNAKE_CASE (例: `API_BASE_URL`)
- **型・インターフェース**: PascalCase (例: `User`, `ApiResponse`)

#### ESLint設定

```javascript
// eslint.config.js
export default {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off'
  }
};
```

### Git ワークフロー

```bash
# 1. 新機能ブランチを作成
git checkout -b feature/new-feature

# 2. コミット前チェック（自動実行）
npm run pre-commit

# 3. コミット
git add .
git commit -m "feat: add new feature"

# 4. プッシュ前チェック（自動実行）
git push origin feature/new-feature

# 5. プルリクエスト作成
```

#### コミットメッセージ規約

Conventional Commits形式:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット
- `refactor`: リファクタリング
- `test`: テスト追加
- `chore`: ビルド・設定変更

**例**:
```
feat(auth): add password reset functionality

- Add forgot password endpoint
- Send reset email via SendGrid
- Add password reset form to client

Closes #123
```

### テスト

```javascript
// tests/api/auth.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.mjs';

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const app = await createApp();
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });
});
```

---

## デプロイメント

### Docker デプロイ

#### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# クライアントをビルド
RUN npm run build:client

EXPOSE 8080

CMD ["npm", "run", "start:prod"]
```

#### Docker Compose (本番)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - AZURE_STORAGE_CONNECTION_STRING=${AZURE_STORAGE_CONNECTION_STRING}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped
```

### Azure App Service デプロイ

#### GitHub Actions ワークフロー

```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: |
        npm ci
        cd server && npm ci
        cd ../client && npm ci
    
    - name: Build client
      run: npm run build:client
    
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: ${{ secrets.AZURE_APP_NAME }}
        publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
        package: .
```

### 環境変数管理

#### ローカル開発

`.env`ファイル:

```bash
NODE_ENV=development
PORT=8080
DATABASE_URL=file:./local.db
SESSION_SECRET=local-dev-secret-change-in-production
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:8080
```

#### Azure App Service

Azure Portalで設定:

1. App Service → 「構成」
2. 「新しいアプリケーション設定」をクリック
3. 環境変数を追加:
   - `NODE_ENV=production`
   - `DATABASE_URL=<Turso connection string>`
   - `DATABASE_AUTH_TOKEN=<Turso token>`
   - `AZURE_STORAGE_CONNECTION_STRING=<connection string>`
   - `OPENAI_API_KEY=<API key>`
   - `SESSION_SECRET=<strong random string>`

---

## スクリプトリファレンス

### プロジェクト全体

| スクリプト | パス | 説明 |
|----------|------|------|
| `npm run dev` | root | 開発サーバー起動（統合） |
| `npm run start:prod` | root | 本番サーバー起動 |
| `npm run build:client` | root | クライアントビルド |
| `npm run docker:dev` | root | Docker開発環境起動 |
| `npm run docker:prod` | root | Docker本番環境起動 |
| `npm run pre-deploy` | root | デプロイ前チェック |

### ユーティリティスクリプト

#### `scripts/kill-port-8080.ps1`

```powershell
# ポート8080を使用しているプロセスを終了
.\scripts\kill-port-8080.ps1
```

#### `scripts/check-azure-auth-status.ps1`

```powershell
# Azure認証状態を確認
.\scripts\check-azure-auth-status.ps1
```

出力例:
```
✓ Azure CLI インストール済み
✓ ログイン済み
✓ サブスクリプション: "My Subscription"
```

#### `scripts/upload-images-to-blob.mjs`

```powershell
# knowledge-base/images/ 内の画像をBlob Storageにアップロード
node scripts/upload-images-to-blob.mjs
```

#### `scripts/generate-password-hash.js`

```powershell
# パスワードのbcryptハッシュを生成
node scripts/generate-password-hash.js
# プロンプト: パスワードを入力
# 出力: $2a$10$...
```

#### `scripts/check-rsc-vulnerabilities.mjs`

```powershell
# RSC（React Server Components）の脆弱性をチェック
npm run security:check-rsc
```

#### `scripts/pre-deploy-check.mjs`

```powershell
# デプロイ前の総合チェック
npm run pre-deploy
```

チェック項目:
- ✓ 環境変数の検証
- ✓ ビルドファイルの存在確認
- ✓ 依存関係の整合性
- ✓ セキュリティ脆弱性スキャン

### サーバースクリプト

#### `server/test-blob-connection.mjs`

```powershell
# Blob Storage接続テスト
node server/test-blob-connection.mjs
```

#### `server/check-table-structure.mjs`

```powershell
# データベーステーブル構造を確認
node server/check-table-structure.mjs
```

#### `server/reset-passwords.mjs`

```powershell
# 全ユーザーのパスワードをリセット
node server/reset-passwords.mjs
```

---

## パフォーマンス最適化

### クライアント側

```javascript
// コード分割（React.lazy）
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));

// 使用例
<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

### サーバー側

```javascript
// レスポンス圧縮
import compression from 'compression';
app.use(compression());

// 静的ファイルキャッシング
app.use(express.static('client/dist', {
  maxAge: '7d',
  etag: true,
  immutable: true
}));
```

### データベース

```javascript
// インデックス作成
await db.execute(sql`CREATE INDEX idx_users_username ON users(username)`);

// クエリ最適化（必要なカラムのみ取得）
const users = await db.select({
  id: users.id,
  username: users.username
}).from(users);
```

---

## モニタリング・ロギング

### ログ出力

```javascript
// server/src/config/logger.mjs
import morgan from 'morgan';

export const loggerMiddleware = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
);
```

### Azure Application Insights（推奨）

```javascript
import appInsights from 'applicationinsights';

if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  appInsights.setup().start();
}
```

---

## トラブルシューティング（開発者向け）

### デバッグモード

```powershell
# Node.js インスペクターでデバッグ
node --inspect server/azure-server.mjs

# Chrome DevToolsでアクセス: chrome://inspect
```

### ログレベル

```bash
# 環境変数で制御
LOG_LEVEL=debug npm run dev
```

### パフォーマンスプロファイリング

```javascript
// server/src/middleware/performance.mjs
export const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};
```

---

## 付録

### 環境変数一覧

| 変数名 | 必須 | デフォルト | 説明 |
|-------|-----|----------|------|
| `NODE_ENV` | ○ | development | 実行環境 |
| `PORT` | | 8080 | サーバーポート |
| `DATABASE_URL` | ○ | | データベース接続文字列 |
| `DATABASE_AUTH_TOKEN` | | | Turso認証トークン |
| `AZURE_STORAGE_CONNECTION_STRING` | | | Azure Storage接続文字列 |
| `BLOB_CONTAINER_NAME` | | knowledge-base | Blobコンテナ名 |
| `OPENAI_API_KEY` | | | OpenAI APIキー |
| `SESSION_SECRET` | ○ | | セッション暗号化キー |
| `CORS_ALLOW_ORIGINS` | | * | CORS許可オリジン |

### 依存関係の更新

```powershell
# 古い依存関係をチェック
npm outdated

# アップデート
npm update

# メジャーバージョンアップ（慎重に）
npx npm-check-updates -u
npm install
```

### ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

---

**最終更新**: 2025年12月11日  
**ドキュメントバージョン**: 1.0.0  
**対象システムバージョン**: 1.0.2
