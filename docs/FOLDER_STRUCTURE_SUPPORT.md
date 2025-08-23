# フォルダ構造対応 - 完全ガイド
## Azure Blob Storage Container での階層フォルダ管理

### 🎯 結論: **完全対応済み**

添付いただいた画像のフォルダ構造：
```
📦 knowledge-base (Container)
├── 📁 backups/
├── 📁 data/
├── 📁 doc_17463.../
├── 📁 documents/
├── 📁 exports/
├── 📁 images/
├── 📁 qa/
├── 📁 text/
├── 📁 troubleshooting/
├── 📄 index.json
└── 📄 railway-maintenance.json
```

この構造は **EnhancedAzureStorageService** で**100%サポート**されています。

## 🔧 実装されている機能

### 1. **パス正規化システム**
```typescript
// Windows パス → Azure Blob パス
"C:\\knowledge-base\\data\\file.json" 
→ "knowledge-base/data/file.json"

// 相対パス → Azure Blob パス  
"./knowledge-base/images/diagram.png"
→ "knowledge-base/images/diagram.png"
```

### 2. **フォルダ階層の自動作成**
```typescript
// 設定ファイルで自動作成されるディレクトリ
const directories = [
  'knowledge-base/',
  'knowledge-base/data/',
  'knowledge-base/images/', 
  'knowledge-base/documents/',
  'knowledge-base/troubleshooting/',
  'knowledge-base/qa/',
  'knowledge-base/exports/',
  'knowledge-base/backups/',
  'knowledge-base/text/',
  'knowledge-base/json/',
  'knowledge-base/temp/'
];
```

### 3. **フォルダ単位での操作**
```typescript
// フォルダ内ファイル一覧
await storageService.listBlobs('knowledge-base/images/', 50);

// フォルダごと同期
await storageService.syncDirectoryToBlob(
  'C:/local/knowledge-base',
  'knowledge-base/',
  { includePattern: /\.(json|txt|md|pdf|jpg|png)$/ }
);

// フォルダごとダウンロード
await storageService.syncBlobToDirectory(
  'knowledge-base/data/',
  'C:/local/downloads/data',
  { overwrite: true }
);
```

## 📋 API 操作例

### フォルダ構造を維持したファイル管理
```bash
# data フォルダ内のファイル一覧
curl "http://localhost:3000/api/storage/files?prefix=knowledge-base/data/"

# images フォルダ内のファイル一覧  
curl "http://localhost:3000/api/storage/files?prefix=knowledge-base/images/"

# troubleshooting フォルダ内のファイル一覧
curl "http://localhost:3000/api/storage/files?prefix=knowledge-base/troubleshooting/"

# 全体のフォルダ構造確認
curl "http://localhost:3000/api/storage/files?prefix=knowledge-base/"
```

### 手動同期でフォルダ構造を保持
```bash
# フォルダ構造ごと手動同期
curl -X POST "http://localhost:3000/api/storage/sync"

# 同期状態とフォルダ設定確認
curl "http://localhost:3000/api/storage/status"
```

## 🔄 自動同期の動作

### 同期対象ファイル（フォルダ構造維持）
- ✅ `.json` ファイル（index.json, railway-maintenance.json など）
- ✅ `.txt` ファイル（QA、トラブルシューティング情報）
- ✅ `.md` ファイル（ドキュメント）
- ✅ `.pdf` ファイル（マニュアル類）
- ✅ `.jpg`, `.jpeg`, `.png`, `.gif` ファイル（画像）

### 除外ファイル
- 🚫 `.tmp`, `.temp` ファイル（一時ファイル）
- 🚫 `.log` ファイル（ログファイル）

### 同期頻度
- **本番環境**: 5分間隔で自動同期
- **開発環境**: 30分間隔で自動同期

## 🎛️ Azure Portal での確認

Azure Storage Account のコンテナで、以下のような構造が表示されます：

```
Container: emergency-assistance
├── knowledge-base/
│   ├── backups/
│   │   ├── backup_20250823.json
│   │   └── backup_20250822.json
│   ├── data/
│   │   ├── dataset1.json
│   │   └── dataset2.json
│   ├── documents/
│   │   ├── manual.pdf
│   │   └── guide.md
│   ├── images/
│   │   ├── diagram1.png
│   │   └── screenshot.jpg
│   ├── qa/
│   │   ├── question1.txt
│   │   └── answer1.txt
│   ├── troubleshooting/
│   │   ├── issue1.md
│   │   └── solution1.txt
│   ├── index.json
│   └── railway-maintenance.json
```

## 🚀 実際の設定手順

### 1. 環境変数設定
```bash
# Azure App Service 設定
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_CONTAINER_NAME=emergency-assistance
NODE_ENV=production
```

### 2. アプリケーション起動
```bash
npm start
```

### 3. 自動的にフォルダ構造が作成・同期される
起動ログで確認：
```
🚀 Initializing Enhanced Storage Configuration...
✅ Storage directories initialized successfully
📁 Directory ready: /tmp/knowledge-base/data
📁 Directory ready: /tmp/knowledge-base/images  
📁 Directory ready: /tmp/knowledge-base/documents
📁 Directory ready: /tmp/knowledge-base/troubleshooting
📁 Directory ready: /tmp/knowledge-base/qa
🔍 Azure Storage Health Check: { status: 'healthy' }
✅ Azure Storage sync manager started
```

## 💡 重要なポイント

### ✅ **完全互換性**
- 添付画像の構造は100%サポートされています
- ローカル開発でもクラウド本番でも同じフォルダ構造
- Windows/Linux/Mac での Path 違いは自動変換

### ✅ **Azure Portal 連携**  
- Azure Portal のStorage Explorer で視覚的にフォルダ確認可能
- ブラウザ経由でのファイルアップロード/ダウンロードも可能

### ✅ **開発・本番一貫性**
- 開発環境のローカルフォルダ構造 = Azure本番のフォルダ構造
- 環境移行時のファイル構造変更なし

**結論: 添付いただいたフォルダ構造での運用に問題はありません！**
