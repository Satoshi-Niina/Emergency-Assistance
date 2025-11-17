# 🚀 Emergency Assistance - 最もシンプルで確実な起動方法

## ⚡ クイックスタート（3ステップ）

### 1️⃣ Docker Desktopを起動
```powershell
# スタートメニューから "Docker Desktop" を起動
# タスクバーのDockerアイコンが緑色になるまで待つ（1-2分）
```

### 2️⃣ 開発環境を起動
```powershell
npm run docker:dev
```

### 3️⃣ ブラウザでアクセス
```
http://localhost:8080
```

**ログイン情報:**
- ユーザー名: `niina` / `takabeni1` / `Kosei001`
- パスワード: （実際のデータベースに保存されている）

**📝 詳細:** [LOGIN_INFO.md](LOGIN_INFO.md) を参照

**完了！** 🎉

---

## 📝 詳細説明

### 開発環境（ホットリロード対応）

```powershell
# 起動
npm run docker:dev

# 停止
Ctrl + C
```

**特徴:**
- ✅ ファイル編集が自動で反映
- ✅ データベース自動セットアップ
- ✅ ログがリアルタイムで表示

**使用タイミング:**
- コードを書いている時
- 機能をテストしている時

---

### 本番環境シミュレーション（デプロイ前確認）

```powershell
# 起動
npm run docker:prod

# 停止
npm run docker:stop
```

**特徴:**
- ✅ 本番環境と完全に同じDockerイメージ
- ✅ デプロイ前の最終確認
- ✅ バックグラウンドで動作

**使用タイミング:**
- git push 前の最終確認
- 本番環境と同じ条件でテスト

---

## 🎯 推奨ワークフロー

```
┌─────────────────────────────┐
│ 1. 開発環境起動              │
│    npm run docker:dev       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. コード編集（自動反映）    │
│    server/*, client/* 編集  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. ブラウザで確認            │
│    http://localhost:8080    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 4. 本番環境でテスト          │
│    Ctrl+C                   │
│    npm run docker:prod      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 5. デプロイ                  │
│    git add .                │
│    git commit -m "..."      │
│    git push origin main     │
└─────────────────────────────┘
```

---

## 🔧 よくある質問

### Q: 401エラーが出る
**A:** データベース接続設定を確認してください

**原因:**
- `.env.development` のデータベース設定が間違っている
- Docker環境では `postgres` ホストを使う必要がある

**正しい設定（server/.env.development）:**
```env
DATABASE_URL=postgresql://postgres:postgres_password_dev@postgres:5432/emergency_assistance
DB_HOST=postgres
```

**デフォルトユーザー:**
- ユーザー名: `admin`
- パスワード: `admin123`

**確認方法:**
```powershell
# データベースに接続
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d emergency_assistance

# ユーザー一覧を表示
SELECT username, role FROM users;

# 終了
\q
```

---

### Q: ポート8080が使用中
**A:** 他のプロセスが使っています

```powershell
# 使用中のプロセスを確認
netstat -ano | findstr :8080

# プロセスを停止
Stop-Process -Id <PID> -Force
```

---

### Q: Docker Engineが応答しない
**A:** 起動直後は接続できないことがあります

```powershell
# 2分待ってから再試行
Start-Sleep -Seconds 120
npm run docker:dev
```

---

### Q: 変更が反映されない
**A:** ブラウザのキャッシュをクリア

```
Ctrl + Shift + R (ハードリフレッシュ)
```

---

## 📂 プロジェクト構成

```
Emergency-Assistance/
├── docker-compose.yml          ← 本番環境シミュレーション用
├── docker-compose.dev.yml      ← 開発環境用（ホットリロード）
├── Dockerfile                  ← 本番用イメージ定義
├── Dockerfile.dev              ← 開発用イメージ定義
│
├── client/                     ← フロントエンド（React + Vite）
│   ├── src/
│   ├── dist/                   ← ビルド成果物
│   └── package.json
│
├── server/                     ← バックエンド（Node.js + Express）
│   ├── azure-server.mjs        ← エントリーポイント
│   └── package.json
│
├── shared/                     ← 共有コード
│
└── knowledge-base/             ← データ保存先
```

---

## 🚫 使わないコマンド

以下は**複雑で不要**です：

❌ Nginxを使った構成（削除しました）
❌ 手動でのクライアントビルド（自動化済み）
❌ 複雑なネットワーク設定（不要）

---

## ✅ 重要な原則

### 1つのコマンドで起動

```powershell
npm run docker:dev
```

### 1つのURLでアクセス

```
http://localhost:8080
```

### 1つのDockerfileで本番デプロイ

```
ローカル: Dockerfile
   ↓
GitHub Actions: 同じDockerfile
   ↓
Azure: 同じDockerイメージ
```

---

## 📚 詳細ドキュメント

- 起動できない時: [DOCKER_QUICKREF.md](DOCKER_QUICKREF.md)
- 環境設定: [DOCKER_SETUP.md](DOCKER_SETUP.md)
- デプロイフロー: [docs/DEPLOYMENT_FLOW_EXPLAINED.md](docs/DEPLOYMENT_FLOW_EXPLAINED.md)

---

## 💡 まとめ

**最もシンプルな方法 = 既にあなたが使っている方法です！**

```powershell
# これだけ！
npm run docker:dev
```

- ✅ 追加設定不要
- ✅ 本番環境と一致
- ✅ 自動で全て設定される

**他の複雑な方法は全て不要です！**
