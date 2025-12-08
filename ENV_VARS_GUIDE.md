# 環境変数設定ガイド

## 概要
セキュリティ強化のため、ハードコードされていた認証情報などを環境変数に移行しました。
ローカル環境および本番環境（Azure App Service）において、以下の環境変数を設定してください。

## 必須環境変数

### ストレージ設定
| 変数名 | 説明 | デフォルト値（未設定時） |
| --- | --- | --- |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storageへの接続文字列 | なし（本番必須） |
| `AZURE_STORAGE_CONTAINER_NAME` | 使用するコンテナ名 | `knowledge` |

### 認証設定（テストユーザー用）
データベース接続がない場合のフォールバック認証で使用されます。
| 変数名 | 説明 | デフォルト値（開発用） |
| --- | --- | --- |
| `TEST_USER_ADMIN_PASSWORD` | ユーザー `admin` のパスワード | `admin` |
| `TEST_USER_NIINA_PASSWORD` | ユーザー `niina` のパスワード | `G&896845` |
| `JWT_SECRET` | JWTトークン署名用シークレット | `dev-secret-key...` |

### その他
| 変数名 | 説明 | デフォルト値 |
| --- | --- | --- |
| `NODE_ENV` | 環境識別 (`production` / `development`) | `development` |
| `OPENAI_API_KEY` | OpenAI APIキー | なし |

## 設定方法

### ローカル環境
プロジェクトルートの `.env` ファイルに追記してください。
```env
AZURE_STORAGE_CONTAINER_NAME=knowledge
TEST_USER_ADMIN_PASSWORD=your_secure_password
TEST_USER_NIINA_PASSWORD=your_secure_password
```

### 本番環境 (Azure App Service)
Azure Portal の「設定」>「環境変数」から追加してください。
