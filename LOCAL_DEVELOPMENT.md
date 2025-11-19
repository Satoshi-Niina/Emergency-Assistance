# ローカル開発環境セットアップガイド

## 🎯 重要: 統一サーバー方式
このプロジェクトは**環境変数だけで開発/本番を切り替える**統一サーバー方式を採用しています。

- **ローカル = 本番** の前提
- フロントエンドは**ビルドせず**にソースコードをそのままデプロイ
- `NODE_ENV`環境変数だけで動作が変わる

---

## 🚀 クイックスタート（推奨）

### 1. 依存関係のインストール
```powershell
npm install
```

### 2. 開発サーバーの起動（2つのターミナルで実行）

**ターミナル1: バックエンドAPI（ポート8080）**
```powershell
npm run dev
```

**ターミナル2: Vite開発サーバー（ポート5173）**
```powershell
cd client
npm run vite-only
```

### 3. ブラウザでアクセス
http://localhost:8080 を開きます（バックエンドがViteへプロキシします）

---

## 🔐 ログイン情報（開発環境）

データベース接続が無い場合、以下の開発用アカウントが自動的に使えます：

| ユーザー名 | パスワード | 権限 |
|-----------|----------|------|
| admin     | admin    | 管理者 |
| user      | user     | 従業員 |
| test      | test     | 従業員 |

---

## 📁 プロジェクト構成

```
Emergency-Assistance/
├── client/              # フロントエンド (React + Vite)
│   ├── src/            # ソースコード（デプロイ対象）
│   ├── dist/           # ビルド成果物（本番のみ）
│   └── vite.config.js
├── server/             # バックエンド (Express)
│   └── azure-server.mjs  # 統一サーバー
└── package.json        # ルートパッケージ
```

---

## 🛠️ 利用可能なコマンド

### 開発環境（推奨）
```powershell
# バックエンドサーバー起動（開発モード）
npm run dev

# 別ターミナルでVite起動
cd client
npm run vite-only
```

### 本番モード確認
```powershell
# フロントエンドをビルド
npm run build:client

# 本番モードで起動（NODE_ENV未設定=本番扱い）
npm start
# http://localhost:8080 にアクセス
```

---

## ❓ トラブルシューティング

### 「Vite開発サーバーに接続できません」エラー
**原因**: Viteが起動していない
**解決**: 別ターミナルで`cd client && npm run vite-only`を実行

### ログインできない
**原因**: データベース接続が設定されていない
**解決**: 開発環境では自動的に開発用アカウントが有効になります（admin/admin）

### ポートが使用中
**原因**: 別のプロセスがポート5173または8080を使用している
**解決**:
```powershell
# ポートを使用しているプロセスを確認
netstat -ano | findstr :5173
netstat -ano | findstr :8080

# プロセスを終了（PIDを確認してから）
taskkill /PID <プロセスID> /F
```

### 本番モードでCSSが読み込まれない
**原因**: client/dist が存在しない
**解決**: `npm run build:client`を実行してからサーバーを起動---

## 🔧 環境変数

### 必須環境変数
```env
# 環境判定（開発環境のみ設定）
NODE_ENV=development
```

### オプション環境変数
`.env`ファイルを作成することで、設定をカスタマイズできます：

```env
# データベース接続（オプション）
DATABASE_URL=postgresql://user:pass@localhost:5432/emergency

# Azure Blob Storage（オプション）
AZURE_STORAGE_CONNECTION_STRING=your_connection_string

# OpenAI API（オプション）
OPENAI_API_KEY=sk-...

# セッションシークレット（オプション）
SESSION_SECRET=your-secret-key
```

---

## 🎯 重要: デプロイの仕組み

### フロントエンド
- **開発**: ソースコードをそのままプッシュ
- **本番**: GitHub Actionsが自動ビルド → Azure Static Web Appsにデプロイ

### バックエンド
1. ソースコードをそのままプッシュ
2. Docker イメージがビルドされる
3. Azure App Serviceにデプロイ
4. `NODE_ENV`環境変数で本番モードで起動

### ローカルで本番環境をテスト
```powershell
# 1. フロントエンドをビルド
npm run build:client

# 2. 環境変数を未設定にして起動（本番モード）
# PowerShellの場合
$env:NODE_ENV=$null
npm start

# または直接
node server/azure-server.mjs
# http://localhost:8080 にアクセス
```

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. Node.jsバージョン: `node --version` (>=20.0.0が必要)
2. npmバージョン: `npm --version` (>=8.0.0が必要)
3. 依存関係の再インストール: `npm install`
4. ポートの競合チェック
5. ブラウザのコンソールエラー

---

## 🎯 開発のヒント

### Hot Reload
Vite開発サーバーは自動的にファイルの変更を検知してリロードします。

### デバッグ
- **フロントエンド**: ブラウザの開発者ツール (F12)
- **バックエンド**: サーバーのコンソールログを確認

### API テスト
バックエンドのAPIは直接テストできます：
```powershell
# ヘルスチェック
curl http://localhost:8080/api/health

# ログイン（開発環境）
curl -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"admin\"}'
```

---

**最終更新**: 2025年11月19日
