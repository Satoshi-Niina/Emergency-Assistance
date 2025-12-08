# 🚨 本番環境 BLOB ストレージ問題 - 診断レポート

**日時**: 2025年12月7日  
**問題**: 画像アップロードエラー、knowledge-baseコンテナ不在

---

## 📊 現状確認

### ✅ ローカル環境
- コンテナ名: `knowledge`
- 画像保存先: `knowledge-base/images/chat-exports/`
- 動作状態: **正常**

### ❌ 本番環境
- Azure Portal確認: `knowledge-base` コンテナ **存在しない**
- エラー発生: 画像アップロード時
- 謎の現象: **既存画像は表示される**

---

## 🔍 原因仮説

### 仮説1: 環境変数の設定ミス
```bash
# 本番 App Service で確認必要
AZURE_STORAGE_CONTAINER_NAME=??? # ← 未設定 or 誤り

# 正しい値
AZURE_STORAGE_CONTAINER_NAME=knowledge
```

### 仮説2: ストレージアカウントの権限不足
- `createIfNotExists()` が失敗している
- App Service の Managed Identity に権限がない
- Connection String に書き込み権限がない

### 仮説3: 画像データの保存先が二重化
- 古い履歴: データベースに直接Base64保存
- 新しい履歴: BLOBに保存
- 画面表示は両方に対応しているため矛盾が見えなかった

---

## 🛠️ 対応手順

### Step 1: Azure Portal で環境変数確認
```
1. App Service を開く
2. 設定 > 構成 > アプリケーション設定
3. 以下を確認・修正:

AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=knowledge  ← ★これを追加/修正
```

### Step 2: ストレージアカウントでコンテナ手動作成
```
1. Azure Portal > ストレージアカウント
2. コンテナ > 新規作成
3. 名前: knowledge
4. パブリックアクセスレベル: コンテナ (匿名読み取り可)
```

### Step 3: App Service に必要な権限付与
```
1. ストレージアカウント > アクセス制御 (IAM)
2. ロールの割り当て追加:
   - ロール: Storage Blob Data Contributor
   - アクセス権の割り当て先: App Service の Managed Identity
```

### Step 4: アプリ再起動
```
1. App Service > 概要
2. 再起動ボタンをクリック
3. ログで確認:
   [Blob] Container exists: knowledge ✅
```

---

## 📝 検証チェックリスト

### 環境変数確認
- [ ] `AZURE_STORAGE_CONNECTION_STRING` 設定済み
- [ ] `AZURE_STORAGE_CONTAINER_NAME=knowledge` 設定済み
- [ ] `AZURE_STORAGE_ACCOUNT_NAME` (オプション)

### コンテナ確認
- [ ] Azure Portal で `knowledge` コンテナ存在確認
- [ ] パブリックアクセスレベル: コンテナ
- [ ] フォルダ構造:
  ```
  knowledge/
    knowledge-base/
      exports/         (履歴JSON)
      images/
        chat-exports/  (チャット画像)
        emergency-flows/ (フロー図)
  ```

### 権限確認
- [ ] App Service Managed Identity 有効
- [ ] Storage Blob Data Contributor ロール割り当て済み
- [ ] または Connection String に書き込み権限あり

### 動作確認
- [ ] 履歴編集画面を開く
- [ ] カメラボタンから画像追加
- [ ] 保存ボタンクリック
- [ ] エラーなく保存完了
- [ ] Azure Portal で画像ファイル存在確認

---

## 🔧 コード修正 (必要な場合)

### より詳細なエラーログ
```javascript
// server/src/routes/history.mjs
// コンテナ作成失敗時の詳細ログ

await containerClient.createIfNotExists({
  access: 'container'
}).catch(err => {
  console.error('[history] Container creation failed:', {
    containerName,
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    details: err.details
  });
  throw err;
});
```

### フォールバック: 既存コンテナ使用
```javascript
// 別のコンテナ名を試す (緊急時)
const fallbackContainers = ['knowledge', 'knowledge-base', '$web'];
for (const name of fallbackContainers) {
  const client = blobServiceClient.getContainerClient(name);
  if (await client.exists()) {
    console.log(`[Blob] Using fallback container: ${name}`);
    return client;
  }
}
```

---

## 📊 デプロイ後の検証

### 本番環境ログ確認
```bash
# Azure Portal > App Service > ログストリーム
# 以下のログが出ることを確認:

[Blob] Container exists: knowledge ✅
[history/upload-image] ✅ BLOB Upload VERIFIED
```

### 実際の画像アップロードテスト
1. 本番サイトで履歴編集画面を開く
2. カメラアイコンから画像追加
3. 保存
4. Azure Portal でファイル確認:
   ```
   knowledge/knowledge-base/images/chat-exports/chat_image_*.jpg
   ```

---

## 🎯 根本対策

### CI/CD に環境変数検証を追加
```yaml
# .github/workflows/deploy-server-AppCervce.yml
- name: Verify Azure Environment Variables
  run: |
    echo "Checking required environment variables..."
    az webapp config appsettings list \
      --name ${{ secrets.AZURE_WEBAPP_NAME }} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
      --query "[?name=='AZURE_STORAGE_CONTAINER_NAME'].value" -o tsv
```

### 起動時の自動検証強化
```javascript
// server/azure-server.mjs
async function validateBlobStorage() {
  const blobClient = getBlobServiceClient();
  if (!blobClient) {
    throw new Error('BLOB client initialization failed');
  }
  
  const containerClient = blobClient.getContainerClient(containerName);
  const exists = await containerClient.exists();
  
  if (!exists) {
    console.log(`Creating container: ${containerName}`);
    await containerClient.createIfNotExists({ access: 'container' });
  }
  
  console.log(`✅ BLOB storage validated: ${containerName}`);
}

// 起動シーケンスに追加
await validateBlobStorage();
```

---

## 📞 サポート情報

### Azure サポートへの問い合わせ内容
```
件名: App ServiceからBlobコンテナ作成権限の確認

本文:
Azure App Service (Node.js) から BlobServiceClient.createIfNotExists() 
を実行していますが、コンテナが作成されません。

環境:
- App Service: [アプリ名]
- Storage Account: [アカウント名]
- 認証方法: Connection String
- エラーコード: [コンソールログから]

確認事項:
1. Connection String に書き込み権限があるか
2. Managed Identity に Storage Blob Data Contributor が必要か
3. ファイアウォール設定による制限の有無
```

---

**次のアクション**: Azure Portal で環境変数とコンテナを確認・修正してください。
