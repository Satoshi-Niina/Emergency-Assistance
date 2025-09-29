# Node.js 18 対応 - 最終設定手順

## 現在の状況
- Azure App Service で Node.js 18.17.1 が固定されている
- 手動でバージョンを変更できない
- Node.js 18 で動作するように修正済み

## 推奨解決策: Node.js 18 で動作させる

### 1. Azure Portal での設定

#### 1.1 環境変数設定（App Settings）
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

#### 1.2 スタートアップコマンド
```
node production-server.js
```

#### 1.3 全般設定
```
スタック: Node
メジャーバージョン: Node 18
マイナーバージョン: Node 18 LTS
```

### 2. 設定の保存と再起動

#### 2.1 設定保存
1. **「保存」** をクリック
2. 設定が正しく保存されたことを確認

#### 2.2 App Service の再起動
1. **「概要」** ページに戻る
2. **「再起動」** をクリック
3. 再起動完了まで待機（約2-3分）

### 3. GitHub Actions でデプロイ実行

### 4. 確認方法

#### 4.1 Kudu コンソールでの確認
```bash
cd /home/site/wwwroot
node --version
# v18.17.1 で問題なし

# 環境変数を設定
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
export SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
export FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# アプリケーションを起動
node production-server.js
```

### 5. 期待される結果

#### 5.1 成功時のログ
```
🚀 Server running on 0.0.0.0:8080
📊 Health check endpoints:
   - http://0.0.0.0:8080/api/health
   - http://0.0.0.0:8080/api/healthz
   - http://0.0.0.0:8080/ping
```

## なぜ Node.js 18 を選択するか

### メリット
- **Azure App Service の制限に合わせる**
- **すぐに動作する**
- **安定した動作**
- **cross-env の警告が解決**

### デメリット
- **最新の機能が使えない**
- **パフォーマンスが若干劣る**

## 将来的な改善案

### オプション1: 新しい App Service を作成
- Linux プラットフォームで Node.js 20 を使用
- 現在の App Service を削除
- 新しい App Service に移行

### オプション2: Azure Container Instances を使用
- Docker コンテナで Node.js 20 を使用
- より柔軟な設定が可能

## 重要なポイント

- **Node.js 18 で動作するように修正済み**
- **Azure App Service の制限に合わせる**
- **安定した動作を優先**
- **将来的な改善は後で検討**
