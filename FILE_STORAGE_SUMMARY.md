# Base64削除とファイル保存場所の確認

## 実施日
2025年11月20日

## Base64処理の削除状況

### ✅ 削除済み

#### クライアント側（camera-modal.tsx）
```typescript
// ❌ 削除前（Base64使用）
const imageData = canvas.toDataURL('image/jpeg', 0.4);
setCapturedImage(imageData);

// ✅ 削除後（Blob使用）
canvas.toBlob(
  (blob) => {
    const blobUrl = URL.createObjectURL(blob);
    setCapturedImage(blobUrl);
  },
  'image/jpeg',
  0.7
);
```

#### 送信処理
```typescript
// ❌ 削除前（Base64をそのまま送信）
await sendMessage(capturedImage); // data:image/jpeg;base64,...

// ✅ 削除後（FormDataでアップロード）
const formData = new FormData();
formData.append('image', blob, fileName);
const uploadResponse = await fetch('/api/history/upload-image', {
  method: 'POST',
  body: formData,
});
const uploadData = await uploadResponse.json();
await sendMessage(uploadData.imageUrl); // /api/images/chat-exports/...
```

### ⚠️ 残っている箇所（問題なし）

以下の箇所はシステムの正常動作に必要なため残しています：

1. **lib/sync-api.ts** - オフライン同期用
2. **lib/image-utils.ts** - SVGプレースホルダー生成用
3. **lib/offline-storage.ts** - オフライン画像最適化用
4. **lib/image-api.ts** - 既存API（廃止予定）

## ファイル保存場所

### JSONエクスポートファイル

#### ローカル環境
```
knowledge-base/
  └── exports/
      ├── エンジンが停止した_c68e3d36-8029-4ca9-99b7-2883f2904526_2025-11-17T09-29-48-427Z.json
      └── railway-maintenance-ai-prompt.json
```

#### 本番環境（Docker/Azure）
```
/app/knowledge-base/
  └── exports/
      ├── *.json
      └── ...
```

#### 環境変数設定

**ローカル開発**:
```bash
# デフォルト値（環境変数不要）
LOCAL_EXPORT_DIR=knowledge-base/exports
```

**Docker環境**:
```yaml
# docker-compose.yml
environment:
  LOCAL_EXPORT_DIR: /app/knowledge-base/exports
volumes:
  - ./knowledge-base:/app/knowledge-base
```

**Azure App Service**:
```bash
# GitHub Actions (.github/workflows/deploy-server-docker-container.yml)
LOCAL_EXPORT_DIR=/app/knowledge-base/exports
```

### 画像ファイル

#### ローカル環境
```
knowledge-base/
  └── images/
      └── chat-exports/
          ├── history_1763371800318_ah2jgf.jpg
          ├── history_1763440043520_3ojfyp.jpg
          └── camera_1732123456789.jpg
```

#### 本番環境（Docker/Azure）
```
/app/knowledge-base/
  └── images/
      └── chat-exports/
          ├── *.jpg
          ├── *.png
          └── ...
```

#### 環境変数設定

**ローカル開発**:
```bash
# デフォルト値（環境変数不要）
FAULT_HISTORY_IMAGES_DIR=knowledge-base/images/chat-exports
```

**Docker環境**:
```yaml
# docker-compose.yml
environment:
  FAULT_HISTORY_IMAGES_DIR: /app/knowledge-base/images/chat-exports
volumes:
  - ./knowledge-base:/app/knowledge-base
```

**Azure App Service**:
```bash
# GitHub Actions
FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
```

## コードでの環境変数使用状況

### server/routes/history.ts

```typescript
// ✅ 環境変数を使用（修正済み）
const exportsDir = process.env.LOCAL_EXPORT_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'exports');

console.log('📂 エクスポートディレクトリ:', exportsDir);
```

### server/routes/fault-history.ts

```typescript
// ✅ 環境変数を使用（既に実装済み）
const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');

console.log('📂 画像ディレクトリ:', imagesDir);
```

### server/services/fault-history-service.ts

```typescript
// ✅ 環境変数を使用（既に実装済み）
this.imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');

// ✅ エクスポートディレクトリも環境変数を使用
const exportDir = process.env.LOCAL_EXPORT_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'exports');
```

## 本番環境でのBLOB Storage対応

### 現在の設定

**Azure BLOB Storage用の環境変数**:
```bash
STORAGE_MODE=hybrid
AZURE_STORAGE_CONNECTION_STRING=<接続文字列>
AZURE_STORAGE_CONTAINER_NAME=<コンテナ名>
```

### 将来的な拡張

ファイルパスの代わりにBLOB Storage URLを使用する場合：

```typescript
// 例: Azure BLOB Storage対応
if (process.env.STORAGE_MODE === 'blob') {
  // BLOB Storageにアップロード
  const blobUrl = await uploadToBlobStorage(file);
  return blobUrl; // https://xxx.blob.core.windows.net/container/image.jpg
} else {
  // ローカルファイルシステムに保存
  const localPath = path.join(imagesDir, fileName);
  fs.writeFileSync(localPath, buffer);
  return `/api/images/chat-exports/${fileName}`;
}
```

## 環境変数の確認方法

### ローカル環境

```bash
# PowerShell
echo $env:LOCAL_EXPORT_DIR
echo $env:FAULT_HISTORY_IMAGES_DIR

# 実際のディレクトリを確認
ls knowledge-base/exports
ls knowledge-base/images/chat-exports
```

### Docker環境

```bash
# コンテナ内の環境変数を確認
docker exec emergency-assistance-app env | grep -E "LOCAL_EXPORT_DIR|FAULT_HISTORY_IMAGES_DIR"

# コンテナ内のディレクトリを確認
docker exec emergency-assistance-app ls -la /app/knowledge-base/exports
docker exec emergency-assistance-app ls -la /app/knowledge-base/images/chat-exports
```

### Azure App Service

```bash
# Azure CLIで環境変数を確認
az webapp config appsettings list \
  --name <app-name> \
  --resource-group <resource-group> \
  --query "[?name=='LOCAL_EXPORT_DIR' || name=='FAULT_HISTORY_IMAGES_DIR']"

# Kuduコンソールで確認
# https://<app-name>.scm.azurewebsites.net/DebugConsole
# cd /app/knowledge-base
# ls -la exports
# ls -la images/chat-exports
```

## ファイルアクセスパターン

### JSONエクスポートファイルの読み書き

```typescript
// 書き込み
const exportDir = process.env.LOCAL_EXPORT_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'exports');
const filePath = path.join(exportDir, `${id}.json`);
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), { encoding: 'utf8' });

// 読み込み
const files = fs.readdirSync(exportDir);
const jsonFiles = files.filter(f => f.endsWith('.json'));
const content = fs.readFileSync(path.join(exportDir, fileName), 'utf8');
const data = JSON.parse(content);
```

### 画像ファイルの読み書き

```typescript
// 書き込み
const imagesDir = process.env.FAULT_HISTORY_IMAGES_DIR ||
  path.join(process.cwd(), 'knowledge-base', 'images', 'chat-exports');
const filePath = path.join(imagesDir, fileName);
fs.writeFileSync(filePath, buffer);

// 読み込み（HTTPエンドポイント経由）
// GET /api/images/chat-exports/:filename
// GET /api/fault-history/images/:filename
```

## トラブルシューティング

### ファイルが見つからない場合

**症状**: 404 Not Found

**確認項目**:
1. 環境変数が正しく設定されているか
2. ディレクトリが存在するか
3. ファイルの読み書き権限があるか
4. パスが正しいか（絶対パス vs 相対パス）

**デバッグログ**:
```typescript
console.log('📂 エクスポートディレクトリ:', exportsDir);
console.log('📂 ディレクトリ存在:', fs.existsSync(exportsDir));
console.log('📂 ファイル一覧:', fs.readdirSync(exportsDir));
```

### パーミッションエラー

**症状**: EACCES: permission denied

**対処法**:
```bash
# ローカル環境
chmod -R 755 knowledge-base

# Docker環境
# Dockerfileでディレクトリを作成
RUN mkdir -p /app/knowledge-base/exports /app/knowledge-base/images/chat-exports
RUN chmod -R 755 /app/knowledge-base

# ボリュームマウント時の権限確認
docker exec emergency-assistance-app ls -la /app/knowledge-base
```

### ディレクトリが作成されない

**対処法**:
```typescript
// ディレクトリを再帰的に作成
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
  console.log('📁 ディレクトリを作成しました:', exportDir);
}
```

## 設定ファイル一覧

### 環境変数を設定しているファイル

1. **docker-compose.yml** - Docker開発環境用
   ```yaml
   environment:
     LOCAL_EXPORT_DIR: /app/knowledge-base/exports
     FAULT_HISTORY_IMAGES_DIR: /app/knowledge-base/images/chat-exports
   ```

2. **docker-compose.dev.yml** - Docker開発環境用（開発モード）
   ```yaml
   environment:
     LOCAL_EXPORT_DIR: /app/knowledge-base/exports
     FAULT_HISTORY_IMAGES_DIR: /app/knowledge-base/images/chat-exports
   ```

3. **.github/workflows/deploy-server-docker-container.yml** - Azure本番デプロイ用
   ```yaml
   LOCAL_EXPORT_DIR=/app/knowledge-base/exports
   FAULT_HISTORY_IMAGES_DIR=/app/knowledge-base/images/chat-exports
   ```

### 環境変数を使用しているファイル

1. **server/routes/history.ts** - 履歴API（修正済み）
2. **server/routes/fault-history.ts** - 故障履歴API（既存）
3. **server/services/fault-history-service.ts** - 故障履歴サービス（既存）

## まとめ

### ✅ 完了事項

1. **Base64処理の削除**
   - camera-modal.tsxからBase64処理を完全削除
   - Blob形式で画像を扱うように変更

2. **環境変数の設定**
   - LOCAL_EXPORT_DIR: JSONエクスポートファイル保存先
   - FAULT_HISTORY_IMAGES_DIR: 画像ファイル保存先
   - 全てのコードで環境変数を使用

3. **ファイル保存場所の明確化**
   - ローカル: `knowledge-base/exports`, `knowledge-base/images/chat-exports`
   - 本番: `/app/knowledge-base/exports`, `/app/knowledge-base/images/chat-exports`

### 🎯 設計方針

- **ローカル環境**: デフォルト値で動作（環境変数不要）
- **Docker環境**: docker-compose.ymlで環境変数設定
- **Azure環境**: GitHub Actionsで環境変数設定
- **将来の拡張**: BLOB Storage対応も環境変数で切替可能

### 📝 注意事項

- 環境変数が設定されていない場合はデフォルト値を使用
- ディレクトリが存在しない場合は自動作成
- ファイルはUTF-8（BOMなし）で保存
- 画像URLは `/api/images/chat-exports/{filename}` 形式
- Base64は使用せず、ファイルパス/URLのみを扱う
