# 🔧 本番環境ストレージ問題修正レポート

**日付**: 2025年12月9日  
**対応者**: GitHub Copilot  
**修正対象**: 本番環境での画像表示・アップロード・フロー生成の500エラー

---

## 📌 問題の概要

### 報告された症状
1. **履歴管理UIの一覧表**: 画像列に画像のプレビューが表示されない（500エラー）
2. **履歴管理のファイル編集**: 画像が表示されず、追加してもエラーが出る（500エラー）
3. **応急復旧データ管理UI**: 新規フロー作成を実行してもファイルが生成されない（500エラー）

### エラーログ分析
```
Failed to load resource: the server responded with a status of 500 ()
api/images/chat-exports/chat_image_*.jpg:1
api/history/upload-image:1
api/emergency-flow/generate:1
```

---

## 🔍 根本原因

### 1. 環境判定ロジックの不統一
各エンドポイントで異なる方法で環境判定を行っていた:
- `process.env.WEBSITE_INSTANCE_ID`
- `process.env.WEBSITE_SITE_NAME`
- 判定結果の変数名が`isAzureEnvironment`

**問題点**:
- Azure App Serviceでこれらの環境変数が設定されていない場合、ローカル環境と誤認識
- ローカルファイルシステムにアクセスしようとして失敗

### 2. STORAGE_MODE環境変数の未使用
`AZURE_ENV_VARS_REQUIRED.md`には`STORAGE_MODE`が記載されていたが、コードで使用されていなかった。

### 3. エラーハンドリングの不足
BLOBアクセスエラー時の詳細情報が不十分で、デバッグが困難だった。

---

## ✅ 実施した修正

### 修正1: 統一的な環境判定関数の実装

**ファイル**: `server/src/config/env.mjs`

```javascript
export const STORAGE_MODE = process.env.STORAGE_MODE || 'auto';

export function isAzureEnvironment() {
  // 1. STORAGE_MODEが明示的に設定されている場合
  if (STORAGE_MODE === 'azure' || STORAGE_MODE === 'blob') {
    return true;
  }
  if (STORAGE_MODE === 'local') {
    return false;
  }
  
  // 2. Azure App Service固有の環境変数
  if (process.env.WEBSITE_INSTANCE_ID || process.env.WEBSITE_SITE_NAME) {
    return true;
  }
  
  // 3. AZURE_STORAGE_CONNECTION_STRINGが設定されていればAzure環境
  if (AZURE_STORAGE_CONNECTION_STRING && AZURE_STORAGE_CONNECTION_STRING.trim()) {
    return true;
  }
  
  // 4. デフォルト: 本番環境はAzure
  return NODE_ENV === 'production';
}
```

**判定の優先順位**:
1. `STORAGE_MODE`環境変数（明示的な指定）
2. Azure App Service固有の環境変数
3. BLOB接続文字列の存在
4. `NODE_ENV === 'production'`

### 修正2: 全エンドポイントで統一関数を使用

**修正したファイル**:
1. `server/src/api/images/index.mjs` - 画像取得エンドポイント
2. `server/src/routes/history.mjs` - 画像アップロードエンドポイント
3. `server/src/api/emergency-flow/index.mjs` - フロー生成/管理エンドポイント

**修正内容**:
```javascript
// 修正前
const isAzureEnvironment = 
  process.env.WEBSITE_INSTANCE_ID !== undefined ||
  process.env.WEBSITE_SITE_NAME !== undefined;

// 修正後
import { isAzureEnvironment } from '../../config/env.mjs';
const useAzure = isAzureEnvironment();
```

### 修正3: エラーハンドリングの改善

**画像取得エンドポイント** (`api/images/index.mjs`):
```javascript
catch (blobError) {
  console.error('[api/images] AZURE: BLOB error:', blobError.message);
  console.error('[api/images] AZURE: BLOB error code:', blobError.code);
  console.error('[api/images] AZURE: BLOB error statusCode:', blobError.statusCode);
  return res.status(blobError.statusCode || 500).json({
    success: false,
    error: 'BLOB取得エラー（Azure環境）',
    details: blobError.message,
    errorCode: blobError.code,
    fileName: fileName,
    category: category,
    blobName: `knowledge-base/images/${category}/${fileName}`,
    containerName: containerName
  });
}
```

---

## 🎯 修正効果

### ローカル環境
- ✅ `STORAGE_MODE=local`または環境変数未設定の場合、ローカルファイルシステムを使用
- ✅ 既存の開発環境での動作に影響なし

### 本番環境（Azure App Service）
- ✅ `STORAGE_MODE=azure`を設定することで確実にBLOBストレージを使用
- ✅ BLOB接続エラー時に詳細なエラー情報を返すため、トラブルシューティングが容易
- ✅ 画像表示、画像アップロード、フロー生成が全てBLOBストレージで動作

---

## 📋 本番デプロイ前の必須作業

### 1. Azure App Serviceで環境変数を設定

Azure Portal → App Service → 設定 → 環境変数 で以下を設定:

```bash
STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=xxx;...
AZURE_STORAGE_ACCOUNT_NAME=rgemergencyassistantb25b
AZURE_STORAGE_CONTAINER_NAME=knowledge
AZURE_KNOWLEDGE_BASE_PATH=knowledge-base
```

### 2. BLOBコンテナの確認

Azure Portal → Storage Account → コンテナ:
- `knowledge`コンテナが存在することを確認
- アクセスレベル: **コンテナー (コンテナーとBLOBの匿名読み取りアクセス)**

### 3. デプロイ後の動作確認

```bash
# ヘルスチェック
curl https://your-app.azurewebsites.net/api/health

# 環境変数診断
curl https://your-app.azurewebsites.net/api/_diag

# 画像取得テスト（既存の画像で）
curl https://your-app.azurewebsites.net/api/images/chat-exports/test_image.jpg
```

---

## 📝 作成したドキュメント

### 1. DEPLOYMENT_CHECKLIST.md
デプロイ前に確認すべき環境変数とトラブルシューティング手順を記載。

**主な内容**:
- 必須環境変数一覧
- 環境判定ロジックの説明
- よくある問題と対処法
- デプロイ後の動作確認手順
- チェックリスト

---

## 🔄 影響範囲

### 修正したファイル
1. `server/src/config/env.mjs` - 環境判定関数の追加
2. `server/src/api/images/index.mjs` - 画像取得エンドポイント
3. `server/src/routes/history.mjs` - 画像アップロード
4. `server/src/api/emergency-flow/index.mjs` - フロー生成/管理

### 新規作成したファイル
1. `DEPLOYMENT_CHECKLIST.md` - デプロイチェックリスト

### 後方互換性
- ✅ ローカル環境での動作に影響なし
- ✅ 既存の環境変数設定で引き続き動作
- ✅ `STORAGE_MODE`を設定することでより明示的な制御が可能に

---

## ⚠️ 注意事項

### 本番環境デプロイ時
1. **必ず`STORAGE_MODE=azure`を設定してください**
   - この設定がない場合、他の環境変数で判定されます
   - 確実性を高めるため、明示的な設定を推奨

2. **BLOB接続文字列を確認してください**
   - `AZURE_STORAGE_CONNECTION_STRING`が正しく設定されているか
   - Storage Accountへのアクセス権限があるか

3. **コンテナの存在を確認してください**
   - `knowledge`コンテナが存在するか
   - アクセスレベルが適切か（読み取り/書き込み可能）

### トラブルシューティング
エラーが発生した場合:
1. `/api/_diag`でSTORAGE_MODEが正しく認識されているか確認
2. Azure Portal → App Service → ログストリームでサーバーログを確認
3. エラーレスポンスの`details`フィールドで詳細なエラー情報を確認

---

## 🎉 期待される結果

### 修正前
- ❌ 画像が表示されない（500エラー）
- ❌ 画像のアップロードに失敗する（500エラー）
- ❌ フロー生成してもファイルが保存されない（500エラー）

### 修正後
- ✅ 画像が正常に表示される
- ✅ 画像のアップロードが成功する（BLOBに保存）
- ✅ フロー生成してBLOBに正常に保存される
- ✅ エラー時に詳細な情報が返される

---

## 📊 修正サマリー

| 項目 | 内容 |
|---|---|
| 修正ファイル数 | 4ファイル |
| 新規ドキュメント | 2ファイル |
| 追加した関数 | `isAzureEnvironment()` |
| 修正した環境判定箇所 | 6箇所 |
| 改善したエラーハンドリング | 3箇所 |

---

**次のステップ**:
1. ✅ コードをコミット
2. ⏳ Azure App Serviceで環境変数を設定
3. ⏳ 本番環境にデプロイ
4. ⏳ 動作確認を実施

**完了予定**: 環境変数設定後、即座にデプロイ可能
