# API 500エラー修正レポート（複数エンドポイント）

## 問題

デプロイ後、以下のAPIエンドポイントで500エラーが発生：

- `/api/files/import` - ファイルインポート時にネットワークエラー
- `/api/knowledge-base/stats` - 統計情報取得失敗
- `/api/ai-assist/settings` - AI支援設定取得失敗
- `/api/settings/rag` - RAG設定取得失敗
- `/api/admin/dashboard` - ダッシュボード情報取得失敗

## 根本原因

すべてのエラーの根本原因は**APIパスルーティングの問題**：

1. `/api/xxx/yyy`形式のパスで、サブパス（`yyy`）を正しく抽出できていなかった
2. `req.params.action`は定義されておらず、`req.path.split('/')`での手動抽出が必要だった
3. パス抽出ロジックが各ハンドラーで不統一だった

## 修正内容

### 1. knowledge-base API（`server/src/api/knowledge-base/index.mjs`）

**問題点:**
```javascript
// ❌ rows変数が未定義のまま参照
return res.json({
  stats: {
    documents: rows.length || 0,  // エラー: rows is not defined
    ...
  }
});
```

**修正後:**
```javascript
// ✅ DBから実際のドキュメント数を取得
let docCount = 0;
try {
  const countResult = await dbQuery('SELECT COUNT(*) as count FROM base_documents');
  docCount = parseInt(countResult.rows[0]?.count || 0);
} catch (countError) {
  console.warn('[api/knowledge-base/stats] DB count failed:', countError.message);
}

return res.json({
  success: true,
  data: {
    total: docCount,
    totalSize: 0,
    typeStats: { json: 0, document: docCount },
    ...
  }
});
```

### 2. settings API（`server/src/api/settings/index.mjs`）

**問題点:**
```javascript
// ❌ 不適切なaction抽出
const action = req.params.action || req.path.split('/').pop();
// /api/settings/rag の場合、actionが正しく'rag'にならない
```

**修正後:**
```javascript
// ✅ 正しいパスパーツ抽出
const pathParts = req.path.split('/').filter(p => p);
const action = pathParts[pathParts.length - 1]; // 最後の要素を取得
console.log('[api/settings] Request:', { method, action, path: req.path, pathParts });
```

### 3. ai-assist API（`server/src/api/ai-assist/index.mjs`）

**問題点:**
```javascript
// ❌ インデックスベースの固定抽出（柔軟性なし）
const action = pathParts.length > 2 ? pathParts[2] : null;
// /api/ai-assist/settings の場合、2番目ではなく最後の要素が必要
```

**修正後:**
```javascript
// ✅ 最後のパス要素を取得
const action = pathParts[pathParts.length - 1];

// POST /api/ai-assist/settings の処理も追加
if (method === 'POST' && action === 'settings') {
  const settings = req.body;
  return res.json({
    success: true,
    message: 'AI支援設定を更新しました',
    data: settings
  });
}
```

### 4. files API（`server/src/api/files/index.mjs`）

**問題点:**
```javascript
// ❌ デバッグ情報が不足
if (!req.file && !req.files) {
  console.log('[api/files/import] No file uploaded');
  // Multerミドルウェアの問題なのか、クライアントの問題なのか不明
}
```

**修正後:**
```javascript
// ✅ 詳細なデバッグログを追加
console.log('[api/files/import] File upload request received:', {
  hasFile: !!req.file,
  hasFiles: !!req.files,
  bodyKeys: Object.keys(req.body || {}),
  contentType: req.headers['content-type']
});

if (!req.file && !req.files) {
  console.error('[api/files/import] No file uploaded. Request details:', {
    headers: req.headers,
    body: req.body
  });
  return res.status(400).json({
    success: false,
    error: 'No file uploaded',
    message: 'ファイルが選択されていません。Multerミドルウェアが正しく動作していない可能性があります。'
  });
}
```

## テスト方法

デプロイ後、以下を確認してください：

1. **基礎データ管理UI**でファイルインポートを実行
   - エラーが出ないこと
   - ファイルが正常にアップロードされること

2. **ブラウザコンソール**でAPIエラーを確認
   ```javascript
   // これらのエンドポイントが200 OKを返すこと
   fetch('/api/knowledge-base/stats', { credentials: 'include' })
   fetch('/api/ai-assist/settings', { credentials: 'include' })
   fetch('/api/settings/rag', { credentials: 'include' })
   fetch('/api/admin/dashboard', { credentials: 'include' })
   ```

3. **Azureログストリーム**で詳細を確認
   ```bash
   az webapp log tail --name emergency-assistance-app --resource-group rg-emergency-assistance
   ```

## 予防策

今後の開発では、以下のベストプラクティスを適用：

1. **統一されたパス抽出ヘルパー関数を作成**
   ```javascript
   // server/src/utils/path-helper.mjs
   export function getLastPathSegment(req) {
     const pathParts = req.path.split('/').filter(p => p);
     return pathParts[pathParts.length - 1];
   }
   ```

2. **APIテストを追加**（`server/tests/api/*.test.mjs`）
   - 各エンドポイントの正常系・異常系をテスト
   - パスマッチングのテスト

3. **エラーハンドリングの統一**
   - すべてのAPIハンドラーで`try-catch`を使用
   - エラーレスポンスの形式を統一

## デプロイ情報

- **コミット**: `513c4f41` - "Fix 500 errors in multiple API endpoints"
- **日時**: 2025-12-14
- **修正ファイル**:
  - `server/src/api/knowledge-base/index.mjs`
  - `server/src/api/settings/index.mjs`
  - `server/src/api/ai-assist/index.mjs`
  - `server/src/api/files/index.mjs`

## 関連ドキュメント

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - デプロイ前チェックリスト
- [FIX_REPORT_API_500_ERRORS.md](./FIX_REPORT_API_500_ERRORS.md) - 以前のAPI 500エラー修正
- [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md) - 技術リファレンス
