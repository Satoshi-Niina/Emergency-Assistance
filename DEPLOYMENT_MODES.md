# Emergency Assistance - サーバー起動モード

このプロジェクトは Azure App Service での 503 エラーを解決するため、二段階起動モードを実装しています。

## 起動モード

### HELLO_ONLY モード（最小構成）

**用途**: Azure App Service での初回デプロイやヘルスチェック専用

**設定方法**:
```bash
# Unix/Linux/Mac
HELLO_ONLY=true npm start

# Windows PowerShell
$env:HELLO_ONLY="true"; npm start

# または npm scripts使用
npm run hello        # Unix/Linux/Mac
npm run hello:win    # Windows PowerShell
```

**特徴**:
- 外部I/O操作なし
- データベース接続なし
- 最小限のメモリ使用量
- 提供エンドポイント: `/` と `/health` のみ
- 高速起動（通常1-2秒）

**レスポンス例**:
```bash
GET / → "hello" (text/plain)
GET /health → {"status":"ok","mode":"hello"} (JSON)
```

### 通常モード（フル機能）

**設定方法**:
```bash
# HELLO_ONLY未設定またはfalse
npm start

# 明示的にfalseを設定
HELLO_ONLY=false npm start
```

**特徴**:
- 全機能が利用可能
- 遅延ロード方式でルート登録
- データベース・Blob Storage接続
- 重い依存関係の動的読み込み
- 起動時間: 5-10秒（依存関係による）

## 実装詳細

### 起動フロー

1. **index.ts**: 起動モード判定とサーバー起動
2. **app.ts**: 軽量な Express設定、ヘルスチェック先行登録
3. **routes/registerRoutes.ts**: 通常モード時の遅延ルート登録

### ファイル構成

```
server/
├── index.ts                      # エントリーポイント（新規実装）
├── app.ts                        # 軽量化済み Express設定
└── routes/
    └── registerRoutes.ts         # 遅延ロード用ルート登録（新規）
```

## 受け入れ条件

✅ npm run build が成功  
✅ HELLO_ONLY=true: "/" と "/health" が 200、外部I/Oなし  
✅ HELLO_ONLY=false: "/health" が起動直後から 200、遅延ロードで安定  
✅ ログに "[boot] listening on http://0.0.0.0:<port> (HELLO_ONLY=...)"

## Azure App Service デプロイ

### 初回デプロイ
```bash
# アプリケーション設定で HELLO_ONLY=true を設定
az webapp config appsettings set \
  --resource-group <resource-group> \
  --name <app-name> \
  --settings HELLO_ONLY=true
```

### 安定稼働後
```bash
# HELLO_ONLY を削除または false に設定
az webapp config appsettings delete \
  --resource-group <resource-group> \
  --name <app-name> \
  --setting-names HELLO_ONLY
```

## トラブルシューティング

### 503 Service Unavailable
1. HELLO_ONLY=true で一度デプロイ
2. /health エンドポイントが 200 を返すことを確認
3. HELLO_ONLY=false に変更して再デプロイ

### 起動時エラー
- ログを確認: `[unhandledRejection]` または `[uncaughtException]`
- HELLO_ONLY=true に戻して最小構成で診断

### パフォーマンス
- 初回リクエスト時に重い処理の遅延ロードが発生
- ウォームアップが必要な場合は事前に主要APIを叩く

## 保守

- `server/app.ts`: ヘルスチェックエンドポイントは最優先で配置
- `server/routes/registerRoutes.ts`: 新しいルートは既存の routes.ts に登録後、ここで遅延読み込み
- 外部I/O処理は可能な限りリクエスト時に初回実行するよう実装
