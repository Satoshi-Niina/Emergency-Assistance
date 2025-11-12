# Azure App Service 最適化設定ガイド

## 🚨 緊急対応：デプロイタイムアウト対策

### 現在の問題
- GitHub Actions デプロイが30分でタイムアウト
- 100+の依存関係による長時間ビルド
- Oryx ビルドシステムの非効率性

## 🔧 Azure Portal で即座に設定すべき項目

### 1. Application Settings (環境変数)
Azure Portal > App Services > Emergency-Assistance > Configuration > Application settings

```bash
# ビルド最適化
SCM_DO_BUILD_DURING_DEPLOYMENT=true
ENABLE_ORYX_BUILD=true
ORYX_APPTYPE=node

# npm 最適化
NPM_CONFIG_PRODUCTION=false
NPM_CONFIG_CACHE=.npm
NPM_CONFIG_PREFER_OFFLINE=true
NPM_CONFIG_PROGRESS=false
NPM_CONFIG_AUDIT=false
NPM_CONFIG_FUND=false

# Node.js 最適化
WEBSITE_NODE_DEFAULT_VERSION=20-lts
WEBSITE_NPM_DEFAULT_VERSION=latest

# メモリとタイムアウト
WEBSITE_SCM_COMMAND_IDLE_TIMEOUT=3600
WEBSITE_TIME_ZONE=Asia/Tokyo
```

### 2. General Settings
Azure Portal > App Services > Emergency-Assistance > Configuration > General settings

```
Platform: 64 Bit
HTTP Version: 2.0
ARR Affinity: Off (スケーラビリティ向上)
HTTPS Only: On
```

### 3. 高度な設定
```bash
# Startup Command を設定:
node app.js

# または動的設定の場合:
node unified-hot-reload-server.js
```

## ⚡ 即効性のある最適化

### A. 依存関係の最適化（package.json 調整）

#### サーバー側で削減可能な依存関係
```json
// 開発時のみ必要（本番では devDependencies に移動）
"@types/*": "devDependencies に移動",
"drizzle-kit": "devDependencies に移動",
"tsx": "devDependencies に移動"
```

#### クライアント側で最適化可能
```json
// バンドル最適化
"terser": "^5.29.2",  // 保持
"rimraf": "^6.0.1"    // 保持（クリーンアップ用）
```

### B. ビルド戦略の最適化

#### 1. 分割デプロイ戦略
```yaml
# 1回目：軽量デプロイ（必須機能のみ）
# 2回目：フル機能デプロイ（段階的）
```

#### 2. プリビルド済みアーティファクト
```bash
# ローカルでビルド完了後にコミット
npm run build
git add dist/
git commit -m "Add pre-built artifacts"
```

## 🚀 緊急時の代替デプロイ方法

### 方法1: 手動 ZIP デプロイ
```bash
# 1. ローカルでフルビルド
npm run build --prefix client
zip -r emergency-deploy.zip server/ client/dist/ package.json

# 2. Azure Portal > Deployment > ZIP Deploy
# emergency-deploy.zip をアップロード
```

### 方法2: Azure CLI 直接デプロイ
```bash
# Azure CLI インストール後
az login
az webapp deployment source config-zip \
  --resource-group YourResourceGroup \
  --name Emergency-Assistance \
  --src emergency-deploy.zip
```

### 方法3: FTP デプロイ
```bash
# Azure Portal > Deployment Center > FTP/S
# 認証情報を取得してファイルを直接アップロード
```

## 📊 パフォーマンス監視

### デプロイ時間の測定
```bash
# GitHub Actions で時間計測
- name: Start Timer
  run: echo "DEPLOY_START=$(date +%s)" >> $GITHUB_ENV

- name: End Timer
  run: |
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - DEPLOY_START))
    echo "⏱️ Deploy Duration: ${DURATION}s"
```

### Azure メトリクス確認
- Portal > Monitor > Metrics
- CPU使用率、メモリ使用率、応答時間を監視

## 🔄 段階的改善プラン

### フェーズ1（即座）：タイムアウト回避
- [x] 最適化済みワークフローファイル作成
- [ ] Azure設定の調整
- [ ] 新ワークフローでのテストデプロイ

### フェーズ2（1週間以内）：根本的最適化
- [ ] 依存関係の整理とバンドルサイズ削減
- [ ] Docker化による一貫性確保
- [ ] CI/CD パイプラインの分離

### フェーズ3（1ヶ月以内）：スケーラブル化
- [ ] マイクロサービス化の検討
- [ ] CDNの活用
- [ ] Azure Container Apps への移行検討

## 🆘 緊急時のロールバック

```bash
# GitHub Actions で前回成功デプロイに戻す
git revert HEAD
git push origin main

# または Azure Portal で Deployment slots を使用
Portal > Deployment slots > Swap
```
