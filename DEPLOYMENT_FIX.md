# デプロイ後の画像表示・エクスポート保存問題の修正

## 問題の概要

デプロイ後、以下の問題が発生していました:

1. **カメラ画像が表示されない** - Azure Blob Storage URLが404エラー
2. **チャットエクスポートが保存されない** - ストレージパスの不一致
3. **履歴管理UIで読み込めない** - API 500エラー

## 根本原因

Azure Blob Storageの構造と、アプリケーション内のパス処理に不整合がありました:

### Azure Blob Storage構造
```
knowledge (コンテナ)
└── knowledge-base/
    ├── exports/              ← チャットエクスポートJSON
    ├── troubleshooting/      ← 応急復旧フローJSON
    └── images/
        ├── chat-exports/     ← チャット画像
        └── emergency-flows/  ← 応急復旧フロー画像
```

### 問題点
- 一部のコードで `knowledge-base/` プレフィックスが二重に追加されていた
- 画像アップロード時に Azure Storage へのアップロード処理が不足
- ローカルパスとAzure Blobパスの不整合

## 修正内容

### 1. server/azure-storage.ts
**変更**: すべてのBlob操作メソッドで `knowledge-base/` プレフィックスを自動追加

```typescript
async uploadFile(filePath: string, blobName: string): Promise<string> {
  // knowledge-base/ プレフィックスを自動追加（既に含まれている場合は追加しない）
  const fullBlobName = blobName.startsWith('knowledge-base/')
    ? blobName
    : `knowledge-base/${blobName}`;
  
  const blockBlobClient = this.containerClient.getBlockBlobClient(fullBlobName);
  // ... アップロード処理
}
```

**影響**: `uploadFile()`, `downloadFile()`, `fileExists()`, `deleteFile()`, `readFileAsString()`, `writeStringToFile()`

### 2. server/lib/azure-storage.ts
**変更**: `getFullBlobName()` メソッドで `knowledge-base/` を自動追加（二重防止付き）

```typescript
private getFullBlobName(blobName: string): string {
  const cleanBlobName = blobName.replace(/^\/+/u, '');
  
  // BLOB_PREFIX が設定されている場合は使用、なければ 'knowledge-base/' を使用
  const prefix = this.blobPrefix || 'knowledge-base/';
  
  // 既に knowledge-base/ で始まっている場合は prefix を追加しない
  if (cleanBlobName.startsWith('knowledge-base/')) {
    return cleanBlobName;
  }
  
  return prefix + cleanBlobName;
}
```

### 3. server/routes/chat.ts
**変更**: Azure Blob パスを統一（`knowledge-base/` は自動追加されるため省略）

```typescript
// 修正前
const azureJsonPrefix = rawBlobPrefix ? 'exports/' : 'knowledge-base/exports/';
const azureImagePrefix = rawBlobPrefix
  ? 'images/chat-exports/'
  : 'knowledge-base/images/chat-exports/';

// 修正後
// azure-storage.ts が自動的に knowledge-base/ を追加するため、ここでは付けない
const azureJsonPrefix = 'exports/';
const azureImagePrefix = 'images/chat-exports/';
```

### 4. server/routes/chat.ts
**変更**: 本番環境ではローカルストレージを使用せず、Azure Storageに直接保存

```typescript
// 本番環境: Azure Storageに直接アップロード（一時ファイル経由）
if (isProduction && shouldUseAzure && azureStorageService) {
  const tempPath = path.join(require('os').tmpdir(), imageFileName);
  fs.writeFileSync(tempPath, imageBuffer);
  
  try {
    const blobName = `${azureImagePrefix}${imageFileName}`;
    await azureStorageService.uploadFile(tempPath, blobName);
    fs.unlinkSync(tempPath); // 一時ファイル削除
    console.log('✅ Azure Storageに直接アップロード:', blobName);
  } catch (uploadError) {
    fs.unlinkSync(tempPath);
    throw uploadError;
  }
} else {
  // 開発環境: ローカルに保存
  fs.writeFileSync(imagePath, imageBuffer);
  console.log('画像ファイルを保存しました（開発環境）:', imagePath);
}
```

### 5. server/routes/emergency-flow.ts
**変更**: 本番環境ではローカルストレージを使用せず、Azure Storageに直接保存

```typescript
// 本番環境: Azure Storageに直接アップロード
if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
  const tempPath = path.join(require('os').tmpdir(), finalFileName);
  fs.writeFileSync(tempPath, req.file.buffer);
  
  const blobName = `images/emergency-flows/${finalFileName}`;
  await azureStorage.uploadFile(tempPath, blobName);
  fs.unlinkSync(tempPath); // 一時ファイル削除
  console.log('✅ Azure Storageに直接アップロード:', blobName);
} else {
  // 開発環境: ローカルに保存
  fs.writeFileSync(filePath, req.file.buffer);
  console.log('✅ ファイル保存成功（開発環境）:', filePath);
}
```

### 6. server/routes/history.ts
**変更**: 本番環境ではローカルストレージを使用せず、Azure Storageに直接保存

```typescript
// 本番環境: Azure Storageに直接アップロード
if (isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING) {
  const tempPath = path.join(require('os').tmpdir(), fileName);
  fs.writeFileSync(tempPath, resizedBuffer);
  
  const blobName = `images/chat-exports/${fileName}`;
  await azureStorage.uploadFile(tempPath, blobName);
  fs.unlinkSync(tempPath); // 一時ファイル削除
  console.log('✅ Azure Storageに直接アップロード:', blobName);
} else {
  // 開発環境: ローカルに保存
  fs.writeFileSync(filePath, resizedBuffer);
  console.log('✅ 画像ファイルを保存しました（開発環境）:', filePath);
}
```

## デプロイ手順

1. **コードのビルド**
   ```powershell
   cd server
   npm run build
   ```

2. **Azure App Serviceへデプロイ**
   ```powershell
   # Azure CLIでデプロイ
   az webapp up --name emergency-assistance --resource-group <your-rg>
   ```

3. **環境変数の確認**
   Azure Portal で以下の環境変数が設定されていることを確認:
   - `AZURE_STORAGE_CONNECTION_STRING`
   - `AZURE_STORAGE_CONTAINER_NAME=knowledge`
   - `NODE_ENV=production`

4. **動作確認**
   - チャットUIでカメラ画像を送信して表示されることを確認
   - チャットをエクスポートして保存されることを確認
   - 履歴管理UIでエクスポートを読み込めることを確認

## 期待される動作

### カメラ画像の表示

**開発環境:**
1. カメラモーダルで画像をキャプチャ
2. ローカルファイルシステムに保存: `knowledge-base/images/chat-exports/`
3. クライアントで画像URL (`/api/images/chat-exports/xxx.jpg`) 経由で表示

**本番環境:**
1. カメラモーダルで画像をキャプチャ
2. Azure Blob Storageに直接アップロード: `knowledge/knowledge-base/images/chat-exports/`
3. ローカルストレージは使用しない（一時ファイルのみ使用し即削除）
4. クライアントでSAS URL経由で表示

### チャットエクスポート

**開発環境:**
1. チャット送信時にエクスポートJSONを生成
2. ローカルファイルシステムに保存: `knowledge-base/exports/`
3. 履歴管理UIでエクスポート一覧を取得・表示

**本番環境:**
1. チャット送信時にエクスポートJSONを生成
2. Azure Blob Storageに直接保存: `knowledge/knowledge-base/exports/`
3. ローカルストレージは使用しない（一時ファイルのみ使用し即削除）
4. 履歴管理UIでAzure Storageから取得・表示

### 応急復旧フロー

**開発環境:**
1. フロー編集時に画像をアップロード
2. ローカルファイルシステムに保存: `knowledge-base/images/emergency-flows/`
3. フロー保存時にJSONをローカルに保存: `knowledge-base/troubleshooting/`

**本番環境:**
1. フロー編集時に画像をアップロード
2. Azure Blob Storageに直接保存: `knowledge/knowledge-base/images/emergency-flows/`
3. ローカルストレージは使用しない（一時ファイルのみ使用し即削除）
4. フロー保存時にJSONをAzure Storageに保存: `knowledge/knowledge-base/troubleshooting/`

## 一時ファイルの取り扱い

本番環境では、ファイルをAzure Storageに保存する際に一時ファイルを使用します:

1. **保存時**: `os.tmpdir()`に一時ファイルを作成 → Azure Storageにアップロード → 一時ファイルを削除
2. **削除時**: Azure Storageから直接削除（ローカルファイル不要）

この方式により、本番環境のディスク容量を節約できます。

## ファイル削除時の動作

### チャットエクスポート削除
JSONファイル削除時に、リンクされた画像も自動的に削除されます:

**開発環境:**
- `knowledge-base/exports/xxx.json` を削除
- `knowledge-base/images/chat-exports/` の関連画像を削除

**本番環境:**
- Azure Blob Storage から `knowledge/knowledge-base/exports/xxx.json` を削除
- Azure Blob Storage から `knowledge/knowledge-base/images/chat-exports/` の関連画像を削除

### 応急復旧フロー削除
JSONファイル削除時に、リンクされた画像も自動的に削除されます:

**開発環境:**
- `knowledge-base/troubleshooting/xxx.json` を削除
- `knowledge-base/images/emergency-flows/` の関連画像を削除

**本番環境:**
- Azure Blob Storage から `knowledge/knowledge-base/troubleshooting/xxx.json` を削除
- Azure Blob Storage から `knowledge/knowledge-base/images/emergency-flows/` の関連画像を削除

## トラブルシューティング

### 画像が404エラーで表示されない
- Azure Blob Storageのコンテナ名が `knowledge` であることを確認
- Blob URLが `https://<account>.blob.core.windows.net/knowledge/knowledge-base/images/...` になっていることを確認
- Azure Portal で Blob Storage の内容を確認

### エクスポートが保存されない
- ローカルディレクトリ `knowledge-base/exports/` が作成されているか確認（開発環境）
- Azure Blob Storage に `knowledge/knowledge-base/exports/` ディレクトリがあるか確認（本番環境）
- サーバーログで保存エラーがないか確認

### 削除時に画像が残る
- サーバーログで画像削除のログを確認
- Azure Portal で Blob Storage の内容を確認
- JSONファイル内の `savedImages` または `steps[].images` に画像情報が正しく保存されているか確認

### API 500エラー
- サーバーログで詳細なエラーメッセージを確認
- ディレクトリのパーミッションを確認（開発環境）
- Azure Storage接続文字列が正しいか確認（本番環境）

## 参考情報

- Azure Blob Storage SDK: https://docs.microsoft.com/azure/storage/blobs/storage-blob-typescript-get-started
- 画像処理: sharp ライブラリ
- ファイルシステム: Node.js fs モジュール
