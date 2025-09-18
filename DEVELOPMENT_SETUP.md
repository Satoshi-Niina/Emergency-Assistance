# Emergency Assistance Development Setup Guide

## 環境設定完了 ✅

開発環境の設定が完了しました。以下の手順でアプリケーションを起動できます。

## 前提条件

- Node.js 18.0.0以上
- npm 8.0.0以上
- Azure Functions Core Tools 4.x
- PostgreSQL (localhost:5432)

## クイックスタート

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

#### オプション1: 全サービスを同時起動
```bash
npm run watch
```

#### オプション2: 個別に起動
```bash
# ターミナル1: クライアント (React + Vite)
npm run dev:client

# ターミナル2: サーバー (Express)
npm run dev:server

# ターミナル3: API (Azure Functions)
npm run dev:api
```

## アクセスURL

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:3001
- **Azure Functions API**: http://localhost:7071

## 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | クライアントとサーバーを起動 |
| `npm run dev:api` | Azure Functions APIを起動 |
| `npm run watch` | 全サービスを同時起動 |
| `npm run build` | 全コンポーネントをビルド |
| `npm run clean` | ビルドファイルをクリーンアップ |

## トラブルシューティング

### Azure Functions が起動しない場合
```bash
cd api
func start
```

### データベース接続エラーの場合
1. PostgreSQLが起動しているか確認
2. データベース `emergency_assistance` が存在するか確認
3. 接続情報を `api/local.settings.json` で確認

### ポートが使用中の場合
- クライアント: 5173番ポート
- サーバー: 3001番ポート  
- API: 7071番ポート

## 開発ワークフロー

1. **コード変更**: ファイルを編集
2. **自動リロード**: 変更が自動的に反映
3. **テスト**: ブラウザで http://localhost:5173 にアクセス
4. **API確認**: http://localhost:7071/api/health でAPI動作確認

## プロジェクト構造

```
Emergency-Assistance/
├── client/          # React + Vite フロントエンド
├── server/          # Express バックエンド
├── api/             # Azure Functions API
├── shared/          # 共通ライブラリ
└── knowledge-base/  # ナレッジベースデータ
```

## セキュリティ注意事項

- 本番環境では必ず環境変数を適切に設定
- データベースパスワードを変更
- CORS設定を本番用に調整

## サポート

問題が発生した場合は、以下を確認してください：
1. ログファイルの確認
2. ネットワーク接続の確認
3. 依存関係の再インストール: `npm run install:all`
