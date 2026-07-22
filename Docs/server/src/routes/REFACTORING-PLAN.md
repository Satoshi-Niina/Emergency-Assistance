# History.mjs リファクタリング計画

**作成日**: 2025年12月7日  
**現状**: 791行（単一ファイル）  
**判断**: 現状のまま運用継続、将来的に分離検討

---

## 現状分析

### ファイル構成
- **総行数**: 791行
- **エンドポイント数**: 10個
- **ヘルパー関数**: 5個

### エンドポイント一覧
```javascript
1. GET    /                           - 履歴一覧取得
2. GET    /machine-data               - 機種データ取得
3. POST   /upload-image               - 画像アップロード
4. GET    /exports/:fileName          - エクスポートファイル取得
5. GET    /export-files               - エクスポートファイル一覧
6. GET    /:id                        - 履歴詳細取得
7. PUT    /update-item/:id            - 履歴更新
8. PUT    /:id                        - 履歴更新（エイリアス）
9. DELETE /:id                        - 履歴削除
10. POST  /cleanup-orphaned-images    - 孤立画像クリーンアップ
```

### ヘルパー関数
```javascript
- normalizeId()              - ID正規化
- findHistoryBlob()          - BLOB検索
- deriveTitleFromFileName()  - ファイル名からタイトル抽出
- extractMetadataFromJson()  - JSONメタデータ抽出
- downloadJson()             - JSON取得
```

---

## リファクタリング計画（将来実施時）

### Phase 1: サービス層分離

#### 新規ファイル構造
```
server/src/
├── routes/
│   └── history.mjs (150行) ← ルーティング定義のみ
├── services/
│   ├── history-metadata.mjs (100行)
│   │   └── メタデータ抽出・正規化
│   ├── history-blob.mjs (150行)
│   │   └── BLOB操作（アップロード・削除）
│   ├── history-cleanup.mjs (120行)
│   │   └── 孤立画像クリーンアップ
│   └── history-query.mjs (200行)
│       └── 一覧・詳細取得・更新
└── utils/
    └── blob-helpers.mjs (70行)
        └── 共通BLOB処理
```

#### history-metadata.mjs
```javascript
// 抽出対象:
export const normalizeId = (id) => { ... }
export const deriveTitleFromFileName = (fileName) => { ... }
export const extractMetadataFromJson = (json, fileName) => { ... }
export const parseFileName = (name) => { ... }

// 特性: 純粋関数、並行処理不要
```

#### history-blob.mjs
```javascript
// 抽出対象:
export const uploadImageToBlob = async (file, options) => { ... }
export const deleteImageFromBlob = async (blobName) => { ... }
export const findHistoryBlob = async (containerClient, normalizedId) => { ... }
export const downloadJson = async (containerClient, blobName) => { ... }

// 並行処理可能:
// - 複数画像の同時アップロード
// - 削除時のバッチ処理
```

#### history-cleanup.mjs
```javascript
// 抽出対象:
export const cleanupOrphanedImages = async (dryRun = false) => { ... }
export const collectReferencedImages = async (containerClient) => { ... }
export const identifyOrphans = async (allImages, referencedImages) => { ... }

// 並行処理最適化:
// - JSON解析をPromise.allで並列化
// - 画像削除をバッチ処理（10個ずつ）
```

#### history-query.mjs
```javascript
// 抽出対象:
export const getHistoryList = async (filters) => { ... }
export const getMachineData = async () => { ... }
export const getHistoryDetail = async (id) => { ... }
export const updateHistory = async (id, data) => { ... }
export const deleteHistory = async (id) => { ... }

// 並行処理最適化:
// - 一覧取得時のJSON解析を並列化
// - 詳細取得時に機種データと並列取得
```

---

### Phase 2: 並行処理最適化

#### 優先度 HIGH

##### 1. 一覧取得の並列化 (GET /)
**現状**: 順次処理（3-5秒 / 50件）
```javascript
for await (const blob of containerClient.listBlobsFlat()) {
  const data = await downloadJson(containerClient, blob.name);
  const metadata = extractMetadataFromJson(data, blob.name);
  historyList.push(metadata);
}
```

**改善後**: バッチ並列処理（1.5-3秒 / 50件）
```javascript
const blobs = await collectBlobs(containerClient, prefix);
const chunks = chunkArray(blobs, 10); // 10個ずつ処理

const results = [];
for (const chunk of chunks) {
  const chunkResults = await Promise.all(
    chunk.map(async (blob) => {
      const data = await downloadJson(containerClient, blob.name);
      return extractMetadataFromJson(data, blob.name);
    })
  );
  results.push(...chunkResults);
}
```

**期待効果**: 処理時間 40-50%短縮

##### 2. 孤立画像クリーンアップの並列化
**現状**: 順次JSON解析（10-15秒 / 100JSON）
```javascript
for await (const blob of containerClient.listBlobsFlat({ prefix: jsonPrefix })) {
  const jsonData = await downloadJson(containerClient, blob.name);
  const metadata = extractMetadataFromJson(jsonData, blob.name);
  // 参照画像を収集
}
```

**改善後**: 並列JSON解析（4-8秒 / 100JSON）
```javascript
const jsonBlobs = await collectJsonBlobs(containerClient);
const referencedImagesSets = await Promise.all(
  jsonBlobs.map(async (blob) => {
    const jsonData = await downloadJson(containerClient, blob.name);
    const metadata = extractMetadataFromJson(jsonData, blob.name);
    return metadata.images.map(img => img.fileName);
  })
);
const referencedImages = new Set(referencedImagesSets.flat());
```

**期待効果**: 処理時間 50-60%短縮

#### 優先度 MEDIUM

##### 3. 詳細取得と機種データの並列化
**現状**: 順次取得
```javascript
const historyData = await getHistoryDetail(id);
const machineData = await getMachineData();
res.json({ history: historyData, machines: machineData });
```

**改善後**: 並列取得
```javascript
const [historyData, machineData] = await Promise.all([
  getHistoryDetail(id),
  getMachineData()
]);
res.json({ history: historyData, machines: machineData });
```

**期待効果**: 処理時間 20-30%短縮

---

### Phase 3: エラーハンドリング強化

#### 並列処理時のエラー戦略
```javascript
// パターン1: 全件成功が必須の場合
const results = await Promise.all(tasks);

// パターン2: 部分失敗を許容する場合
const results = await Promise.allSettled(tasks);
const succeeded = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');

// パターン3: リトライ処理
async function retryOperation(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
```

---

## 実装タイムライン（実施時）

### Week 1: 基盤準備
- [ ] `server/src/services/` ディレクトリ作成
- [ ] `history-metadata.mjs` 作成・テスト
- [ ] `blob-helpers.mjs` 作成・テスト

### Week 2: サービス分離
- [ ] `history-blob.mjs` 作成・テスト
- [ ] `history-cleanup.mjs` 作成・テスト
- [ ] `history-query.mjs` 作成・テスト

### Week 3: 並行処理導入
- [ ] 一覧取得の並列化実装
- [ ] クリーンアップの並列化実装
- [ ] 詳細取得の並列化実装

### Week 4: 統合テスト
- [ ] routes/history.mjsをサービス層呼び出しに書き換え
- [ ] 全エンドポイント動作確認
- [ ] レスポンスタイム計測・比較
- [ ] 本番環境デプロイ

---

## 期待される改善効果

| 項目 | 現状 | 改善後 | 効果 |
|------|------|--------|------|
| **コード行数** | 791行（単一） | 690行（分散） | 可読性向上 |
| **一覧取得速度** | 3-5秒 (50件) | 1.5-3秒 | **40-50%高速化** |
| **クリーンアップ速度** | 10-15秒 (100JSON) | 4-8秒 | **50-60%高速化** |
| **保守性** | 低 | 高 | バグ修正容易 |
| **テスタビリティ** | 困難 | 容易 | 品質向上 |
| **並行開発** | 困難 | 容易 | コンフリクト減少 |

---

## 注意事項

### 後方互換性
- 既存APIパス・レスポンス形式は変更なし
- クライアント側の修正不要

### 段階的移行
1. 1機能ずつ分離
2. 各ステップで完全テスト
3. 問題発生時は即座にロールバック

### パフォーマンス
- バッチサイズは環境に応じて調整（デフォルト10件）
- Azure BLOB API制限に注意（秒間100リクエスト）
- メモリ使用量監視（大量JSON処理時）

### セキュリティ
- サービス層でも認証状態を確認
- BLOB操作の権限チェック
- 入力値検証の徹底

---

## 実施判断基準

### 実施すべき状況
- [ ] 履歴データが500件以上になった
- [ ] 一覧取得に5秒以上かかる
- [ ] 複数人で同時開発が必要
- [ ] 単体テストの実装が必要
- [ ] コード理解に30分以上かかる（新規メンバー）

### 現状維持でよい状況
- [x] 履歴データが200件未満
- [x] レスポンスタイムが許容範囲内
- [x] 単独開発
- [x] 機能追加の予定なし

---

## 現在の運用方針

**判断**: 現状のまま運用継続

**理由**:
1. 機能・レスポンスに問題なし
2. データ量がまだ少ない
3. 保守頻度が低い
4. リファクタリングコストが高い

**再検討時期**: 以下のいずれかが発生した時
- 履歴データが500件超過
- レスポンスタイムが3秒超過
- 複数人での並行開発開始
- 大規模機能追加の必要性

---

## 参考資料

### Promise並列処理のベストプラクティス
```javascript
// ✅ Good: バッチ処理で制御
async function processBatch(items, batchSize = 10) {
  const chunks = chunkArray(items, batchSize);
  const results = [];
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(item => processItem(item))
    );
    results.push(...chunkResults);
  }
  return results;
}

// ❌ Bad: 無制限並列実行（メモリ枯渇リスク）
const results = await Promise.all(
  items.map(item => processItem(item))
);
```

### Azure BLOB Storage制限
- **スループット**: コンテナあたり20,000リクエスト/秒
- **帯域幅**: 60 Gbps（Premium）/ 20 Gbps（Standard）
- **推奨**: バッチサイズ10-50、リトライ処理実装

---

**最終更新**: 2025年12月7日  
**次回レビュー**: データ量500件到達時 or 2026年6月
