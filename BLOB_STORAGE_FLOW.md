# BLOBストレージ データフロー確認

## 期待動作と実装状況

### ①チャット画像の送信と表示
**期待:** チャットUIで撮影した画像を送信 → チャットエリアに表示

**実装:**
- アップロードAPI: `POST /api/history/upload-image`
  - 保存先: `knowledge-base/images/chat-exports/{fileName}`
  - レスポンス: `{ imageUrl: "/api/images/chat-exports/{fileName}" }`
- 表示API: `GET /api/images/chat-exports/:fileName`
  - BLOBから画像を取得して配信

**✅ 実装済み - BLOBストレージのみ使用**

---

### ②チャットエクスポート（JSON保存）
**期待:** チャットUIの内容をエクスポート → JSON形式で保存

**実装:**
- エクスポートAPI: `POST /api/chat/export`
  - 保存先: `knowledge-base/exports/{filename}.json`
  - 画像URLを正規化: `/api/images/chat-exports/{fileName}`
  - JSONに含まれる画像データ:
    ```json
    {
      "savedImages": [
        {
          "fileName": "chat_image_1234567890.jpg",
          "url": "/api/images/chat-exports/chat_image_1234567890.jpg",
          "blobPath": "images/chat-exports/chat_image_1234567890.jpg"
        }
      ]
    }
    ```

**✅ 実装済み - BLOBストレージのみ使用**

---

### ③履歴管理UIでの読み込み
**期待:** エクスポートしたJSONを履歴管理UIで読み込み → 画像も表示

**実装:**
- 一覧取得: `GET /api/history/export-list`
  - `knowledge-base/exports/` 内のJSONファイル一覧
- 詳細取得: `GET /api/history/:id`
  - JSONファイルをBLOBから読み込み
  - 画像URL: `/api/images/chat-exports/{fileName}` がそのまま使用可能

**✅ 実装済み - BLOBストレージのみ使用**

---

### ④応急復旧データ管理UI
**期待:** 
- 新規フロー生成 → JSONで保存
- 編集時 → ファイル内容を表示
- JSON内の画像を読み込み

**実装:**

#### 新規作成:
- 生成API: `POST /api/emergency-flow/generate`
- 保存API: `POST /api/emergency-flow`
  - 保存先: `knowledge-base/troubleshooting/{flowId}.json`
  - 画像URLを正規化: `/api/emergency-flow/image/{fileName}`

#### 画像アップロード:
- アップロードAPI: `POST /api/emergency-flow/upload-image`
  - 保存先: `knowledge-base/images/emergency-flows/{fileName}`

#### 編集/読み込み:
- 一覧取得: `GET /api/troubleshooting/list`
  - `knowledge-base/troubleshooting/` 内のJSON一覧
- 詳細取得: `GET /api/troubleshooting/:id`
  - JSONファイルをBLOBから読み込み
- 画像表示: `GET /api/emergency-flow/image/:fileName`
  - BLOBから画像を取得

#### 更新:
- 更新API: `PUT /api/emergency-flow/:flowId`
  - 既存JSONを上書き保存

**✅ 実装済み - BLOBストレージのみ使用**

---

## データの流れ（全体）

### チャット画像のライフサイクル:
```
1. 撮影/選択
   ↓
2. POST /api/history/upload-image
   ↓ BLOB保存: knowledge-base/images/chat-exports/chat_image_{timestamp}.jpg
   ↓
3. レスポンス: { imageUrl: "/api/images/chat-exports/chat_image_..." }
   ↓
4. チャットUIで表示: <img src="/api/images/chat-exports/...">
   ↓ (画像はBLOBから配信)
   ↓
5. エクスポート: POST /api/chat/export
   ↓ JSON保存: knowledge-base/exports/{filename}.json
   │ (画像URLを含む)
   ↓
6. 履歴読み込み: GET /api/history/:id
   ↓ JSONをBLOBから取得
   ↓
7. 画像表示: savedImages[].url を使用
   ↓ GET /api/images/chat-exports/{fileName}
   ↓ BLOBから画像を配信
```

### 応急フロー画像のライフサイクル:
```
1. 画像選択/アップロード
   ↓
2. POST /api/emergency-flow/upload-image
   ↓ BLOB保存: knowledge-base/images/emergency-flows/{fileName}_{timestamp}.jpg
   ↓
3. レスポンス: { imageUrl: "/api/emergency-flow/image/{fileName}_..." }
   ↓
4. フロー保存: POST /api/emergency-flow
   ↓ JSON保存: knowledge-base/troubleshooting/{flowId}.json
   │ (画像URLを含む)
   ↓
5. フロー読み込み: GET /api/troubleshooting/:id
   ↓ JSONをBLOBから取得
   ↓
6. 画像表示: steps[].images[].url を使用
   ↓ GET /api/emergency-flow/image/{fileName}
   ↓ BLOBから画像を配信
```

---

## 重要な変更点（最新）

### ❌ 削除されたローカルファイルシステムのフォールバック:
- 全てのAPIからローカルファイル読み書きを削除
- BLOBストレージが利用できない場合は503エラーを返す
- デプロイパッケージに `knowledge-base/` ディレクトリは含まれない

### ✅ BLOBストレージ専用の実装:
- 読み取り: 全てBLOBストレージから
- 書き込み: 全てBLOBストレージへ
- 削除: BLOBストレージのみ

---

## 確認事項

### Azure環境変数が正しく設定されているか:
```
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_ACCOUNT_NAME=...
AZURE_STORAGE_ACCOUNT_KEY=...
AZURE_STORAGE_CONTAINER_NAME=knowledge
BLOB_PREFIX=knowledge-base/
```

### BLOBストレージの構造:
```
Container: knowledge
├─ knowledge-base/
   ├─ exports/              ← チャットエクスポート
   ├─ troubleshooting/      ← 応急フロー
   ├─ data/                 ← ナレッジベース
   └─ images/
       ├─ chat-exports/     ← チャット画像
       └─ emergency-flows/  ← フロー画像
```

---

## テスト手順

### 1. チャット画像のテスト:
```powershell
# 画像アップロード
curl -X POST https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/history/upload-image `
  -F "image=@test.jpg"

# 画像取得
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/images/chat-exports/chat_image_1234567890.jpg
```

### 2. チャットエクスポートのテスト:
```powershell
# エクスポート
curl -X POST https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/chat/export `
  -H "Content-Type: application/json" `
  -d '{"chatId":"test123","title":"テスト","savedImages":[...]}'

# 履歴一覧
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/history/export-list

# 履歴詳細
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/history/test123
```

### 3. 応急フローのテスト:
```powershell
# フロー一覧
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/troubleshooting/list

# フロー詳細
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/troubleshooting/flow_1762131970241

# フロー画像
curl https://emergency-assistantapp-gwgscxcca5chahyb9.japanwest-01.azurewebsites.net/api/emergency-flow/image/emergency-flow-step1762144594249.jpg
```

---

## まとめ

**✅ 全ての期待動作が実装済み:**
1. ①チャット画像送信・表示 → BLOBストレージ
2. ②チャットエクスポート → BLOBストレージにJSON保存
3. ③履歴管理UIで読み込み → BLOBから取得
4. ④応急フロー生成・編集 → BLOBストレージでJSON/画像管理

**✅ ローカルファイルシステムは完全に削除:**
- サーバーにknowledge-baseフォルダは不要
- デプロイパッケージも軽量化
- Azure App Serviceのスケーリングでもデータ一貫性を保証
