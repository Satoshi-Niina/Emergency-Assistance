# API修正内容サマリー

## 修正された問題

### 1. 404エラーの解決
- **問題**: `/api/users`, `/api/machine-types`, `/api/all-machines`, `/api/troubleshooting`, `/api/history`が404エラー
- **原因**: ルートが正しく登録されていない、または重複登録による競合
- **修正**:
  - `server/app.ts`で不足していたルートを追加
  - `server/routes.ts`で重複したルート登録を削除
  - 各ルートファイルでエラーハンドリングを強化

### 2. CORSポリシーエラーの解決
- **問題**: `cache-control`ヘッダーが許可されていない
- **修正**: `server/app.ts`のCORS設定に`cache-control`と`Cache-Control`を追加

### 3. 500エラーの解決
- **問題**: DB接続エラーとクエリ不一致
- **修正**:
  - `server/routes/machines.ts`で古い`query`関数をdrizzleの`db.execute`に変更
  - データベーススキーマに`machine_types`と`machines`テーブルを追加
  - エラーハンドリングを強化し、詳細なログを追加

## 修正されたファイル

### 1. server/app.ts
- CORS設定に`cache-control`ヘッダーを追加
- 不足していたルートを追加：
  - `/api/users` → `usersRouter`
  - `/api/machines` → `machinesRouter`
  - `/api/data-processor` → `registerDataProcessorRoutes`
- 重複を避けるため、基本的なルートのみを`registerRoutes`で登録

### 2. server/routes/machines.ts
- PostgreSQL接続を`query`から`db.execute`に変更
- レスポンス形式を統一（`success`, `data`, `timestamp`を含む）
- エラーハンドリングを強化
- デバッグログを追加

### 3. server/routes/troubleshooting.ts
- レスポンス形式を統一
- エラーハンドリングを強化
- 404ハンドリングを追加

### 4. server/db/schema.ts
- `machine_types`テーブルを追加
- `machines`テーブルを追加（外部キー制約付き）
- スキーマエクスポートに新しいテーブルを追加

### 5. server/routes.ts
- 重複したユーザー管理ルートを削除
- 基本的なルートのみを残す

## 追加されたAPIエンドポイント

### 機械管理API
- `GET /api/machines/machine-types` - 機種一覧取得
- `POST /api/machines/machine-types` - 機種追加
- `GET /api/machines/machines` - 機械番号一覧取得
- `POST /api/machines/machines` - 機械番号追加
- `DELETE /api/machines/machine-types/:id` - 機種削除
- `DELETE /api/machines/machines/:id` - 機械番号削除
- `GET /api/machines/all-machines` - 全機械データ取得

### トラブルシューティングAPI
- `GET /api/troubleshooting/list` - トラブルシューティング一覧取得
- `GET /api/troubleshooting/:id` - 特定のトラブルシューティング取得

### データプロセッサーAPI
- `POST /api/data-processor/process` - 統合データ処理
- `POST /api/data-processor/init-image-search` - 画像検索データ初期化
- `POST /api/data-processor/merge` - 差分更新
- `GET /api/data-processor/documents` - ドキュメント一覧取得
- `POST /api/data-processor/backup` - バックアップ作成
- `GET /api/data-processor/download-backup/:filename` - バックアップダウンロード

## 統一されたレスポンス形式

### 成功時
```json
{
  "success": true,
  "data": [...],
  "total": 10,
  "message": "操作が成功しました",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "details": "詳細なエラー情報",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## データベーステーブル

### machine_types
- `id` (text, primary key)
- `machine_type_name` (text, not null)
- `created_at` (timestamp, default now)

### machines
- `id` (text, primary key)
- `machine_number` (text, not null)
- `machine_type_id` (text, foreign key to machine_types.id)
- `created_at` (timestamp, default now)

## 次のステップ

1. **データベースマイグレーション**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

2. **サーバー起動テスト**
   ```bash
   npm run dev:server
   ```

3. **API動作確認**
   - ヘルスチェック: `GET /api/health`
   - 機種一覧: `GET /api/machines/machine-types`
   - ユーザー一覧: `GET /api/users`
   - トラブルシューティング一覧: `GET /api/troubleshooting/list`

4. **フロントエンド側の調整**
   - APIレスポンス形式の変更に対応
   - `data`プロパティを参照するよう修正

## 注意事項

- **フロントエンドコードは変更していません** - UIやReactコンポーネントはそのまま
- **APIレスポンス形式が変更** - フロントエンド側で`data`プロパティを参照する必要があります
- **エラーハンドリングが強化** - より詳細なエラー情報が提供されます
- **ログ出力が改善** - デバッグしやすいログメッセージを追加 