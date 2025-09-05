# バックエンドのみ起動ガイド

このブランチ（backup-clean）では、バックエンドのみを起動することができます。

## バックエンドのみの起動方法

### 1. ルートディレクトリから
```bash
npm run dev:server
```

### 2. サーバーディレクトリから直接
```bash
cd server
npm run dev
```

## 利用可能なエンドポイント

- `GET /health` - ヘルスチェック（OK レスポンス）
- その他のAPI エンドポイント（実装済み）

## 設定

- ポート: 3001 (環境変数 PORT で変更可能)
- 開発環境: `tsx index.dev.ts` を使用
- プロダクション環境: `npm run build && npm start`

## 主な変更点

- `health.ts` を `health.js` に変換
- TypeScript 関数ベースから Express Router パターンに変更
- バックエンド単体での動作を最適化
