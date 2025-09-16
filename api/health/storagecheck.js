const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  let result = { status: 'ng', error: null };
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    // ストレージアカウントのコンテナ一覧を取得してみる
    const iter = blobServiceClient.listContainers();
    await iter.next(); // 1件でも取得できればOK
    result.status = 'ok';
  } catch (err) {
    result.error = err.message;
  }
  context.res = {
    body: result,
    headers: { 'Content-Type': 'application/json' }
  };
};
