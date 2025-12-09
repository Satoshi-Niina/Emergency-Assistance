# Azure環境変数の正しい設定

## 🔴 問題
BLOBストレージの実際のパス構造：
```
knowledge-base/images/chat-exports/xxx.jpg
knowledge-base/exports/xxx.json
knowledge-base/troubleshooting/xxx.json
```

しかしコードでは空のプレフィックスを想定していたため、以下のパスを探していました：
```
images/chat-exports/xxx.jpg  ← 見つからない
exports/xxx.json             ← 見つからない
troubleshooting/xxx.json     ← 見つからない
```

## ✅ 解決方法

Azure Portal → App Service `emergency-assistantapp` → 設定 → 環境変数

### 追加する環境変数

| 名前 | 値 |
|------|-----|
| `BLOB_PREFIX` | `knowledge-base` |

**または**

| 名前 | 値 |
|------|-----|
| `AZURE_KNOWLEDGE_BASE_PATH` | `knowledge-base` |

### 設定後

1. 「保存」をクリック
2. App Serviceを**再起動**

## 📊 確認方法

再起動後、診断エンドポイントで確認：
```
https://emergency-assistantapp.azurewebsites.net/api/_diag/blob-detailed
```

ログストリームで以下を確認：
```
[Config] BLOB_PREFIX='knowledge-base' (length: 14)
[Blob] Configuration: Container=knowledge, BlobPrefix='knowledge-base'
[Blob] Normalized path: images/chat-exports/xxx.jpg -> knowledge-base/images/chat-exports/xxx.jpg
```

## 🎯 期待される動作

- ✅ 履歴管理UI：画像サムネイル表示
- ✅ 履歴編集：画像の追加・削除が動作
- ✅ 応急復旧データ管理：フロー生成後にファイルが保存される
- ✅ すべての画像が正しく表示される
