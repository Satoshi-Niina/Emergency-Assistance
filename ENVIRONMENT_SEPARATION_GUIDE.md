# 環境分離デプロイメントガイド

## 問題の解決

### 問題
- ローカル環境（Windows）と本番環境（Azure Linux）の設定が混在
- 環境固有の修正が相互に影響する

### 解決策
環境を完全に分離し、それぞれに適した設定を使用

## 環境別設定

### 1. ローカル開発環境（Windows）

#### 設定ファイル: `local.env`
```bash
NODE_ENV=development
PORT=8000
BYPASS_DB_FOR_LOGIN=true
PG_SSL=disable
DATABASE_URL=postgresql://postgres:password@localhost:5432/webappdb
```

#### 特徴
- SSL接続無効
- デモログイン有効
- ローカルPostgreSQL使用

### 2. 本番環境（Azure Linux）

#### 設定ファイル: `production.env`
```bash
NODE_ENV=production
PORT=8080
BYPASS_DB_FOR_LOGIN=false
PG_SSL=require
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

#### 特徴
- SSL接続必須
- データベース認証必須
- Azure PostgreSQL使用

## デプロイメント手順

### ローカル開発
1. `local.env`ファイルを設定
2. `npm run dev`で起動
3. ローカル環境専用の設定が適用される

### 本番デプロイ
1. Azure Portalで環境変数を設定（`production.env`の内容）
2. `npm start`で起動
3. 本番環境専用の設定が適用される

## 重要なポイント

### ✅ 環境分離の徹底
- ローカル環境の設定は本番環境に影響しない
- 本番環境の設定はローカル環境に影響しない

### ✅ 設定の優先順位
1. 環境変数（Azure Portal設定）
2. 環境別設定ファイル（`local.env` / `production.env`）
3. システム環境変数

### ✅ セキュリティ
- 本番環境では`BYPASS_DB_FOR_LOGIN=false`が必須
- ローカル環境では`BYPASS_DB_FOR_LOGIN=true`で開発効率化

## トラブルシューティング

### ローカル環境でエラーが発生する場合
1. `local.env`ファイルの設定を確認
2. `NODE_ENV=development`が設定されているか確認
3. `BYPASS_DB_FOR_LOGIN=true`が設定されているか確認

### 本番環境でエラーが発生する場合
1. Azure Portalの環境変数を確認
2. `NODE_ENV=production`が設定されているか確認
3. `BYPASS_DB_FOR_LOGIN=false`が設定されているか確認
4. `PG_SSL=require`が設定されているか確認
