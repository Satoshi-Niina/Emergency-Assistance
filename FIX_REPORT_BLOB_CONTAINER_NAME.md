# 修正レポート：Blobコンテナ名の訂正

## 概要
ユーザーからの指摘に基づき、Azure Blob Storageのコンテナ名設定を修正しました。
以前の修正ではコンテナ名を `knowledge-base` とハードコードしていましたが、正しくはコンテナ名が `knowledge` であり、その中の仮想フォルダ（プレフィックス）が `knowledge-base/` であることが判明しました。

## 修正内容
`server/unified-hot-reload-server.js` 内の以下の箇所を修正しました。

1.  **コンテナ名の変更**:
    -   `const containerName = 'knowledge-base';` を `const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'knowledge';` に変更しました。
    -   これにより、環境変数 `AZURE_STORAGE_CONTAINER_NAME` が設定されていればそれを優先し、なければデフォルトで `knowledge` を使用します。

2.  **影響範囲**:
    -   `GET /history` (履歴一覧取得)
    -   `POST /history/upload-image` (画像アップロード)
    -   `POST /emergency-flow/generate` (フロー生成・保存)
    -   `PUT /history/update-item/:id` (履歴更新)
    -   `DELETE /history/:id` (履歴削除)

## 構成確認
-   **コンテナ名**: `knowledge` (または環境変数指定)
-   **Blobパス構成**:
    -   履歴データ: `knowledge-base/exports/filename.json`
    -   フローデータ: `knowledge-base/troubleshooting/filename.json`
    -   画像データ: `knowledge-base/images/chat-exports/filename.jpg`

この修正により、本番環境でのBlobアクセスエラー（ContainerNotFoundなど）が解消されるはずです。
