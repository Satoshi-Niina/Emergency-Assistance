# Azure App Service スタートアップコマンド設定

## 現在の問題
- Node.js 18.17.1 で動作する必要がある
- cross-env の警告を無視する必要がある
- スタートアップスクリプトが見つからない

## 解決策

### 1. Azure Portal でのスタートアップコマンド設定

#### 1.1 直接的なコマンド（推奨）
```
NODE_ENV=production PORT=8080 JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net node production-server.js
```

#### 1.2 環境変数設定（App Settings）
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

#### 1.3 スタートアップコマンド（環境変数使用）
```
node production-server.js
```

### 2. 設定手順

#### 2.1 Azure Portal での設定
1. **Azure Portal** → **Emergencyassistance-sv** → **設定** → **全般設定**
2. **スタートアップコマンド** に上記のコマンドを設定
3. **保存** をクリック

#### 2.2 App Service の再起動
1. **概要** ページに戻る
2. **再起動** をクリック
3. 再起動完了まで待機

### 3. 確認方法

#### 3.1 Kudu コンソールでの確認
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

### 4. 期待される結果

#### 4.1 成功時のログ
```
🚀 Server running on 0.0.0.0:8080
📊 Health check endpoints:
   - http://0.0.0.0:8080/api/health
   - http://0.0.0.0:8080/api/healthz
   - http://0.0.0.0:8080/ping
```

#### 4.2 エラーが解決される条件
- Node.js 18.17.1 で動作
- 必要な環境変数が設定されている
- `routes/index.js` が存在する

## 重要なポイント

- **Node.js 18.17.1 で動作するように修正済み**
- **cross-env のバージョンを下げて警告を回避**
- **直接的なスタートアップコマンドを使用**
- **環境変数は App Settings で設定**
