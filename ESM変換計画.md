# ESM変換と自動ルーティング計画

## 現状（2025-12-05）

### 完了した作業
- ✅ **自動ルーティングシステム実装** - `azure-server.mjs`に`loadApiRoutes()`関数を追加
- ✅ **BLOBパス統一** - すべてのエンドポイントが`knowledge-base/`プレフィックスを使用
- ✅ **共有関数のエクスポート** - `getBlobServiceClient`, `containerName`, `norm`, `dbQuery` をexport
- ✅ **ワイルドカードルート対応** - 画像エンドポイント用に`/api/images/*`をサポート
- ✅ ESM変換完了:
  - ✅ `/api/users` - ユーザー管理
  - ✅ `/api/images` - 画像取得（chat-exports, emergency-flows対応）

### 自動ルーティングシステム
```javascript
// azure-server.mjs に実装済み
async function loadApiRoutes(app) {
  // src/api/ 配下のディレクトリを走査
  // index.mjs または index.js を動的にインポート
  // /api/{moduleName} にルートを自動登録
}
```

**動作:**
1. サーバー起動時に `loadApiRoutes()` が実行される
2. `src/api/` 配下の各ディレクトリをスキャン
3. `index.mjs` (優先) または `index.js` を検索
4. モジュールを動的インポートして Express ルートに登録
5. インライン実装が優先され、自動ルーティングは衝突を回避

### 問題の解決
1. ✅ **自動ルーティング実装済み** - 変更のたびに`azure-server.mjs`を修正する必要がなくなった
2. ⏳ **ESM変換** - 段階的に`src/api/`配下をESM形式に変換中

---

## 今後の計画

### Phase 1: 一気にESM化 🚀 (進行中)
**方針変更理由:** 
- インライン実装とモジュールの混在は保守が困難
- BLOBパス不整合が複数箇所に散在
- 最終的にESM化するなら今やる方が効率的

**進捗:**
- [x] 共有関数のexport化
- [x] `/api/images` ESM化（完了）
- [x] `/api/users` ESM化（完了）
- [x] `/api/history` ESM化（完了）
- [x] `/api/troubleshooting` ESM化（完了）
- [x] `/api/emergency-flow` ESM化（完了）
- [x] `/api/settings` ESM化（完了）
- [x] `/api/machines` ESM化（完了）
- [x] インライン実装の段階的削除（完了）
- [x] **ローカルテスト完了**: 16個のESMモジュールが正常にロード

**次のステップ:**
1. 主要エンドポイントを優先的にESM化
2. 各モジュール変換後にローカルテスト
3. インライン実装を段階的にコメントアウト
4. デプロイして本番確認

---

### Phase 2: 本番デプロイと検証
**前提:** 主要エンドポイントのESM化完了

対象: すべてのエンドポイント

**変換手順:**
```javascript
// Before (Azure Functions形式 + CommonJS)
const { db } = require('../db/index.js');
module.exports = async function(context, req) {
  context.res = { ... };
}

// After (Express形式 + ESM)
import { dbQuery } from '../../../db/index.js';
export default async function handler(req, res) {
  res.json({ ... });
}
export const methods = ['get', 'post']; // オプション
```

**優先順位（低リスクから順に）:**
1. ✅ `users/` - 完了（サンプル）
2. `settings/` - 設定系（影響範囲が小さい）
3. `machines/` - マシン管理
4. `documents/` - ドキュメント管理
5. `history/` - 履歴管理
6. `auth/` - 認証関連（最後：重要度が高いため慎重に）

**変換の進め方:**
1. 1モジュールずつ変換
2. ローカルでテスト
3. デプロイして本番確認
4. 問題なければ次のモジュールへ
5. 問題があれば該当モジュールのみロールバック（`.mjs`を削除すれば元の`.js`にフォールバック）

### Phase 3: 完全なコード統一（将来的な目標）
**目的:** すべてのAPIコードをESM + Express形式に統一

現在のインライン実装を段階的にモジュール化:
- インライン実装は段階的に削減
- 新規機能は必ず`src/api/`にモジュールとして作成
- 最終的にはインライン実装ゼロを目指す

**メリット:**
- 🎯 コード一貫性の向上
- 🔧 保守性の向上
- 🚀 新機能追加が容易
- 👥 チーム開発がスムーズ
- 📦 モジュールの再利用が可能

---

## 使い方

### 新しいAPIエンドポイントの追加方法

1. **ディレクトリを作成**
   ```
   server/src/api/my-feature/
   ```

2. **`index.mjs` を作成**
   ```javascript
   export default async function myFeatureHandler(req, res) {
     const method = req.method;
     
     if (method === 'GET') {
       // GET処理
       return res.json({ success: true, data: [] });
     }
     
     return res.status(405).json({ error: 'Method not allowed' });
   }
   
   export const methods = ['get', 'post'];
   ```

3. **サーバー再起動**
   - 自動的に `/api/my-feature` として登録される
   - `azure-server.mjs` の修正は不要！

---

## デプロイ前チェックリスト

### Phase 1 デプロイ前
- [ ] すべてのBLOBパスが`knowledge-base/`プレフィックスを使用
- [ ] 重複エンドポイントが削除されている
- [ ] ローカルでビルドエラーがない
- [ ] 環境変数が正しく設定されている
  - `AZURE_STORAGE_CONNECTION_STRING`
  - `AZURE_STORAGE_CONTAINER_NAME=knowledge`
  - `DATABASE_URL`

### Phase 2 移行時
- [ ] 変換前のコードをバックアップ
- [ ] 変換後のローカルテスト完了
- [ ] ロールバック手順を確認（`.mjs`削除で元に戻る）
- [ ] 1モジュールずつ段階的に実施

---

## コード統一のガイドライン

### すべてのAPIコードで統一すべき項目

1. **モジュール形式:** ESM (import/export)
2. **関数形式:** Express ハンドラー形式 `(req, res) => {}`
3. **エラーハンドリング:** try-catch + 詳細なログ
4. **レスポンス形式:** 
   ```javascript
   {
     success: true/false,
     data: {},
     error: "",
     timestamp: ""
   }
   ```
5. **ログ出力:** `console.log('[api/endpoint-name] ...')`

### 統一しないもの
- ビジネスロジック（各エンドポイントで異なるのは当然）
- データベースクエリ（必要に応じて異なる）

---

## 注意事項
- ✅ インライン実装は自動ルーティングより優先される
- ✅ `.mjs` ファイルが `.js` より優先される
- ✅ ESM変換中も本番環境は動作し続ける
- ✅ 変換は段階的に行い、各ステップでテストを実施
- ⚠️ **重要:** Phase 1 の検証完了後にのみ Phase 2 へ進む

---

## 参照ファイル
- メインサーバー: `server/azure-server.mjs` (自動ルーティング実装済み)
- ローカル開発: `server/unified-hot-reload-server.js`
- 変換サンプル: `server/src/api/users/index.mjs`
- 変換対象: `server/src/api/**/*.js` (31ファイル)
