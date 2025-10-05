## ローカル開発環境の起動方法

### シンプルな同時起動コマンド

**2つのターミナルで実行:**

**ターミナル1 (サーバー):**
```bash
cd server && npm run dev
```

**ターミナル2 (フロントエンド):**
```bash
cd client && npm run dev
```

### アクセス先
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:8081

### 本番デプロイ
```bash
git add .
git commit -m "Update"
git push origin main
```

自動でAzure Static Web Appsにデプロイされます。