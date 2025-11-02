# knowledge-base削除対象外フォルダの使用箇所

## 📊 削除対象外フォルダの使用状況

### 1. `data/` フォルダ（`image_search_data.json`）

**用途**: 画像検索データ（画像ファイルのメタデータとインデックス）

**使用箇所**:
- **`server/routes/tech-support.ts`**
  - 行838-840: `image_search_data.json`の読み込み
  - 行1128-1130: 画像アップロード時に画像検索データを更新
  - `/api/tech-support/init-image-search-data` - 画像検索データの初期化
  - `/api/tech-support/search-images` - 画像検索時に使用
  - `/api/tech-support/upload` - 画像アップロード時にデータを更新

**役割**: GPTのナレッジではない。画像ファイルの検索用インデックスデータ。

---

### 2. `images/` フォルダ

**用途**: 画像ファイルの保存場所

**使用箇所**:

#### 画像保存
- **`server/routes/tech-support.ts`**
  - 行560: 画像アップロード先として`knowledge-base/images`を使用
  - 行545: `publicImagesDir = knowledgeBaseImagesDir`で画像保存先を設定

#### 画像配信
- **`server/routes/image-storage.ts`**
  - 行107: `/api/image-storage/chat-exports/:filename` - `knowledge-base/images/chat-exports/`から画像を配信

- **`server/routes/troubleshooting.ts`**
  - 行563-569: `/api/troubleshooting/image/:fileName` - `knowledge-base/images/emergency-flows/`または`chat-exports/`から画像を配信

- **`server/unified-server.js`**
  - 行2663-2874: `/api/images/chat-exports/:filename` - チャットエクスポート画像を配信

- **`server/routes/emergency-flow.ts`**
  - 行1785-1844: フロー画像のアップロード先として`knowledge-base/images/emergency-flows/`を使用

- **`server/routes/chat.ts`**
  - 行1178-1179: チャット画像の保存先として`knowledge-base/images/chat-exports/`を使用

#### サブディレクトリ
- `images/emergency-flows/` - 応急処置フローの画像
- `images/chat-exports/` - チャットでエクスポートされた画像

**役割**: GPTのナレッジではない。画像ファイルのストレージ。Webアプリケーションで画像を表示するために使用。

---

### 3. `exports/` フォルダ

**用途**: 故障履歴・チャット履歴のエクスポートファイル（JSON形式）

**使用箇所**:

#### 履歴管理
- **`server/routes/history.ts`**（主要な使用箇所）
  - 行150-174: `/api/history/list` - エクスポートファイル一覧を取得
  - 行341-363: `/api/history/file` - 特定のファイルを取得
  - 行1545-1639: `/api/history/exports-list` - エクスポートファイル一覧を取得（詳細版）
  - 行1645-1818: `/api/history/import` - エクスポートファイルをインポート（データベースに登録）
  - 行1307-1395: `/api/history/search` - エクスポートファイル内を検索
  - 行1483-1508: `/api/history/machine-types` - 機種リスト取得
  - 複数のエンドポイントでエクスポートファイルを読み込み

- **`server/routes/chat.ts`**
  - 行909-957: `/api/chats/exports` - チャットエクスポートファイル一覧取得

#### データベース連携
- **`server/services/fault-history-service.ts`**
  - エクスポートファイルからデータベースへの移行処理

- **`server/migrate-exports-to-db.js`**
  - エクスポートファイルをデータベースに移行するスクリプト

**役割**: GPTのナレッジではない。故障履歴・チャット履歴のバックアップ・エクスポートデータ。履歴管理機能で使用される。

**注意**: 一部のエクスポートファイルは`/api/history/import`を通じて`knowledge-base/documents/`に保存され、GPTのナレッジデータとして活用される可能性がある（行1699-1700参照）。

---

## 📝 まとめ

| フォルダ | GPTナレッジ | 用途 | 削除対象外の理由 |
|---------|-----------|------|----------------|
| `data/` | ❌ | 画像検索インデックス | 画像検索機能で使用 |
| `images/` | ❌ | 画像ファイル保存 | 画像配信・表示に必要 |
| `exports/` | ❌ | 履歴データバックアップ | 履歴管理機能で使用 |

**結論**: 
- これらのフォルダはGPTのナレッジ検索（`searchKnowledgeBase`関数）では使用されていない
- しかし、システムの他の機能（画像検索、画像表示、履歴管理）で重要
- 削除機能から除外されているのは正しい判断

