# Emergency Assistance - 開発環境セットアップガイド

## 🚀 クイックスタート

### 単一コマンドでの起動（推奨）

```bash
npm run dev
```

このコマンドで以下が同時に起動されます：
- 統一サーバー（ポート8080）
- フロントエンド（Viteプロキシ経由）
- APIサーバー
- ホットリロード機能

### アクセス方法

- **メインアクセス**: http://localhost:8080
- **Vite Dev Server**: http://localhost:5173 （プロキシ経由でAPIは8080）

## 📁 プロジェクト構造

```
Emergency-Assistance/
├── server/
│   ├── unified-hot-reload-server.js  # 統一開発サーバー
│   ├── .env                          # サーバー環境設定
│   └── package.json                  # サーバー依存関係
├── client/
│   ├── src/                          # フロントエンドソース
│   ├── vite.config.js               # Vite設定（プロキシ含む）
│   └── package.json                 # クライアント依存関係
└── package.json                     # ルートレベル設定
```

## 🛠️ 開発環境設定

### 環境変数設定

サーバー設定は `server/.env` で管理：

```properties
NODE_ENV=development
PORT=8080                           # 統一サーバーポート
BYPASS_DB_FOR_LOGIN=true           # データベースバイパス（開発用）
CORS_ALLOW_ORIGINS=http://localhost:5173,http://localhost:8080
FRONTEND_URL=http://localhost:8080
```

### 推奨VS Code拡張機能

以下の拡張機能がインストール済み：
- PowerShell
- ShellCheck
- Bash IDE
- Code Runner

## 📝 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 統一サーバー起動（開発用メイン） |
| `npm run build` | プロダクション用ビルド |
| `npm start` | `npm run dev`のエイリアス |

### クライアント専用コマンド（client/ディレクトリ内）

| コマンド | 説明 |
|---------|------|
| `npm run vite-only` | Vite単体起動（デバッグ用） |
| `npm run build` | クライアントビルド |

## 🔧 トラブルシューティング

### ポート競合問題

```bash
# ポート使用状況確認
netstat -ano | findstr :8080
netstat -ano | findstr :5173

# プロセス終了
taskkill /PID <プロセスID> /F
```

### CORSエラー

統一サーバー（8080）を使用することでCORS問題が解決されます。
Vite dev server（5173）使用時は`.env`でCORS設定が適用されます。

### モジュールタイプ警告

`server/package.json`に`"type": "module"`が設定済み。

### ES Module エラー

CommonJS形式のファイルは以下のように修正済み：
- `routes/_diag.js`: ES Module形式に変換
- `exports`使用箇所を`export default`に変更

## 🎯 推奨開発フロー

1. **起動**: `npm run dev`でサーバー起動
2. **アクセス**: http://localhost:8080 でアプリ確認
3. **開発**: ファイル変更でホットリロード自動実行
4. **デバッグ**: VS Code統合ターミナルでログ確認

## 📊 環境情報

- Node.js: >=20.0.0
- NPM: >=8.0.0
- 開発サーバー: 統一サーバー（Express + Vite）
- ホットリロード: 有効
- データベース: 開発時バイパス有効

## 🔒 認証情報（開発用）

```
管理者: admin / admin
一般ユーザー: niina / G&896845
```

データベース認証はバイパスされ、簡易認証を使用。
