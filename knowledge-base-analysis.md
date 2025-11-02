# GPTナレッジデータ使用状況分析

## 📊 GPTのナレッジデータとして**実際に使われている**フォルダ・ファイル

### ✅ 使用中（`searchKnowledgeBase`関数で読み込まれる）

1. **`text/`** - `.txt`ファイル
   - `searchKnowledgeBase`関数の行210-250で読み込み
   - 段落ごとにチャンク化して検索対象に追加

2. **`documents/`** - ドキュメントチャンクデータ
   - `documents/*/chunks.json` - チャンク化されたドキュメントデータ
   - `documents/*/metadata.json` - メタデータ
   - `documents/*.json` - 直下のJSONファイル（ナレッジベースに保存されたファイル）
   - `searchKnowledgeBase`関数の行252-378で読み込み

3. **`troubleshooting/`** - トラブルシューティングフローデータ
   - `.json`ファイル（フローデータ）
   - `searchKnowledgeBase`関数の行380-450で読み込み
   - タイトル、説明、キーワード、各ステップの説明が検索対象

### ❌ **使われていない**フォルダ

4. **`qa/`** - Q&Aデータ
   - `QA_DIR`は定義されているが、**`searchKnowledgeBase`関数では読み込まれていない**
   - 保存先としては使用されるが、GPTの検索には反映されない
   - 削除機能の削除対象には含まれている

## 🗑️ ナレッジデータ削除機能の動作

### 削除対象フォルダ（`/api/knowledge-base/cleanup/manual` および `/cleanup/auto`）

```typescript
const directoriesToClean: string[] = [
  DOCUMENTS_DIR,        // ✅ 使用中 → 削除される
  TEXT_DIR,             // ✅ 使用中 → 削除される
  QA_DIR,               // ❌ 未使用 → 削除される（使われていないのに削除される）
  TROUBLESHOOTING_DIR,  // ✅ 使用中 → 削除される
];
```

### 削除されないフォルダ（GPTのナレッジではない）

- **`data/`** - `image_search_data.json`（画像検索用、GPTのナレッジではない）
- **`images/`** - 画像ファイル保存場所（GPTのナレッジではない）
- **`exports/`** - エクスポートファイル（履歴データ、GPTのナレッジではない）

## 🔍 問題点

1. **`qa/`フォルダの問題**
   - 削除機能の削除対象だが、実際にはGPTの検索で使われていない
   - 保存はされるが、検索に反映されないため、意味がない

2. **削除機能の不完全性**
   - `data/emergency-flow/`は`troubleshooting/`と重複していたが、削除機能の対象外
   - （既に手動で削除済み）

## 📝 推奨事項

1. **`qa/`フォルダの処理**
   - オプション1: `searchKnowledgeBase`関数に`qa/`フォルダの読み込みを追加
   - オプション2: 削除機能から`qa/`を除外（使われていないため）

2. **削除機能の改善**
   - `data/`直下の古いファイルも削除対象に含める検討
   - ただし、`image_search_data.json`は削除しない（画像検索用）

