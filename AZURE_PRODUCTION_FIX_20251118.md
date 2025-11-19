# Azure本番環境 修正レポート - 2025年11月18日

## 修正した問題

### 1. ログイン失敗の原因と解決 ✅

**問題**: `INVALID_PASSWORD` エラーでログインできない

**原因**:
- `seed-admin-user.sql`のbcryptハッシュが`bcrypt`(node-gyp版)で生成されていた
- 本番環境（Dockerコンテナ）では`bcryptjs`(Pure JS版)を使用
- 2つのライブラリ間でハッシュ互換性がない

**検証結果**:
```javascript
// シードSQLの旧ハッシュ
const seedHash = '$2a$10$N9qo8uLOickgx2ZMRZoMye6IjF4N/fU6.kcXLX3fLgO.F7o4g7X6m';
bcrypt.compare('admin', seedHash) // => false ❌

// bcryptjsで生成した新ハッシュ
const newHash = '$2a$10$bmXf8KANdBBHbwVM.qo9SOzAAXIUTu.1Gmo5uqeGmmc5RN7aWtppW';
bcrypt.compare('admin', newHash) // => true ✅
```

**解決方法**:
1. データベースのパスワードハッシュを更新
```sql
UPDATE users SET password = '$2a$10$bmXf8KANdBBHbwVM.qo9SOzAAXIUTu.1Gmo5uqeGmmc5RN7aWtppW' WHERE username = 'admin';
```

2. `seed-admin-user.sql`を更新（bcryptjs互換ハッシュに変更）

**結果**: ✅ ログイン成功
```json
{
  "success": true,
  "user": {
    "id": "ea95d9fb-ff6a-4074-b1ae-f884af89a475",
    "username": "admin",
    "role": "admin",
    "displayName": "Administrator"
  }
}
```

---

### 2. UI機能の問題と原因分析

#### ✅ 正常に動作している機能

| 機能 | ステータス | 備考 |
|------|-----------|------|
| バックエンドAPI | ✅ 正常 | Health check 200 OK |
| データベース接続 | ✅ 正常 | PostgreSQL 17.6 接続中 |
| BLOBストレージ接続 | ✅ 正常 | Container exists: true |
| OpenAI API | ✅ 設定済 | API Key configured |
| ユーザー管理API | ✅ 正常 | 5ユーザー取得可能 |
| ログイン認証 | ✅ 修正完了 | admin/adminでログイン可能 |

#### ❌ 問題がある機能

| 機能 | ステータス | 原因 |
|------|-----------|------|
| チャットUI - GPTレスポンス | ❓ 要確認 | OpenAI API設定は正常、実装確認が必要 |
| チャットエクスポート | ❌ エラー | ローカルファイルシステムを参照している |
| 履歴管理UI - ファイル一覧 | ❌ エラー | `/app/knowledge-base/exports`が存在しない |
| 応急処置データ管理UI | ❌ エラー | ローカルファイルシステムを参照している |

---

## 根本原因：ハイブリッドモードの実装問題

### 現在の実装

`azure-server.mjs`の履歴詳細取得API:

```javascript
app.get('/api/history/:id', async (req, res) => {
  const projectRoot = path.resolve(__dirname, '..');
  const exportsDir = path.join(projectRoot, 'knowledge-base', 'exports');

  // ❌ ローカルファイルシステムに直接アクセス
  if (!fs.existsSync(exportsDir)) {
    return res.status(404).json({
      error: 'not_found',
      message: 'エクスポートディレクトリが見つかりません'
    });
  }
  // ...
});
```

**問題点**:
1. Dockerコンテナ内に`/app/knowledge-base/exports`ディレクトリが存在しない
2. 本番環境では`WEBSITES_ENABLE_APP_SERVICE_STORAGE=false`に設定
3. ローカルファイルシステムは永続化されない（コンテナ再起動で消失）
4. BLOBストレージが利用可能なのに使用していない

---

## 解決策

### 即時対応（手動修正）

#### A. BLOBストレージに既存データをアップロード

ローカルの`knowledge-base/exports`にあるJSONファイルをBLOBにアップロード:

```powershell
# Azure Storage CLIまたはAzure Portal Storage Explorerを使用
az storage blob upload-batch `
  --account-name emergencyassistance `
  --destination knowledge/exports `
  --source ./knowledge-base/exports `
  --pattern "*.json"
```

#### B. 履歴API実装を修正

現在の実装優先順位:
```
1. ローカルファイルシステム ❌ (コンテナに存在しない)
2. BLOBストレージ ✅ (利用可能)
```

修正後の優先順位:
```
1. BLOBストレージ ✅ (本番環境)
2. ローカルファイルシステム (開発環境のみ)
```

### コード修正案

#### 1. 履歴一覧API - BLOBストレージから取得

```javascript
app.get('/api/history/list', async (req, res) => {
  try {
    const storageMode = process.env.STORAGE_MODE || 'hybrid';

    // 本番環境ではBLOBストレージを優先
    if (storageMode === 'hybrid' || storageMode === 'blob') {
      const blobServiceClient = getBlobServiceClient();
      if (blobServiceClient) {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const prefix = 'knowledge-base/exports/';

        const blobs = [];
        for await (const blob of containerClient.listBlobsFlat({ prefix })) {
          if (blob.name.endsWith('.json') && !blob.name.includes('.backup.')) {
            blobs.push({
              id: extractIdFromFilename(blob.name),
              name: blob.name,
              lastModified: blob.properties.lastModified,
              size: blob.properties.contentLength
            });
          }
        }

        return res.json({
          success: true,
          data: blobs,
          source: 'blob_storage'
        });
      }
    }

    // フォールバック: ローカルファイルシステム（開発環境のみ）
    // ...
  } catch (error) {
    console.error('履歴一覧取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. 履歴詳細API - BLOBから取得

```javascript
app.get('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // BLOBストレージから取得を試行
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      const containerClient = blobServiceClient.getContainerClient(containerName);

      // ID一致するBLOBを検索
      const prefix = 'knowledge-base/exports/';
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        if (blob.name.includes(id) && blob.name.endsWith('.json')) {
          const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
          const downloadResponse = await blockBlobClient.download();
          const content = await streamToString(downloadResponse.readableStreamBody);
          const data = JSON.parse(content);

          return res.json({
            success: true,
            data: data,
            source: 'blob_storage'
          });
        }
      }
    }

    return res.status(404).json({
      error: 'not_found',
      message: '指定された履歴が見つかりません'
    });
  } catch (error) {
    console.error('履歴詳細取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 3. エクスポートAPI - BLOBに保存

```javascript
app.post('/api/chat/export', async (req, res) => {
  try {
    const exportData = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chat-export_${exportData.chatId}_${timestamp}.json`;
    const blobName = `knowledge-base/exports/${filename}`;

    // BLOBストレージに保存
    const blobServiceClient = getBlobServiceClient();
    if (blobServiceClient) {
      const containerClient = blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.upload(
        JSON.stringify(exportData, null, 2),
        Buffer.byteLength(JSON.stringify(exportData, null, 2)),
        {
          blobHTTPHeaders: { blobContentType: 'application/json' }
        }
      );

      return res.json({
        success: true,
        filename: filename,
        blobName: blobName,
        storage: 'blob'
      });
    }

    throw new Error('BLOBストレージが利用できません');
  } catch (error) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 環境変数確認

現在の本番環境設定:

| 変数名 | 設定状況 | 値の長さ |
|--------|----------|----------|
| `DATABASE_URL` | ✅ 設定済 | 141文字 |
| `OPENAI_API_KEY` | ✅ 設定済 | 164文字 |
| `AZURE_STORAGE_CONNECTION_STRING` | ✅ 設定済 | 198文字 |
| `AZURE_STORAGE_CONTAINER_NAME` | ✅ 設定済 | 9文字 (knowledge) |
| `SESSION_SECRET` | ✅ 設定済 | 29文字 |
| `JWT_SECRET` | ✅ 設定済 | 25文字 |
| `FRONTEND_URL` | ✅ 設定済 | 51文字 |
| `STATIC_WEB_APP_URL` | ✅ 設定済 | 51文字 |
| `NODE_ENV` | ✅ 設定済 | production |
| `PORT` | ✅ 設定済 | 8080 |
| `STORAGE_MODE` | ✅ 設定済 | hybrid |

**すべて正しく設定されています。**

---

## 次のステップ

### 優先度：高

1. **履歴管理APIをBLOB優先に修正** ⚠️
   - `api/history/list` - BLOBから一覧取得
   - `api/history/:id` - BLOBから詳細取得
   - エクスポート機能をBLOB保存に変更

2. **既存データをBLOBにマイグレーション** ⚠️
   - ローカルの`knowledge-base/exports/*.json`をBLOBにアップロード

3. **GPTチャット機能の動作確認** 📋
   - OpenAI API接続テスト
   - チャット送信・受信テスト

### 優先度：中

4. **応急処置データ管理のBLOB対応** 📋
   - トラブルシューティングファイルをBLOBから取得

5. **画像アップロード機能のBLOB対応** 📋
   - 画像をBLOBに保存・取得

---

## 確認済み項目

✅ Dockerコンテナは正常動作
✅ Always On有効化（アイドル停止なし）
✅ Health Check設定完了
✅ データベース接続正常
✅ BLOBストレージ接続正常
✅ OpenAI API設定完了
✅ ログイン認証修正完了
✅ ユーザー管理API正常
✅ 環境変数すべて設定済

❌ ローカルファイルシステム依存のAPI（修正が必要）
❌ 履歴データがBLOBにマイグレーションされていない

---

## まとめ

**理解の確認**: ✅ **正しい理解です**

> Azure App ServiceがB1 Basic プランをWindowsプランからDockerコンテナのLinuxプランに変更しただけ

はい、その通りです。ただし追加で:
- Always Onを有効化（アイドル停止防止）
- Health Checkパスを設定（`/health`）
- bcryptjsハッシュ互換性の問題を修正

**残っている問題**:

DBやBLOBとの接続は正常ですが、**APIの実装がローカルファイルシステム依存**になっているため、以下の機能が動作しません:

1. ❌ チャットエクスポート → BLOBに保存する実装が必要
2. ❌ 履歴ファイル一覧 → BLOBから取得する実装が必要
3. ❌ 履歴詳細表示 → BLOBから取得する実装が必要
4. ❌ 応急処置データ → BLOBから取得する実装が必要

**環境変数は正しく設定されています**が、コード側でBLOBストレージを優先的に使用するように修正が必要です。

次は履歴管理APIをBLOB優先に修正しますか？
