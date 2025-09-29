# Azure App Service 根本問題解決手順

## 問題の根本原因
- ヘルスチェックタイムアウト
- アプリケーションが起動していない
- `npm start` が実行されていない可能性

## 根本的な解決手順

### 1. Azure Portal での直接確認

#### 1.1 ログストリームの確認
1. Azure Portal → App Service → **「監視」** → **「ログストリーム」**
2. 以下のログを確認：
   ```
   npm start
   node production-server.js
   🚀 Server running on 0.0.0.0:8080
   ```

#### 1.2 設定の確認
**全般設定**:
```
スタック: Node
メジャーバージョン: Node 20
マイナーバージョン: Node 20 LTS
スタートアップコマンド: npm start
```

**環境変数 (App Settings)**:
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
```

### 2. スタートアップコマンドの強制設定

#### 2.1 より確実なスタートアップコマンド
**全般設定** の **スタートアップコマンド** を以下に変更：

```bash
cd /home/site/wwwroot && npm install --production && npm start
```

#### 2.2 環境変数での強制設定
**App Settings** に以下を追加：

```
WEBSITES_NODE_DEFAULT_VERSION=20.19.3
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
WEBSITES_MOUNT_ENABLED=1
```

### 3. 手動での動作確認

#### 3.1 Kudu コンソールでの確認
1. Azure Portal → App Service → **「開発ツール」** → **「高度なツール」** → **「移動」**
2. **「Debug console」** → **「CMD」** をクリック
3. 以下のコマンドを実行：

```bash
cd site/wwwroot
ls -la
npm --version
node --version
npm install --production
npm start
```

#### 3.2 ファイル構造の確認
```bash
ls -la
# 以下が存在することを確認：
# - package.json
# - production-server.js
# - node_modules/ (npm install後)
```

### 4. トラブルシューティング

#### 4.1 よくある問題と解決方法

**問題1: `npm start` が実行されない**
```bash
# スタートアップコマンドを以下に変更：
cd /home/site/wwwroot && npm install --production && npm start
```

**問題2: `node_modules` が存在しない**
```bash
# 環境変数を追加：
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

**問題3: 環境変数が設定されていない**
```bash
# 必須の環境変数を設定：
NODE_ENV=production
JWT_SECRET=your-secret-here
SESSION_SECRET=your-session-secret-here
```

**問題4: Node.js バージョンが正しくない**
```bash
# 環境変数を追加：
WEBSITES_NODE_DEFAULT_VERSION=20.19.3
```

### 5. 根本的な解決の確認

#### 5.1 ログストリームでの確認
以下のログが表示されることを確認：

```
npm install
npm start
node production-server.js
🚀 Server running on 0.0.0.0:8080
```

#### 5.2 手動でのヘルスチェック
```bash
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/ping
curl https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net/api/health
```

### 6. 最終的な設定

#### 6.1 推奨設定
**スタートアップコマンド**:
```bash
cd /home/site/wwwroot && npm install --production && npm start
```

**環境変数**:
```
NODE_ENV=production
PORT=8080
JWT_SECRET=emergency-assistance-jwt-secret-key-32chars-minimum
SESSION_SECRET=emergency-assistance-session-secret-32chars-minimum
WEBSITES_NODE_DEFAULT_VERSION=20.19.3
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
```

#### 6.2 設定後の手順
1. **「保存」** をクリック
2. **「再起動」** をクリック
3. **ログストリーム** で動作確認
4. **GitHub Actions** でデプロイ実行

## 重要なポイント

- **ヘルスチェックの延長は対症療法**
- **根本原因はアプリケーションの起動失敗**
- **スタートアップコマンドと環境変数が重要**
- **Kudu コンソールで直接確認が有効**
