# Emergency Assistance - 環境戦略

## 現在の問題

### 環境の混在
- ローカル開発 = 本番設定
- 環境変数が統合されている
- テスト環境がない

### デプロイプロセスの問題
- main → 即座に本番デプロイ
- 段階的テストなし
- ロールバック機能なし

## 推奨する環境構成

### 1. 環境分離
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   開発環境   │ →  │ ステージング │ →  │   本番環境   │
│  (Local)    │    │  (Staging)  │    │(Production) │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 2. ブランチ戦略
- `develop` → ステージング環境
- `main` → 本番環境
- Pull Request でレビュー

### 3. 環境変数管理
```
server/.env.development    # ローカル開発用
server/.env.staging       # ステージング用
server/.env.production    # 本番用（Azureで管理）
```

## 実装手順

### Phase 1: 環境分離
1. ブランチ戦略の導入
2. 環境変数の分離
3. GitHub Actions の改修

### Phase 2: ステージング環境
1. Azure App Service (Staging) 構築
2. ステージング用デプロイワークフロー
3. 自動テストの導入

### Phase 3: 本番デプロイの改善
1. 承認プロセスの導入
2. ロールバック機能
3. 監視・アラートの強化

## 環境変数戦略

### ローカル開発
```bash
NODE_ENV=development
PORT=8080
API_BASE_URL=http://localhost:8080/api
DATABASE_URL=postgresql://localhost:5432/webappdb_dev
```

### ステージング
```bash
NODE_ENV=staging
PORT=80
API_BASE_URL=https://emergency-staging.azurewebsites.net/api
DATABASE_URL=postgresql://staging-server/webappdb_staging
```

### 本番
```bash
NODE_ENV=production
PORT=80
API_BASE_URL=https://emergency-assistance-bfckhjejb3fbf9du.japanwest-01.azurewebsites.net/api
DATABASE_URL=postgresql://prod-server/webappdb_production
```

## デプロイフロー

### 現在（問題あり）
```
修正 → main push → 本番デプロイ
```

### 推奨フロー
```
修正 → develop push → ステージング → テスト → main PR → 承認 → 本番デプロイ
```

## 緊急対応

### 現在の運用を継続しながら改善
1. 重要な修正は慎重に
2. バックアップの確保
3. 段階的な改善実施

### ホットフィックス対応
1. `hotfix/` ブランチ作成
2. 緊急修正実施
3. 直接本番デプロイ
4. 事後レビュー
