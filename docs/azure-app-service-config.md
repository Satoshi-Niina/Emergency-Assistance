# Azure App Service設定ガイド

## npm startコマンド対応のための設定

### 1. Azure App Serviceの起動コマンド設定

Azure App Serviceのポータルで以下を設定：

**Configuration > General Settings**
- **Startup Command**: `npm start`

または、Azure CLIで設定：
```bash
az webapp config set --resource-group <resource-group-name> --name emergencyassistance-sv --startup-file "npm start"
```

### 2. 環境変数の確認

以下の環境変数が設定されていることを確認：
- `NODE_ENV=production`
- `PORT=80` (Azure App Serviceのデフォルト)
- その他のアプリケーション固有の環境変数

### 3. package.jsonファイル構造の変更点

修正後のデプロイ構造：
```
deploy-backend/
├── dist/           # TypeScriptコンパイル結果
│   └── index.js    # メインエントリーポイント
├── package.json    # npm startを含むスクリプト定義
└── node_modules/   # 本番用依存関係（CI/CDで自動インストール）
```

### 4. 起動フローの変更

**修正前**:
1. Azure App Service → `node dist/index.js` を直接実行

**修正後**:
1. Azure App Service → `npm start` を実行
2. npm → package.jsonの`"start": "node dist/index.js"`を参照
3. Node.js → `dist/index.js` を実行

### 5. トラブルシューティング

#### エラー: "npm: command not found"
- Azure App ServiceでNode.jsランタイムが正しく設定されているか確認
- Application Settings で `WEBSITE_NODE_DEFAULT_VERSION` を `~20` に設定

#### エラー: "Cannot find module"
- `npm install --production` がCI/CDで正常実行されているか確認
- package.jsonがデプロイパッケージに含まれているか確認

#### 起動タイムアウト
- 起動コマンドのタイムアウトを延長: `SCM_COMMAND_IDLE_TIMEOUT=300`
