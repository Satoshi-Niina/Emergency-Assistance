# Emergency Assistance System - 修正・構築ガイド

## 修正内容

### 1. ESM対応の `__dirname` 修正

**問題**: Node.js + TypeScript + tsx（ESM構成）で `__dirname` が未定義エラー

**修正内容**: `server/routes/data-processor.ts` に以下を追加
```typescript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM対応の __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 2. PostgreSQLスキーマ修正

**問題**: 
- `machines` テーブルに `machine_type_id` カラムが存在しない
- `history_items` テーブルが存在しない

**修正内容**: `migrations/0002_fix_schema_issues.sql` を作成
- `machines` テーブルに `machine_type_id` カラムを追加
- `history_items` テーブルを作成
- 必要なインデックスとトリガーを設定
- サンプルデータを挿入

### 3. マイグレーション実行スクリプト

**追加内容**: `server/scripts/apply-migration.ts`
- マイグレーションの自動実行
- テーブル構造の確認
- データ件数の確認

## セットアップ手順

### 1. 環境変数の設定

```bash
# .env ファイルを作成（server/.env）
DATABASE_URL=postgresql://postgres:password@localhost:5432/emergency_assistance
NODE_ENV=development
```

### 2. PostgreSQLデータベースの準備

```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE emergency_assistance;

# 接続確認
\c emergency_assistance
```

### 3. マイグレーションの実行

```bash
# サーバーディレクトリに移動
cd server

# マイグレーションを実行
npm run apply-migration
```

### 4. サーバーの起動

```bash
# 開発サーバーを起動
npm run dev
```

### 5. API動作確認

```bash
# テストスクリプトを実行
chmod +x test-api.sh
./test-api.sh
```

## API確認方法

### 基本的なcurlコマンド例

```bash
# 1. サーバーヘルスチェック
curl -s http://localhost:5000/api/health

# 2. 機種一覧取得
curl -s http://localhost:5000/api/machine-types | jq '.'

# 3. 全機械データ取得
curl -s http://localhost:5000/api/all-machines | jq '.'

# 4. 履歴一覧取得
curl -s http://localhost:5000/api/history | jq '.'

# 5. 機種追加
curl -X POST http://localhost:5000/api/machine-types \
  -H "Content-Type: application/json" \
  -d '{"machine_type_name": "新機種"}' | jq '.'

# 6. 履歴保存
curl -X POST http://localhost:5000/api/history/save \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "question": "テスト質問",
    "answer": "テスト回答",
    "machineType": "軌道モータカー",
    "machineNumber": "TRACK-001"
  }' | jq '.'
```

## 修正されたファイル一覧

1. `server/routes/data-processor.ts` - ESM対応の `__dirname` 修正
2. `migrations/0002_fix_schema_issues.sql` - PostgreSQLスキーマ修正
3. `server/scripts/apply-migration.ts` - マイグレーション実行スクリプト
4. `server/package.json` - マイグレーション実行用スクリプト追加
5. `test-api.sh` - API確認用テストスクリプト

## トラブルシューティング

### よくあるエラーと対処法

1. **データベース接続エラー**
   ```bash
   # PostgreSQLが起動しているか確認
   sudo systemctl status postgresql
   
   # 接続文字列を確認
   echo $DATABASE_URL
   ```

2. **マイグレーションエラー**
   ```bash
   # データベースに直接接続して確認
   psql -U postgres -d emergency_assistance
   
   # テーブル一覧を確認
   \dt
   ```

3. **サーバー起動エラー**
   ```bash
   # 依存関係を再インストール
   npm install
   
   # TypeScriptコンパイルエラーを確認
   npm run build
   ```

## 期待される結果

修正後、以下のAPIが正常に動作するはずです：

- ✅ `/api/machine-types` - 機種一覧取得
- ✅ `/api/all-machines` - 全機械データ取得
- ✅ `/api/history` - 履歴一覧取得
- ✅ `/api/data-processor/documents` - ナレッジベース文書一覧
- ✅ `/api/machine-types` (POST) - 機種追加
- ✅ `/api/history/save` (POST) - 履歴保存

フロントエンドのReact UIは変更せず、既存のUIでデータが正常に表示される状態になります。 