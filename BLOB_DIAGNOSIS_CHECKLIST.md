# BLOB診断チェックリスト

デプロイ完了後、以下の順序で確認してください。

## ステップ1: BLOB詳細診断（最優先）

### URLにアクセス
```
https://emergency-assistantapp.azurewebsites.net/api/_diag/blob-detailed
```

### 確認ポイント
- ✅ `tests.clientInit`: "✅ Success" → BLOBクライアント初期化成功
- ✅ `tests.containerExists`: "✅ Exists" → コンテナ`knowledge`存在
- ✅ `tests.writePermission`: "✅ Can Write" → 書き込み権限あり
- ✅ `tests.listImages`: 画像ファイル数を確認
- ✅ `tests.listFlows`: フローファイル数を確認
- ✅ `sampleImageBlobs`: 実際の画像BLOBのパスを確認
- ✅ `sampleFlowBlobs`: 実際のフローBLOBのパスを確認

### エラーが出た場合
JSONレスポンスの `error`, `writeError`, `imageReadError` フィールドを確認

---

## ステップ2: 環境変数確認

### URLにアクセス
```
https://emergency-assistantapp.azurewebsites.net/api/_diag/env
```

### 確認ポイント
```json
{
  "criticalEnvVars": {
    "STORAGE_MODE": "azure または production",
    "AZURE_STORAGE_CONNECTION_STRING": "✅ SET",
    "NODE_ENV": "production",
    "WEBSITE_SITE_NAME": "emergency-assistantapp"
  }
}
```

---

## ステップ3: Application Insights / ログストリーム

Azure Portal → App Service → Monitoring → Log stream

### 探すログキーワード
1. **環境判定**
   ```
   [isAzureEnvironment] ✅ TRUE
   ```

2. **画像取得エラー**
   ```
   [api/images] AZURE: BLOB error:
   [api/images] AZURE: BLOB error code:
   ```

3. **フロー生成エラー**
   ```
   [api/emergency-flow/generate] AZURE: ❌ BLOB save failed:
   ```

---

## ステップ4: 実際のBLOB構造確認

### Azure Portal → Storage Account → Containers → knowledge

確認すべきフォルダ構造：
```
knowledge/
├── knowledge-base/
│   ├── images/
│   │   └── chat-exports/
│   │       └── chat_image_*.jpg
│   ├── exports/
│   │   └── *.json (履歴データ)
│   └── troubleshooting/
│       └── *.json (フローデータ)
```

もし構造が違う場合（例: `images/chat-exports/` が `knowledge-base/` なしで存在）、
コードのパス生成ロジックを修正する必要があります。

---

## よくある問題と解決策

### 問題1: 画像が表示されない
**症状**: 一覧に画像カウントは表示されるが、サムネイルが表示されない

**原因候補**:
- BLOBのパスが `/api/images/chat-exports/xxx.jpg` として保存されているが、実際のBLOBは `knowledge-base/images/chat-exports/xxx.jpg` にある
- ネットワーク制限でApp ServiceからBLOBにアクセスできない

**確認方法**:
1. `blob-detailed` で `sampleImageBlobs[0].name` を確認
2. ログで `[api/images] AZURE: Looking for blob: knowledge-base/images/chat-exports/xxx.jpg` を探す
3. その直後のログで `BLOB found` か `BLOB not found` か確認

**解決策**:
- パスの不一致 → コードのパス生成を修正
- ネットワーク制限 → Azure Storage Accountのファイアウォール設定を確認

### 問題2: 画像アップロードが失敗
**症状**: "アップ失敗"メッセージが出る

**原因候補**:
- 書き込み権限がない（`writePermission` テストで確認済み）
- ネットワーク制限
- 接続文字列のSAS tokenの有効期限切れ

**確認方法**:
`blob-detailed` の `tests.writePermission` を確認

**解決策**:
- `writeError` に詳細が表示される
- 多くの場合はネットワーク設定の問題

### 問題3: フロー生成後にファイルが見つからない
**症状**: フロー生成は成功するが、一覧に表示されない

**原因候補**:
- 生成時は `knowledge-base/troubleshooting/` に保存
- 一覧取得時は `troubleshooting/` を参照（プレフィックス不一致）

**確認方法**:
ログで以下を確認：
```
[api/emergency-flow/generate] AZURE: BLOB path: knowledge-base/troubleshooting/xxx.json
[api/emergency-flow/list] AZURE: Listing with prefix: troubleshooting/
```

**解決策**:
`sampleFlowBlobs` で実際のパスを確認し、コードのプレフィックスを統一

---

## 次のアクション

診断結果をもとに以下を報告してください：

1. **`blob-detailed` のレスポンス全体**（JSON）
2. **`sampleImageBlobs` のパス例**
3. **`sampleFlowBlobs` のパス例**
4. **エラーメッセージ**（あれば）

これで問題の根本原因を特定できます。
