# Emergency Assistance システム構造分析

## 問題の本質

### 現状の問題点
1. **二重構造のサーバー実装**
   - ローカル: `unified-hot-reload-server.js` (8000行の巨大ファイル)
   - 本番: `azure-server.mjs` + `src/app.mjs` (モジュール化)
   - **結果**: ローカルで動作確認したコードが本番で動かない

2. **API実装の不整合**
   - ローカルサーバーに直接実装されたAPI
   - `src/api/*` モジュールとの同期が取れていない
   - **結果**: 本番デプロイ後にAPIが404エラー

3. **環境変数の管理不備**
   - ローカル: `.env.development`
   - 本番: Azure App Service の環境変数
   - **結果**: CORS、OpenAI、BLOB接続エラー

## システム構造の調査結果

### サーバー構成

#### ローカル開発環境
```
unified-hot-reload-server.js (8072行)
├── Express アプリケーション
├── CORS設定 (ハードコード)
├── 全APIエンドポイント (直接実装)
│   ├── /api/emergency-flow/*
│   ├── /api/chatgpt
│   ├── /api/images/*
│   └── その他多数
├── Vite プロキシ
└── 静的ファイル配信
```

#### 本番環境 (Azure)
```
azure-server.mjs
└── src/app.mjs
    ├── CORS設定 (src/config/cors.mjs)
    ├── 認証ルート (src/routes/auth.mjs)
    ├── ヘルスチェック (src/routes/health.mjs)
    ├── 履歴ルート (src/routes/history.mjs)
    └── 動的APIロード (src/api/*)
        ├── emergency-flow/index.mjs
        ├── machines/index.mjs
        ├── users/index.mjs
        └── images/index.mjs
```

### 不整合の具体例

| 機能 | ローカル実装 | 本番実装 | 状態 |
|------|------------|---------|------|
| GPT統合 | unified内に直接 | src/api/emergency-flow/index.mjs | ✅ 今回修正 |
| BLOB保存 | unified内に直接 | src/api/emergency-flow/index.mjs | ✅ 今回修正 |
| PUT更新 | unified内に直接 | src/api/emergency-flow/index.mjs | ✅ 今回修正 |
| CORS | unified内ハードコード | src/config/cors.mjs | ⚠️ URL不整合 |
| 画像取得 | unified内に直接 | src/api/images/index.mjs | ❓ 要確認 |

## 抜本的な解決策

### アプローチ1: 本番環境を基準にする（推奨）

**メリット**:
- モジュール化された綺麗な構造
- 保守性が高い
- スケーラブル

**デメリット**:
- ローカル開発環境の再構築が必要

**実装方針**:
1. `unified-hot-reload-server.js` を廃止
2. ローカルでも `azure-server.mjs` を使用
3. すべてのAPIを `src/api/*` に統一
4. 環境変数で動作を切り替え

### アプローチ2: ローカル環境を基準にする（非推奨）

**メリット**:
- 既存のローカル開発フローをそのまま使える

**デメリット**:
- 8000行のファイルを本番にデプロイ
- 保守性が悪い
- デバッグが困難

### アプローチ3: 段階的移行（現実的）

**フェーズ1: 緊急対応（即実施）**
1. CORS設定の統一
2. 環境変数の確認と設定
3. 診断エンドポイントの活用

**フェーズ2: API統一（1-2日）**
1. `src/api/*` モジュールを完全にする
2. `unified-hot-reload-server.js` からAPI実装を削除
3. ローカルでも `src/api/*` を使用

**フェーズ3: サーバー統一（3-5日）**
1. ローカル開発でも `azure-server.mjs` を使用
2. `unified-hot-reload-server.js` の段階的廃止
3. 完全な環境統一

## 即座に実施すべき修正

### 1. 環境変数の確認
```bash
# Azure App Service で確認
az webapp config appsettings list --name emergency-assistantapp --resource-group <resource-group>
```

必須の環境変数:
- `OPENAI_API_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME`
- `DATABASE_URL`
- `NODE_ENV=production`

### 2. CORS設定の統一

#### src/config/cors.mjs
```javascript
export const allowedOrigins = [
  'https://emergency-assistantapp.azurewebsites.net',
  'https://*.azurestaticapps.net',
  'http://localhost:*'
];
```

### 3. APIルーティングの確認

#### src/app.mjs の自動ルーティング
```javascript
// 各APIモジュールは以下を export する必要がある
export default async function handler(req, res) { ... }
export const methods = ['get', 'post', 'put', 'delete'];
```

### 4. 診断エンドポイントの活用

本番環境で確認:
```
GET https://emergency-assistantapp.azurewebsites.net/api/_diag/env
GET https://emergency-assistantapp.azurewebsites.net/api/_diag/blob-test
GET https://emergency-assistantapp.azurewebsites.net/api/health
```

## 検証チェックリスト

### 本番環境
- [ ] 環境変数が正しく設定されている
- [ ] OPENAI_API_KEY が有効
- [ ] AZURE_STORAGE_CONNECTION_STRING が有効
- [ ] CORS設定が正しい
- [ ] APIルーティングが機能している
- [ ] GPT統合が動作する
- [ ] BLOB保存が動作する
- [ ] 画像表示が動作する

### ローカル環境
- [ ] `.env.development` が正しい
- [ ] unified-hot-reload-server.js が起動する
- [ ] src/api/* モジュールと整合性がある
- [ ] 本番と同じAPIパスで動作する

## 次のステップ

1. **即座に**: Azure環境変数の確認と設定
2. **今日中**: CORS設定の修正とデプロイ
3. **明日**: 診断エンドポイントで本番動作確認
4. **今週**: API統一の計画策定
5. **来週**: 段階的移行の開始

---

## 結論

現在のシステムは「二重実装」により、ローカルと本番の整合性が取れていません。
抜本的な解決には **段階的移行アプローチ** を推奨します。

まずは緊急対応として:
1. 環境変数の確認
2. CORS設定の修正
3. 診断エンドポイントでの動作確認

を実施し、その後計画的にシステム統一を進めます。
