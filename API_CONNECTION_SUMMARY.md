# Emergency Assistance System API・接続構成まとめ

## 1. APIエンドポイント一覧

### フロントエンド（client）→ バックエンド（server）

| 機能                | メソッド | パス例                                 | 説明                         |
|---------------------|----------|----------------------------------------|------------------------------|
| 履歴一覧取得        | GET      | /api/history                           | 履歴データ一覧取得           |
| 履歴削除            | DELETE   | /api/history/:id                       | 履歴データ削除               |
| 応急処置フロー一覧  | GET      | /api/emergency-flow/list               | フロー一覧取得               |
| 応急処置フロー詳細  | GET      | /api/emergency-flow/detail/:id         | フロー詳細取得               |
| 応急処置フロー削除  | DELETE   | /api/emergency-flow/:id                | フロー削除                   |
| 画像取得            | GET      | /api/emergency-flow/image/:fileName    | 画像ファイル取得             |
| 機種・機械番号取得  | GET      | /api/history/machine-data              | 機種・機械番号リスト取得     |
| チャット送信        | POST     | /api/chats/:id/send                    | チャット内容送信             |

> ※ `/api/` 配下はExpress/Node.jsサーバーで実装。API_BASE_URLで切り替え可。

---

## 2. API接続・認証・環境変数

- API_BASE_URL（例: https://your-production-domain.com/api）
  - フロント（Vite/React）は `VITE_API_BASE_URL` で参照
  - サーバーは `API_BASE_URL` で参照
- 認証（JWT/セッション）
  - `JWT_SECRET` で署名
  - `SESSION_SECRET`（開発時）
- CORS
  - `CORS_ORIGIN` で許可ドメイン指定

---

## 3. DB・ストレージ・外部サービス接続

- DB（PostgreSQL等）
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Azure Storage
  - `AZURE_STORAGE_CONNECTION_STRING`, `BLOB_CONTAINER`
- OpenAI
  - `OPENAI_API_KEY`（利用時のみ）

---

## 4. システム全体の接続イメージ

```
[Client (Vite/React)]
   |
   |  (REST API, VITE_API_BASE_URL)
   v
[Server (Node.js/Express, Docker)]
   |
   |  (DB接続, Azure, OpenAI)
   v
[DB/PostgreSQL]   [Azure Storage]   [OpenAI API]
```

---

## 5. 補足
- APIエンドポイントは `server/unified-server.js` で集中管理
- フロントは `api.ts` などでAPI_BASE_URLを参照しfetch/axiosで呼び出し
- 機密情報は必ずGitHub Secrets経由で渡す

---

以上を参考に、API設計・接続構成・環境変数管理を整理してください。
