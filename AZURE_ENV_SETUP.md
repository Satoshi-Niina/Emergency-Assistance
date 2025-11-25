# Azure環境変数設定ガイド

このガイドでは、Azure App ServiceでEmergency Assistanceアプリケーションが正常に動作するために必要な環境変数の設定方法を説明します。

## 📋 必要な環境変数一覧

### 🔴 必須の環境変数

| 環境変数名 | 説明 | 例 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgresql://user:password@host:5432/dbname?sslmode=require` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage接続文字列 | `DefaultEndpointsProtocol=https;AccountName=...` |
| `AZURE_STORAGE_CONTAINER_NAME` | Blobコンテナ名 | `emergency-exports` |
| `OPENAI_API_KEY` | OpenAI APIキー | `sk-proj-...` |

### 🟡 推奨の環境変数

| 環境変数名 | 説明 | デフォルト値 |
|---|---|---|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | ポート番号 | `8080` (Azureが自動設定) |
| `SESSION_SECRET` | セッション暗号化キー | ランダムな32文字以上の文字列 |
| `JWT_SECRET` | JWT暗号化キー | ランダムな32文字以上の文字列 |
| `PG_SSL` | PostgreSQL SSL接続 | `true` |

## 🔧 環境変数の設定手順

### ステップ1: Azure Portalにアクセス

1. [Azure Portal](https://portal.azure.com)にログイン
2. 「App Service」を検索して選択
3. デプロイしたアプリケーション(例: `emergency-assistance-xxxxx`)を選択

### ステップ2: 環境変数設定画面を開く

1. 左側メニューから **「設定」** > **「環境変数」** をクリック
2. または **「構成」** をクリック(UIバージョンによって異なる)

### ステップ3: 環境変数を追加

各環境変数について、以下の手順で追加します:

1. **「+ 新しいアプリケーション設定」** をクリック
2. **名前**: 環境変数名を入力(例: `DATABASE_URL`)
3. **値**: 環境変数の値を入力
4. **OK**をクリック
5. すべての環境変数を追加したら、画面上部の **「保存」** をクリック

> **⚠️ 重要**: 保存後、アプリケーションが自動的に再起動されます。

## 📝 各環境変数の詳細設定

### 1. DATABASE_URL (PostgreSQL接続文字列)

#### 取得方法

**Azure Database for PostgreSQLの場合:**

1. Azure Portal > **「Azure Database for PostgreSQL」** を選択
2. 使用するデータベースサーバーを選択
3. **「設定」** > **「接続文字列」** をクリック
4. **「Node.js」** タブを選択
5. 接続文字列をコピー
6. `{your_password}`部分を実際のパスワードに置換

**フォーマット:**
```
postgresql://ユーザー名:パスワード@ホスト名:5432/データベース名?sslmode=require
```

**例:**
```
postgresql://adminuser:P@ssw0rd123@myserver.postgres.database.azure.com:5432/emergency_db?sslmode=require
```

> **💡 ヒント**: `sslmode=require`は必須です。Azure PostgreSQLはSSL接続が必要です。

### 2. AZURE_STORAGE_CONNECTION_STRING (Blob Storage接続文字列)

#### 取得方法

1. Azure Portal > **「ストレージアカウント」** を選択
2. 使用するストレージアカウントを選択
3. **「セキュリティとネットワーク」** > **「アクセスキー」** をクリック
4. **「接続文字列」** をコピー

**フォーマット:**
```
DefaultEndpointsProtocol=https;AccountName=ストレージアカウント名;AccountKey=キー;EndpointSuffix=core.windows.net
```

**例:**
```
DefaultEndpointsProtocol=https;AccountName=emergencystorage;AccountKey=abc123...xyz789==;EndpointSuffix=core.windows.net
```

#### コンテナの作成

接続文字列を設定した後、コンテナを作成する必要があります:

1. ストレージアカウント > **「データストレージ」** > **「コンテナ」**
2. **「+ コンテナ」** をクリック
3. **名前**: `emergency-exports`
4. **パブリックアクセスレベル**: **「プライベート」**
5. **「作成」** をクリック

### 3. AZURE_STORAGE_CONTAINER_NAME

**値**: `emergency-exports`

これは上記で作成したコンテナ名と一致させてください。

### 4. OPENAI_API_KEY

#### 取得方法

1. [OpenAI Platform](https://platform.openai.com/)にログイン
2. **「API keys」** をクリック
3. **「+ Create new secret key」** をクリック
4. 名前を入力(例: `Emergency-Assistance-Production`)
5. **「Create secret key」** をクリック
6. **即座にコピーして保存**(二度と表示されません)

**フォーマット:**
```
sk-proj-...
```

> **🔒 重要**: このキーは絶対に公開しないでください。Gitにコミットしないでください。

### 5. SESSION_SECRET (セッション暗号化キー)

**ランダムな32文字以上の文字列を生成:**

PowerShellで生成:
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

または、オンラインツールを使用:
```
https://www.random.org/strings/
```

**例:**
```
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW
```

### 6. JWT_SECRET (JWT暗号化キー)

SESSION_SECRETと同様にランダムな文字列を生成してください。

**別の値を使用してください**(SESSION_SECRETとは異なる値)

## ✅ 設定確認手順

### 方法1: Azure診断スクリプトを使用

1. Azure App Service の **「開発ツール」** > **「SSH」** または **「コンソール」** を開く
2. 以下のコマンドを実行:

```bash
cd /home/site/wwwroot
node server/azure-diagnosis.js
```

このスクリプトは以下を確認します:
- ✅ データベース接続
- ✅ テーブルの存在とデータ件数
- ✅ BLOBストレージ接続

### 方法2: Azure Portalで確認

1. App Service > **「設定」** > **「環境変数」**
2. 以下の環境変数が設定されていることを確認:
   - `DATABASE_URL` ✅
   - `AZURE_STORAGE_CONNECTION_STRING` ✅
   - `AZURE_STORAGE_CONTAINER_NAME` ✅
   - `OPENAI_API_KEY` ✅

### 方法3: アプリケーションのログを確認

1. App Service > **「監視」** > **「ログストリーム」**
2. アプリケーション起動時のログで以下を確認:
   - `✅ PostgreSQL tables created/verified`
   - `✅ Database connection successful`
   - エラーメッセージがないこと

## 🐛 トラブルシューティング

### 問題1: データベース接続エラー

**症状:**
```
❌ Database connection error
```

**解決方法:**
1. `DATABASE_URL`が正しく設定されているか確認
2. パスワードに特殊文字がある場合、URLエンコードする必要があります
   - 例: `@` → `%40`, `#` → `%23`
3. Azure PostgreSQLのファイアウォール設定を確認
   - **「接続のセキュリティ」** > **「Azure サービスへのアクセスを許可」** をONに

### 問題2: BLOBストレージ接続エラー

**症状:**
```
❌ Blob storage connection error
```

**解決方法:**
1. `AZURE_STORAGE_CONNECTION_STRING`が正しくコピーされているか確認
2. コンテナ `emergency-exports` が存在するか確認
3. ストレージアカウントのアクセスキーが有効か確認

### 問題3: ログインできない

**症状:**
- `niina`以外のユーザーでログインできない

**解決方法:**
1. Azure Portal > PostgreSQL > **「クエリエディタ」** を開く
2. `seed-production-data.txt`の内容を実行(拡張子を.sqlに変更)
3. または、診断スクリプトで現在のユーザー一覧を確認

## 🔄 環境変数変更後の再起動

環境変数を変更した後は、必ずアプリケーションを再起動してください:

1. App Service > **「概要」**
2. **「再起動」** をクリック
3. 確認ダイアログで **「はい」** をクリック

再起動には通常30秒〜1分かかります。

## 📞 サポート

問題が解決しない場合は、以下の情報を収集してください:

1. Azure App Serviceのログ
2. `azure-diagnosis.js`の実行結果
3. 環境変数の設定状況(値は隠してOK)
4. エラーメッセージのスクリーンショット

---

**最終更新**: 2025年11月25日
