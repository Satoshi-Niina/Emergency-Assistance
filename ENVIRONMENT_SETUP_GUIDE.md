# 環境変数設定ガイド

## 設定フロー

```
1. server/.env.production (テンプレート)
   ↓
2. GitHub Secrets (CI/CD用)
   ↓
3. Azure App Service Configuration (本番環境)
```

## DBバックアップのトリガー

### 自動バックアップのタイミング

1. **チャット送信完了時**
   - `/api/chats/send` エンドポイント
   - チャット完了 → JSONファイル保存 → 画像保存 → (DATABASE_BACKUP=true なら) DB保存

2. **手動エクスポート時**
   - ユーザーがエクスポートボタンを押した時
   - 同様にファイル → DBの順で保存

3. **故障履歴インポート時**
   - `/api/fault-history/import-from-exports`
   - 既存エクスポートファイルをDBに取り込む

### バックアップフロー

```
チャット完了
  ↓
JSONファイル保存（knowledge-base/exports）
  ↓
画像ファイル保存（knowledge-base/images/chat-exports）
  ↓
STORAGE_MODE=hybrid の場合
  ↓
Azure BLOB Storageにアップロード
  ↓
DATABASE_BACKUP=true の場合（オプション）
  ↓
PostgreSQL/SQLiteにバックアップ保存
```

## 環境変数一覧

### 必須設定（本番環境）

| 変数名 | 説明 | デフォルト | 設定場所 |
|--------|------|-----------|---------|
| `NODE_ENV` | 環境モード | `production` | Azure |
| `PORT` | ポート番号 | `80` | Azure |
| `DATABASE_URL` | PostgreSQL接続URL | - | GitHub Secrets |
| `JWT_SECRET` | JWT署名キー（32文字以上） | - | GitHub Secrets |
| `SESSION_SECRET` | セッション署名キー（32文字以上） | - | GitHub Secrets |
| `OPENAI_API_KEY` | OpenAI APIキー | - | GitHub Secrets |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage接続文字列 | - | GitHub Secrets |

### ストレージ設定

| 変数名 | 説明 | デフォルト | 推奨値 |
|--------|------|-----------|--------|
| `STORAGE_MODE` | ストレージモード | `file` | `hybrid`（本番） |
| `LOCAL_EXPORT_DIR` | JSONエクスポート保存先 | `knowledge-base/exports` | `/app/knowledge-base/exports` |
| `FAULT_HISTORY_IMAGES_DIR` | 画像保存先 | `knowledge-base/images/chat-exports` | `/app/knowledge-base/images/chat-exports` |

**ストレージモード**:
- `file`: ファイルシステムのみ（ローカル開発）
- `hybrid`: ファイル + Azure BLOB Storage（本番推奨）

### DBバックアップ設定（オプション）

| 変数名 | 説明 | デフォルト | 推奨値 |
|--------|------|-----------|--------|
| `DATABASE_BACKUP` | DBバックアップ有効化 | `false` | `false`（標準） |

**重要**: DBバックアップは**オプション機能**です
- 標準動作: ファイルシステム + BLOB Storage（`STORAGE_MODE=hybrid`）
- DBバックアップ: 追加のバックアップとして使用可能
- DBバックアップ失敗時もファイル保存は成功（エラーにならない）

### その他の設定

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `BACKUP_ENABLED` | ファイル変更履歴バックアップ | `true` |
| `BACKUP_MAX_FILES` | 保持する変更履歴数 | `10` |
| `CORS_ALLOW_ORIGINS` | CORS許可オリジン | 自動設定 |

## 設定手順

### 1. server/.env.production を編集

テンプレートとしてコメントを追加・修正:

```bash
# ================================================
# Database Backup Configuration (Optional)
# ================================================
# DBバックアップを有効化する場合は true に設定
# デフォルト: false（ファイルシステム + BLOB のみ）
# DATABASE_BACKUP=true
```

### 2. GitHub Secrets に登録

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

必須シークレット:
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `OPENAI_API_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME`
- `ACR_LOGIN_SERVER`
- `ACR_USERNAME`
- `ACR_PASSWORD`

オプション:
- `DATABASE_BACKUP` (DBバックアップを有効化する場合のみ `true` に設定)

### 3. GitHub Actions ワークフロー確認

`.github/workflows/deploy-server-docker-container.yml`:

```yaml
az webapp config appsettings set \
  --name ${{ env.WEBAPP_NAME }} \
  --resource-group ${{ env.RESOURCE_GROUP }} \
  --settings \
    DATABASE_URL="${{ secrets.DATABASE_URL }}" \
    STORAGE_MODE=hybrid \
    LOCAL_EXPORT_DIR=/app/knowledge-base/exports \
    FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports \
    DATABASE_BACKUP=false \
    # ... 他の設定
```

### 4. Azure App Service で確認

デプロイ後、Azure Portalで確認:

**Azure Portal** → **App Service** → **Configuration** → **Application settings**

自動設定される環境変数:
- `DATABASE_URL`
- `STORAGE_MODE=hybrid`
- `DATABASE_BACKUP=false`
- その他すべての環境変数

## 動作モード

### 標準モード（推奨）

```bash
STORAGE_MODE=hybrid
DATABASE_BACKUP=false  # または未設定
```

**保存先**:
- ✅ ファイルシステム: `knowledge-base/exports`, `knowledge-base/images/chat-exports`
- ✅ Azure BLOB Storage: 自動アップロード
- ❌ PostgreSQL: 使用しない

**メリット**:
- シンプル
- 高速
- ファイル直接アクセス可能
- BLOBで冗長化

### DBバックアップモード（オプション）

```bash
STORAGE_MODE=hybrid
DATABASE_BACKUP=true
DATABASE_URL=postgresql://...
```

**保存先**:
- ✅ ファイルシステム: `knowledge-base/exports`, `knowledge-base/images/chat-exports`（メイン）
- ✅ Azure BLOB Storage: 自動アップロード
- ✅ PostgreSQL: バックアップとして保存

**メリット**:
- 3重バックアップ（ファイル + BLOB + DB）
- DB検索機能が使える（将来的な拡張）

**注意**:
- DBバックアップ失敗してもエラーにならない（ファイル保存が優先）
- ファイルからの読み取りが標準（DBは読み取らない）

## トラブルシューティング

### 環境変数が反映されない

```bash
# Azure CLI で確認
az webapp config appsettings list \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group emergency-assistance-rg

# 再起動
az webapp restart \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group emergency-assistance-rg
```

### DBバックアップが動作しない

確認項目:
1. `DATABASE_BACKUP=true` が設定されているか
2. `DATABASE_URL` が正しく設定されているか
3. ログに `💾 データベースバックアップ完了` が出力されるか

```bash
# ログ確認
az webapp log tail \
  --name emergency-assistance-bfckhjejb3fbf9du \
  --resource-group emergency-assistance-rg
```

### ファイルが保存されない

確認項目:
1. `LOCAL_EXPORT_DIR` のディレクトリが存在するか
2. 書き込み権限があるか
3. ディスク容量は十分か

## まとめ

| 機能 | ローカル | 本番（標準） | 本番（DBバックアップ） |
|------|---------|------------|---------------------|
| JSONファイル | ✅ | ✅ | ✅ |
| 画像ファイル | ✅ | ✅ | ✅ |
| Azure BLOB | ❌ | ✅ | ✅ |
| PostgreSQL | ❌ | ❌ | ✅（バックアップ） |

**推奨設定**: `STORAGE_MODE=hybrid` + `DATABASE_BACKUP=false`（標準）
